import { Controller, Get, Query, Param, Body, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CourseAnalyticsService, CourseMetrics, CoursePerformanceData } from '../services/course-analytics.service';
import { AnalyticsQueryDto } from '../dto';

@ApiTags('Course Analytics')
@Controller('course-analytics')
export class CourseAnalyticsController {
  constructor(private readonly courseAnalyticsService: CourseAnalyticsService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get comprehensive course metrics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Course metrics retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getCourseMetrics(@Query() query: AnalyticsQueryDto): Promise<CourseMetrics> {
    return this.courseAnalyticsService.getCourseMetrics(query);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get course performance analytics data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Course performance data retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getCoursePerformance(@Query() query: AnalyticsQueryDto): Promise<CoursePerformanceData> {
    return this.courseAnalyticsService.getCoursePerformanceData(query);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get detailed analytics for a specific course' })
  @ApiResponse({ 
    status: 200, 
    description: 'Course analytics retrieved successfully',
    type: Object
  })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getCourseAnalytics(
    @Param('courseId') courseId: string,
    @Query() query: AnalyticsQueryDto
  ) {
    return this.courseAnalyticsService.getCourseAnalytics(courseId, query);
  }

  @Post('comparison')
  @ApiOperation({ summary: 'Compare analytics between multiple courses' })
  @ApiResponse({ 
    status: 200, 
    description: 'Course comparison data retrieved successfully',
    type: Object
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        courseIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of course IDs to compare'
        },
        timeRange: { type: 'string', enum: ['day', 'week', 'month', 'quarter', 'year'] },
        startDate: { type: 'string' },
        endDate: { type: 'string' }
      }
    }
  })
  async compareCourses(
    @Body() body: { courseIds: string[] } & AnalyticsQueryDto
  ) {
    const { courseIds, ...query } = body;
    return this.courseAnalyticsService.getCourseComparison(courseIds, query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get course analytics dashboard data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard data retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  async getDashboardData(@Query() query: AnalyticsQueryDto) {
    if (query.courseId) {
      // Get specific course dashboard
      return this.courseAnalyticsService.getCourseAnalytics(query.courseId, query);
    } else {
      // Get overall course dashboard
      const [metrics, performance] = await Promise.all([
        this.courseAnalyticsService.getCourseMetrics(query),
        this.courseAnalyticsService.getCoursePerformanceData(query)
      ]);

      return {
        overview: metrics,
        performance,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('enrollment-trends')
  @ApiOperation({ summary: 'Get course enrollment trends' })
  @ApiResponse({ 
    status: 200, 
    description: 'Enrollment trends retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  async getEnrollmentTrends(@Query() query: AnalyticsQueryDto) {
    const performance = await this.courseAnalyticsService.getCoursePerformanceData(query);
    
    return {
      enrollmentTrends: performance.enrollmentTrends,
      timeRange: query.timeRange || 'month'
    };
  }

  @Get('completion-analysis')
  @ApiOperation({ summary: 'Get course completion analysis' })
  @ApiResponse({ 
    status: 200, 
    description: 'Completion analysis retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getCompletionAnalysis(@Query() query: AnalyticsQueryDto) {
    const performance = await this.courseAnalyticsService.getCoursePerformanceData(query);
    const metrics = await this.courseAnalyticsService.getCourseMetrics(query);
    
    return {
      avgCompletionRate: metrics.avgCompletionRate,
      completionRates: performance.completionRates,
      dropoffAnalysis: performance.dropoffAnalysis,
      timeRange: query.timeRange || 'month'
    };
  }

  @Get('engagement-metrics')
  @ApiOperation({ summary: 'Get course engagement metrics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Engagement metrics retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  async getEngagementMetrics(@Query() query: AnalyticsQueryDto) {
    const performance = await this.courseAnalyticsService.getCoursePerformanceData(query);
    
    return {
      engagementMetrics: performance.engagementMetrics,
      timeRange: query.timeRange || 'month'
    };
  }

  @Get('popular-courses')
  @ApiOperation({ summary: 'Get most popular courses' })
  @ApiResponse({ 
    status: 200, 
    description: 'Popular courses retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPopularCourses(@Query() query: AnalyticsQueryDto) {
    const metrics = await this.courseAnalyticsService.getCourseMetrics(query);
    
    return {
      popularCourses: metrics.popularCourses.slice(0, query.limit || 10),
      timeRange: query.timeRange || 'month'
    };
  }
}