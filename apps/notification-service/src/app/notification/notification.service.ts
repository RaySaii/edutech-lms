import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    private emailService: EmailService,
  ) {}

  async sendWelcomeEmail(data: { email: string; firstName: string; organizationName: string }) {
    await this.emailQueue.add('welcome', {
      to: data.email,
      subject: `Welcome to ${data.organizationName} - EduTech LMS`,
      template: 'welcome',
      templateData: {
        firstName: data.firstName,
        organizationName: data.organizationName,
        loginUrl: `${process.env.FRONTEND_URL}/login`,
      },
    });

    return {
      success: true,
      message: 'Welcome email queued successfully',
    };
  }

  async sendCourseEnrollmentEmail(data: { email: string; firstName: string; courseName: string; instructorName: string }) {
    await this.emailQueue.add('course-enrollment', {
      to: data.email,
      subject: `You've been enrolled in ${data.courseName}`,
      template: 'course-enrollment',
      templateData: {
        firstName: data.firstName,
        courseName: data.courseName,
        instructorName: data.instructorName,
        courseUrl: `${process.env.FRONTEND_URL}/courses`,
      },
    });

    return {
      success: true,
      message: 'Course enrollment email queued successfully',
    };
  }

  async sendCourseCompletionEmail(data: { email: string; firstName: string; courseName: string }) {
    await this.emailQueue.add('course-completion', {
      to: data.email,
      subject: `Congratulations! You've completed ${data.courseName}`,
      template: 'course-completion',
      templateData: {
        firstName: data.firstName,
        courseName: data.courseName,
        certificateUrl: `${process.env.FRONTEND_URL}/certificates`,
      },
    });

    return {
      success: true,
      message: 'Course completion email queued successfully',
    };
  }

  async sendPasswordResetEmail(data: { email: string; firstName: string; resetToken: string }) {
    await this.emailQueue.add('password-reset', {
      to: data.email,
      subject: 'Reset Your Password - EduTech LMS',
      template: 'password-reset',
      templateData: {
        firstName: data.firstName,
        resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${data.resetToken}`,
        expiresIn: '1 hour',
      },
    });

    return {
      success: true,
      message: 'Password reset email queued successfully',
    };
  }

  async sendCourseReminderEmail(data: { email: string; firstName: string; courseName: string; lastAccessedDays: number }) {
    await this.emailQueue.add('course-reminder', {
      to: data.email,
      subject: `Don't forget about ${data.courseName}`,
      template: 'course-reminder',
      templateData: {
        firstName: data.firstName,
        courseName: data.courseName,
        lastAccessedDays: data.lastAccessedDays,
        courseUrl: `${process.env.FRONTEND_URL}/courses`,
      },
    });

    return {
      success: true,
      message: 'Course reminder email queued successfully',
    };
  }

  async sendBulkEmail(data: { recipients: string[]; subject: string; template: string; templateData: any }) {
    const jobs = data.recipients.map(email => ({
      name: 'bulk-email',
      data: {
        to: email,
        subject: data.subject,
        template: data.template,
        templateData: data.templateData,
      },
    }));

    await this.emailQueue.addBulk(jobs);

    return {
      success: true,
      message: `Bulk email queued for ${data.recipients.length} recipients`,
    };
  }

  async sendSystemNotification(data: { userId: string; title: string; message: string; type: string }) {
    // In a real implementation, you would save this to a notifications table
    // and potentially send push notifications, SMS, etc.
    
    console.log('System Notification:', {
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      timestamp: new Date(),
    });

    return {
      success: true,
      message: 'System notification sent successfully',
    };
  }

  async sendDirectEmail(emailData: any) {
    return this.emailService.sendEmail(emailData);
  }
}