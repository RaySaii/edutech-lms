import { Controller, Get, Query, Param, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { RevenueAnalyticsService, RevenueMetrics, RevenueAnalysisData } from '../services/revenue-analytics.service';
import { AnalyticsQueryDto } from '../dto';

@ApiTags('Revenue Analytics')
@Controller('revenue-analytics')
export class RevenueAnalyticsController {
  constructor(private readonly revenueAnalyticsService: RevenueAnalyticsService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get comprehensive revenue metrics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Revenue metrics retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getRevenueMetrics(@Query() query: AnalyticsQueryDto): Promise<RevenueMetrics> {
    return this.revenueAnalyticsService.getRevenueMetrics(query);
  }

  @Get('analysis')
  @ApiOperation({ summary: 'Get revenue analysis and trends data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Revenue analysis data retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getRevenueAnalysis(@Query() query: AnalyticsQueryDto): Promise<RevenueAnalysisData> {
    return this.revenueAnalyticsService.getRevenueAnalysisData(query);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get revenue analysis for a specific course' })
  @ApiResponse({ 
    status: 200, 
    description: 'Course revenue analysis retrieved successfully',
    type: Object
  })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getCourseRevenue(
    @Param('courseId') courseId: string,
    @Query() query: AnalyticsQueryDto
  ) {
    return this.revenueAnalyticsService.getCourseRevenueAnalysis(courseId, query);
  }

  @Get('financial-summary')
  @ApiOperation({ summary: 'Get comprehensive financial summary' })
  @ApiResponse({ 
    status: 200, 
    description: 'Financial summary retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getFinancialSummary(@Query() query: AnalyticsQueryDto) {
    return this.revenueAnalyticsService.getFinancialSummary(query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get revenue analytics dashboard data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard data retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  async getDashboardData(@Query() query: AnalyticsQueryDto) {
    const [metrics, analysis] = await Promise.all([
      this.revenueAnalyticsService.getRevenueMetrics(query),
      this.revenueAnalyticsService.getRevenueAnalysisData(query)
    ]);

    return {
      overview: {
        totalRevenue: metrics.totalRevenue,
        netRevenue: metrics.netRevenue,
        totalTransactions: metrics.totalTransactions,
        avgTransactionValue: metrics.avgTransactionValue,
        revenueGrowth: metrics.revenueGrowth,
        refundRate: metrics.refundRate
      },
      trends: analysis.dailyRevenue,
      breakdown: metrics.revenueBySource,
      topCourses: metrics.topCourses,
      paymentMethods: analysis.paymentMethods,
      timestamp: new Date().toISOString()
    };
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get revenue trends over time' })
  @ApiResponse({ 
    status: 200, 
    description: 'Revenue trends retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  async getRevenueTrends(@Query() query: AnalyticsQueryDto) {
    const analysis = await this.revenueAnalyticsService.getRevenueAnalysisData(query);
    
    return {
      dailyRevenue: analysis.dailyRevenue,
      monthlyTrends: analysis.monthlyTrends,
      timeRange: query.timeRange || 'month'
    };
  }

  @Get('breakdown')
  @ApiOperation({ summary: 'Get revenue breakdown by source' })
  @ApiResponse({ 
    status: 200, 
    description: 'Revenue breakdown retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  async getRevenueBreakdown(@Query() query: AnalyticsQueryDto) {
    const metrics = await this.revenueAnalyticsService.getRevenueMetrics(query);
    
    return {
      revenueBySource: metrics.revenueBySource,
      topCourses: metrics.topCourses,
      totalRevenue: metrics.totalRevenue,
      timeRange: query.timeRange || 'month'
    };
  }

  @Get('payment-analysis')
  @ApiOperation({ summary: 'Get payment methods and regional analysis' })
  @ApiResponse({ 
    status: 200, 
    description: 'Payment analysis retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  async getPaymentAnalysis(@Query() query: AnalyticsQueryDto) {
    const analysis = await this.revenueAnalyticsService.getRevenueAnalysisData(query);
    
    return {
      paymentMethods: analysis.paymentMethods,
      regionAnalysis: analysis.regionAnalysis,
      timeRange: query.timeRange || 'month'
    };
  }

  @Post('record')
  @ApiOperation({ summary: 'Add a new revenue record' })
  @ApiResponse({ 
    status: 201, 
    description: 'Revenue record created successfully',
    type: Object
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        date: { type: 'string', format: 'date' },
        source: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        transactionCount: { type: 'number' },
        refunds: { type: 'number' },
        taxes: { type: 'number' },
        fees: { type: 'number' },
        courseId: { type: 'string' },
        paymentMethod: { type: 'string' },
        region: { type: 'string' },
        metadata: { type: 'object' }
      },
      required: ['date', 'source', 'amount']
    }
  })
  async addRevenueRecord(@Body() data: {
    date: Date;
    source: string;
    amount: number;
    currency?: string;
    transactionCount?: number;
    refunds?: number;
    taxes?: number;
    fees?: number;
    courseId?: string;
    paymentMethod?: string;
    region?: string;
    metadata?: any;
  }) {
    return this.revenueAnalyticsService.addRevenueRecord(data);
  }

  @Get('performance-metrics')
  @ApiOperation({ summary: 'Get revenue performance metrics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Performance metrics retrieved successfully',
    type: Object
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['day', 'week', 'month', 'quarter', 'year'] })
  async getPerformanceMetrics(@Query() query: AnalyticsQueryDto) {
    const metrics = await this.revenueAnalyticsService.getRevenueMetrics(query);
    
    return {
      totalRevenue: metrics.totalRevenue,
      netRevenue: metrics.netRevenue,
      revenueGrowth: metrics.revenueGrowth,
      avgTransactionValue: metrics.avgTransactionValue,
      refundRate: metrics.refundRate,
      transactionCount: metrics.totalTransactions,
      timeRange: query.timeRange || 'month'
    };
  }
}