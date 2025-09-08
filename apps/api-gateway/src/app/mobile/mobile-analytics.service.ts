import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  MobileAnalytics,
  MobileDevice,
  User,
  Organization,
  DevicePlatform,
} from '@edutech-lms/database';

export interface MobileEventData {
  deviceId: string;
  eventType: string;
  properties: {
    screen?: string;
    contentId?: string;
    courseId?: string;
    duration?: number;
    networkType?: string;
    batteryLevel?: number;
    deviceStorage?: number;
    appVersion?: string;
    [key: string]: any;
  };
  sessionId?: string;
  timestamp?: Date;
}

export interface MobileAnalyticsReport {
  overview: {
    totalEvents: number;
    activeDevices: number;
    uniqueUsers: number;
    averageSessionDuration: number;
    topEvents: Array<{ eventType: string; count: number }>;
  };
  platforms: Record<DevicePlatform, {
    devices: number;
    events: number;
    crashes: number;
    averageSessionDuration: number;
  }>;
  performance: {
    averageLoadTime: number;
    averageResponseTime: number;
    errorRate: number;
    crashRate: number;
  };
  usage: {
    dailyActiveUsers: Array<{ date: string; count: number }>;
    screenViews: Array<{ screen: string; views: number; avgDuration: number }>;
    featureUsage: Array<{ feature: string; usage: number }>;
  };
  retention: {
    day1: number;
    day7: number;
    day30: number;
  };
  demographics: {
    appVersions: Record<string, number>;
    osVersions: Record<string, number>;
    countries: Record<string, number>;
    deviceModels: Record<string, number>;
  };
}

export interface UserJourneyAnalysis {
  userId: string;
  sessionCount: number;
  totalDuration: number;
  averageSessionDuration: number;
  mostUsedFeatures: string[];
  learningPath: Array<{
    screen: string;
    timestamp: Date;
    duration: number;
  }>;
  completionFunnels: Record<string, {
    started: number;
    completed: number;
    conversionRate: number;
  }>;
  churnRisk: number;
}

@Injectable()
export class MobileAnalyticsService {
  private readonly logger = new Logger(MobileAnalyticsService.name);

