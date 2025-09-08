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
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@edutech-lms/auth';
import { CurrentUser } from '@edutech-lms/auth';
import { DevicePlatform } from '@edutech-lms/database';
import {
  MobileSyncService,
  SyncRequest,
  SyncResponse,
  OfflineDownloadRequest,
} from './mobile-sync.service';
import {
  MobilePushService,
  PushNotificationRequest,
  BulkNotificationRequest,
} from './mobile-push.service';
import {
  MobileAnalyticsService,
  MobileEventData,
} from './mobile-analytics.service';
import {
  MobileConfigService,
  AppConfigRequest,
  ClientConfigResponse,
} from './mobile-config.service';

@ApiTags('mobile')
@Controller('mobile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MobileController {
  constructor(
    private syncService: MobileSyncService,
    private pushService: MobilePushService,
    private analyticsService: MobileAnalyticsService,
    private configService: MobileConfigService,
  ) {}

  // Device Management Endpoints

  @Post('devices/register')
  @ApiOperation({ summary: 'Register a mobile device' })
  @ApiResponse({ status: 201, description: 'Device registered successfully' })
  async registerDevice(
    @CurrentUser() user: any,
    @Body() deviceData: {
      deviceToken: string;
      platform: DevicePlatform;
      deviceId: string;
      deviceName?: string;
      model?: string;
      osVersion?: string;
      appVersion?: string;
    }
  ) {
    const device = await this.syncService.registerDevice(
      user.id,
      user.organizationId,
      deviceData
    );

    return {
      success: true,
      data: device,
    };
  }

  @Get('devices/:deviceId')
  @ApiOperation({ summary: 'Get device information' })
  @ApiResponse({ status: 200, description: 'Device information retrieved' })
  async getDeviceInfo(@Param('deviceId') deviceId: string) {
    const device = await this.syncService.getDeviceInfo(deviceId);

    return {
      success: true,
      data: device,
    };
  }

  @Put('devices/:deviceId/settings')
  @ApiOperation({ summary: 'Update device settings' })
  @ApiResponse({ status: 200, description: 'Device settings updated' })
  async updateDeviceSettings(
    @Param('deviceId') deviceId: string,
    @Body() settings: any
  ) {
    const device = await this.syncService.updateDeviceSettings(deviceId, settings);

    return {
      success: true,
      data: device,
    };
  }

  // Synchronization Endpoints

  @Post('sync/initiate')
  @ApiOperation({ summary: 'Initiate data synchronization' })
  @ApiResponse({ status: 200, description: 'Sync initiated successfully' })
  async initiateSync(@Body() syncRequest: SyncRequest): Promise<{
    success: boolean;
    data: SyncResponse;
  }> {
    const response = await this.syncService.initiateSync(syncRequest);

    return {
      success: true,
      data: response,
    };
  }

  @Get('sync/:syncId/status')
  @ApiOperation({ summary: 'Get synchronization status' })
  @ApiResponse({ status: 200, description: 'Sync status retrieved' })
  async getSyncStatus(@Param('syncId') syncId: string) {
    const sync = await this.syncService.getSyncStatus(syncId);

    return {
      success: true,
      data: sync,
    };
  }

  // Offline Content Endpoints

  @Post('offline/download')
  @ApiOperation({ summary: 'Queue content for offline download' })
  @ApiResponse({ status: 200, description: 'Download queued successfully' })
  async downloadContentForOffline(@Body() request: OfflineDownloadRequest) {
    const result = await this.syncService.downloadContentForOffline(request);

    return {
      success: true,
      data: result,
    };
  }

  @Get('offline/content/:deviceId/:contentId')
  @ApiOperation({ summary: 'Get offline content access URL' })
  @ApiResponse({ status: 200, description: 'Offline content URL generated' })
  async getOfflineContent(
    @Param('deviceId') deviceId: string,
    @Param('contentId') contentId: string
  ) {
    const result = await this.syncService.getOfflineContent(deviceId, contentId);

    return {
      success: true,
      data: result,
    };
  }

  // Push Notification Endpoints

  @Post('notifications/send')
  @ApiOperation({ summary: 'Send push notification' })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  async sendNotification(
    @CurrentUser() user: any,
    @Body() request: Omit<PushNotificationRequest, 'organizationId'>
  ) {
    const result = await this.pushService.sendNotification({
      ...request,
      organizationId: user.organizationId,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Post('notifications/send-bulk')
  @ApiOperation({ summary: 'Send bulk push notifications' })
  @ApiResponse({ status: 200, description: 'Bulk notifications sent successfully' })
  async sendBulkNotifications(
    @CurrentUser() user: any,
    @Body() request: Omit<BulkNotificationRequest, 'organizationId'>
  ) {
    const result = await this.pushService.sendBulkNotifications({
      ...request,
      organizationId: user.organizationId,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Get('notifications/analytics')
  @ApiOperation({ summary: 'Get notification analytics' })
  @ApiResponse({ status: 200, description: 'Notification analytics retrieved' })
  async getNotificationAnalytics(
    @CurrentUser() user: any,
    @Query('period') period: string = '30d'
  ) {
    const analytics = await this.pushService.getNotificationAnalytics(
      user.organizationId,
      period
    );

    return {
      success: true,
      data: analytics,
    };
  }

  @Get('notifications/preferences/:deviceId')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved' })
  async getNotificationPreferences(@Param('deviceId') deviceId: string) {
    const preferences = await this.pushService.getUserNotificationPreferences(deviceId);

    return {
      success: true,
      data: preferences,
    };
  }

  @Put('notifications/preferences/:deviceId')
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updateNotificationPreferences(
    @Param('deviceId') deviceId: string,
    @Body() preferences: any
  ) {
    await this.pushService.updateUserNotificationPreferences(deviceId, preferences);

    return {
      success: true,
      message: 'Preferences updated successfully',
    };
  }

  // Analytics Endpoints

  @Post('analytics/track')
  @ApiOperation({ summary: 'Track mobile analytics event' })
  @ApiResponse({ status: 201, description: 'Event tracked successfully' })
  @HttpCode(HttpStatus.CREATED)
  async trackEvent(@Body() eventData: MobileEventData) {
    await this.analyticsService.trackEvent(eventData);

    return {
      success: true,
      message: 'Event tracked successfully',
    };
  }

  @Post('analytics/track-batch')
  @ApiOperation({ summary: 'Track multiple analytics events' })
  @ApiResponse({ status: 201, description: 'Events tracked successfully' })
  @HttpCode(HttpStatus.CREATED)
  async trackBatchEvents(@Body() events: MobileEventData[]) {
    await this.analyticsService.batchTrackEvents(events);

    return {
      success: true,
      message: `${events.length} events tracked successfully`,
    };
  }

  @Get('analytics/report')
  @ApiOperation({ summary: 'Generate mobile analytics report' })
  @ApiResponse({ status: 200, description: 'Analytics report generated' })
  async getAnalyticsReport(
    @CurrentUser() user: any,
    @Query('period') period: string = '30d'
  ) {
    const report = await this.analyticsService.generateAnalyticsReport(
      user.organizationId,
      period
    );

    return {
      success: true,
      data: report,
    };
  }

  @Get('analytics/user-journey/:userId')
  @ApiOperation({ summary: 'Analyze user journey' })
  @ApiResponse({ status: 200, description: 'User journey analysis completed' })
  async analyzeUserJourney(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Query('period') period: string = '30d'
  ) {
    const analysis = await this.analyticsService.analyzeUserJourney(
      user.organizationId,
      userId,
      period
    );

    return {
      success: true,
      data: analysis,
    };
  }

  @Get('analytics/device-performance/:deviceId')
  @ApiOperation({ summary: 'Get device performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved' })
  async getDevicePerformanceMetrics(@Param('deviceId') deviceId: string) {
    const metrics = await this.analyticsService.getDevicePerformanceMetrics(deviceId);

    return {
      success: true,
      data: metrics,
    };
  }

  // Configuration Endpoints

  @Get('config')
  @ApiOperation({ summary: 'Get mobile app configuration for client' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
  async getClientConfig(
    @CurrentUser() user: any,
    @Query('platform') platform: DevicePlatform,
    @Query('version') currentVersion: string
  ): Promise<{
    success: boolean;
    data: ClientConfigResponse;
  }> {
    const config = await this.configService.getClientConfig(
      user.organizationId,
      platform,
      currentVersion
    );

    return {
      success: true,
      data: config,
    };
  }

  @Post('config')
  @ApiOperation({ summary: 'Create or update mobile app configuration' })
  @ApiResponse({ status: 201, description: 'Configuration created/updated' })
  async createOrUpdateConfig(
    @CurrentUser() user: any,
    @Body() configData: Omit<AppConfigRequest, 'organizationId'>
  ) {
    const config = await this.configService.createOrUpdateConfig({
      ...configData,
      organizationId: user.organizationId,
    });

    return {
      success: true,
      data: config,
    };
  }

  @Get('config/all')
  @ApiOperation({ summary: 'Get all configurations for organization' })
  @ApiResponse({ status: 200, description: 'Configurations retrieved' })
  async getAllConfigs(@CurrentUser() user: any) {
    const configs = await this.configService.getAllConfigs(user.organizationId);

    return {
      success: true,
      data: configs,
    };
  }

  @Get('config/:configId')
  @ApiOperation({ summary: 'Get configuration by ID' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
  async getConfigById(@Param('configId') configId: string) {
    const config = await this.configService.getConfigById(configId);

    return {
      success: true,
      data: config,
    };
  }

  @Post('config/validate')
  @ApiOperation({ summary: 'Validate mobile app configuration' })
  @ApiResponse({ status: 200, description: 'Configuration validated' })
  async validateConfig(@Body() config: any) {
    const validation = await this.configService.validateConfig(config);

    return {
      success: true,
      data: validation,
    };
  }

  @Get('config/diff/:platform')
  @ApiOperation({ summary: 'Compare two configuration versions' })
  @ApiResponse({ status: 200, description: 'Configuration diff generated' })
  async getConfigDiff(
    @CurrentUser() user: any,
    @Param('platform') platform: DevicePlatform,
    @Query('version1') version1: string,
    @Query('version2') version2: string
  ) {
    const diff = await this.configService.getConfigDiff(
      user.organizationId,
      platform,
      version1,
      version2
    );

    return {
      success: true,
      data: diff,
    };
  }

  @Post('config/:configId/clone')
  @ApiOperation({ summary: 'Clone configuration to another platform' })
  @ApiResponse({ status: 201, description: 'Configuration cloned' })
  async cloneConfig(
    @Param('configId') configId: string,
    @Body() cloneData: {
      targetPlatform: DevicePlatform;
      newVersion: string;
    }
  ) {
    const clonedConfig = await this.configService.cloneConfig(
      configId,
      cloneData.targetPlatform,
      cloneData.newVersion
    );

    return {
      success: true,
      data: clonedConfig,
    };
  }

  @Put('config/:configId/deactivate')
  @ApiOperation({ summary: 'Deactivate configuration' })
  @ApiResponse({ status: 200, description: 'Configuration deactivated' })
  async deactivateConfig(@Param('configId') configId: string) {
    await this.configService.deactivateConfig(configId);

    return {
      success: true,
      message: 'Configuration deactivated successfully',
    };
  }

  @Delete('config/:configId')
  @ApiOperation({ summary: 'Delete configuration' })
  @ApiResponse({ status: 200, description: 'Configuration deleted' })
  async deleteConfig(@Param('configId') configId: string) {
    await this.configService.deleteConfig(configId);

    return {
      success: true,
      message: 'Configuration deleted successfully',
    };
  }

  // Utility Endpoints

  @Post('cleanup/expired-content')
  @ApiOperation({ summary: 'Cleanup expired offline content' })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  async cleanupExpiredContent() {
    const cleanedCount = await this.syncService.cleanupExpiredContent();

    return {
      success: true,
      data: {
        cleanedCount,
        message: `Cleaned up ${cleanedCount} expired content items`,
      },
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Mobile service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          sync: 'operational',
          push: 'operational',
          analytics: 'operational',
          config: 'operational',
        },
      },
    };
  }
}