import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  PushNotification,
  MobileDevice,
  User,
  Organization,
  DevicePlatform,
} from '@edutech-lms/database';
import * as admin from 'firebase-admin';

export interface PushNotificationRequest {
  organizationId: string;
  title: string;
  body: string;
  targeting?: {
    deviceIds?: string[];
    userIds?: string[];
    platforms?: DevicePlatform[];
    segments?: string[];
  };
  data?: {
    action?: string;
    resourceId?: string;
    resourceType?: string;
    deepLink?: string;
    imageUrl?: string;
  };
  scheduling?: {
    sendAt?: Date;
    timezone?: string;
  };
  category?: string;
}

export interface BulkNotificationRequest {
  organizationId: string;
  notifications: Omit<PushNotificationRequest, 'organizationId'>[];
  batchSize?: number;
}

@Injectable()
export class MobilePushService {
  private readonly logger = new Logger(MobilePushService.name);

  constructor(
    @InjectRepository(PushNotification)
    private notificationRepository: Repository<PushNotification>,
    @InjectRepository(MobileDevice)
    private deviceRepository: Repository<MobileDevice>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectQueue('push-notifications')
    private pushQueue: Queue,
  ) {
    this.initializeFirebase();
  }

  async sendNotification(request: PushNotificationRequest): Promise<{
    notifications: PushNotification[];
    targetDevices: number;
  }> {
    try {
      const targetDevices = await this.getTargetDevices(request);
      
      if (targetDevices.length === 0) {
        this.logger.warn(`No target devices found for notification: ${request.title}`);
        return { notifications: [], targetDevices: 0 };
      }

      const notifications: PushNotification[] = [];

      for (const device of targetDevices) {
        const notification = this.notificationRepository.create({
          organizationId: request.organizationId,
          deviceId: device.id,
          title: request.title,
          body: request.body,
          category: request.category,
          data: request.data,
          status: 'pending',
          scheduledAt: request.scheduling?.sendAt || new Date(),
        });

        const savedNotification = await this.notificationRepository.save(notification);
        notifications.push(savedNotification);

        // Queue for immediate or scheduled sending
        await this.pushQueue.add('send-notification', {
          notificationId: savedNotification.id,
          deviceToken: device.deviceToken,
          platform: device.platform,
        }, {
          delay: request.scheduling?.sendAt ? 
            request.scheduling.sendAt.getTime() - Date.now() : 0,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        });
      }

      this.logger.log(`Queued ${notifications.length} push notifications`);
      return { notifications, targetDevices: targetDevices.length };
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
      throw error;
    }
  }

  async sendBulkNotifications(request: BulkNotificationRequest): Promise<{
    totalNotifications: number;
    totalTargetDevices: number;
    batchResults: Array<{
      notifications: number;
      targetDevices: number;
    }>;
  }> {
    const batchSize = request.batchSize || 100;
    const batchResults = [];
    let totalNotifications = 0;
    let totalTargetDevices = 0;

    for (let i = 0; i < request.notifications.length; i += batchSize) {
      const batch = request.notifications.slice(i, i + batchSize);
      
      for (const notificationRequest of batch) {
        const result = await this.sendNotification({
          ...notificationRequest,
          organizationId: request.organizationId,
        });

        totalNotifications += result.notifications.length;
        totalTargetDevices += result.targetDevices;
        batchResults.push({
          notifications: result.notifications.length,
          targetDevices: result.targetDevices,
        });
      }

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < request.notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      totalNotifications,
      totalTargetDevices,
      batchResults,
    };
  }

  async processNotificationSend(
    notificationId: string,
    deviceToken: string,
    platform: DevicePlatform
  ): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    try {
      notification.status = 'sent';
      notification.sentAt = new Date();
      
      let messageId: string;

      switch (platform) {
        case DevicePlatform.IOS:
          messageId = await this.sendToIOS(notification, deviceToken);
          break;
        case DevicePlatform.ANDROID:
          messageId = await this.sendToAndroid(notification, deviceToken);
          break;
        case DevicePlatform.WEB:
          messageId = await this.sendToWeb(notification, deviceToken);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      notification.externalMessageId = messageId;
      await this.notificationRepository.save(notification);

      this.logger.debug(`Push notification sent: ${notificationId} to ${platform}`);
    } catch (error) {
      notification.status = 'failed';
      notification.errorMessage = error.message;
      notification.retryCount++;
      await this.notificationRepository.save(notification);

      this.logger.error(`Failed to send push notification ${notificationId}: ${error.message}`);
      throw error;
    }
  }

