import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { 
  User, 
  NotificationStatus,
  NotificationPreferenceEntity 
} from '@edutech-lms/database';
import * as nodemailer from 'nodemailer';
import * as AWS from 'aws-sdk';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  category: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  disposition?: 'attachment' | 'inline';
  cid?: string; // For inline images
}

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  template?: {
    id: string;
    variables: Record<string, any>;
  };
  tracking?: {
    opens?: boolean;
    clicks?: boolean;
    unsubscribe?: boolean;
  };
  priority?: 'high' | 'normal' | 'low';
  headers?: Record<string, string>;
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private transporter: nodemailer.Transporter;
  private sesClient: AWS.SES;
  private templates = new Map<string, EmailTemplate>();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(NotificationPreferenceEntity)
    private preferencesRepository: Repository<NotificationPreferenceEntity>,
    private configService: ConfigService,
  ) {
    this.initializeEmailProvider();
    this.loadEmailTemplates();
  }

  private async initializeEmailProvider(): Promise<void> {
    const provider = this.configService.get('EMAIL_PROVIDER', 'smtp');

    switch (provider) {
      case 'ses':
        this.initializeSES();
        break;
      case 'smtp':
      default:
        await this.initializeSMTP();
        break;
    }
  }

  private initializeSES(): void {
    AWS.config.update({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_SES_REGION', 'us-east-1'),
    });

    this.sesClient = new AWS.SES();
    this.logger.log('AWS SES email provider initialized');
  }

  private async initializeSMTP(): Promise<void> {
    const smtpConfig = {
      host: this.configService.get('SMTP_HOST', 'localhost'),
      port: parseInt(this.configService.get('SMTP_PORT', '587')),
      secure: this.configService.get('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    };

    this.transporter = nodemailer.createTransport(smtpConfig);
    
    try {
      await this.transporter.verify();
      this.logger.log('SMTP email provider initialized and verified');
    } catch (error) {
      this.logger.error('SMTP verification failed:', error);
    }
  }

  private loadEmailTemplates(): void {
    // Load email templates from database or file system
    // For now, we'll define some basic templates
    const basicTemplates: EmailTemplate[] = [
      {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to {{organization.name}}!',
        htmlContent: `
          <h1>Welcome, {{user.firstName}}!</h1>
          <p>Thank you for joining {{organization.name}}. We're excited to have you on board!</p>
          <p>You can start learning by visiting your <a href="{{dashboard.url}}">dashboard</a>.</p>
          <p>If you have any questions, feel free to <a href="{{support.url}}">contact our support team</a>.</p>
        `,
        textContent: `
          Welcome, {{user.firstName}}!
          
          Thank you for joining {{organization.name}}. We're excited to have you on board!
          
          You can start learning by visiting your dashboard: {{dashboard.url}}
          
          If you have any questions, feel free to contact our support team: {{support.url}}
        `,
        variables: ['user.firstName', 'organization.name', 'dashboard.url', 'support.url'],
        category: 'onboarding',
      },
      {
        id: 'course_enrollment',
        name: 'Course Enrollment Confirmation',
        subject: 'You\'re enrolled in {{course.title}}!',
        htmlContent: `
          <h1>Enrollment Confirmed!</h1>
          <p>Hi {{user.firstName}},</p>
          <p>You have successfully enrolled in <strong>{{course.title}}</strong>.</p>
          <p>Course details:</p>
          <ul>
            <li>Duration: {{course.duration}} hours</li>
            <li>Difficulty: {{course.difficulty}}</li>
            <li>Start Date: {{enrollment.startDate}}</li>
          </ul>
          <p><a href="{{course.url}}" class="btn">Start Learning</a></p>
        `,
        textContent: `
          Enrollment Confirmed!
          
          Hi {{user.firstName}},
          
          You have successfully enrolled in {{course.title}}.
          
          Course details:
          - Duration: {{course.duration}} hours
          - Difficulty: {{course.difficulty}}
          - Start Date: {{enrollment.startDate}}
          
          Start learning: {{course.url}}
        `,
        variables: ['user.firstName', 'course.title', 'course.duration', 'course.difficulty', 'enrollment.startDate', 'course.url'],
        category: 'enrollment',
      },
      {
        id: 'certificate_earned',
        name: 'Certificate Earned',
        subject: 'Congratulations! You\'ve earned a certificate!',
        htmlContent: `
          <h1>🎉 Congratulations, {{user.firstName}}!</h1>
          <p>You have successfully completed <strong>{{course.title}}</strong> and earned your certificate!</p>
          <p>Your final score: {{completion.score}}%</p>
          <p>Completion date: {{completion.date}}</p>
          <p><a href="{{certificate.url}}" class="btn">Download Certificate</a></p>
          <p>Share your achievement on social media and show the world what you've learned!</p>
        `,
        textContent: `
          🎉 Congratulations, {{user.firstName}}!
          
          You have successfully completed {{course.title}} and earned your certificate!
          
          Your final score: {{completion.score}}%
          Completion date: {{completion.date}}
          
          Download your certificate: {{certificate.url}}
          
          Share your achievement on social media and show the world what you've learned!
        `,
        variables: ['user.firstName', 'course.title', 'completion.score', 'completion.date', 'certificate.url'],
        category: 'achievement',
      },
      {
        id: 'course_reminder',
        name: 'Course Progress Reminder',
        subject: 'Don\'t forget to continue your learning!',
        htmlContent: `
          <h1>Keep up the great work, {{user.firstName}}!</h1>
          <p>We noticed you haven't been active in <strong>{{course.title}}</strong> for a while.</p>
          <p>Your current progress: {{progress.percentage}}% complete</p>
          <p>You're doing great! Just {{progress.remaining}} lessons left to finish the course.</p>
          <p><a href="{{course.url}}" class="btn">Continue Learning</a></p>
          <p>Remember, consistency is key to successful learning. Even 15 minutes a day can make a big difference!</p>
        `,
        textContent: `
          Keep up the great work, {{user.firstName}}!
          
          We noticed you haven't been active in {{course.title}} for a while.
          
          Your current progress: {{progress.percentage}}% complete
          
          You're doing great! Just {{progress.remaining}} lessons left to finish the course.
          
          Continue learning: {{course.url}}
          
          Remember, consistency is key to successful learning. Even 15 minutes a day can make a big difference!
        `,
        variables: ['user.firstName', 'course.title', 'progress.percentage', 'progress.remaining', 'course.url'],
        category: 'reminder',
      },
      {
        id: 'assessment_failed',
        name: 'Assessment Retry Encouragement',
        subject: 'Don\'t give up! Retry your assessment',
        htmlContent: `
          <h1>Don't worry, {{user.firstName}}!</h1>
          <p>We know that <strong>{{assessment.title}}</strong> was challenging, but don't let this discourage you.</p>
          <p>Your score: {{attempt.score}}% (Pass mark: {{assessment.passScore}}%)</p>
          <p>Here are some tips for your next attempt:</p>
          <ul>
            <li>Review the course materials, especially {{suggestions.topics}}</li>
            <li>Take practice quizzes to reinforce your knowledge</li>
            <li>Consider reaching out to your instructor for guidance</li>
          </ul>
          <p><a href="{{course.url}}" class="btn">Review Course Content</a></p>
          <p>You've got this! We believe in you.</p>
        `,
        textContent: `
          Don't worry, {{user.firstName}}!
          
          We know that {{assessment.title}} was challenging, but don't let this discourage you.
          
          Your score: {{attempt.score}}% (Pass mark: {{assessment.passScore}}%)
          
          Here are some tips for your next attempt:
          - Review the course materials, especially {{suggestions.topics}}
          - Take practice quizzes to reinforce your knowledge  
          - Consider reaching out to your instructor for guidance
          
          Review course content: {{course.url}}
          
          You've got this! We believe in you.
        `,
        variables: ['user.firstName', 'assessment.title', 'attempt.score', 'assessment.passScore', 'suggestions.topics', 'course.url'],
        category: 'encouragement',
      },
    ];

    basicTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });

    this.logger.log(`Loaded ${this.templates.size} email templates`);
  }

  async sendEmail(options: EmailOptions): Promise<string> {
    try {
      // Check user email preferences
      if (typeof options.to === 'string') {
        const canSend = await this.checkEmailPreferences(options.to);
        if (!canSend) {
          throw new Error('User has opted out of email notifications');
        }
      }

      // Process template if specified
      if (options.template) {
        const processedContent = await this.processTemplate(options.template.id, options.template.variables);
        options.subject = processedContent.subject;
        options.html = processedContent.html;
        options.text = processedContent.text;
      }

      // Add tracking pixels and links if enabled
      if (options.tracking) {
        options = await this.addEmailTracking(options);
      }

      let messageId: string;

      // Send via configured provider
      if (this.sesClient) {
        messageId = await this.sendViaSES(options);
      } else if (this.transporter) {
        messageId = await this.sendViaSMTP(options);
      } else {
        throw new Error('No email provider configured');
      }

      this.logger.log(`Email sent successfully: ${messageId}`);
      return messageId;
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendBulkEmail(emailOptions: EmailOptions[]): Promise<string[]> {
    const messageIds: string[] = [];
    
    for (const options of emailOptions) {
      try {
        const messageId = await this.sendEmail(options);
        messageIds.push(messageId);
        this.logger.log(`Bulk email sent: ${messageId}`);
      } catch (error) {
        this.logger.error(`Failed to send bulk email: ${error.message}`);
      }
    }
    
    return messageIds;
  }

  private async sendViaSES(options: EmailOptions): Promise<string> {
    const params: AWS.SES.SendEmailRequest = {
      Source: this.configService.get('EMAIL_FROM_ADDRESS'),
      Destination: {
        ToAddresses: Array.isArray(options.to) ? options.to : [options.to],
        CcAddresses: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
        BccAddresses: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: options.html ? {
            Data: options.html,
            Charset: 'UTF-8',
          } : undefined,
          Text: options.text ? {
            Data: options.text,
            Charset: 'UTF-8',
          } : undefined,
        },
      },
      ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
    };

    const result = await this.sesClient.sendEmail(params).promise();
    return result.MessageId || '';
  }

  private async sendViaSMTP(options: EmailOptions): Promise<string> {
    const mailOptions = {
      from: this.configService.get('EMAIL_FROM_ADDRESS'),
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      attachments: options.attachments,
      priority: options.priority,
      headers: options.headers,
    };

    const result = await this.transporter.sendMail(mailOptions);
    return result.messageId;
  }

  private async processTemplate(templateId: string, variables: Record<string, any>): Promise<{
    subject: string;
    html: string;
    text: string;
  }> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Email template not found: ${templateId}`);
    }

    const replaceVariables = (content: string): string => {
      return content.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const value = this.getNestedValue(variables, key.trim());
        return value !== undefined ? String(value) : match;
      });
    };

    return {
      subject: replaceVariables(template.subject),
      html: replaceVariables(template.htmlContent),
      text: replaceVariables(template.textContent),
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  private async addEmailTracking(options: EmailOptions): Promise<EmailOptions> {
    if (!options.tracking) return options;

    const trackingId = this.generateTrackingId();
    
    // Add tracking pixel for opens
    if (options.tracking.opens && options.html) {
      const trackingPixel = `<img src="${this.getTrackingPixelUrl(trackingId)}" width="1" height="1" alt="" style="display:block" />`;
      options.html += trackingPixel;
    }

    // Transform links for click tracking
    if (options.tracking.clicks && options.html) {
      options.html = this.addClickTracking(options.html, trackingId);
    }

    // Add unsubscribe link
    if (options.tracking.unsubscribe && options.html) {
      const unsubscribeLink = `<p style="font-size: 12px; color: #666;">
        <a href="${this.getUnsubscribeUrl(trackingId)}">Unsubscribe</a> from these emails
      </p>`;
      options.html += unsubscribeLink;
    }

    return options;
  }

  private generateTrackingId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private getTrackingPixelUrl(trackingId: string): string {
    const baseUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    return `${baseUrl}/api/email/track/open/${trackingId}`;
  }

  private getUnsubscribeUrl(trackingId: string): string {
    const baseUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    return `${baseUrl}/api/email/unsubscribe/${trackingId}`;
  }

  private addClickTracking(html: string, trackingId: string): string {
    const baseUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    
    return html.replace(/href="([^"]+)"/g, (match, url) => {
      if (url.startsWith('http')) {
        const trackingUrl = `${baseUrl}/api/email/track/click/${trackingId}?url=${encodeURIComponent(url)}`;
        return `href="${trackingUrl}"`;
      }
      return match;
    });
  }

  private async checkEmailPreferences(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) return false;

    const preferences = await this.preferencesRepository.findOne({
      where: { userId: user.id },
    });

    if (!preferences) return true; // Default to allow if no preferences set

    return preferences.enabled;
  }

  async handleEmailBounce(messageId: string, bounceType: string, reason: string): Promise<void> {
    this.logger.warn(`Email bounced: ${messageId} - ${bounceType}: ${reason}`);
    // In a real implementation, would update delivery status
  }

  async handleEmailComplaint(messageId: string): Promise<void> {
    this.logger.warn(`Email complaint received for message: ${messageId}`);
    // In a real implementation, would disable emails for the user
  }

  private async disableEmailForUser(userId: string): Promise<void> {
    let preferences = await this.preferencesRepository.findOne({ where: { userId } });
    
    if (!preferences) {
      // For simplification, just log the action
      this.logger.log(`Would create preference to disable emails for user: ${userId}`);
    } else {
      preferences.enabled = false;
      await this.preferencesRepository.save(preferences);
    }

    this.logger.log(`Email disabled for user: ${userId}`);
  }

  async trackEmailOpen(trackingId: string): Promise<void> {
    // In a real implementation, update delivery status and statistics
    this.logger.log(`Email opened: ${trackingId}`);
  }

  async trackEmailClick(trackingId: string, url: string): Promise<void> {
    // In a real implementation, update delivery status and statistics
    this.logger.log(`Email link clicked: ${trackingId} - ${url}`);
  }

  async processUnsubscribe(trackingId: string): Promise<void> {
    // In a real implementation, find delivery and disable emails for user
    this.logger.log(`Unsubscribe request: ${trackingId}`);
  }

  getEmailTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  async createEmailTemplate(template: Omit<EmailTemplate, 'id'>): Promise<EmailTemplate> {
    const newTemplate: EmailTemplate = {
      id: this.generateTemplateId(),
      ...template,
    };

    this.templates.set(newTemplate.id, newTemplate);
    
    // In a real implementation, save to database
    this.logger.log(`Email template created: ${newTemplate.id}`);
    return newTemplate;
  }

  private generateTemplateId(): string {
    return 'tpl_' + Math.random().toString(36).substring(2, 15);
  }
}