import { Controller, Get, UseGuards, Query, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@edutech-lms/auth';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('student')
  @ApiResponse({ status: 200, description: 'Student dashboard data retrieved successfully' })
  async getStudentDashboard(@CurrentUser() user: any) {
    return this.dashboardService.getStudentDashboard(user.id);
  }

  @Get('instructor')
  @ApiResponse({ status: 200, description: 'Instructor dashboard data retrieved successfully' })
  async getInstructorDashboard(@CurrentUser() user: any) {
    return this.dashboardService.getInstructorDashboard(user.id);
  }

  @Get('admin')
  @ApiResponse({ status: 200, description: 'Admin dashboard data retrieved successfully' })
  async getAdminDashboard(@CurrentUser() user: any) {
    return this.dashboardService.getAdminDashboard(user.id);
  }

  @Get('stats')
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getStats(@CurrentUser() user: any) {
    return this.dashboardService.getStats(user.id, user.role);
  }

  @Get()
  @ApiOperation({ summary: 'Get overall dashboard data based on user role' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard(@CurrentUser() user: any) {
    switch (user.role) {
      case 'student':
        return this.dashboardService.getStudentDashboard(user.id);
      case 'teacher':
      case 'instructor':
        return this.dashboardService.getInstructorDashboard(user.id);
      case 'admin':
        return this.dashboardService.getAdminDashboard(user.id);
      default:
        return this.dashboardService.getStudentDashboard(user.id);
    }
  }

  @Get('quick-stats')
  @ApiOperation({ summary: 'Get quick stats for dashboard cards' })
  @ApiResponse({ status: 200, description: 'Quick stats retrieved successfully' })
  async getQuickStats(@CurrentUser() user: any) {
    return this.dashboardService.getStats(user.id, user.role);
  }

  @Get('activities')
  @ApiOperation({ summary: 'Get recent activities with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Recent activities retrieved successfully' })
  async getRecentActivities(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.dashboardService.getRecentActivities(user.id, page, limit);
  }

  @Get('learning-stats')
  @ApiOperation({ summary: 'Get learning statistics for charts' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'year'] })
  @ApiResponse({ status: 200, description: 'Learning statistics retrieved successfully' })
  async getLearningStats(
    @CurrentUser() user: any,
    @Query('period') period: 'week' | 'month' | 'year' = 'month'
  ) {
    return this.dashboardService.getLearningStats(user.id, period);
  }
}