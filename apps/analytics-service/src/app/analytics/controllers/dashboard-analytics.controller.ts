import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DashboardAnalyticsService } from '../services/dashboard-analytics.service';
import { AnalyticsQueryDto } from '../dto';

@ApiTags('Dashboard Analytics')
@Controller('dashboard')
export class DashboardAnalyticsController {
  constructor(private readonly dashboardAnalyticsService: DashboardAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview with key metrics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard overview retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getDashboardOverview(@Query() query: AnalyticsQueryDto) {
    return this.dashboardAnalyticsService.getDashboardOverview(query);
  }

  @Get('charts')
  @ApiOperation({ summary: 'Get dashboard chart data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard charts retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getDashboardCharts(@Query() query: AnalyticsQueryDto) {
    return this.dashboardAnalyticsService.getDashboardCharts(query);
  }

  @Get('comprehensive')
  @ApiOperation({ summary: 'Get comprehensive dashboard with all data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Comprehensive dashboard retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getComprehensiveDashboard(@Query() query: AnalyticsQueryDto) {
    return this.dashboardAnalyticsService.getComprehensiveDashboard(query);
  }

  @Get('executive-summary')
  @ApiOperation({ summary: 'Get executive summary with key insights' })
  @ApiResponse({ 
    status: 200, 
    description: 'Executive summary retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getExecutiveSummary(@Query() query: AnalyticsQueryDto) {
    return this.dashboardAnalyticsService.getExecutiveSummary(query);
  }

  @Get('realtime')
  @ApiOperation({ summary: 'Get real-time metrics and activity' })
  @ApiResponse({ 
    status: 200, 
    description: 'Real-time metrics retrieved successfully',
    type: Object
  })
  async getRealtimeMetrics() {
    return this.dashboardAnalyticsService.getRealtimeMetrics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get analytics service health status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service health status retrieved successfully',
    type: Object
  })
  async getHealthStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      services: {
        database: 'connected',
        eventTracking: 'active',
        analytics: 'processing'
      }
    };
  }
}