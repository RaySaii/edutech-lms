import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseAnalyticsEntity, EventTrackingEntity } from '../entities';
import { AnalyticsQueryDto } from '../dto';

export interface CourseMetrics {
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  avgCompletionRate: number;
  avgRating: number;
  totalRevenue: number;
  popularCourses: Array<{
    courseId: string;
    enrollments: number;
    completionRate: number;
    rating: number;
  }>;
}

export interface CoursePerformanceData {
  enrollmentTrends: Array<{ date: string; enrollments: number }>;
  completionRates: Array<{ courseId: string; rate: number }>;
  dropoffAnalysis: Array<{ courseId: string; dropoffPoints: any[] }>;
  engagementMetrics: Array<{ courseId: string; metrics: any }>;
}

@Injectable()
export class CourseAnalyticsService {
  constructor(
    @InjectRepository(CourseAnalyticsEntity)
    private courseAnalyticsRepository: Repository<CourseAnalyticsEntity>,
    @InjectRepository(EventTrackingEntity)
    private eventTrackingRepository: Repository<EventTrackingEntity>
  ) {}

  async getCourseMetrics(query: AnalyticsQueryDto): Promise<CourseMetrics> {
    const { startDate, endDate } = this.getDateRange(query);

    // Get overall course statistics
    const courseStats = await this.courseAnalyticsRepository
      .createQueryBuilder('ca')
      .select([
        'COUNT(DISTINCT ca.courseId) as totalCourses',
        'SUM(ca.enrollments) as totalEnrollments',
        'AVG(ca.completionRate) as avgCompletionRate',
        'AVG(ca.avgRating) as avgRating',
        'SUM(ca.revenue) as totalRevenue'
      ])
      .where('ca.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    // Get popular courses
    const popularCourses = await this.courseAnalyticsRepository
      .createQueryBuilder('ca')
      .select([
        'ca.courseId',
        'SUM(ca.enrollments) as enrollments',
        'AVG(ca.completionRate) as completionRate',
        'AVG(ca.avgRating) as rating'
      ])
      .where('ca.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('ca.courseId')
      .orderBy('enrollments', 'DESC')
      .limit(10)
      .getRawMany();

    // Count published courses (courses with activity)
    const publishedCount = await this.courseAnalyticsRepository
      .createQueryBuilder('ca')
      .select('COUNT(DISTINCT ca.courseId)', 'count')
      .where('ca.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('ca.enrollments > 0')
      .getRawOne();

    return {
      totalCourses: parseInt(courseStats.totalCourses) || 0,
      publishedCourses: parseInt(publishedCount.count) || 0,
      totalEnrollments: parseInt(courseStats.totalEnrollments) || 0,
      avgCompletionRate: parseFloat(courseStats.avgCompletionRate) || 0,
      avgRating: parseFloat(courseStats.avgRating) || 0,
      totalRevenue: parseFloat(courseStats.totalRevenue) || 0,
      popularCourses: popularCourses.map(course => ({
        courseId: course.courseId,
        enrollments: parseInt(course.enrollments),
        completionRate: parseFloat(course.completionRate),
        rating: parseFloat(course.rating)
      }))
    };
  }

  async getCoursePerformanceData(query: AnalyticsQueryDto): Promise<CoursePerformanceData> {
    const { startDate, endDate } = this.getDateRange(query);

    // Enrollment trends over time
    const enrollmentTrends = await this.courseAnalyticsRepository
      .createQueryBuilder('ca')
      .select([
        'DATE(ca.date) as date',
        'SUM(ca.enrollments) as enrollments'
      ])
      .where('ca.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(ca.date)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Course completion rates
    const completionRates = await this.courseAnalyticsRepository
      .createQueryBuilder('ca')
      .select([
        'ca.courseId',
        'AVG(ca.completionRate) as rate'
      ])
      .where('ca.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('ca.courseId')
      .orderBy('rate', 'DESC')
      .limit(query.limit || 50)
      .getRawMany();

    // Dropoff analysis
    const dropoffAnalysis = await this.courseAnalyticsRepository
      .createQueryBuilder('ca')
      .select([
        'ca.courseId',
        'ca.dropoffPoints'
      ])
      .where('ca.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('ca.dropoffPoints IS NOT NULL')
      .getMany();

    // Engagement metrics
    const engagementMetrics = await this.courseAnalyticsRepository
      .createQueryBuilder('ca')
      .select([
        'ca.courseId',
        'ca.engagementMetrics'
      ])
      .where('ca.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('ca.engagementMetrics IS NOT NULL')
      .getMany();

    return {
      enrollmentTrends: enrollmentTrends.map(item => ({
        date: item.date,
        enrollments: parseInt(item.enrollments)
      })),
      completionRates: completionRates.map(item => ({
        courseId: item.courseId,
        rate: parseFloat(item.rate)
      })),
      dropoffAnalysis: dropoffAnalysis.map(item => ({
        courseId: item.courseId,
        dropoffPoints: item.dropoffPoints || []
      })),
      engagementMetrics: engagementMetrics.map(item => ({
        courseId: item.courseId,
        metrics: item.engagementMetrics || {}
      }))
    };
  }

  async getCourseAnalytics(courseId: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const courseData = await this.courseAnalyticsRepository
      .createQueryBuilder('ca')
      .select([
        'SUM(ca.enrollments) as totalEnrollments',
        'SUM(ca.completions) as totalCompletions',
        'AVG(ca.completionRate) as completionRate',
        'AVG(ca.avgProgress) as avgProgress',
        'SUM(ca.totalViews) as totalViews',
        'SUM(ca.uniqueViews) as uniqueViews',
        'SUM(ca.totalWatchTime) as totalWatchTime',
        'AVG(ca.avgRating) as avgRating',
        'SUM(ca.totalReviews) as totalReviews',
        'SUM(ca.revenue) as revenue'
      ])
      .where('ca.courseId = :courseId', { courseId })
      .andWhere('ca.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    // Get daily enrollment data
    const dailyEnrollments = await this.courseAnalyticsRepository
      .createQueryBuilder('ca')
      .select([
        'DATE(ca.date) as date',
        'SUM(ca.enrollments) as enrollments'
      ])
      .where('ca.courseId = :courseId', { courseId })
      .andWhere('ca.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(ca.date)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Get lesson-level analytics
    const lessonAnalytics = await this.eventTrackingRepository
      .createQueryBuilder('et')
      .select([
        'et.lessonId',
        'COUNT(DISTINCT et.userId) as uniqueViewers',
        'COUNT(*) as totalViews',
        'AVG(et.duration) as avgWatchTime'
      ])
      .where('et.courseId = :courseId', { courseId })
      .andWhere('et.eventType IN (:...eventTypes)', { 
        eventTypes: ['lesson_start', 'lesson_complete', 'lesson_progress'] 
      })
      .andWhere('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('et.lessonId IS NOT NULL')
      .groupBy('et.lessonId')
      .getRawMany();

    return {
      overview: {
        totalEnrollments: parseInt(courseData.totalEnrollments) || 0,
        totalCompletions: parseInt(courseData.totalCompletions) || 0,
        completionRate: parseFloat(courseData.completionRate) || 0,
        avgProgress: parseFloat(courseData.avgProgress) || 0,
        totalViews: parseInt(courseData.totalViews) || 0,
        uniqueViews: parseInt(courseData.uniqueViews) || 0,
        totalWatchTime: parseInt(courseData.totalWatchTime) || 0,
        avgRating: parseFloat(courseData.avgRating) || 0,
        totalReviews: parseInt(courseData.totalReviews) || 0,
        revenue: parseFloat(courseData.revenue) || 0
      },
      enrollmentTrend: dailyEnrollments.map(item => ({
        date: item.date,
        enrollments: parseInt(item.enrollments)
      })),
      lessonAnalytics: lessonAnalytics.map(item => ({
        lessonId: item.lessonId,
        uniqueViewers: parseInt(item.uniqueViewers),
        totalViews: parseInt(item.totalViews),
        avgWatchTime: parseFloat(item.avgWatchTime) || 0
      }))
    };
  }

  async getCourseComparison(courseIds: string[], query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const comparisons = await Promise.all(
      courseIds.map(async (courseId) => {
        const data = await this.getCourseAnalytics(courseId, query);
        return {
          courseId,
          ...data.overview
        };
      })
    );

    return {
      courses: comparisons,
      comparisonDate: new Date().toISOString()
    };
  }

  async updateCourseAnalytics(courseId: string, date: Date, metrics: Partial<CourseAnalyticsEntity>) {
    const existing = await this.courseAnalyticsRepository.findOne({
      where: { courseId, date }
    });

    if (existing) {
      // Update existing record
      await this.courseAnalyticsRepository.update(existing.id, {
        ...metrics,
        updatedAt: new Date()
      });
    } else {
      // Create new record
      const newAnalytics = this.courseAnalyticsRepository.create({
        courseId,
        date,
        ...metrics
      });
      await this.courseAnalyticsRepository.save(newAnalytics);
    }
  }

  private getDateRange(query: AnalyticsQueryDto) {
    if (query.startDate && query.endDate) {
      return {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate)
      };
    }

    const endDate = new Date();
    let startDate = new Date();

    switch (query.timeRange) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 1);
    }

    return { startDate, endDate };
  }
}