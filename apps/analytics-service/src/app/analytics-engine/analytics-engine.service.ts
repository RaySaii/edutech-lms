import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, MoreThan, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AnalyticsEvent,
  AnalyticsMetric,
  AnalyticsDashboard,
  DashboardWidget,
  AnalyticsReport,
  UserAnalyticsProfile,
  User,
  Organization,
  Course,
  Enrollment,
  Content,
  Assessment,
  AssessmentAttempt,
  MetricType,
  AggregationType,
} from '@edutech-lms/database';

export interface EventData {
  organizationId: string;
  userId?: string;
  eventType: string;
  resourceType?: string;
  resourceId?: string;
  properties: Record<string, any>;
  sessionId?: string;
  timestamp?: Date;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    deviceType?: string;
    browser?: string;
    operatingSystem?: string;
    country?: string;
    city?: string;
    timezone?: string;
  };
}

export interface MetricQuery {
  organizationId: string;
  metrics: Array<{
    name: string;
    aggregation: AggregationType;
    field?: string;
  }>;
  dimensions?: string[];
  filters?: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
    value: any;
  }>;
  timeRange: {
    type: 'relative' | 'absolute';
    value: string;
  };
  groupBy?: string[];
  limit?: number;
}

export interface AnalyticsResult {
  data: Array<{
    dimensions: Record<string, any>;
    metrics: Record<string, number>;
    timestamp?: Date;
  }>;
  metadata: {
    totalRecords: number;
    query: MetricQuery;
    executionTime: number;
    cacheHit: boolean;
  };
}

@Injectable()
export class AnalyticsEngineService {
  private readonly logger = new Logger(AnalyticsEngineService.name);
  private metricsCache = new Map<string, { data: any; expiry: number }>();

