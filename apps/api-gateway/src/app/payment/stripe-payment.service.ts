import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  User,
  Subscription,
  SubscriptionPlan,
  Payment,
  PaymentMethod,
  Invoice,
  Coupon,
  PaymentStatus,
  PaymentMethod as PaymentMethodEnum,
  SubscriptionStatus,
} from '@edutech-lms/database';

export interface CreatePaymentIntentData {
  amount: number;
  currency: string;
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreateSubscriptionData {
  userId: string;
  planId: string;
  paymentMethodId?: string;
  couponCode?: string;
  trialDays?: number;
  quantity?: number;
}

export interface UpdateSubscriptionData {
  planId?: string;
  quantity?: number;
  couponCode?: string;
  cancelAtPeriodEnd?: boolean;
}

@Injectable()
export class StripePaymentService {
  private readonly logger = new Logger(StripePaymentService.name);
  private stripe: Stripe;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Coupon)
    private couponRepository: Repository<Coupon>,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get('STRIPE_SECRET_KEY') || '',
      {
        apiVersion: '2023-10-16',
      }
    );
  }

  async createCustomer(user: User): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user.id,
          organizationId: user.organizationId || '',
        },
      });

      this.logger.log(`Stripe customer created: ${customer.id} for user ${user.id}`);
      return customer.id;
    } catch (error) {
      this.logger.error(`Failed to create Stripe customer: ${error.message}`);
      throw error;
    }
  }

  async createPaymentIntent(data: CreatePaymentIntentData): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency.toLowerCase(),
        customer: data.customerId,
        payment_method: data.paymentMethodId,
        description: data.description,
        metadata: data.metadata,
        confirmation_method: 'manual',
        confirm: true,
        return_url: `${this.configService.get('APP_URL')}/payment/success`,
      });

      this.logger.log(`Payment intent created: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to create payment intent: ${error.message}`);
      throw error;
    }
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);
      this.logger.log(`Payment intent confirmed: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to confirm payment intent: ${error.message}`);
      throw error;
    }
  }

  async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
    const user = await this.userRepository.findOne({ where: { id: data.userId } });
    if (!user) {
      throw new NotFoundException(`User ${data.userId} not found`);
    }

    const plan = await this.planRepository.findOne({ where: { id: data.planId } });
    if (!plan) {
      throw new NotFoundException(`Plan ${data.planId} not found`);
    }

    try {
      // Ensure customer exists in Stripe
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        customerId = await this.createCustomer(user);
        await this.userRepository.update(user.id, { stripeCustomerId: customerId });
      }

      // Apply coupon if provided
      let coupon: Stripe.Coupon | undefined;
      if (data.couponCode) {
        coupon = await this.validateAndGetCoupon(data.couponCode);
      }

      // Create subscription in Stripe
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{
          price: plan.metadata?.stripePriceId || '',
          quantity: data.quantity || 1,
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: user.id,
          planId: plan.id,
          organizationId: user.organizationId || '',
        },
      };

      if (data.paymentMethodId) {
        subscriptionParams.default_payment_method = data.paymentMethodId;
      }

      if (coupon) {
        subscriptionParams.coupon = coupon.id;
      }

      if (data.trialDays || plan.trialPeriodDays) {
        subscriptionParams.trial_period_days = data.trialDays || plan.trialPeriodDays;
      }

      const stripeSubscription = await this.stripe.subscriptions.create(subscriptionParams);

      // Create subscription record in database
      const subscription = this.subscriptionRepository.create({
        userId: user.id,
        organizationId: user.organizationId || plan.organizationId,
        planId: plan.id,
        externalSubscriptionId: stripeSubscription.id,
        status: this.mapStripeStatus(stripeSubscription.status),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        amount: plan.price,
        currency: plan.currency,
        quantity: data.quantity || 1,
        trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : undefined,
        trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : undefined,
        metadata: {
          customerId,
          paymentMethodId: data.paymentMethodId,
        },
      });

      const savedSubscription = await this.subscriptionRepository.save(subscription);

      this.logger.log(`Subscription created: ${savedSubscription.id} for user ${user.id}`);
      return savedSubscription;
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${error.message}`);
      throw error;
    }
  }

  async updateSubscription(subscriptionId: string, data: UpdateSubscriptionData): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['plan'],
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    try {
      const updateParams: Stripe.SubscriptionUpdateParams = {};

      // Update plan
      if (data.planId && data.planId !== subscription.planId) {
        const newPlan = await this.planRepository.findOne({ where: { id: data.planId } });
        if (!newPlan) {
          throw new NotFoundException(`Plan ${data.planId} not found`);
        }

        // Get current subscription from Stripe to update items
        const stripeSubscription = await this.stripe.subscriptions.retrieve(
          subscription.externalSubscriptionId!
        );

        updateParams.items = [{
          id: stripeSubscription.items.data[0].id,
          price: newPlan.metadata?.stripePriceId || '',
          quantity: data.quantity || subscription.quantity,
        }];

        subscription.planId = newPlan.id;
        subscription.amount = newPlan.price;
      }

      // Update quantity
      if (data.quantity && data.quantity !== subscription.quantity) {
        if (!updateParams.items) {
          const stripeSubscription = await this.stripe.subscriptions.retrieve(
            subscription.externalSubscriptionId!
          );
          updateParams.items = [{
            id: stripeSubscription.items.data[0].id,
            quantity: data.quantity,
          }];
        }
        subscription.quantity = data.quantity;
      }

      // Apply coupon
      if (data.couponCode) {
        const coupon = await this.validateAndGetCoupon(data.couponCode);
        updateParams.coupon = coupon.id;
      }

      // Cancel at period end
      if (data.cancelAtPeriodEnd !== undefined) {
        updateParams.cancel_at_period_end = data.cancelAtPeriodEnd;
        subscription.cancelAtPeriodEnd = data.cancelAtPeriodEnd;
      }

      // Update subscription in Stripe
      await this.stripe.subscriptions.update(subscription.externalSubscriptionId!, updateParams);

      // Save changes to database
      const updatedSubscription = await this.subscriptionRepository.save(subscription);

      this.logger.log(`Subscription updated: ${subscriptionId}`);
      return updatedSubscription;
    } catch (error) {
      this.logger.error(`Failed to update subscription: ${error.message}`);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    try {
      if (immediately) {
        // Cancel immediately
        await this.stripe.subscriptions.cancel(subscription.externalSubscriptionId!);
        subscription.status = SubscriptionStatus.CANCELLED;
        subscription.cancelledAt = new Date();
      } else {
        // Cancel at period end
        await this.stripe.subscriptions.update(subscription.externalSubscriptionId!, {
          cancel_at_period_end: true,
        });
        subscription.cancelAtPeriodEnd = true;
      }

      const cancelledSubscription = await this.subscriptionRepository.save(subscription);

      this.logger.log(`Subscription cancelled: ${subscriptionId} (immediate: ${immediately})`);
      return cancelledSubscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription: ${error.message}`);
      throw error;
    }
  }

  async pauseSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    try {
      // Pause subscription in Stripe
      await this.stripe.subscriptions.update(subscription.externalSubscriptionId!, {
        pause_collection: {
          behavior: 'void',
        },
      });

      subscription.status = SubscriptionStatus.PAUSED;
      const pausedSubscription = await this.subscriptionRepository.save(subscription);

      this.logger.log(`Subscription paused: ${subscriptionId}`);
      return pausedSubscription;
    } catch (error) {
      this.logger.error(`Failed to pause subscription: ${error.message}`);
      throw error;
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    try {
      // Resume subscription in Stripe
      await this.stripe.subscriptions.update(subscription.externalSubscriptionId!, {
        pause_collection: '',
      });

      subscription.status = SubscriptionStatus.ACTIVE;
      const resumedSubscription = await this.subscriptionRepository.save(subscription);

      this.logger.log(`Subscription resumed: ${subscriptionId}`);
      return resumedSubscription;
    } catch (error) {
      this.logger.error(`Failed to resume subscription: ${error.message}`);
      throw error;
    }
  }

  async attachPaymentMethod(userId: string, paymentMethodId: string): Promise<PaymentMethod> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    try {
      // Ensure customer exists in Stripe
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        customerId = await this.createCustomer(user);
        await this.userRepository.update(user.id, { stripeCustomerId: customerId });
      }

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Retrieve payment method details
      const stripePaymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);

      // Create payment method record
      const paymentMethod = this.paymentMethodRepository.create({
        userId,
        externalId: paymentMethodId,
        type: stripePaymentMethod.type,
        details: this.extractPaymentMethodDetails(stripePaymentMethod),
        billingAddress: stripePaymentMethod.billing_details.address ? {
          line1: stripePaymentMethod.billing_details.address.line1 || undefined,
          line2: stripePaymentMethod.billing_details.address.line2 || undefined,
          city: stripePaymentMethod.billing_details.address.city || undefined,
          state: stripePaymentMethod.billing_details.address.state || undefined,
          postalCode: stripePaymentMethod.billing_details.address.postal_code || undefined,
          country: stripePaymentMethod.billing_details.address.country || undefined,
        } : undefined,
      });

      const savedPaymentMethod = await this.paymentMethodRepository.save(paymentMethod);

      this.logger.log(`Payment method attached: ${paymentMethodId} for user ${userId}`);
      return savedPaymentMethod;
    } catch (error) {
      this.logger.error(`Failed to attach payment method: ${error.message}`);
      throw error;
    }
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    try {
      // Update customer's default payment method in Stripe
      await this.stripe.customers.update(user.stripeCustomerId!, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Update payment methods in database
      await this.paymentMethodRepository.update(
        { userId, isDefault: true },
        { isDefault: false }
      );

      await this.paymentMethodRepository.update(
        { userId, externalId: paymentMethodId },
        { isDefault: true }
      );

      this.logger.log(`Default payment method set: ${paymentMethodId} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to set default payment method: ${error.message}`);
      throw error;
    }
  }

  async processWebhook(signature: string, payload: Buffer): Promise<void> {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;
        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`);
      throw error;
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { externalPaymentId: paymentIntent.id },
      });

      if (payment) {
        payment.status = PaymentStatus.COMPLETED;
        payment.processedAt = new Date();
        await this.paymentRepository.save(payment);
      }

      this.logger.log(`Payment succeeded: ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error(`Error handling payment success: ${error.message}`);
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { externalPaymentId: paymentIntent.id },
      });

      if (payment) {
        payment.status = PaymentStatus.FAILED;
        payment.failedAt = new Date();
        payment.failureReason = paymentIntent.last_payment_error?.message;
        await this.paymentRepository.save(payment);
      }

      this.logger.log(`Payment failed: ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error(`Error handling payment failure: ${error.message}`);
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { externalSubscriptionId: invoice.subscription as string },
      });

      if (subscription) {
        subscription.status = SubscriptionStatus.ACTIVE;
        await this.subscriptionRepository.save(subscription);
      }

      this.logger.log(`Invoice payment succeeded: ${invoice.id}`);
    } catch (error) {
      this.logger.error(`Error handling invoice payment success: ${error.message}`);
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { externalSubscriptionId: invoice.subscription as string },
      });

      if (subscription) {
        subscription.status = SubscriptionStatus.PAST_DUE;
        await this.subscriptionRepository.save(subscription);
      }

      this.logger.log(`Invoice payment failed: ${invoice.id}`);
    } catch (error) {
      this.logger.error(`Error handling invoice payment failure: ${error.message}`);
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const localSubscription = await this.subscriptionRepository.findOne({
        where: { externalSubscriptionId: subscription.id },
      });

      if (localSubscription) {
        localSubscription.status = this.mapStripeStatus(subscription.status);
        localSubscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
        localSubscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        localSubscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
        
        if (subscription.canceled_at) {
          localSubscription.cancelledAt = new Date(subscription.canceled_at * 1000);
        }

        await this.subscriptionRepository.save(localSubscription);
      }

      this.logger.log(`Subscription updated: ${subscription.id}`);
    } catch (error) {
      this.logger.error(`Error handling subscription update: ${error.message}`);
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const localSubscription = await this.subscriptionRepository.findOne({
        where: { externalSubscriptionId: subscription.id },
      });

      if (localSubscription) {
        localSubscription.status = SubscriptionStatus.CANCELLED;
        localSubscription.cancelledAt = new Date();
        await this.subscriptionRepository.save(localSubscription);
      }

      this.logger.log(`Subscription deleted: ${subscription.id}`);
    } catch (error) {
      this.logger.error(`Error handling subscription deletion: ${error.message}`);
    }
  }

  private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    // Send notification about trial ending
    // This would integrate with your notification system
    this.logger.log(`Trial will end for subscription: ${subscription.id}`);
  }

  private async validateAndGetCoupon(couponCode: string): Promise<Stripe.Coupon> {
    const coupon = await this.couponRepository.findOne({
      where: { code: couponCode, isActive: true },
    });

    if (!coupon) {
      throw new BadRequestException(`Invalid coupon code: ${couponCode}`);
    }

    // Check if coupon is still valid
    if (coupon.validUntil && coupon.validUntil < new Date()) {
      throw new BadRequestException('Coupon has expired');
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    // Get coupon from Stripe (assuming it exists there)
    try {
      return await this.stripe.coupons.retrieve(couponCode);
    } catch (error) {
      this.logger.error(`Failed to retrieve coupon from Stripe: ${error.message}`);
      throw new BadRequestException('Invalid coupon');
    }
  }

  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'canceled':
        return SubscriptionStatus.CANCELLED;
      case 'incomplete':
      case 'incomplete_expired':
        return SubscriptionStatus.INACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'unpaid':
        return SubscriptionStatus.UNPAID;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'paused':
        return SubscriptionStatus.PAUSED;
      default:
        return SubscriptionStatus.INACTIVE;
    }
  }

  private extractPaymentMethodDetails(paymentMethod: Stripe.PaymentMethod): any {
    switch (paymentMethod.type) {
      case 'card':
        return {
          brand: paymentMethod.card?.brand,
          last4: paymentMethod.card?.last4,
          expiryMonth: paymentMethod.card?.exp_month,
          expiryYear: paymentMethod.card?.exp_year,
          funding: paymentMethod.card?.funding,
          country: paymentMethod.card?.country,
          fingerprint: paymentMethod.card?.fingerprint,
        };
      default:
        return {
          type: paymentMethod.type,
        };
    }
  }
}