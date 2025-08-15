import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailService } from './email.service';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private emailService: EmailService) {}

  @Process('welcome')
  async handleWelcomeEmail(job: Job) {
    this.logger.log('Processing welcome email job...');
    const result = await this.emailService.sendEmail(job.data);
    this.logger.log(`Welcome email job completed: ${result.success}`);
    return result;
  }

  @Process('course-enrollment')
  async handleCourseEnrollmentEmail(job: Job) {
    this.logger.log('Processing course enrollment email job...');
    const result = await this.emailService.sendEmail(job.data);
    this.logger.log(`Course enrollment email job completed: ${result.success}`);
    return result;
  }

  @Process('course-completion')
  async handleCourseCompletionEmail(job: Job) {
    this.logger.log('Processing course completion email job...');
    const result = await this.emailService.sendEmail(job.data);
    this.logger.log(`Course completion email job completed: ${result.success}`);
    return result;
  }

  @Process('password-reset')
  async handlePasswordResetEmail(job: Job) {
    this.logger.log('Processing password reset email job...');
    const result = await this.emailService.sendEmail(job.data);
    this.logger.log(`Password reset email job completed: ${result.success}`);
    return result;
  }

  @Process('course-reminder')
  async handleCourseReminderEmail(job: Job) {
    this.logger.log('Processing course reminder email job...');
    const result = await this.emailService.sendEmail(job.data);
    this.logger.log(`Course reminder email job completed: ${result.success}`);
    return result;
  }

  @Process('bulk-email')
  async handleBulkEmail(job: Job) {
    this.logger.log('Processing bulk email job...');
    const result = await this.emailService.sendEmail(job.data);
    this.logger.log(`Bulk email job completed: ${result.success}`);
    return result;
  }

  @Process()
  async handleGenericEmail(job: Job) {
    this.logger.log(`Processing generic email job: ${job.name}`);
    const result = await this.emailService.sendEmail(job.data);
    this.logger.log(`Generic email job completed: ${result.success}`);
    return result;
  }
}