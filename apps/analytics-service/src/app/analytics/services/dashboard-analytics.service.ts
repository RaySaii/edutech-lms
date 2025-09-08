import { Injectable } from '@nestjs/common';
import { UserAnalyticsService } from './user-analytics.service';
import { CourseAnalyticsService } from './course-analytics.service';
import { RevenueAnalyticsService } from './revenue-analytics.service';
import { EventTrackingService } from './event-tracking.service';
import { AnalyticsQueryDto, TimeRange } from '../dto';

export interface DashboardOverview {
  users: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    userGrowth: number;
  };
  courses: {
    totalCourses: number;
    publishedCourses: number;
    totalEnrollments: number;
    avgCompletionRate: number;
  };
  revenue: {
    totalRevenue: number;
    revenueGrowth: number;
    avgTransactionValue: number;
    totalTransactions: number;
  };
  engagement: {
    avgSessionDuration: number;
    avgPageViews: number;
    engagementRate: number;
    retentionRate: number;
  };
}

export interface DashboardCharts {
  userGrowth: Array<{ date: string; count: number }>;
  enrollmentTrends: Array<{ date: string; enrollments: number }>;
  revenueTrends: Array<{ date: string; amount: number }>;
  popularCourses: Array<{ courseId: string; enrollments: number; rating: number }>;
  userActivities: Array<{ activity: string; count: number }>;
  deviceBreakdown: Array<{ deviceType: string; count: number; percentage: number }>;
}

@Injectable()
export class DashboardAnalyticsService {
  constructor(
    private userAnalyticsService: UserAnalyticsService,
    private courseAnalyticsService: CourseAnalyticsService,
    private revenueAnalyticsService: RevenueAnalyticsService,
    private eventTrackingService: EventTrackingService
  ) {}

  async getDashboardOverview(query: AnalyticsQueryDto): Promise<DashboardOverview> {
    // Return mock data until database entities are properly configured
    return {
      users: {
        totalUsers: 12450,
        activeUsers: 8320,
        newUsers: 1250,
        userGrowth: 15.8
      },
      courses: {
        totalCourses: 145,
        publishedCourses: 128,
        totalEnrollments: 45680,
        avgCompletionRate: 74.2
      },
      revenue: {
        totalRevenue: 234500.75,
        revenueGrowth: 22.3,
        avgTransactionValue: 89.50,
        totalTransactions: 2620
      },
      engagement: {
        avgSessionDuration: 28.5,
        avgPageViews: 12.3,
        engagementRate: 68.7,
        retentionRate: 82.1
      }
    };
  }

  async getDashboardCharts(query: AnalyticsQueryDto): Promise<DashboardCharts> {
    // Return mock chart data until database entities are properly configured
    const mockUserGrowth = [];
    const mockEnrollmentTrends = [];
    const mockRevenueTrends = [];
    
    // Generate last 30 days of mock data
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      mockUserGrowth.push({
        date: dateStr,
        count: Math.floor(Math.random() * 100) + 200
      });
      
      mockEnrollmentTrends.push({
        date: dateStr,
        enrollments: Math.floor(Math.random() * 50) + 20
      });
      
      mockRevenueTrends.push({
        date: dateStr,
        amount: Math.floor(Math.random() * 2000) + 500
      });
    }

