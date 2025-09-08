import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '@edutech-lms/auth';
import { Permission } from '@edutech-lms/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

export class CreateNotificationDto {
  title: string;
  message: string;
  type?: string;
  priority?: string;
  category: string;
  metadata?: any;
  scheduledFor?: Date;
}

export class UpdateNotificationPreferenceDto {
  enabled?: boolean;
  frequency?: string;
  customSettings?: any;
}

export class NotificationQueryDto {
  page?: number = 1;
  limit?: number = 20;
  status?: string;
  category?: string;
  type?: string;
  unreadOnly?: boolean;
  startDate?: Date;
  endDate?: Date;
}

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async getNotifications(@Query() query: NotificationQueryDto, @Request() req) {
    return this.notificationClient.send(
      { cmd: 'get_user_notifications' },
      { ...query, userId: req.user.id }
    ).toPromise();
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getUnreadCount(@Request() req) {
    return this.notificationClient.send(
      { cmd: 'get_unread_count' },
      { userId: req.user.id }
    ).toPromise();
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
  async getPreferences(@Request() req) {
    return this.notificationClient.send(
      { cmd: 'get_notification_preferences' },
      { userId: req.user.id }
    ).toPromise();
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(
    @Body() preferences: Array<{
      category: string;
      type: string;
      updates: UpdateNotificationPreferenceDto;
    }>,
    @Request() req,
  ) {
    return this.notificationClient.send(
      { cmd: 'update_notification_preferences' },
      { userId: req.user.id, preferences }
    ).toPromise();
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.notificationClient.send(
      { cmd: 'mark_notification_read' },
      { notificationId: id, userId: req.user.id }
    ).toPromise();
  }

  @Put('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Request() req) {
    return this.notificationClient.send(
      { cmd: 'mark_all_notifications_read' },
      { userId: req.user.id }
    ).toPromise();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  async deleteNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.notificationClient.send(
      { cmd: 'delete_notification' },
      { notificationId: id, userId: req.user.id }
    ).toPromise();
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all notifications' })
  @ApiResponse({ status: 200, description: 'All notifications deleted successfully' })
  async deleteAllNotifications(@Request() req) {
    return this.notificationClient.send(
      { cmd: 'delete_all_notifications' },
      { userId: req.user.id }
    ).toPromise();
  }

  // Admin endpoints
  @Post('broadcast')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.ADMIN_SYSTEM)
  @ApiOperation({ summary: 'Send broadcast notification to all users (Admin only)' })
  @ApiResponse({ status: 201, description: 'Broadcast notification sent successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async broadcastNotification(
    @Body(ValidationPipe) notificationData: CreateNotificationDto,
    @Request() req,
  ) {
    return this.notificationClient.send(
      { cmd: 'broadcast_notification' },
      { ...notificationData, organizationId: req.user.organizationId, createdBy: req.user.id }
    ).toPromise();
  }

  @Post('send-to-users')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.ADMIN_SYSTEM)
  @ApiOperation({ summary: 'Send notification to specific users (Admin only)' })
  @ApiResponse({ status: 201, description: 'Notifications sent successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async sendToUsers(
    @Body() data: { userIds: string[]; notification: CreateNotificationDto },
    @Request() req,
  ) {
    return this.notificationClient.send(
      { cmd: 'send_notification_to_users' },
      { 
        ...data, 
        organizationId: req.user.organizationId, 
        createdBy: req.user.id 
      }
    ).toPromise();
  }

  @Get('templates')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.ADMIN_SYSTEM)
  @ApiOperation({ summary: 'Get notification templates (Admin only)' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates(@Query() query: { category?: string; locale?: string }) {
    return this.notificationClient.send(
      { cmd: 'get_notification_templates' },
      query
    ).toPromise();
  }

  @Post('templates')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.ADMIN_SYSTEM)
  @ApiOperation({ summary: 'Create notification template (Admin only)' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(
    @Body() templateData: any,
    @Request() req,
  ) {
    return this.notificationClient.send(
      { cmd: 'create_notification_template' },
      { ...templateData, createdBy: req.user.id }
    ).toPromise();
  }

  @Put('templates/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.ADMIN_SYSTEM)
  @ApiOperation({ summary: 'Update notification template (Admin only)' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() templateData: any,
    @Request() req,
  ) {
    return this.notificationClient.send(
      { cmd: 'update_notification_template' },
      { id, ...templateData, updatedBy: req.user.id }
    ).toPromise();
  }

  @Get('analytics')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.ADMIN_SYSTEM)
  @ApiOperation({ summary: 'Get notification analytics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(
    @Query() query: { 
      startDate?: Date; 
      endDate?: Date; 
      organizationId?: string;
      category?: string;
      type?: string;
    },
    @Request() req,
  ) {
    return this.notificationClient.send(
      { cmd: 'get_notification_analytics' },
      { ...query, organizationId: req.user.organizationId }
    ).toPromise();
  }

  // Test endpoints for development
  @Post('test')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permission.ADMIN_SYSTEM)
  @ApiOperation({ summary: 'Send test notification (Development only)' })
  async sendTestNotification(
    @Body() testData: { type: string; userId?: string },
    @Request() req,
  ) {
    return this.notificationClient.send(
      { cmd: 'send_test_notification' },
      { ...testData, userId: testData.userId || req.user.id }
    ).toPromise();
  }
}