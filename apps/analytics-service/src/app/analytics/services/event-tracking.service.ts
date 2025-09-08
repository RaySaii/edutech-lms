import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventTrackingEntity } from '../entities';
import { CreateEventDto, AnalyticsQueryDto } from '../dto';

@Injectable()
export class EventTrackingService {
  constructor(
    @InjectRepository(EventTrackingEntity)
    private eventTrackingRepository: Repository<EventTrackingEntity>
  ) {}

  async trackEvent(eventData: CreateEventDto): Promise<EventTrackingEntity> {
    const event = this.eventTrackingRepository.create({
      ...eventData,
      timestamp: eventData.timestamp || new Date()
    });

    return this.eventTrackingRepository.save(event);
  }

  async trackBulkEvents(eventsData: CreateEventDto[]): Promise<EventTrackingEntity[]> {
    const events = eventsData.map(eventData => 
      this.eventTrackingRepository.create({
        ...eventData,
        timestamp: eventData.timestamp || new Date()
      })
    );

    return this.eventTrackingRepository.save(events);
  }

  async getEventsByType(eventType: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    return this.eventTrackingRepository
      .createQueryBuilder('et')
      .where('et.eventType = :eventType', { eventType })
      .andWhere('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('et.timestamp', 'DESC')
      .limit(query.limit || 1000)
      .offset(query.offset || 0)
      .getMany();
  }

  async getEventsByUser(userId: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    return this.eventTrackingRepository
      .createQueryBuilder('et')
      .where('et.userId = :userId', { userId })
      .andWhere('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('et.timestamp', 'DESC')
      .limit(query.limit || 1000)
      .offset(query.offset || 0)
      .getMany();
  }

  async getEventsByCourse(courseId: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    return this.eventTrackingRepository
      .createQueryBuilder('et')
      .where('et.courseId = :courseId', { courseId })
      .andWhere('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('et.timestamp', 'DESC')
      .limit(query.limit || 1000)
      .offset(query.offset || 0)
      .getMany();
  }

  async getEventStatistics(query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const stats = await this.eventTrackingRepository
      .createQueryBuilder('et')
      .select([
        'et.eventType',
        'COUNT(*) as count',
        'COUNT(DISTINCT et.userId) as uniqueUsers',
        'COUNT(DISTINCT et.sessionId) as uniqueSessions'
      ])
      .where('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('et.eventType')
      .orderBy('count', 'DESC')
      .getRawMany();

    return stats.map(stat => ({
      eventType: stat.eventType,
      count: parseInt(stat.count),
      uniqueUsers: parseInt(stat.uniqueUsers),
      uniqueSessions: parseInt(stat.uniqueSessions)
    }));
  }

  async getHourlyActivity(query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const hourlyData = await this.eventTrackingRepository
      .createQueryBuilder('et')
      .select([
        'HOUR(et.timestamp) as hour',
        'COUNT(*) as count',
        'COUNT(DISTINCT et.userId) as uniqueUsers'
      ])
      .where('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('HOUR(et.timestamp)')
      .orderBy('hour', 'ASC')
      .getRawMany();

    return hourlyData.map(data => ({
      hour: parseInt(data.hour),
      count: parseInt(data.count),
      uniqueUsers: parseInt(data.uniqueUsers)
    }));
  }

  async getUserJourney(userId: string, sessionId?: string, query?: AnalyticsQueryDto) {
    let queryBuilder = this.eventTrackingRepository
      .createQueryBuilder('et')
      .where('et.userId = :userId', { userId });

    if (sessionId) {
      queryBuilder = queryBuilder.andWhere('et.sessionId = :sessionId', { sessionId });
    }

    if (query) {
      const { startDate, endDate } = this.getDateRange(query);
      queryBuilder = queryBuilder.andWhere('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const events = await queryBuilder
      .orderBy('et.timestamp', 'ASC')
      .limit(query?.limit || 1000)
      .getMany();

    return events.map(event => ({
      eventType: event.eventType,
      timestamp: event.timestamp,
      pagePath: event.pagePath,
      courseId: event.courseId,
      lessonId: event.lessonId,
      duration: event.duration,
      eventData: event.eventData
    }));
  }

  async getDeviceAnalytics(query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const deviceStats = await this.eventTrackingRepository
      .createQueryBuilder('et')
      .select([
        'et.deviceType',
        'et.browser',
        'et.operatingSystem',
        'COUNT(*) as count',
        'COUNT(DISTINCT et.userId) as uniqueUsers'
      ])
      .where('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('et.deviceType IS NOT NULL')
      .groupBy('et.deviceType, et.browser, et.operatingSystem')
      .orderBy('count', 'DESC')
      .getRawMany();

    return {
      devices: deviceStats.map(stat => ({
        deviceType: stat.deviceType,
        browser: stat.browser,
        operatingSystem: stat.operatingSystem,
        count: parseInt(stat.count),
        uniqueUsers: parseInt(stat.uniqueUsers)
      })),
      summary: await this.getDeviceSummary(startDate, endDate)
    };
  }

  private async getDeviceSummary(startDate: Date, endDate: Date) {
    const deviceTypeSummary = await this.eventTrackingRepository
      .createQueryBuilder('et')
      .select([
        'et.deviceType',
        'COUNT(*) as count',
        'COUNT(DISTINCT et.userId) as uniqueUsers'
      ])
      .where('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('et.deviceType IS NOT NULL')
      .groupBy('et.deviceType')
      .orderBy('count', 'DESC')
      .getRawMany();

    const browserSummary = await this.eventTrackingRepository
      .createQueryBuilder('et')
      .select([
        'et.browser',
        'COUNT(*) as count',
        'COUNT(DISTINCT et.userId) as uniqueUsers'
      ])
      .where('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('et.browser IS NOT NULL')
      .groupBy('et.browser')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      byDeviceType: deviceTypeSummary.map(stat => ({
        deviceType: stat.deviceType,
        count: parseInt(stat.count),
        uniqueUsers: parseInt(stat.uniqueUsers)
      })),
      byBrowser: browserSummary.map(stat => ({
        browser: stat.browser,
        count: parseInt(stat.count),
        uniqueUsers: parseInt(stat.uniqueUsers)
      }))
    };
  }

  async getPageAnalytics(query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const pageStats = await this.eventTrackingRepository
      .createQueryBuilder('et')
      .select([
        'et.pagePath',
        'COUNT(*) as pageViews',
        'COUNT(DISTINCT et.userId) as uniqueVisitors',
        'COUNT(DISTINCT et.sessionId) as sessions',
        'AVG(et.duration) as avgTimeOnPage'
      ])
      .where('et.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('et.pagePath IS NOT NULL')
      .groupBy('et.pagePath')
      .orderBy('pageViews', 'DESC')
      .limit(query.limit || 50)
      .getRawMany();

    return pageStats.map(stat => ({
      pagePath: stat.pagePath,
      pageViews: parseInt(stat.pageViews),
      uniqueVisitors: parseInt(stat.uniqueVisitors),
      sessions: parseInt(stat.sessions),
      avgTimeOnPage: parseFloat(stat.avgTimeOnPage) || 0
    }));
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