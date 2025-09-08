import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { EventTrackingService } from '../services/event-tracking.service';
import { CreateEventDto, AnalyticsQueryDto } from '../dto';

@ApiTags('Event Tracking')
@Controller('event-tracking')
export class EventTrackingController {
  constructor(private readonly eventTrackingService: EventTrackingService) {}

  @Post('track')
  @ApiOperation({ summary: 'Track a single event' })
  @ApiResponse({ 
    status: 201, 
    description: 'Event tracked successfully',
    type: Object
  })
  @ApiBody({ type: CreateEventDto })
  async trackEvent(@Body() eventData: CreateEventDto) {
    return this.eventTrackingService.trackEvent(eventData);
  }

  @Post('track-bulk')
  @ApiOperation({ summary: 'Track multiple events in bulk' })
  @ApiResponse({ 
    status: 201, 
    description: 'Events tracked successfully',
    type: Array
  })
  @ApiBody({ 
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/CreateEventDto' }
    }
  })
  async trackBulkEvents(@Body() eventsData: CreateEventDto[]) {
    return this.eventTrackingService.trackBulkEvents(eventsData);
  }

  @Get('events/:eventType')
  @ApiOperation({ summary: 'Get events by type' })
  @ApiResponse({ 
    status: 200, 
    description: 'Events retrieved successfully',
    type: Array
  })
  @ApiParam({ name: 'eventType', description: 'Event type to filter by' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getEventsByType(
    @Param('eventType') eventType: string,
    @Query() query: AnalyticsQueryDto
  ) {
    return this.eventTrackingService.getEventsByType(eventType, query);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get events for a specific user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User events retrieved successfully',
    type: Array
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getEventsByUser(
    @Param('userId') userId: string,
    @Query() query: AnalyticsQueryDto
  ) {
    return this.eventTrackingService.getEventsByUser(userId, query);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get events for a specific course' })
  @ApiResponse({ 
    status: 200, 
    description: 'Course events retrieved successfully',
    type: Array
  })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getEventsByCourse(
    @Param('courseId') courseId: string,
    @Query() query: AnalyticsQueryDto
  ) {
    return this.eventTrackingService.getEventsByCourse(courseId, query);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get event statistics and summary' })
  @ApiResponse({ 
    status: 200, 
    description: 'Event statistics retrieved successfully',
    type: Array
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getEventStatistics(@Query() query: AnalyticsQueryDto) {
    return this.eventTrackingService.getEventStatistics(query);
  }

  @Get('activity/hourly')
  @ApiOperation({ summary: 'Get hourly activity patterns' })
  @ApiResponse({ 
    status: 200, 
    description: 'Hourly activity data retrieved successfully',
    type: Array
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getHourlyActivity(@Query() query: AnalyticsQueryDto) {
    return this.eventTrackingService.getHourlyActivity(query);
  }

  @Get('journey/user/:userId')
  @ApiOperation({ summary: 'Get user journey and behavior flow' })
  @ApiResponse({ 
    status: 200, 
    description: 'User journey retrieved successfully',
    type: Array
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'sessionId', required: false, type: String })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserJourney(
    @Param('userId') userId: string,
    @Query('sessionId') sessionId?: string,
    @Query() query?: AnalyticsQueryDto
  ) {
    return this.eventTrackingService.getUserJourney(userId, sessionId, query);
  }

  @Get('analytics/devices')
  @ApiOperation({ summary: 'Get device and browser analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Device analytics retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getDeviceAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.eventTrackingService.getDeviceAnalytics(query);
  }

  @Get('analytics/pages')
  @ApiOperation({ summary: 'Get page analytics and performance' })
  @ApiResponse({ 
    status: 200, 
    description: 'Page analytics retrieved successfully',
    type: Array
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPageAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.eventTrackingService.getPageAnalytics(query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get event tracking dashboard data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard data retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  async getDashboardData(@Query() query: AnalyticsQueryDto) {
    const [statistics, hourlyActivity, deviceAnalytics, pageAnalytics] = await Promise.all([
      this.eventTrackingService.getEventStatistics(query),
      this.eventTrackingService.getHourlyActivity(query),
      this.eventTrackingService.getDeviceAnalytics(query),
      this.eventTrackingService.getPageAnalytics({ ...query, limit: 10 })
    ]);

    return {
      eventStatistics: statistics,
      hourlyActivity,
      deviceBreakdown: deviceAnalytics.summary,
      topPages: pageAnalytics,
      timestamp: new Date().toISOString()
    };
  }
}