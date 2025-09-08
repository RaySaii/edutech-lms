import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsData {
  to: string;
  message: string;
  template?: string;
  templateData?: any;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private configService: ConfigService) {}

  async sendSms(smsData: SmsData) {
    try {
      const { to, message, template, templateData } = smsData;

      let smsContent = message;
      if (template && templateData) {
        smsContent = this.generateSmsContent(template, templateData);
      }

      // In development, log SMS instead of sending
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.log(`SMS would be sent to ${to}: ${smsContent}`);
        return {
          success: true,
          messageId: `dev-${Date.now()}`,
          provider: 'development',
        };
      }

      // TODO: Implement actual SMS providers (Twilio, AWS SNS, etc.)
      // For now, simulate SMS sending
      const provider = this.configService.get('SMS_PROVIDER', 'simulation');
      
      switch (provider) {
        case 'twilio':
          return this.sendWithTwilio(to, smsContent);
        case 'aws-sns':
          return this.sendWithAWSSNS(to, smsContent);
        default:
          return this.simulateSms(to, smsContent);
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${smsData.to}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private generateSmsContent(template: string, data: any): string {
    const templates = {
      welcome: `Welcome to ${data.organizationName}, ${data.firstName}! Access your courses at ${data.loginUrl}`,
      'course-enrollment': `Hi ${data.firstName}, you're enrolled in "${data.courseName}" by ${data.instructorName}. Start learning!`,
      'course-completion': `Congratulations ${data.firstName}! You completed "${data.courseName}". Get your certificate at ${data.certificateUrl}`,
      'password-reset': `Hi ${data.firstName}, reset your password: ${data.resetUrl} (expires in ${data.expiresIn})`,
      'course-reminder': `Hi ${data.firstName}, continue "${data.courseName}". Last accessed ${data.lastAccessedDays} days ago.`,
      'assignment-due': `Hi ${data.firstName}, assignment "${data.assignmentName}" is due ${data.dueDate}. Submit at ${data.submitUrl}`,
      'payment-reminder': `Hi ${data.firstName}, payment for "${data.courseName}" is due. Pay at ${data.paymentUrl}`,
    };

    return templates[template] || data.message || 'Notification from EduTech LMS';
  }

  private async sendWithTwilio(to: string, message: string) {
    // TODO: Implement Twilio SMS
    this.logger.log(`Twilio SMS to ${to}: ${message}`);
    return {
      success: true,
      messageId: `twilio-${Date.now()}`,
      provider: 'twilio',
    };
  }

  private async sendWithAWSSNS(to: string, message: string) {
    // TODO: Implement AWS SNS SMS
    this.logger.log(`AWS SNS SMS to ${to}: ${message}`);
    return {
      success: true,
      messageId: `aws-sns-${Date.now()}`,
      provider: 'aws-sns',
    };
  }

  private async simulateSms(to: string, message: string) {
    this.logger.log(`Simulated SMS to ${to}: ${message}`);
    return {
      success: true,
      messageId: `sim-${Date.now()}`,
      provider: 'simulation',
    };
  }
}