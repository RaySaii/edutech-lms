import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { Course } from './course.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
  STRIPE = 'stripe',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
  CRYPTOCURRENCY = 'cryptocurrency',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELLED = 'cancelled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  TRIALING = 'trialing',
  PAUSED = 'paused',
}

export enum SubscriptionInterval {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  LIFETIME = 'lifetime',
}

export enum PlanType {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom',
}

@Entity('subscription_plans')
@Index(['organizationId'])
@Index(['planType'])
@Index(['isActive'])
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 200 })
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({
    type: 'enum',
    enum: PlanType,
    default: PlanType.BASIC,
  })
  planType: PlanType;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('varchar', { length: 3, default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: SubscriptionInterval,
    default: SubscriptionInterval.MONTHLY,
  })
  interval: SubscriptionInterval;

  @Column('int', { default: 1 })
  intervalCount: number; // e.g., every 3 months

  @Column('int', { nullable: true })
  trialPeriodDays?: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPopular: boolean;

  @Column('jsonb')
  features: {
    maxUsers?: number;
    maxCourses?: number;
    storageGB?: number;
    supportLevel?: 'basic' | 'priority' | 'dedicated';
    customBranding?: boolean;
    analyticsAdvanced?: boolean;
    apiAccess?: boolean;
    ssoIntegration?: boolean;
    customDomain?: boolean;
    whiteLabeling?: boolean;
    certificateCustomization?: boolean;
    bulkEnrollment?: boolean;
    reportingAdvanced?: boolean;
  };

  @Column('jsonb', { nullable: true })
  limits?: {
    videoBandwidthGB?: number;
    apiCallsPerMonth?: number;
    emailsPerMonth?: number;
    concurrentUsers?: number;
    diskSpaceGB?: number;
  };

  @Column('jsonb', { nullable: true })
  metadata?: {
    stripePriceId?: string;
    paypalPlanId?: string;
    tags?: string[];
    marketingDescription?: string;
  };

  @OneToMany(() => Subscription, subscription => subscription.plan)
  subscriptions: Subscription[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('subscriptions')
@Index(['userId'])
@Index(['organizationId'])
@Index(['planId'])
@Index(['status'])
@Index(['currentPeriodEnd'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid')
  planId: string;

  @ManyToOne(() => SubscriptionPlan, plan => plan.subscriptions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'planId' })
  plan: SubscriptionPlan;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column('varchar', { length: 100, nullable: true })
  externalSubscriptionId?: string; // Stripe, PayPal, etc.

  @Column()
  currentPeriodStart: Date;

  @Column()
  currentPeriodEnd: Date;

  @Column({ nullable: true })
  cancelledAt?: Date;

  @Column({ nullable: true })
  cancelAtPeriodEnd?: boolean;

  @Column({ nullable: true })
  trialStart?: Date;

  @Column({ nullable: true })
  trialEnd?: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('varchar', { length: 3 })
  currency: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  taxRate?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  taxAmount?: number;

  @Column('int', { default: 0 })
  quantity: number; // For seat-based pricing

  @Column('jsonb', { nullable: true })
  discounts?: Array<{
    couponId: string;
    amount: number;
    percentage?: number;
    validUntil?: string;
  }>;

  @OneToMany(() => Payment, payment => payment.subscription)
  payments: Payment[];

  @OneToMany(() => Invoice, invoice => invoice.subscription)
  invoices: Invoice[];

  @Column('jsonb', { nullable: true })
  usage?: {
    currentPeriod: {
      users?: number;
      courses?: number;
      storageUsedGB?: number;
      bandwidthUsedGB?: number;
      apiCalls?: number;
      emailsSent?: number;
    };
    alerts?: Array<{
      feature: string;
      threshold: number;
      currentUsage: number;
      alertedAt: string;
    }>;
  };

  @Column('jsonb', { nullable: true })
  metadata?: {
    paymentMethodId?: string;
    customerId?: string;
    source?: 'web' | 'mobile' | 'api';
    referralCode?: string;
    notes?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  nextBillingAt?: Date;
}

@Entity('payments')
@Index(['userId'])
@Index(['subscriptionId'])
@Index(['status'])
@Index(['createdAt'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid', { nullable: true })
  subscriptionId?: string;

  @ManyToOne(() => Subscription, subscription => subscription.payments, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription?: Subscription;

  @Column('uuid', { nullable: true })
  courseId?: string; // For one-time course purchases

  @ManyToOne(() => Course, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @Column('varchar', { length: 100, nullable: true })
  externalPaymentId?: string; // Stripe payment intent ID, PayPal transaction ID, etc.

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  method: PaymentMethod;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('varchar', { length: 3 })
  currency: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  feeAmount?: number; // Processing fee

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  taxAmount?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  refundedAmount?: number;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ nullable: true })
  processedAt?: Date;

  @Column({ nullable: true })
  failedAt?: Date;

  @Column('text', { nullable: true })
  failureReason?: string;

  @Column({ nullable: true })
  refundedAt?: Date;

  @Column('text', { nullable: true })
  refundReason?: string;

  @Column('jsonb', { nullable: true })
  paymentMethodDetails?: {
    type: string;
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    fingerprint?: string;
    country?: string;
  };

  @Column('jsonb', { nullable: true })
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  @Column('jsonb', { nullable: true })
  metadata?: {
    invoiceId?: string;
    receiptUrl?: string;
    customerIp?: string;
    userAgent?: string;
    riskScore?: number;
    fraudCheck?: {
      status: 'pass' | 'fail' | 'warn';
      reasons?: string[];
    };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('invoices')
@Index(['subscriptionId'])
@Index(['status'])
@Index(['dueDate'])
@Index(['createdAt'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50, unique: true })
  invoiceNumber: string;

  @Column('uuid')
  subscriptionId: string;

  @ManyToOne(() => Subscription, subscription => subscription.invoices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;

  @Column({
    type: 'enum',
    enum: ['draft', 'open', 'paid', 'void', 'uncollectible'],
    default: 'draft',
  })
  status: string;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column('varchar', { length: 3 })
  currency: string;

  @Column()
  periodStart: Date;

  @Column()
  periodEnd: Date;

  @Column()
  dueDate: Date;

  @Column({ nullable: true })
  paidAt?: Date;

  @Column({ nullable: true })
  voidedAt?: Date;

  @OneToMany(() => InvoiceItem, item => item.invoice, { cascade: true })
  items: InvoiceItem[];

  @Column('jsonb', { nullable: true })
  billingDetails?: {
    name: string;
    email: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    vatNumber?: string;
  };

  @Column('varchar', { length: 500, nullable: true })
  pdfUrl?: string;

  @Column('varchar', { length: 100, nullable: true })
  externalInvoiceId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('invoice_items')
@Index(['invoiceId'])
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  invoiceId: string;

  @ManyToOne(() => Invoice, invoice => invoice.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column('varchar', { length: 200 })
  description: string;

  @Column('int')
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unitAmount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('varchar', { length: 3 })
  currency: string;

  @Column('jsonb', { nullable: true })
  metadata?: {
    planId?: string;
    courseId?: string;
    periodStart?: string;
    periodEnd?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('payment_methods')
@Index(['userId'])
@Index(['isDefault'])
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { length: 100 })
  externalId: string; // Stripe payment method ID

  @Column('varchar', { length: 50 })
  type: string; // card, bank_account, etc.

  @Column({ default: false })
  isDefault: boolean;

  @Column('jsonb')
  details: {
    brand?: string;
    last4?: string;
    expiryMonth?: number;
    expiryYear?: number;
    funding?: string;
    country?: string;
    fingerprint?: string;
  };

  @Column('jsonb', { nullable: true })
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('coupons')
@Index(['code'])
@Index(['isActive'])
@Index(['validFrom'])
@Index(['validUntil'])
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50, unique: true })
  code: string;

  @Column('varchar', { length: 200 })
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['percentage', 'fixed_amount'],
  })
  discountType: string;

  @Column('decimal', { precision: 10, scale: 2 })
  discountValue: number;

  @Column('varchar', { length: 3, nullable: true })
  currency?: string; // Required for fixed_amount discounts

  @Column('int', { nullable: true })
  maxUses?: number;

  @Column('int', { default: 0 })
  usedCount: number;

  @Column('int', { nullable: true })
  maxUsesPerCustomer?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  minimumAmount?: number;

  @Column()
  validFrom: Date;

  @Column({ nullable: true })
  validUntil?: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column('simple-array', { nullable: true })
  applicablePlans?: string[]; // Plan IDs

  @Column('simple-array', { nullable: true })
  applicableCourses?: string[]; // Course IDs

  @Column('jsonb', { nullable: true })
  restrictions?: {
    firstPurchaseOnly?: boolean;
    newCustomersOnly?: boolean;
    countryRestrictions?: string[];
    emailDomainRestrictions?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}