  constructor(
    @InjectRepository(MobileAnalytics)
    private analyticsRepository: Repository<MobileAnalytics>,
    @InjectRepository(MobileDevice)
    private deviceRepository: Repository<MobileDevice>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  async trackEvent(eventData: MobileEventData): Promise<void> {
    try {
      const event = this.analyticsRepository.create({
        deviceId: eventData.deviceId,
        eventType: eventData.eventType,
        properties: eventData.properties,
        sessionId: eventData.sessionId,
        timestamp: eventData.timestamp || new Date(),
      });

      await this.analyticsRepository.save(event);

      // Process real-time analytics
      await this.processRealTimeAnalytics(event);

      this.logger.debug(`Mobile event tracked: ${eventData.eventType} for device ${eventData.deviceId}`);
    } catch (error) {
      this.logger.error(`Failed to track mobile event: ${error.message}`);
      throw error;
    }
  }

  async batchTrackEvents(events: MobileEventData[]): Promise<void> {
    try {
      const analyticsEvents = events.map(eventData => 
        this.analyticsRepository.create({
          deviceId: eventData.deviceId,
          eventType: eventData.eventType,
          properties: eventData.properties,
          sessionId: eventData.sessionId,
          timestamp: eventData.timestamp || new Date(),
        })
      );

      await this.analyticsRepository.save(analyticsEvents);

      this.logger.log(`Batch tracked ${events.length} mobile events`);
    } catch (error) {
      this.logger.error(`Failed to batch track mobile events: ${error.message}`);
      throw error;
    }
  }

  async generateAnalyticsReport(
    organizationId: string,
    period: string = '30d'
  ): Promise<MobileAnalyticsReport> {
    try {
      const days = parseInt(period.replace('d', ''));
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get organization's devices and events
      const devices = await this.deviceRepository.find({
        where: { organizationId },
        relations: ['user'],
      });

      const deviceIds = devices.map(d => d.id);

      const events = await this.analyticsRepository.find({
        where: {
          deviceId: { $in: deviceIds } as any,
          createdAt: MoreThan(startDate),
        },
        relations: ['device'],
        order: { createdAt: 'DESC' },
      });

      // Generate overview
      const overview = await this.generateOverview(events, devices);

      // Generate platform analytics
      const platforms = await this.generatePlatformAnalytics(events, devices);

      // Generate performance metrics
      const performance = await this.generatePerformanceMetrics(events);

      // Generate usage analytics
      const usage = await this.generateUsageAnalytics(events, days);

      // Generate retention metrics
      const retention = await this.generateRetentionMetrics(organizationId, devices);

      // Generate demographics
      const demographics = await this.generateDemographics(devices, events);

      return {
        overview,
        platforms,
        performance,
        usage,
        retention,
        demographics,
      };
    } catch (error) {
      this.logger.error(`Failed to generate analytics report: ${error.message}`);
      throw error;
    }
  }

  async analyzeUserJourney(
    organizationId: string,
    userId: string,
    period: string = '30d'
  ): Promise<UserJourneyAnalysis> {
    try {
      const days = parseInt(period.replace('d', ''));
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const userDevices = await this.deviceRepository.find({
        where: { organizationId, userId },
      });

      const deviceIds = userDevices.map(d => d.id);

      const events = await this.analyticsRepository.find({
        where: {
          deviceId: { $in: deviceIds } as any,
          createdAt: MoreThan(startDate),
        },
        order: { timestamp: 'ASC' },
      });

      // Analyze sessions
      const sessions = this.groupEventsBySession(events);
      const sessionCount = sessions.length;
      const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
      const averageSessionDuration = sessionCount > 0 ? totalDuration / sessionCount : 0;

      // Find most used features
      const featureUsage = events.reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostUsedFeatures = Object.entries(featureUsage)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([feature]) => feature);

      // Generate learning path
      const learningPath = events
        .filter(event => event.properties.screen)
        .map(event => ({
          screen: event.properties.screen,
          timestamp: event.timestamp || event.createdAt,
          duration: event.properties.duration || 0,
        }));

      // Analyze completion funnels
      const completionFunnels = this.analyzeCompletionFunnels(events);

      // Calculate churn risk
      const churnRisk = this.calculateChurnRisk(events, sessions);

      return {
        userId,
        sessionCount,
        totalDuration,
        averageSessionDuration,
        mostUsedFeatures,
        learningPath,
        completionFunnels,
        churnRisk,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze user journey: ${error.message}`);
      throw error;
    }
  }

  async getDevicePerformanceMetrics(deviceId: string): Promise<{
    averageLoadTime: number;
    crashCount: number;
    errorCount: number;
    batteryUsage: number;
    storageUsage: number;
    networkUsage: {
      wifi: number;
      cellular: number;
    };
  }> {
    const events = await this.analyticsRepository.find({
      where: { deviceId },
      order: { createdAt: 'DESC' },
      take: 1000,
    });

    const loadTimeEvents = events.filter(e => e.eventType === 'screen_load' && e.properties.duration);
    const averageLoadTime = loadTimeEvents.length > 0 
      ? loadTimeEvents.reduce((sum, e) => sum + e.properties.duration, 0) / loadTimeEvents.length 
      : 0;

    const crashCount = events.filter(e => e.eventType === 'app_crash').length;
    const errorCount = events.filter(e => e.eventType === 'error' || e.eventType.includes('error')).length;

    const batteryEvents = events.filter(e => e.properties.batteryLevel != null);
    const averageBatteryUsage = batteryEvents.length > 0
      ? batteryEvents.reduce((sum, e) => sum + (100 - e.properties.batteryLevel), 0) / batteryEvents.length
      : 0;

    const storageEvents = events.filter(e => e.properties.deviceStorage != null);
    const averageStorageUsage = storageEvents.length > 0
      ? storageEvents.reduce((sum, e) => sum + e.properties.deviceStorage, 0) / storageEvents.length
      : 0;

    const wifiEvents = events.filter(e => e.properties.networkType === 'wifi').length;
    const cellularEvents = events.filter(e => e.properties.networkType === 'cellular').length;

    return {
      averageLoadTime: Math.round(averageLoadTime),
      crashCount,
      errorCount,
      batteryUsage: Math.round(averageBatteryUsage),
      storageUsage: Math.round(averageStorageUsage),
      networkUsage: {
        wifi: wifiEvents,
        cellular: cellularEvents,
      },
    };
  }

  // Background processing

  @Cron(CronExpression.EVERY_HOUR)
  async processHourlyAnalytics(): Promise<void> {
    try {
      const organizations = await this.organizationRepository.find();
      
      for (const org of organizations) {
        await this.calculateHourlyMobileMetrics(org.id);
      }

      this.logger.log('Hourly mobile analytics processing completed');
    } catch (error) {
      this.logger.error(`Hourly mobile analytics processing failed: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async processDailyAnalytics(): Promise<void> {
    try {
      const organizations = await this.organizationRepository.find();
      
      for (const org of organizations) {
        await this.calculateDailyMobileMetrics(org.id);
        await this.cleanupOldEvents(org.id);
      }

      this.logger.log('Daily mobile analytics processing completed');
    } catch (error) {
      this.logger.error(`Daily mobile analytics processing failed: ${error.message}`);
    }
  }

  // Private helper methods

  private async processRealTimeAnalytics(event: MobileAnalytics): Promise<void> {
    // Update device last activity
    await this.deviceRepository.update(
      { id: event.deviceId },
      { lastActiveAt: new Date() }
    );

    // Process specific event types
    switch (event.eventType) {
      case 'app_crash':
        await this.handleCrashEvent(event);
        break;
      case 'performance_issue':
        await this.handlePerformanceIssue(event);
        break;
      case 'user_feedback':
        await this.handleUserFeedback(event);
        break;
    }
  }

  private async generateOverview(events: MobileAnalytics[], devices: MobileDevice[]): Promise<any> {
    const totalEvents = events.length;
    const activeDevices = new Set(events.map(e => e.deviceId)).size;
    const uniqueUsers = new Set(devices.map(d => d.userId)).size;

    const sessionEvents = events.filter(e => 
      e.eventType === 'session_start' || e.eventType === 'session_end'
    );

    let totalSessionDuration = 0;
    let sessionCount = 0;

    for (let i = 0; i < sessionEvents.length; i += 2) {
      if (sessionEvents[i].eventType === 'session_start' && 
          sessionEvents[i + 1]?.eventType === 'session_end') {
        const duration = sessionEvents[i + 1].timestamp.getTime() - sessionEvents[i].timestamp.getTime();
        totalSessionDuration += duration;
        sessionCount++;
      }
    }

    const averageSessionDuration = sessionCount > 0 ? totalSessionDuration / sessionCount / 1000 : 0;

    const eventCounts = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topEvents = Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([eventType, count]) => ({ eventType, count }));

    return {
      totalEvents,
      activeDevices,
      uniqueUsers,
      averageSessionDuration: Math.round(averageSessionDuration),
      topEvents,
    };
  }

  private async generatePlatformAnalytics(
    events: MobileAnalytics[], 
    devices: MobileDevice[]
  ): Promise<Record<DevicePlatform, any>> {
    const platformAnalytics = {} as Record<DevicePlatform, any>;

    for (const platform of Object.values(DevicePlatform)) {
      const platformDevices = devices.filter(d => d.platform === platform);
      const platformEvents = events.filter(e => 
        platformDevices.some(d => d.id === e.deviceId)
      );

      const crashes = platformEvents.filter(e => e.eventType === 'app_crash').length;
      
      const sessionEvents = platformEvents.filter(e => 
        e.eventType === 'session_start' || e.eventType === 'session_end'
      );

      let totalDuration = 0;
      let sessionCount = 0;

      for (let i = 0; i < sessionEvents.length; i += 2) {
        if (sessionEvents[i].eventType === 'session_start' && 
            sessionEvents[i + 1]?.eventType === 'session_end') {
          const duration = sessionEvents[i + 1].timestamp.getTime() - sessionEvents[i].timestamp.getTime();
          totalDuration += duration;
          sessionCount++;
        }
      }

      platformAnalytics[platform] = {
        devices: platformDevices.length,
        events: platformEvents.length,
        crashes,
        averageSessionDuration: sessionCount > 0 ? Math.round(totalDuration / sessionCount / 1000) : 0,
      };
    }

    return platformAnalytics;
  }

  private async generatePerformanceMetrics(events: MobileAnalytics[]): Promise<any> {
    const loadTimeEvents = events.filter(e => e.eventType === 'screen_load' && e.properties.duration);
    const averageLoadTime = loadTimeEvents.length > 0
      ? loadTimeEvents.reduce((sum, e) => sum + e.properties.duration, 0) / loadTimeEvents.length
      : 0;

    const responseTimeEvents = events.filter(e => e.eventType === 'api_response' && e.properties.duration);
    const averageResponseTime = responseTimeEvents.length > 0
      ? responseTimeEvents.reduce((sum, e) => sum + e.properties.duration, 0) / responseTimeEvents.length
      : 0;

    const errorEvents = events.filter(e => e.eventType.includes('error'));
    const errorRate = events.length > 0 ? (errorEvents.length / events.length) * 100 : 0;

    const crashEvents = events.filter(e => e.eventType === 'app_crash');
    const crashRate = events.length > 0 ? (crashEvents.length / events.length) * 100 : 0;

    return {
      averageLoadTime: Math.round(averageLoadTime),
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      crashRate: Math.round(crashRate * 100) / 100,
    };
  }

  private async generateUsageAnalytics(events: MobileAnalytics[], days: number): Promise<any> {
    // Daily active users
    const dailyActiveUsers = [];
    const uniqueUsersByDay = new Map<string, Set<string>>();

    events.forEach(event => {
      const date = event.createdAt.toISOString().split('T')[0];
      if (!uniqueUsersByDay.has(date)) {
        uniqueUsersByDay.set(date, new Set());
      }
      if (event.device?.userId) {
        uniqueUsersByDay.get(date)!.add(event.device.userId);
      }
    });

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      const count = uniqueUsersByDay.get(date)?.size || 0;
      dailyActiveUsers.push({ date, count });
    }

    // Screen views
    const screenViews = events
      .filter(e => e.eventType === 'screen_view' && e.properties.screen)
      .reduce((acc, event) => {
        const screen = event.properties.screen;
        if (!acc[screen]) {
          acc[screen] = { views: 0, totalDuration: 0, count: 0 };
        }
        acc[screen].views++;
        if (event.properties.duration) {
          acc[screen].totalDuration += event.properties.duration;
          acc[screen].count++;
        }
        return acc;
      }, {} as Record<string, any>);

    const screenViewsArray = Object.entries(screenViews)
      .map(([screen, data]) => ({
        screen,
        views: data.views,
        avgDuration: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Feature usage
    const featureUsage = events
      .reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const featureUsageArray = Object.entries(featureUsage)
      .map(([feature, usage]) => ({ feature, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);

    return {
      dailyActiveUsers,
      screenViews: screenViewsArray,
      featureUsage: featureUsageArray,
    };
  }

  private async generateRetentionMetrics(
    organizationId: string,
    devices: MobileDevice[]
  ): Promise<any> {
    // Simplified retention calculation
    const now = new Date();
    const day1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalDevices = devices.length;
    const activeDay1 = devices.filter(d => d.lastActiveAt && d.lastActiveAt >= day1).length;
    const activeDay7 = devices.filter(d => d.lastActiveAt && d.lastActiveAt >= day7).length;
    const activeDay30 = devices.filter(d => d.lastActiveAt && d.lastActiveAt >= day30).length;

    return {
      day1: totalDevices > 0 ? Math.round((activeDay1 / totalDevices) * 100) : 0,
      day7: totalDevices > 0 ? Math.round((activeDay7 / totalDevices) * 100) : 0,
      day30: totalDevices > 0 ? Math.round((activeDay30 / totalDevices) * 100) : 0,
    };
  }

  private async generateDemographics(
    devices: MobileDevice[],
    events: MobileAnalytics[]
  ): Promise<any> {
    const appVersions = devices.reduce((acc, device) => {
      const version = device.appVersion || 'Unknown';
      acc[version] = (acc[version] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const osVersions = devices.reduce((acc, device) => {
      const version = device.osVersion || 'Unknown';
      acc[version] = (acc[version] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const deviceModels = devices.reduce((acc, device) => {
      const model = device.model || 'Unknown';
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // For countries, we'd need to integrate with a geolocation service
    const countries = { 'Unknown': devices.length };

    return {
      appVersions,
      osVersions,
      countries,
      deviceModels,
    };
  }

  private groupEventsBySession(events: MobileAnalytics[]): Array<{
    sessionId: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    eventCount: number;
  }> {
    const sessions = new Map();

    events.forEach(event => {
      const sessionId = event.sessionId || 'unknown';
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
          sessionId,
          startTime: event.timestamp || event.createdAt,
          endTime: event.timestamp || event.createdAt,
          eventCount: 0,
        });
      }

      const session = sessions.get(sessionId);
      session.eventCount++;
      
      const eventTime = event.timestamp || event.createdAt;
      if (eventTime < session.startTime) session.startTime = eventTime;
      if (eventTime > session.endTime) session.endTime = eventTime;
    });

    return Array.from(sessions.values()).map(session => ({
      ...session,
      duration: session.endTime.getTime() - session.startTime.getTime(),
    }));
  }

  private analyzeCompletionFunnels(events: MobileAnalytics[]): Record<string, any> {
    const funnels = {
      course_enrollment: {
        started: events.filter(e => e.eventType === 'course_view').length,
        completed: events.filter(e => e.eventType === 'course_enroll').length,
        conversionRate: 0,
      },
      video_completion: {
        started: events.filter(e => e.eventType === 'video_start').length,
        completed: events.filter(e => e.eventType === 'video_complete').length,
        conversionRate: 0,
      },
    };

    Object.keys(funnels).forEach(key => {
      const funnel = funnels[key];
      funnel.conversionRate = funnel.started > 0 
        ? Math.round((funnel.completed / funnel.started) * 100) 
        : 0;
    });

    return funnels;
  }

  private calculateChurnRisk(events: MobileAnalytics[], sessions: any[]): number {
    // Simple churn risk calculation based on activity patterns
    const recentEvents = events.filter(e => 
      e.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const avgSessionDuration = sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length 
      : 0;

    let riskScore = 0;
    
    if (recentEvents.length < 10) riskScore += 30;
    if (sessions.length < 3) riskScore += 20;
    if (avgSessionDuration < 300000) riskScore += 25; // Less than 5 minutes
    if (events.filter(e => e.eventType === 'app_crash').length > 0) riskScore += 25;

    return Math.min(riskScore, 100);
  }

  private async handleCrashEvent(event: MobileAnalytics): Promise<void> {
    this.logger.error(`App crash detected on device ${event.deviceId}: ${JSON.stringify(event.properties)}`);
    // In a real implementation, you might send alerts or create tickets
  }

  private async handlePerformanceIssue(event: MobileAnalytics): Promise<void> {
    this.logger.warn(`Performance issue on device ${event.deviceId}: ${JSON.stringify(event.properties)}`);
  }

  private async handleUserFeedback(event: MobileAnalytics): Promise<void> {
    this.logger.log(`User feedback received from device ${event.deviceId}: ${JSON.stringify(event.properties)}`);
  }

  private async calculateHourlyMobileMetrics(organizationId: string): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Calculate metrics for the last hour
    const devices = await this.deviceRepository.find({
      where: { organizationId },
    });

    const deviceIds = devices.map(d => d.id);

    const events = await this.analyticsRepository.count({
      where: {
        deviceId: { $in: deviceIds } as any,
        createdAt: Between(oneHourAgo, now),
      },
    });

    this.logger.debug(`Calculated hourly mobile metrics for org ${organizationId}: ${events} events`);
  }

  private async calculateDailyMobileMetrics(organizationId: string): Promise<void> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Calculate daily metrics
    this.logger.debug(`Calculating daily mobile metrics for org ${organizationId}`);
  }

  private async cleanupOldEvents(organizationId: string): Promise<void> {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days

    const devices = await this.deviceRepository.find({
      where: { organizationId },
    });

    const deviceIds = devices.map(d => d.id);

    await this.analyticsRepository.delete({
      deviceId: { $in: deviceIds } as any,
      createdAt: { $lt: cutoffDate } as any,
    });

    this.logger.log(`Cleaned up old mobile events for org ${organizationId}`);
  }
}