  async updateNotificationStatus(
    externalMessageId: string,
    status: 'delivered' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { externalMessageId },
    });

    if (notification) {
      notification.status = status;
      if (status === 'delivered') {
        notification.deliveredAt = new Date();
      } else if (errorMessage) {
        notification.errorMessage = errorMessage;
      }
      await this.notificationRepository.save(notification);
    }
  }

  async getNotificationAnalytics(organizationId: string, period: string = '30d'): Promise<{
    totalSent: number;
    totalDelivered: number;
    deliveryRate: number;
    platformBreakdown: Record<DevicePlatform, number>;
    categoryBreakdown: Record<string, number>;
    failureReasons: Record<string, number>;
    trends: Array<{
      date: string;
      sent: number;
      delivered: number;
      failed: number;
    }>;
  }> {
    const days = parseInt(period.replace('d', ''));
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const notifications = await this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoin('notification.device', 'device')
      .select([
        'notification.status',
        'notification.category',
        'notification.sentAt',
        'notification.errorMessage',
        'device.platform',
      ])
      .where('notification.organizationId = :organizationId', { organizationId })
      .andWhere('notification.createdAt >= :startDate', { startDate })
      .getMany();

    const totalSent = notifications.filter(n => n.status !== 'pending').length;
    const totalDelivered = notifications.filter(n => n.status === 'delivered').length;
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

    // Platform breakdown
    const platformBreakdown = notifications.reduce((acc, notification) => {
      const platform = notification.device?.platform || DevicePlatform.ANDROID;
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {} as Record<DevicePlatform, number>);

    // Category breakdown
    const categoryBreakdown = notifications.reduce((acc, notification) => {
      const category = notification.category || 'general';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Failure reasons
    const failureReasons = notifications
      .filter(n => n.status === 'failed' && n.errorMessage)
      .reduce((acc, notification) => {
        const reason = notification.errorMessage.split(':')[0] || 'Unknown';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Daily trends (simplified)
    const trends = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const dayNotifications = notifications.filter(n => 
        n.sentAt && n.sentAt >= dayStart && n.sentAt <= dayEnd
      );

      trends.push({
        date: dayStart.toISOString().split('T')[0],
        sent: dayNotifications.length,
        delivered: dayNotifications.filter(n => n.status === 'delivered').length,
        failed: dayNotifications.filter(n => n.status === 'failed').length,
      });
    }

    return {
      totalSent,
      totalDelivered,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      platformBreakdown,
      categoryBreakdown,
      failureReasons,
      trends,
    };
  }

  async getUserNotificationPreferences(deviceId: string): Promise<any> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    return device?.notificationPreferences || {
      courses: true,
      announcements: true,
      reminders: true,
      social: true,
      marketing: false,
      quiet_hours: {
        enabled: false,
        start_time: '22:00',
        end_time: '08:00',
        timezone: 'UTC',
      },
    };
  }

  async updateUserNotificationPreferences(
    deviceId: string,
    preferences: any
  ): Promise<void> {
    await this.deviceRepository.update(
      { id: deviceId },
      { notificationPreferences: preferences }
    );

    this.logger.log(`Updated notification preferences for device ${deviceId}`);
  }

  // Private helper methods

  private async getTargetDevices(request: PushNotificationRequest): Promise<MobileDevice[]> {
    let query = this.deviceRepository.createQueryBuilder('device')
      .where('device.organizationId = :organizationId', {
        organizationId: request.organizationId,
      })
      .andWhere('device.isActive = :isActive', { isActive: true })
      .andWhere('device.pushNotificationsEnabled = :enabled', { enabled: true });

    if (request.targeting?.deviceIds) {
      query = query.andWhere('device.id IN (:...deviceIds)', {
        deviceIds: request.targeting.deviceIds,
      });
    }

    if (request.targeting?.userIds) {
      query = query.andWhere('device.userId IN (:...userIds)', {
        userIds: request.targeting.userIds,
      });
    }

    if (request.targeting?.platforms) {
      query = query.andWhere('device.platform IN (:...platforms)', {
        platforms: request.targeting.platforms,
      });
    }

    // Check quiet hours
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    query = query.andWhere(`
      (device.notificationPreferences->>'quiet_hours' IS NULL OR 
       (device.notificationPreferences->'quiet_hours'->>'enabled')::boolean = false OR
       NOT (
         :currentTime BETWEEN 
         device.notificationPreferences->'quiet_hours'->>'start_time' AND 
         device.notificationPreferences->'quiet_hours'->>'end_time'
       ))
    `, { currentTime });

    return query.getMany();
  }

  private initializeFirebase(): void {
    if (!admin.apps.length) {
      // In production, use service account credentials
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      } catch (error) {
        this.logger.warn(`Firebase not initialized: ${error.message}`);
      }
    }
  }

  private async sendToIOS(notification: PushNotification, deviceToken: string): Promise<string> {
    const message = {
      token: deviceToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      apns: {
        payload: {
          aps: {
            category: notification.category,
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    return response;
  }

  private async sendToAndroid(notification: PushNotification, deviceToken: string): Promise<string> {
    const message = {
      token: deviceToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      android: {
        notification: {
          channelId: notification.category || 'default',
          priority: 'high' as const,
        },
      },
    };

    const response = await admin.messaging().send(message);
    return response;
  }

  private async sendToWeb(notification: PushNotification, deviceToken: string): Promise<string> {
    const message = {
      token: deviceToken,
      notification: {
        title: notification.title,
        body: notification.body,
        icon: '/images/notification-icon.png',
      },
      data: notification.data || {},
      webpush: {
        notification: {
          requireInteraction: true,
          actions: notification.data?.action ? [{
            action: notification.data.action,
            title: 'Open',
          }] : undefined,
        },
      },
    };

    const response = await admin.messaging().send(message);
    return response;
  }
}