  constructor(
    @InjectRepository(AnalyticsEvent)
    private eventRepository: Repository<AnalyticsEvent>,
    @InjectRepository(AnalyticsMetric)
    private metricRepository: Repository<AnalyticsMetric>,
    @InjectRepository(AnalyticsDashboard)
    private dashboardRepository: Repository<AnalyticsDashboard>,
    @InjectRepository(DashboardWidget)
    private widgetRepository: Repository<DashboardWidget>,
    @InjectRepository(AnalyticsReport)
    private reportRepository: Repository<AnalyticsReport>,
    @InjectRepository(UserAnalyticsProfile)
    private profileRepository: Repository<UserAnalyticsProfile>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentAttempt)
    private attemptRepository: Repository<AssessmentAttempt>,
  ) {}

  async trackEvent(eventData: EventData): Promise<void> {
    try {
      const event = this.eventRepository.create({
        organizationId: eventData.organizationId,
        userId: eventData.userId,
        eventType: eventData.eventType,
        resourceType: eventData.resourceType,
        resourceId: eventData.resourceId,
        properties: eventData.properties,
        sessionId: eventData.sessionId,
        timestamp: eventData.timestamp || new Date(),
        ipAddress: eventData.metadata?.ipAddress,
        userAgent: eventData.metadata?.userAgent,
        referrer: eventData.metadata?.referrer,
        deviceType: eventData.metadata?.deviceType,
        browser: eventData.metadata?.browser,
        operatingSystem: eventData.metadata?.operatingSystem,
        country: eventData.metadata?.country,
        city: eventData.metadata?.city,
        timezone: eventData.metadata?.timezone,
      });

      await this.eventRepository.save(event);

      // Process real-time metrics
      await this.processRealTimeMetrics(event);

      this.logger.debug(`Event tracked: ${eventData.eventType} for org ${eventData.organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to track event: ${error.message}`);
      throw error;
    }
  }

  async recordMetric(
    organizationId: string,
    metricName: string,
    value: number,
    type: MetricType = MetricType.COUNTER,
    unit?: string,
    dimensions?: Record<string, string>,
    timestamp?: Date
  ): Promise<void> {
    try {
      const metric = this.metricRepository.create({
        organizationId,
        metricName,
        type,
        value,
        unit,
        dimensions,
        timestamp: timestamp || new Date(),
      });

      await this.metricRepository.save(metric);
      
      // Invalidate related cache
      this.invalidateCache(organizationId, metricName);

      this.logger.debug(`Metric recorded: ${metricName} = ${value} for org ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to record metric: ${error.message}`);
      throw error;
    }
  }

  async queryMetrics(query: MetricQuery): Promise<AnalyticsResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query);
    
    // Check cache first
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          executionTime: Date.now() - startTime,
          cacheHit: true,
        },
      };
    }

    try {
      let queryBuilder = this.metricRepository.createQueryBuilder('metric');

      // Add organization filter
      queryBuilder = queryBuilder.where('metric.organizationId = :organizationId', {
        organizationId: query.organizationId,
      });

      // Add metric filters
      const metricNames = query.metrics.map(m => m.name);
      queryBuilder = queryBuilder.andWhere('metric.metricName IN (:...metricNames)', {
        metricNames,
      });

      // Add time range filter
      const timeRange = this.parseTimeRange(query.timeRange);
      if (timeRange.start && timeRange.end) {
        queryBuilder = queryBuilder.andWhere('metric.timestamp BETWEEN :start AND :end', {
          start: timeRange.start,
          end: timeRange.end,
        });
      }

      // Add custom filters
      if (query.filters) {
        query.filters.forEach((filter, index) => {
          const paramKey = `filter_${index}`;
          switch (filter.operator) {
            case 'equals':
              queryBuilder = queryBuilder.andWhere(`metric.${filter.field} = :${paramKey}`, {
                [paramKey]: filter.value,
              });
              break;
            case 'not_equals':
              queryBuilder = queryBuilder.andWhere(`metric.${filter.field} != :${paramKey}`, {
                [paramKey]: filter.value,
              });
              break;
            case 'greater_than':
              queryBuilder = queryBuilder.andWhere(`metric.${filter.field} > :${paramKey}`, {
                [paramKey]: filter.value,
              });
              break;
            case 'less_than':
              queryBuilder = queryBuilder.andWhere(`metric.${filter.field} < :${paramKey}`, {
                [paramKey]: filter.value,
              });
              break;
            case 'contains':
              queryBuilder = queryBuilder.andWhere(`metric.${filter.field} ILIKE :${paramKey}`, {
                [paramKey]: `%${filter.value}%`,
              });
              break;
            case 'in':
              queryBuilder = queryBuilder.andWhere(`metric.${filter.field} IN (:...${paramKey})`, {
                [paramKey]: filter.value,
              });
              break;
          }
        });
      }

      // Add grouping and aggregation
      if (query.groupBy && query.groupBy.length > 0) {
        query.groupBy.forEach(field => {
          queryBuilder = queryBuilder.addGroupBy(`metric.${field}`);
        });
      }

      // Add ordering
      queryBuilder = queryBuilder.orderBy('metric.timestamp', 'DESC');

      // Add limit
      if (query.limit) {
        queryBuilder = queryBuilder.limit(query.limit);
      }

      const rawResults = await queryBuilder.getRawMany();

      // Process results
      const processedData = await this.processQueryResults(rawResults, query);

      const result: AnalyticsResult = {
        data: processedData,
        metadata: {
          totalRecords: rawResults.length,
          query,
          executionTime: Date.now() - startTime,
          cacheHit: false,
        },
      };

      // Cache the result
      this.cacheResult(cacheKey, result, 300000); // Cache for 5 minutes

      return result;
    } catch (error) {
      this.logger.error(`Failed to query metrics: ${error.message}`);
      throw error;
    }
  }

  async generateUserInsights(organizationId: string, userId: string): Promise<UserAnalyticsProfile> {
    try {
      // Get user's learning events
      const events = await this.eventRepository.find({
        where: {
          organizationId,
          userId,
          timestamp: MoreThan(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)), // Last 90 days
        },
        order: { timestamp: 'DESC' },
        take: 1000,
      });

      // Get user's enrollments and attempts
      const enrollments = await this.enrollmentRepository.find({
        where: { userId },
        relations: ['course'],
      });

      const attempts = await this.attemptRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 100,
      });

      // Calculate learning patterns
      const learningPatterns = this.analyzeLearningPatterns(events);
      
      // Calculate performance metrics
      const performanceMetrics = this.analyzePerformance(enrollments, attempts);
      
      // Calculate engagement metrics
      const engagementMetrics = this.analyzeEngagement(events);
      
      // Generate predictions
      const predictions = this.generatePredictions(learningPatterns, performanceMetrics, engagementMetrics);

      // Find or create user analytics profile
      let profile = await this.profileRepository.findOne({
        where: { organizationId, userId },
      });

      if (!profile) {
        profile = this.profileRepository.create({
          organizationId,
          userId,
        });
      }

      profile.learningPatterns = learningPatterns;
      profile.performanceMetrics = performanceMetrics;
      profile.engagementMetrics = engagementMetrics;
      profile.predictions = predictions;
      profile.lastCalculatedAt = new Date();

      return this.profileRepository.save(profile);
    } catch (error) {
      this.logger.error(`Failed to generate user insights: ${error.message}`);
      throw error;
    }
  }

  async createDashboard(
    organizationId: string,
    createdBy: string,
    dashboardData: {
      name: string;
      description?: string;
      isPublic?: boolean;
      layout?: any;
      widgets?: any[];
    }
  ): Promise<AnalyticsDashboard> {
    try {
      const dashboard = this.dashboardRepository.create({
        organizationId,
        createdBy,
        name: dashboardData.name,
        description: dashboardData.description,
        isPublic: dashboardData.isPublic || false,
        layout: dashboardData.layout || this.getDefaultLayout(),
        widgets: [], // Will be added separately
      });

      const savedDashboard = await this.dashboardRepository.save(dashboard);

      // Create widgets if provided
      if (dashboardData.widgets && dashboardData.widgets.length > 0) {
        const widgets = dashboardData.widgets.map((widgetData, index) => 
          this.widgetRepository.create({
            dashboardId: savedDashboard.id,
            title: widgetData.title,
            description: widgetData.description,
            type: widgetData.type,
            chartType: widgetData.chartType,
            query: widgetData.query,
            visualization: widgetData.visualization,
            position: index,
            refreshInterval: widgetData.refreshInterval || 300,
          })
        );

        await this.widgetRepository.save(widgets);
      }

      this.logger.log(`Dashboard created: ${savedDashboard.id} for org ${organizationId}`);
      return savedDashboard;
    } catch (error) {
      this.logger.error(`Failed to create dashboard: ${error.message}`);
      throw error;
    }
  }

  async getDashboardData(dashboardId: string): Promise<{
    dashboard: AnalyticsDashboard;
    widgetData: Record<string, any>;
  }> {
    try {
      const dashboard = await this.dashboardRepository.findOne({
        where: { id: dashboardId },
        relations: ['widgets'],
      });

      if (!dashboard) {
        throw new Error(`Dashboard ${dashboardId} not found`);
      }

      // Get data for each widget
      const widgetData: Record<string, any> = {};
      
      for (const widget of dashboard.widgets) {
        if (widget.isVisible) {
          try {
            const data = await this.queryMetrics({
              organizationId: dashboard.organizationId,
              ...widget.query,
            });
            widgetData[widget.id] = data;
          } catch (error) {
            this.logger.error(`Failed to get data for widget ${widget.id}: ${error.message}`);
            widgetData[widget.id] = { error: error.message };
          }
        }
      }

      return { dashboard, widgetData };
    } catch (error) {
      this.logger.error(`Failed to get dashboard data: ${error.message}`);
      throw error;
    }
  }

  // Background processing methods

  @Cron(CronExpression.EVERY_HOUR)
  async processHourlyMetrics(): Promise<void> {
    try {
      const organizations = await this.organizationRepository.find();
      
      for (const org of organizations) {
        await this.calculateHourlyMetrics(org.id);
      }

      this.logger.log('Hourly metrics processing completed');
    } catch (error) {
      this.logger.error(`Hourly metrics processing failed: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processDailyMetrics(): Promise<void> {
    try {
      const organizations = await this.organizationRepository.find();
      
      for (const org of organizations) {
        await this.calculateDailyMetrics(org.id);
        await this.updateUserInsights(org.id);
      }

      this.logger.log('Daily metrics processing completed');
    } catch (error) {
      this.logger.error(`Daily metrics processing failed: ${error.message}`);
    }
  }

  @Cron('0 3 * * 0') // Every Sunday at 3 AM
  async processWeeklyMetrics(): Promise<void> {
    try {
      const organizations = await this.organizationRepository.find();
      
      for (const org of organizations) {
        await this.calculateWeeklyMetrics(org.id);
      }

      this.logger.log('Weekly metrics processing completed');
    } catch (error) {
      this.logger.error(`Weekly metrics processing failed: ${error.message}`);
    }
  }

  // Private helper methods

  private async processRealTimeMetrics(event: AnalyticsEvent): Promise<void> {
    // Process common real-time metrics based on event type
    const baseMetrics = [
      { name: 'total_events', value: 1 },
      { name: `${event.eventType}_count`, value: 1 },
    ];

    for (const metric of baseMetrics) {
      await this.recordMetric(
        event.organizationId,
        metric.name,
        metric.value,
        MetricType.COUNTER,
        'count',
        {
          eventType: event.eventType,
          resourceType: event.resourceType || 'unknown',
        }
      );
    }

    // Event-specific metrics
    switch (event.eventType) {
      case 'session_start':
        await this.recordMetric(event.organizationId, 'active_sessions', 1, MetricType.GAUGE);
        break;
      case 'session_end':
        const sessionDuration = event.properties.duration || 0;
        await this.recordMetric(event.organizationId, 'session_duration', sessionDuration, MetricType.DURATION, 'seconds');
        break;
      case 'course_progress':
        const progress = event.properties.progress || 0;
        await this.recordMetric(event.organizationId, 'course_progress', progress, MetricType.GAUGE, 'percent');
        break;
      case 'assessment_completed':
        const score = event.properties.score || 0;
        await this.recordMetric(event.organizationId, 'assessment_score', score, MetricType.GAUGE, 'percent');
        break;
    }
  }

  private parseTimeRange(timeRange: { type: 'relative' | 'absolute'; value: string }): {
    start?: Date;
    end?: Date;
  } {
    const now = new Date();
    
    if (timeRange.type === 'relative') {
      const match = timeRange.value.match(/^(\d+)([hdwmy])$/);
      if (match) {
        const amount = parseInt(match[1]);
        const unit = match[2];
        
        let start: Date;
        switch (unit) {
          case 'h':
            start = new Date(now.getTime() - amount * 60 * 60 * 1000);
            break;
          case 'd':
            start = new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
            break;
          case 'w':
            start = new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
            break;
          case 'm':
            start = new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000);
            break;
          case 'y':
            start = new Date(now.getTime() - amount * 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 1 day
        }
        
        return { start, end: now };
      }
    } else if (timeRange.type === 'absolute') {
      const parts = timeRange.value.split(' to ');
      if (parts.length === 2) {
        return {
          start: new Date(parts[0]),
          end: new Date(parts[1]),
        };
      }
    }

    return {};
  }

  private async processQueryResults(rawResults: any[], query: MetricQuery): Promise<any[]> {
    // Group results by dimensions and aggregate metrics
    const grouped = new Map<string, any>();

    for (const row of rawResults) {
      const dimensions = {};
      const metrics = {};
      
      // Extract dimensions
      if (query.dimensions) {
        for (const dim of query.dimensions) {
          dimensions[dim] = row[`metric_${dim}`];
        }
      }

      // Extract and aggregate metrics
      for (const metricConfig of query.metrics) {
        const value = parseFloat(row.metric_value) || 0;
        
        switch (metricConfig.aggregation) {
          case AggregationType.SUM:
            metrics[metricConfig.name] = (metrics[metricConfig.name] || 0) + value;
            break;
          case AggregationType.AVG:
            // For average, we need to track sum and count
            if (!metrics[`${metricConfig.name}_sum`]) {
              metrics[`${metricConfig.name}_sum`] = 0;
              metrics[`${metricConfig.name}_count`] = 0;
            }
            metrics[`${metricConfig.name}_sum`] += value;
            metrics[`${metricConfig.name}_count`]++;
            metrics[metricConfig.name] = metrics[`${metricConfig.name}_sum`] / metrics[`${metricConfig.name}_count`];
            break;
          case AggregationType.MIN:
            metrics[metricConfig.name] = Math.min(metrics[metricConfig.name] || Infinity, value);
            break;
          case AggregationType.MAX:
            metrics[metricConfig.name] = Math.max(metrics[metricConfig.name] || -Infinity, value);
            break;
          case AggregationType.COUNT:
            metrics[metricConfig.name] = (metrics[metricConfig.name] || 0) + 1;
            break;
        }
      }

      const key = JSON.stringify(dimensions);
      if (grouped.has(key)) {
        const existing = grouped.get(key);
        // Merge metrics
        Object.assign(existing.metrics, metrics);
      } else {
        grouped.set(key, {
          dimensions,
          metrics,
          timestamp: new Date(row.metric_timestamp),
        });
      }
    }

    return Array.from(grouped.values());
  }

  private analyzeLearningPatterns(events: AnalyticsEvent[]): any {
    const sessionEvents = events.filter(e => e.eventType === 'session_start' || e.eventType === 'session_end');
    const hourCounts = new Array(24).fill(0);
    let totalDuration = 0;
    let sessionCount = 0;

    // Analyze time patterns
    events.forEach(event => {
      const hour = event.timestamp.getHours();
      hourCounts[hour]++;
    });

    const preferredTimeOfDay = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => `${item.hour}:00`);

    // Calculate session metrics
    for (let i = 0; i < sessionEvents.length; i += 2) {
      if (sessionEvents[i].eventType === 'session_start' && 
          sessionEvents[i + 1]?.eventType === 'session_end') {
        const duration = sessionEvents[i + 1].timestamp.getTime() - sessionEvents[i].timestamp.getTime();
        totalDuration += duration;
        sessionCount++;
      }
    }

    return {
      preferredTimeOfDay,
      averageSessionDuration: sessionCount > 0 ? Math.round(totalDuration / sessionCount / 1000 / 60) : 0,
      sessionsPerWeek: Math.round(sessionCount * 7 / 90), // Extrapolate to weekly
    };
  }

  private analyzePerformance(enrollments: any[], attempts: any[]): any {
    if (attempts.length === 0) return {};

    const scores = attempts.map(a => a.score).filter(s => s != null);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const completedCourses = enrollments.filter(e => e.status === 'completed');
    const completionRate = enrollments.length > 0 ? completedCourses.length / enrollments.length * 100 : 0;

    return {
      averageQuizScore: Math.round(averageScore),
      completionRate: Math.round(completionRate),
      retryRate: attempts.filter(a => a.attemptNumber > 1).length / attempts.length * 100,
    };
  }

  private analyzeEngagement(events: AnalyticsEvent[]): any {
    const forumEvents = events.filter(e => e.eventType.includes('forum'));
    const ratingEvents = events.filter(e => e.eventType === 'content_rated');
    
    return {
      forumParticipation: forumEvents.length,
      contentRating: ratingEvents.length > 0 ? 
        ratingEvents.reduce((sum, e) => sum + (e.properties.rating || 0), 0) / ratingEvents.length : 0,
    };
  }

  private generatePredictions(learningPatterns: any, performanceMetrics: any, engagementMetrics: any): any {
    // Simple prediction algorithms - in practice, you'd use ML models
    const completionProbability = Math.min(100, 
      (performanceMetrics.completionRate || 0) * 0.5 +
      (performanceMetrics.averageQuizScore || 0) * 0.3 +
      (engagementMetrics.forumParticipation || 0) * 2
    );

    const churnRisk = Math.max(0, 100 - completionProbability);

    return {
      completionProbability: Math.round(completionProbability),
      churnRisk: Math.round(churnRisk),
    };
  }

  private async calculateHourlyMetrics(organizationId: string): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Calculate active users in the last hour
    const activeUsers = await this.eventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.organizationId = :organizationId', { organizationId })
      .andWhere('event.timestamp BETWEEN :start AND :end', { start: oneHourAgo, end: now })
      .getRawOne();

    await this.recordMetric(organizationId, 'hourly_active_users', activeUsers.count, MetricType.GAUGE);
  }

  private async calculateDailyMetrics(organizationId: string): Promise<void> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Daily active users
    const activeUsers = await this.eventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.organizationId = :organizationId', { organizationId })
      .andWhere('event.timestamp BETWEEN :start AND :end', { start: oneDayAgo, end: now })
      .getRawOne();

    await this.recordMetric(organizationId, 'daily_active_users', activeUsers.count, MetricType.GAUGE);

    // Course completions
    const completions = await this.eventRepository.count({
      where: {
        organizationId,
        eventType: 'course_completed',
        timestamp: Between(oneDayAgo, now),
      },
    });

    await this.recordMetric(organizationId, 'daily_course_completions', completions, MetricType.COUNTER);
  }

  private async calculateWeeklyMetrics(organizationId: string): Promise<void> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Weekly active users
    const activeUsers = await this.eventRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.organizationId = :organizationId', { organizationId })
      .andWhere('event.timestamp BETWEEN :start AND :end', { start: oneWeekAgo, end: now })
      .getRawOne();

    await this.recordMetric(organizationId, 'weekly_active_users', activeUsers.count, MetricType.GAUGE);
  }

  private async updateUserInsights(organizationId: string): Promise<void> {
    // Get all users who were active in the last 30 days
    const activeUsers = await this.eventRepository
      .createQueryBuilder('event')
      .select('DISTINCT event.userId', 'userId')
      .where('event.organizationId = :organizationId', { organizationId })
      .andWhere('event.timestamp > :since', { since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) })
      .getRawMany();

    for (const { userId } of activeUsers) {
      if (userId) {
        try {
          await this.generateUserInsights(organizationId, userId);
        } catch (error) {
          this.logger.error(`Failed to update insights for user ${userId}: ${error.message}`);
        }
      }
    }
  }

  private getDefaultLayout(): any {
    return {
      grid: [],
      breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
      columns: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    };
  }

  private generateCacheKey(query: MetricQuery): string {
    return `metrics_${JSON.stringify(query)}`;
  }

  private getCachedResult(key: string): any {
    const cached = this.metricsCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    return null;
  }

  private cacheResult(key: string, data: any, ttl: number): void {
    this.metricsCache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
  }

  private invalidateCache(organizationId: string, metricName?: string): void {
    // Simple cache invalidation - in practice, you'd use a more sophisticated approach
    for (const [key] of this.metricsCache.entries()) {
      if (key.includes(organizationId) && (!metricName || key.includes(metricName))) {
        this.metricsCache.delete(key);
      }
    }
  }
}