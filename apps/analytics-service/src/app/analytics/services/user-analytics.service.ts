import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UserAnalyticsEntity, EventTrackingEntity } from '../entities';
import { AnalyticsQueryDto } from '../dto';

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userGrowth: number;
  avgSessionDuration: number;
  avgPageViews: number;
  engagementRate: number;
  retentionRate: number;
}

export interface UserEngagementData {
  dailyActiveUsers: Array<{ date: string; count: number }>;
  userActivities: Array<{ activity: string; count: number }>;
  learningProgress: Array<{ userId: string; progress: number }>;
  topUsers: Array<{ userId: string; score: number }>;
}

@Injectable()
export class UserAnalyticsService {
  constructor(
    @InjectRepository(UserAnalyticsEntity)
    private userAnalyticsRepository: Repository<UserAnalyticsEntity>,
    @InjectRepository(EventTrackingEntity)
    private eventTrackingRepository: Repository<EventTrackingEntity>
  ) {}

  async getUserMetrics(query: AnalyticsQueryDto): Promise<UserMetrics> {
    const { startDate, endDate } = this.getDateRange(query);
    
    // Get user analytics data
    const userStats = await this.userAnalyticsRepository
      .createQueryBuilder('ua')
      .select([
        'COUNT(DISTINCT ua.userId) as totalUsers',
        'AVG(ua.sessionDuration) as avgSessionDuration',
        'AVG(ua.pageViews) as avgPageViews',
        'SUM(ua.lessonsCompleted) as totalLessonsCompleted'
      ])
      .where('ua.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    // Get active users (users with activity in the period)
    const activeUsersCount = await this.eventTrackingRepository
      .createQueryBuilder('et')
      .select('COUNT(DISTINCT et.userId)', 'count')
      .where('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('et.userId IS NOT NULL')
      .getRawOne();

    // Get new users (first activity in the period)
    const newUsersCount = await this.eventTrackingRepository
      .createQueryBuilder('et')
      .select('COUNT(DISTINCT et.userId)', 'count')
      .where('et.eventType = :eventType', { eventType: 'user_registered' })
      .andWhere('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    // Calculate previous period for growth rate
    const periodDiff = new Date(endDate).getTime() - new Date(startDate).getTime();
    const prevStartDate = new Date(new Date(startDate).getTime() - periodDiff);
    const prevEndDate = new Date(startDate);

    const prevActiveUsers = await this.eventTrackingRepository
      .createQueryBuilder('et')
      .select('COUNT(DISTINCT et.userId)', 'count')
      .where('et.timestamp BETWEEN :startDate AND :endDate', { 
        startDate: prevStartDate, 
        endDate: prevEndDate 
      })
      .andWhere('et.userId IS NOT NULL')
      .getRawOne();

    const userGrowth = prevActiveUsers.count > 0 
      ? ((activeUsersCount.count - prevActiveUsers.count) / prevActiveUsers.count) * 100
      : 0;

    return {
      totalUsers: parseInt(userStats.totalUsers) || 0,
      activeUsers: parseInt(activeUsersCount.count) || 0,
      newUsers: parseInt(newUsersCount.count) || 0,
      userGrowth: parseFloat(userGrowth.toFixed(2)),
      avgSessionDuration: parseFloat(userStats.avgSessionDuration) || 0,
      avgPageViews: parseFloat(userStats.avgPageViews) || 0,
      engagementRate: this.calculateEngagementRate(userStats),
      retentionRate: await this.calculateRetentionRate(startDate, endDate)
    };
  }

  async getUserEngagementData(query: AnalyticsQueryDto): Promise<UserEngagementData> {
    const { startDate, endDate } = this.getDateRange(query);

    // Daily active users
    const dailyActiveUsers = await this.eventTrackingRepository
      .createQueryBuilder('et')
      .select([
        'DATE(et.timestamp) as date',
        'COUNT(DISTINCT et.userId) as count'
      ])
      .where('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('et.userId IS NOT NULL')
      .groupBy('DATE(et.timestamp)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // User activities breakdown
    const userActivities = await this.eventTrackingRepository
      .createQueryBuilder('et')
      .select([
        'et.eventType as activity',
        'COUNT(*) as count'
      ])
      .where('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('et.eventType')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Learning progress
    const learningProgress = await this.userAnalyticsRepository
      .createQueryBuilder('ua')
      .select([
        'ua.userId',
        'AVG(ua.avgProgress) as progress'
      ])
      .where('ua.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('ua.userId')
      .orderBy('progress', 'DESC')
      .limit(query.limit || 50)
      .getRawMany();

    // Top engaged users
    const topUsers = await this.userAnalyticsRepository
      .createQueryBuilder('ua')
      .select([
        'ua.userId',
        '(ua.sessionDuration + ua.pageViews + ua.lessonsCompleted * 10) as score'
      ])
      .where('ua.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('score', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      dailyActiveUsers: dailyActiveUsers.map(item => ({
        date: item.date,
        count: parseInt(item.count)
      })),
      userActivities: userActivities.map(item => ({
        activity: item.activity,
        count: parseInt(item.count)
      })),
      learningProgress: learningProgress.map(item => ({
        userId: item.userId,
        progress: parseFloat(item.progress) || 0
      })),
      topUsers: topUsers.map(item => ({
        userId: item.userId,
        score: parseFloat(item.score) || 0
      }))
    };
  }

  async getUserActivityTimeline(userId: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const activities = await this.eventTrackingRepository
      .createQueryBuilder('et')
      .select([
        'et.eventType',
        'et.courseId',
        'et.lessonId',
        'et.eventData',
        'et.timestamp'
      ])
      .where('et.userId = :userId', { userId })
      .andWhere('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('et.timestamp', 'DESC')
      .limit(query.limit || 100)
      .getMany();

    return activities.map(activity => ({
      type: activity.eventType,
      courseId: activity.courseId,
      lessonId: activity.lessonId,
      data: activity.eventData,
      timestamp: activity.timestamp
    }));
  }

  async updateUserAnalytics(userId: string, date: Date, metrics: Partial<UserAnalyticsEntity>) {
    const existing = await this.userAnalyticsRepository.findOne({
      where: { userId, date }
    });

    if (existing) {
      // Update existing record
      await this.userAnalyticsRepository.update(existing.id, {
        ...metrics,
        updatedAt: new Date()
      });
    } else {
      // Create new record
      const newAnalytics = this.userAnalyticsRepository.create({
        userId,
        date,
        ...metrics
      });
      await this.userAnalyticsRepository.save(newAnalytics);
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

  private calculateEngagementRate(userStats: any): number {
    const avgLessons = parseFloat(userStats.totalLessonsCompleted) || 0;
    const avgPageViews = parseFloat(userStats.avgPageViews) || 0;
    
    // Simple engagement calculation based on lessons and page views
    return Math.min((avgLessons * 10 + avgPageViews) / 100 * 100, 100);
  }

  private async calculateRetentionRate(startDate: Date, endDate: Date): Promise<number> {
    // Calculate 7-day retention rate
    const retentionPeriod = 7; // days
    const checkDate = new Date(endDate);
    checkDate.setDate(checkDate.getDate() - retentionPeriod);

    const initialUsers = await this.eventTrackingRepository
      .createQueryBuilder('et')
      .select('COUNT(DISTINCT et.userId)', 'count')
      .where('et.timestamp BETWEEN :startDate AND :checkDate', { 
        startDate, 
        checkDate 
      })
      .andWhere('et.userId IS NOT NULL')
      .getRawOne();

    const returningUsers = await this.eventTrackingRepository
      .createQueryBuilder('et1')
      .select('COUNT(DISTINCT et1.userId)', 'count')
      .where('et1.userId IN (SELECT DISTINCT et2.userId FROM event_tracking et2 WHERE et2.timestamp BETWEEN :startDate AND :checkDate)')
      .andWhere('et1.timestamp BETWEEN :checkDate AND :endDate', { checkDate, endDate })
      .setParameters({ startDate, checkDate })
      .getRawOne();

    return initialUsers.count > 0 
      ? (returningUsers.count / initialUsers.count) * 100
      : 0;
  }
}