import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationTemplateService } from './notification-template.service';
import { EmailService } from '../email/email.service';
import { EmailProcessor } from '../email/email.processor';
import { PushNotificationService } from '../push/push-notification.service';
import { SmsService } from '../sms/sms.service';
import {
  NotificationEntity,
  NotificationPreferenceEntity,
  NotificationTemplateEntity,
} from '@edutech-lms/database';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      NotificationPreferenceEntity,
      NotificationTemplateEntity,
    ]),
    BullModule.registerQueue({
      name: 'email',
    }),
    BullModule.registerQueue({
      name: 'push',
    }),
    BullModule.registerQueue({
      name: 'sms',
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationPreferenceService,
    NotificationTemplateService,
    EmailService,
    EmailProcessor,
    PushNotificationService,
    SmsService,
  ],
  exports: [
    NotificationService,
    NotificationPreferenceService,
    NotificationTemplateService,
  ],
})
export class NotificationModule {}