import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UserAnalyticsService, UserMetrics, UserEngagementData } from '../services/user-analytics.service';
import { AnalyticsQueryDto } from '../dto';

@ApiTags('User Analytics')
@Controller('user-analytics')
export class UserAnalyticsController {
  constructor(private readonly userAnalyticsService: UserAnalyticsService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get comprehensive user metrics' })
  @ApiResponse({ 
    status: 200, 
    description: 'User metrics retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getUserMetrics(@Query() query: AnalyticsQueryDto): Promise<UserMetrics> {
    return this.userAnalyticsService.getUserMetrics(query);
  }

  @Get('engagement')
  @ApiOperation({ summary: 'Get user engagement analytics data' })
  @ApiResponse({ 
    status: 200, 
    description: 'User engagement data retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserEngagement(@Query() query: AnalyticsQueryDto): Promise<UserEngagementData> {
    return this.userAnalyticsService.getUserEngagementData(query);
  }

  @Get('activity/:userId')
  @ApiOperation({ summary: 'Get user activity timeline' })
  @ApiResponse({ 
    status: 200, 
    description: 'User activity timeline retrieved successfully',
    type: Array
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserActivity(
    @Param('userId') userId: string,
    @Query() query: AnalyticsQueryDto
  ) {
    return this.userAnalyticsService.getUserActivityTimeline(userId, query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get user analytics dashboard data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard data retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  async getDashboardData(@Query() query: AnalyticsQueryDto) {
    const [metrics, engagement] = await Promise.all([
      this.userAnalyticsService.getUserMetrics(query),
      this.userAnalyticsService.getUserEngagementData(query)
    ]);

    return {
      overview: metrics,
      engagement,
      timestamp: new Date().toISOString()
    };
  }

  @Get('retention')
  @ApiOperation({ summary: 'Get user retention analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'User retention data retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  async getUserRetention(@Query() query: AnalyticsQueryDto) {
    const metrics = await this.userAnalyticsService.getUserMetrics(query);
    
    return {
      retentionRate: metrics.retentionRate,
      engagementRate: metrics.engagementRate,
      activeUsers: metrics.activeUsers,
      newUsers: metrics.newUsers,
      timeRange: query.timeRange || 'month'
    };
  }

  @Get('growth')
  @ApiOperation({ summary: 'Get user growth analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'User growth data retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  async getUserGrowth(@Query() query: AnalyticsQueryDto) {
    const metrics = await this.userAnalyticsService.getUserMetrics(query);
    const engagement = await this.userAnalyticsService.getUserEngagementData(query);
    
    return {
      totalUsers: metrics.totalUsers,
      activeUsers: metrics.activeUsers,
      newUsers: metrics.newUsers,
      userGrowth: metrics.userGrowth,
      dailyActiveUsers: engagement.dailyActiveUsers,
      timeRange: query.timeRange || 'month'
    };
  }
}