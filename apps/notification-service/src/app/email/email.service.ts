import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter() {
    const smtpHost = this.configService.get('SMTP_HOST', 'localhost');
    const smtpPort = this.configService.get('SMTP_PORT', 1025);
    const smtpUsername = this.configService.get('SMTP_USERNAME', '');
    const smtpPassword = this.configService.get('SMTP_PASSWORD', '');

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // true for 465, false for other ports
      auth: smtpUsername ? {
        user: smtpUsername,
        pass: smtpPassword,
      } : undefined,
    });
  }

  async sendEmail(emailData: {
    to: string;
    subject: string;
    template?: string;
    templateData?: any;
    html?: string;
    text?: string;
  }) {
    try {
      const { to, subject, template, templateData, html, text } = emailData;
      const fromEmail = this.configService.get('FROM_EMAIL', 'noreply@edutech-lms.com');

      let emailContent = {
        html: html || '',
        text: text || '',
      };

      // If template is provided, generate HTML content
      if (template && templateData) {
        emailContent = this.generateEmailContent(template, templateData);
      }

      const mailOptions = {
        from: fromEmail,
        to,
        subject,
        html: emailContent.html,
        text: emailContent.text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${to}`);
      
      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${emailData.to}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private generateEmailContent(template: string, data: any) {
    const templates = {
      welcome: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to ${data.organizationName}!</h2>
            <p>Hi ${data.firstName},</p>
            <p>Welcome to your learning management system. We're excited to have you on board!</p>
            <p>You can now access your courses and start learning.</p>
            <a href="${data.loginUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">Access Your Courses</a>
            <p>If you have any questions, please don't hesitate to reach out to our support team.</p>
            <p>Happy learning!</p>
            <p>Best regards,<br>The EduTech LMS Team</p>
          </div>
        `,
        text: `Welcome to ${data.organizationName}! Hi ${data.firstName}, Welcome to your learning management system. Access your courses at: ${data.loginUrl}`,
      },
      'course-enrollment': {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Course Enrollment Confirmation</h2>
            <p>Hi ${data.firstName},</p>
            <p>You have been successfully enrolled in <strong>${data.courseName}</strong>!</p>
            <p>Instructor: ${data.instructorName}</p>
            <p>You can now access your course content and start learning.</p>
            <a href="${data.courseUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">Start Learning</a>
            <p>Good luck with your studies!</p>
            <p>Best regards,<br>The EduTech LMS Team</p>
          </div>
        `,
        text: `Hi ${data.firstName}, You have been enrolled in ${data.courseName}. Instructor: ${data.instructorName}. Start learning: ${data.courseUrl}`,
      },
      'course-completion': {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">🎉 Congratulations!</h2>
            <p>Hi ${data.firstName},</p>
            <p>Congratulations! You have successfully completed <strong>${data.courseName}</strong>!</p>
            <p>This is a significant achievement, and we're proud of your dedication and hard work.</p>
            <a href="${data.certificateUrl}" style="background-color: #ffc107; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">View Certificate</a>
            <p>Keep up the great work and continue your learning journey!</p>
            <p>Best regards,<br>The EduTech LMS Team</p>
          </div>
        `,
        text: `Congratulations ${data.firstName}! You completed ${data.courseName}. View your certificate: ${data.certificateUrl}`,
      },
      'password-reset': {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hi ${data.firstName},</p>
            <p>You requested to reset your password. Click the button below to create a new password:</p>
            <a href="${data.resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">Reset Password</a>
            <p>This link will expire in ${data.expiresIn}.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>Best regards,<br>The EduTech LMS Team</p>
          </div>
        `,
        text: `Hi ${data.firstName}, Reset your password: ${data.resetUrl} (expires in ${data.expiresIn})`,
      },
      'course-reminder': {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Continue Your Learning Journey</h2>
            <p>Hi ${data.firstName},</p>
            <p>We noticed you haven't accessed <strong>${data.courseName}</strong> in ${data.lastAccessedDays} days.</p>
            <p>Don't let your progress slip away! Continue where you left off and complete your course.</p>
            <a href="${data.courseUrl}" style="background-color: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">Continue Learning</a>
            <p>We're here to support your learning journey!</p>
            <p>Best regards,<br>The EduTech LMS Team</p>
          </div>
        `,
        text: `Hi ${data.firstName}, Continue your course ${data.courseName}. Last accessed ${data.lastAccessedDays} days ago. Continue: ${data.courseUrl}`,
      },
    };

    return templates[template] || {
      html: `<p>${JSON.stringify(data)}</p>`,
      text: JSON.stringify(data),
    };
  }
}