import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @MessagePattern({ cmd: 'send_welcome_email' })
  async sendWelcomeEmail(@Payload() data: { email: string; firstName: string; organizationName: string }) {
    return this.notificationService.sendWelcomeEmail(data);
  }

  @MessagePattern({ cmd: 'send_course_enrollment_email' })
  async sendCourseEnrollmentEmail(@Payload() data: { email: string; firstName: string; courseName: string; instructorName: string }) {
    return this.notificationService.sendCourseEnrollmentEmail(data);
  }

  @MessagePattern({ cmd: 'send_course_completion_email' })
  async sendCourseCompletionEmail(@Payload() data: { email: string; firstName: string; courseName: string }) {
    return this.notificationService.sendCourseCompletionEmail(data);
  }

  @MessagePattern({ cmd: 'send_password_reset_email' })
  async sendPasswordResetEmail(@Payload() data: { email: string; firstName: string; resetToken: string }) {
    return this.notificationService.sendPasswordResetEmail(data);
  }

  @MessagePattern({ cmd: 'send_course_reminder_email' })
  async sendCourseReminderEmail(@Payload() data: { email: string; firstName: string; courseName: string; lastAccessedDays: number }) {
    return this.notificationService.sendCourseReminderEmail(data);
  }

  @MessagePattern({ cmd: 'send_bulk_email' })
  async sendBulkEmail(@Payload() data: { recipients: string[]; subject: string; template: string; templateData: any }) {
    return this.notificationService.sendBulkEmail(data);
  }

  @MessagePattern({ cmd: 'send_system_notification' })
  async sendSystemNotification(@Payload() data: { userId: string; title: string; message: string; type: string }) {
    return this.notificationService.sendSystemNotification(data);
  }
}