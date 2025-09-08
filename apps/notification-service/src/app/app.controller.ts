import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { NotificationService } from './notification/notification.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly notificationService: NotificationService
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Post('email/send')
  async sendEmail(@Body() emailData: any) {
    console.log('Received email request:', emailData);
    
    if (emailData.template === 'password-reset') {
      // Extract token from resetUrl
      const resetToken = emailData.templateData.resetUrl.split('token=')[1];
      console.log('Extracted reset token:', resetToken);
      
      return this.notificationService.sendPasswordResetEmail({
        email: emailData.to,
        firstName: emailData.templateData.firstName,
        resetToken: resetToken
      });
    }
    
    // For other email types, use direct email service
    return this.notificationService.sendDirectEmail(emailData);
  }
}
