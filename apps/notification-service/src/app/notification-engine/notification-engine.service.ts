import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  User,
  NotificationEntity,
} from '@edutech-lms/database';

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  OPENED = 'opened',
  CLICKED = 'clicked'
}

export enum NotificationPriority {
  URGENT = 'urgent',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook',
  IN_APP = 'in-app'
}
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface NotificationPayload {
  userId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  content: {
    subject?: string;
    title: string;
    body: string;
    html?: string;
    data?: Record<string, any>;
    actions?: Array<{
      text: string;
      url: string;
      type: 'primary' | 'secondary';
    }>;
  };
  scheduling?: {
    sendAt?: Date;
    timezone?: string;
  };
  tracking?: {
    trackOpens?: boolean;
    trackClicks?: boolean;
    campaignId?: string;
    automationId?: string;
  };
}

export interface BulkNotificationPayload {
  userIds: string[];
  channels: NotificationChannel[];
  content: NotificationPayload['content'];
  priority?: NotificationPriority;
  scheduling?: NotificationPayload['scheduling'];
  tracking?: NotificationPayload['tracking'];
}

@Injectable()
export class NotificationEngineService {
  private readonly logger = new Logger(NotificationEngineService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(NotificationEntity)
    private notificationRepository: Repository<NotificationEntity>,
    @InjectQueue('email-notifications')
    private emailQueue: Queue,
    @InjectQueue('sms-notifications')
    private smsQueue: Queue,
    @InjectQueue('push-notifications')
    private pushQueue: Queue,
    @InjectQueue('webhook-notifications')
    private webhookQueue: Queue,
    private eventEmitter: EventEmitter2,
  ) {}

  async sendNotification(payload: NotificationPayload): Promise<string> {
    const deliveryId = await this.createDeliveryRecord(payload);

    try {
      await this.queueNotification(deliveryId, payload);
      
      this.logger.log(`Notification queued: ${deliveryId} for user ${payload.userId} via ${payload.channel}`);
      return deliveryId;
    } catch (error) {
      await this.updateDeliveryStatus(deliveryId, NotificationStatus.FAILED, error.message);
      throw error;
    }
  }

  async sendBulkNotifications(payload: BulkNotificationPayload): Promise<string[]> {
    const deliveryIds: string[] = [];

    for (const userId of payload.userIds) {
      for (const channel of payload.channels) {
        const individualPayload: NotificationPayload = {
          userId,
          channel,
          priority: payload.priority || NotificationPriority.NORMAL,
          content: payload.content,
          scheduling: payload.scheduling,
          tracking: payload.tracking,
        };

        try {
          const deliveryId = await this.sendNotification(individualPayload);
          deliveryIds.push(deliveryId);
        } catch (error) {
          this.logger.error(`Failed to queue notification for user ${userId}: ${error.message}`);
        }
      }
    }

    this.logger.log(`Bulk notifications queued: ${deliveryIds.length} deliveries`);
    return deliveryIds;
  }

  async createNotification(notificationData: Partial<NotificationEntity>): Promise<NotificationEntity> {
    const notification = this.notificationRepository.create(notificationData);
    const saved = await this.notificationRepository.save(notification);

    this.logger.log(`Notification created: ${saved.id}`);
    return saved;
  }