    return {
      userGrowth: mockUserGrowth,
      enrollmentTrends: mockEnrollmentTrends,
      revenueTrends: mockRevenueTrends,
      popularCourses: [
        { courseId: 'course-1', enrollments: 1250, rating: 4.8 },
        { courseId: 'course-2', enrollments: 980, rating: 4.6 },
        { courseId: 'course-3', enrollments: 875, rating: 4.7 },
        { courseId: 'course-4', enrollments: 720, rating: 4.5 },
        { courseId: 'course-5', enrollments: 650, rating: 4.4 }
      ],
      userActivities: [
        { activity: 'Lesson Completed', count: 2450 },
        { activity: 'Quiz Taken', count: 1820 },
        { activity: 'Course Enrolled', count: 1250 },
        { activity: 'Forum Post', count: 890 },
        { activity: 'Certificate Earned', count: 320 }
      ],
      deviceBreakdown: [
        { deviceType: 'Desktop', count: 5240, percentage: 62.1 },
        { deviceType: 'Mobile', count: 2560, percentage: 30.3 },
        { deviceType: 'Tablet', count: 640, percentage: 7.6 }
      ]
    };
  }

  async getComprehensiveDashboard(query: AnalyticsQueryDto) {
    const [overview, charts] = await Promise.all([
      this.getDashboardOverview(query),
      this.getDashboardCharts(query)
    ]);

    return {
      overview,
      charts,
      metadata: {
        timeRange: query.timeRange || 'month',
        generatedAt: new Date().toISOString(),
        dataPoints: {
          userGrowthPoints: charts.userGrowth.length,
          enrollmentTrendPoints: charts.enrollmentTrends.length,
          revenueTrendPoints: charts.revenueTrends.length,
          popularCoursesCount: charts.popularCourses.length,
          userActivitiesCount: charts.userActivities.length,
          deviceTypesCount: charts.deviceBreakdown.length
        }
      }
    };
  }

  async getExecutiveSummary(query: AnalyticsQueryDto) {
    const overview = await this.getDashboardOverview(query);
    const revenueMetrics = await this.revenueAnalyticsService.getRevenueMetrics(query);

    return {
      keyMetrics: {
        totalUsers: overview.users.totalUsers,
        totalRevenue: overview.revenue.totalRevenue,
        totalEnrollments: overview.courses.totalEnrollments,
        avgCompletionRate: overview.courses.avgCompletionRate
      },
      growth: {
        userGrowth: overview.users.userGrowth,
        revenueGrowth: overview.revenue.revenueGrowth,
        newUsers: overview.users.newUsers,
        activeUsers: overview.users.activeUsers
      },
      revenueBreakdown: revenueMetrics.revenueBySource.slice(0, 5),
      topPerformingCourses: revenueMetrics.topCourses.slice(0, 5),
      insights: await this.generateInsights(overview, revenueMetrics),
      timeRange: query.timeRange || 'month',
      generatedAt: new Date().toISOString()
    };
  }

  async getRealtimeMetrics() {
    // Get real-time metrics for the last 24 hours
    const query: AnalyticsQueryDto = {
      timeRange: TimeRange.DAY
    };

    const [
      userMetrics,
      eventStats,
      hourlyActivity
    ] = await Promise.all([
      this.userAnalyticsService.getUserMetrics(query),
      this.eventTrackingService.getEventStatistics(query),
      this.eventTrackingService.getHourlyActivity(query)
    ]);

    return {
      activeUsers: userMetrics.activeUsers,
      totalEvents: eventStats.reduce((sum, stat) => sum + stat.count, 0),
      topEvents: eventStats.slice(0, 5),
      hourlyActivity,
      timestamp: new Date().toISOString()
    };
  }

  private async generateInsights(overview: DashboardOverview, revenueMetrics: any) {
    const insights = [];

    // User growth insights
    if (overview.users.userGrowth > 10) {
      insights.push({
        type: 'positive',
        category: 'users',
        message: `Strong user growth of ${overview.users.userGrowth.toFixed(1)}% indicates effective marketing and user acquisition strategies.`
      });
    } else if (overview.users.userGrowth < 0) {
      insights.push({
        type: 'warning',
        category: 'users',
        message: `User growth is declining by ${Math.abs(overview.users.userGrowth).toFixed(1)}%. Consider reviewing user acquisition and retention strategies.`
      });
    }

    // Revenue insights
    if (overview.revenue.revenueGrowth > 15) {
      insights.push({
        type: 'positive',
        category: 'revenue',
        message: `Excellent revenue growth of ${overview.revenue.revenueGrowth.toFixed(1)}% shows strong monetization performance.`
      });
    } else if (overview.revenue.revenueGrowth < 0) {
      insights.push({
        type: 'warning',
        category: 'revenue',
        message: `Revenue declined by ${Math.abs(overview.revenue.revenueGrowth).toFixed(1)}%. Review pricing strategy and course offerings.`
      });
    }

    // Course completion insights
    if (overview.courses.avgCompletionRate < 50) {
      insights.push({
        type: 'warning',
        category: 'courses',
        message: `Low completion rate of ${overview.courses.avgCompletionRate.toFixed(1)}% suggests need for improved course engagement and structure.`
      });
    } else if (overview.courses.avgCompletionRate > 80) {
      insights.push({
        type: 'positive',
        category: 'courses',
        message: `High completion rate of ${overview.courses.avgCompletionRate.toFixed(1)}% indicates excellent course quality and engagement.`
      });
    }

    // Engagement insights
    if (overview.engagement.retentionRate < 30) {
      insights.push({
        type: 'warning',
        category: 'engagement',
        message: `Low retention rate of ${overview.engagement.retentionRate.toFixed(1)}% needs immediate attention to improve user stickiness.`
      });
    }

    return insights;
  }
}