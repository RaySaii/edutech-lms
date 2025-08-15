import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationController } from './notification/notification.controller';
import { NotificationService } from './notification/notification.service';
import { EmailService } from './email/email.service';
import { EmailProcessor } from './email/email.processor';
import { configuration } from '@edutech-lms/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || '',
      },
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  controllers: [AppController, NotificationController],
  providers: [AppService, NotificationService, EmailService, EmailProcessor],
})
export class AppModule {}