  async scheduleNotification(notificationId: string, scheduledAt?: Date): Promise<void> {
    const notification = await this.notificationRepository.findOne({ where: { id: notificationId } });
    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    // Queue notification execution
    await this.emailQueue.add('execute-notification', 
      { notificationId }, 
      { 
        delay: scheduledAt ? scheduledAt.getTime() - Date.now() : 0,
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );

    this.logger.log(`Notification scheduled: ${notificationId}`);
  }

  async executeNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({ 
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    try {
      // Process notification
      this.logger.log(`Notification executed: ${notificationId}`);
    } catch (error) {
      this.logger.error(`Notification execution failed: ${notificationId} - ${error.message}`);
      throw error;
    }
  }

  async createAutomation(automationData: any): Promise<any> {
    // Simplified automation creation
    this.logger.log(`Automation created for event ${automationData.triggerEvent}`);
    return { id: this.generateId(), ...automationData };
  }

  async triggerAutomation(event: string, data: Record<string, any>): Promise<void> {
    // Simplified automation trigger
    this.logger.log(`Automation triggered for event: ${event}`);
    // In a real implementation, would query automation rules and execute them
  }

  private async executeAutomation(
    automation: any,
    triggerData: Record<string, any>
  ): Promise<void> {
    // Simplified automation execution
    this.logger.log(`Executing automation: ${automation.id}`);
  }

  async processAutomationExecution(executionId: string): Promise<void> {
    // Simplified automation execution processing
    this.logger.log(`Processing automation execution: ${executionId}`);
  }

  private async createDeliveryRecord(payload: NotificationPayload): Promise<string> {
    // For individual notifications, create a simple delivery record
    // In a real implementation, this would be more sophisticated
    const delivery = {
      id: this.generateId(),
      userId: payload.userId,
      channel: payload.channel,
      status: NotificationStatus.PENDING,
      content: payload.content,
      scheduledAt: payload.scheduling?.sendAt || new Date(),
    };

    // Store in temporary map or database
    // For this implementation, we'll return the generated ID
    return delivery.id;
  }

  private async queueNotification(deliveryId: string, payload: NotificationPayload): Promise<void> {
    const jobData = {
      deliveryId,
      payload,
    };

    const delay = payload.scheduling?.sendAt 
      ? Math.max(0, payload.scheduling.sendAt.getTime() - Date.now())
      : 0;

    const priority = this.getPriorityValue(payload.priority);

    switch (payload.channel) {
      case NotificationChannel.EMAIL:
        await this.emailQueue.add('send-email', jobData, { delay, priority });
        break;
      case NotificationChannel.SMS:
        await this.smsQueue.add('send-sms', jobData, { delay, priority });
        break;
      case NotificationChannel.PUSH:
        await this.pushQueue.add('send-push', jobData, { delay, priority });
        break;
      case NotificationChannel.WEBHOOK:
        await this.webhookQueue.add('send-webhook', jobData, { delay, priority });
        break;
      default:
        throw new Error(`Unsupported notification channel: ${payload.channel}`);
    }
  }

  private async updateDeliveryStatus(
    deliveryId: string,
    status: NotificationStatus,
    errorMessage?: string
  ): Promise<void> {
    // Update delivery status in database
    // For this implementation, we'll just log it
    this.logger.log(`Delivery ${deliveryId} status updated to ${status}${errorMessage ? `: ${errorMessage}` : ''}`);
  }

  private async calculateAudience(targetType: string, criteria: any): Promise<User[]> {
    let recipients: User[] = [];

    switch (targetType) {
      case 'all':
        recipients = await this.userRepository.find();
        break;
      case 'specific':
        if (criteria?.userIds?.length) {
          recipients = await this.userRepository.find({
            where: { id: In(criteria.userIds) },
          });
        }
        break;
    }

    return recipients;
  }




  private evaluateAutomationConditions(
    automation: any,
    triggerData: Record<string, any>
  ): boolean {
    // Simplified condition evaluation
    return true;
  }

  private async personalizeContent(
    content: any,
    recipient: User,
    triggerData: Record<string, any>
  ): Promise<any> {
    // Simple template variable replacement
    // In a real implementation, use a proper templating engine
    let personalizedContent = JSON.parse(JSON.stringify(content));

    const variables = {
      'user.firstName': recipient.firstName,
      'user.lastName': recipient.lastName,
      'user.email': recipient.email,
      'user.fullName': `${recipient.firstName} ${recipient.lastName}`,
      ...triggerData,
    };

    const replaceVariables = (text: string): string => {
      return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        return variables[key.trim()] || match;
      });
    };

    if (personalizedContent.subject) {
      personalizedContent.subject = replaceVariables(personalizedContent.subject);
    }
    if (personalizedContent.title) {
      personalizedContent.title = replaceVariables(personalizedContent.title);
    }
    if (personalizedContent.body) {
      personalizedContent.body = replaceVariables(personalizedContent.body);
    }

    return personalizedContent;
  }

  private async applyAudienceFilters(
    recipients: User[],
    filters: any
  ): Promise<User[]> {
    // Apply filters like enrollment status, last login, etc.
    // This would require additional queries and filtering logic
    return recipients;
  }

  private getRecipientAddress(user: User, channel: NotificationChannel): string {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return user.email;
      case NotificationChannel.SMS:
        return user.phone || '';
      case NotificationChannel.PUSH:
        // Would return device token from user preferences
        return '';
      case NotificationChannel.WEBHOOK:
        return ''; // Webhook URL from user settings
      default:
        return '';
    }
  }

  private convertDelayToMilliseconds(amount: number, unit: 'minutes' | 'hours' | 'days'): number {
    switch (unit) {
      case 'minutes':
        return amount * 60 * 1000;
      case 'hours':
        return amount * 60 * 60 * 1000;
      case 'days':
        return amount * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  private getPriorityValue(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 1;
      case NotificationPriority.HIGH:
        return 2;
      case NotificationPriority.NORMAL:
        return 3;
      case NotificationPriority.LOW:
        return 4;
      default:
        return 3;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Event handlers for common LMS events
  async handleUserEnrolled(data: { userId: string; courseId: string }): Promise<void> {
    await this.triggerAutomation('user.enrolled', data);
  }

  async handleCourseCompleted(data: { userId: string; courseId: string; completionDate: Date }): Promise<void> {
    await this.triggerAutomation('course.completed', data);
  }

  async handleAssessmentFailed(data: { userId: string; assessmentId: string; score: number }): Promise<void> {
    await this.triggerAutomation('assessment.failed', data);
  }

  async handleUserInactive(data: { userId: string; daysSinceLastLogin: number }): Promise<void> {
    await this.triggerAutomation('user.inactive', data);
  }

  async handleCertificateEarned(data: { userId: string; certificateId: string; courseId: string }): Promise<void> {
    await this.triggerAutomation('certificate.earned', data);
  }

  async handlePaymentFailed(data: { userId: string; subscriptionId: string; amount: number }): Promise<void> {
    await this.triggerAutomation('payment.failed', data);
  }
}