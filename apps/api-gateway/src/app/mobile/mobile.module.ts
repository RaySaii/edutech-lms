import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import {
  MobileDevice,
  OfflineContent,
  MobileSync,
  MobileAppConfig,
  PushNotification,
  MobileAnalytics,
  AppFeedback,
  User,
  Organization,
  Course,
  Content,
  Enrollment,
  ContentProgress,
  Assessment,
  AssessmentAttempt,
} from '@edutech-lms/database';
import { SharedAuthModule } from '@edutech-lms/auth';
import { MobileController } from './mobile.controller';
import { MobileSyncService } from './mobile-sync.service';
import { MobilePushService } from './mobile-push.service';
import { MobileAnalyticsService } from './mobile-analytics.service';
import { MobileConfigService } from './mobile-config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Mobile-specific entities
      MobileDevice,
      OfflineContent,
      MobileSync,
      MobileAppConfig,
      PushNotification,
      MobileAnalytics,
      AppFeedback,
      // Core entities needed for mobile operations
      User,
      Organization,
      Course,
      Content,
      Enrollment,
      ContentProgress,
      Assessment,
      AssessmentAttempt,
    ]),
    BullModule.registerQueue(
      {
        name: 'mobile-sync',
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      },
      {
        name: 'content-download',
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      },
      {
        name: 'push-notifications',
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          removeOnComplete: 200,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      }
    ),
    ScheduleModule.forRoot(),
    SharedAuthModule,
  ],
  controllers: [MobileController],
  providers: [
    MobileSyncService,
    MobilePushService,
    MobileAnalyticsService,
    MobileConfigService,
  ],
  exports: [
    MobileSyncService,
    MobilePushService,
    MobileAnalyticsService,
    MobileConfigService,
  ],
})
export class MobileModule {}