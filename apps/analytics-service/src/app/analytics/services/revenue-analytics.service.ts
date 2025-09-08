import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevenueAnalyticsEntity } from '../entities';
import { AnalyticsQueryDto } from '../dto';

export interface RevenueMetrics {
  totalRevenue: number;
  netRevenue: number;
  totalTransactions: number;
  avgTransactionValue: number;
  revenueGrowth: number;
  refundRate: number;
  revenueBySource: Array<{
    source: string;
    amount: number;
    percentage: number;
    transactionCount: number;
  }>;
  topCourses: Array<{
    courseId: string;
    revenue: number;
    transactionCount: number;
  }>;
}

export interface RevenueAnalysisData {
  dailyRevenue: Array<{ date: string; amount: number; transactionCount: number }>;
  monthlyTrends: Array<{ month: string; amount: number }>;
  paymentMethods: Array<{ method: string; amount: number; count: number }>;
  regionAnalysis: Array<{ region: string; amount: number; count: number }>;
}

@Injectable()
export class RevenueAnalyticsService {
  constructor(
    @InjectRepository(RevenueAnalyticsEntity)
    private revenueAnalyticsRepository: Repository<RevenueAnalyticsEntity>
  ) {}

  async getRevenueMetrics(query: AnalyticsQueryDto): Promise<RevenueMetrics> {
    const { startDate, endDate } = this.getDateRange(query);

    // Get overall revenue statistics
    const revenueStats = await this.revenueAnalyticsRepository
      .createQueryBuilder('ra')
      .select([
        'SUM(ra.amount) as totalRevenue',
        'SUM(ra.netRevenue) as netRevenue',
        'SUM(ra.transactionCount) as totalTransactions',
        'AVG(ra.amount / ra.transactionCount) as avgTransactionValue',
        'SUM(ra.refunds) as totalRefunds'
      ])
      .where('ra.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    // Calculate growth rate
    const periodDiff = new Date(endDate).getTime() - new Date(startDate).getTime();
    const prevStartDate = new Date(new Date(startDate).getTime() - periodDiff);
    const prevEndDate = new Date(startDate);

    const prevRevenueStats = await this.revenueAnalyticsRepository
      .createQueryBuilder('ra')
      .select('SUM(ra.amount)', 'amount')
      .where('ra.date BETWEEN :startDate AND :endDate', { 
        startDate: prevStartDate, 
        endDate: prevEndDate 
      })
      .getRawOne();

    const revenueGrowth = prevRevenueStats.amount > 0 
      ? ((revenueStats.totalRevenue - prevRevenueStats.amount) / prevRevenueStats.amount) * 100
      : 0;

    // Get revenue by source
    const revenueBySource = await this.revenueAnalyticsRepository
      .createQueryBuilder('ra')
      .select([
        'ra.source',
        'SUM(ra.amount) as amount',
        'SUM(ra.transactionCount) as transactionCount'
      ])
      .where('ra.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('ra.source')
      .orderBy('amount', 'DESC')
      .getRawMany();

    const totalAmount = parseFloat(revenueStats.totalRevenue) || 0;

    // Get top revenue-generating courses
    const topCourses = await this.revenueAnalyticsRepository
      .createQueryBuilder('ra')
      .select([
        'ra.courseId',
        'SUM(ra.amount) as revenue',
        'SUM(ra.transactionCount) as transactionCount'
      ])
      .where('ra.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('ra.courseId IS NOT NULL')
      .groupBy('ra.courseId')
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany();

    const refundRate = totalAmount > 0 
      ? ((parseFloat(revenueStats.totalRefunds) || 0) / totalAmount) * 100
      : 0;

    return {
      totalRevenue: totalAmount,
      netRevenue: parseFloat(revenueStats.netRevenue) || 0,
      totalTransactions: parseInt(revenueStats.totalTransactions) || 0,
      avgTransactionValue: parseFloat(revenueStats.avgTransactionValue) || 0,
      revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
      refundRate: parseFloat(refundRate.toFixed(2)),
      revenueBySource: revenueBySource.map(item => ({
        source: item.source,
        amount: parseFloat(item.amount),
        percentage: totalAmount > 0 ? ((parseFloat(item.amount) / totalAmount) * 100) : 0,
        transactionCount: parseInt(item.transactionCount)
      })),
      topCourses: topCourses.map(item => ({
        courseId: item.courseId,
        revenue: parseFloat(item.revenue),
        transactionCount: parseInt(item.transactionCount)
      }))
    };
  }

  async getRevenueAnalysisData(query: AnalyticsQueryDto): Promise<RevenueAnalysisData> {
    const { startDate, endDate } = this.getDateRange(query);

    // Daily revenue trends
    const dailyRevenue = await this.revenueAnalyticsRepository
      .createQueryBuilder('ra')
      .select([
        'DATE(ra.date) as date',
        'SUM(ra.amount) as amount',
        'SUM(ra.transactionCount) as transactionCount'
      ])
      .where('ra.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(ra.date)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Monthly trends (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyTrends = await this.revenueAnalyticsRepository
      .createQueryBuilder('ra')
      .select([
        'DATE_FORMAT(ra.date, "%Y-%m") as month',
        'SUM(ra.amount) as amount'
      ])
      .where('ra.date >= :startDate', { startDate: twelveMonthsAgo })
      .groupBy('DATE_FORMAT(ra.date, "%Y-%m")')
      .orderBy('month', 'ASC')
      .getRawMany();

    // Payment methods analysis
    const paymentMethods = await this.revenueAnalyticsRepository
      .createQueryBuilder('ra')
      .select([
        'ra.paymentMethod as method',
        'SUM(ra.amount) as amount',
        'COUNT(*) as count'
      ])
      .where('ra.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('ra.paymentMethod IS NOT NULL')
      .groupBy('ra.paymentMethod')
      .orderBy('amount', 'DESC')
      .getRawMany();

    // Regional analysis
    const regionAnalysis = await this.revenueAnalyticsRepository
      .createQueryBuilder('ra')
      .select([
        'ra.region',
        'SUM(ra.amount) as amount',
        'COUNT(*) as count'
      ])
      .where('ra.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('ra.region IS NOT NULL')
      .groupBy('ra.region')
      .orderBy('amount', 'DESC')
      .limit(20)
      .getRawMany();

    return {
      dailyRevenue: dailyRevenue.map(item => ({
        date: item.date,
        amount: parseFloat(item.amount),
        transactionCount: parseInt(item.transactionCount)
      })),
      monthlyTrends: monthlyTrends.map(item => ({
        month: item.month,
        amount: parseFloat(item.amount)
      })),
      paymentMethods: paymentMethods.map(item => ({
        method: item.method,
        amount: parseFloat(item.amount),
        count: parseInt(item.count)
      })),
      regionAnalysis: regionAnalysis.map(item => ({
        region: item.region,
        amount: parseFloat(item.amount),
        count: parseInt(item.count)
      }))
    };
  }

  async getCourseRevenueAnalysis(courseId: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const courseRevenue = await this.revenueAnalyticsRepository
      .createQueryBuilder('ra')
      .select([
        'SUM(ra.amount) as totalRevenue',
        'SUM(ra.netRevenue) as netRevenue',
        'SUM(ra.transactionCount) as totalTransactions',
        'SUM(ra.refunds) as totalRefunds',
        'AVG(ra.amount / ra.transactionCount) as avgPrice'
      ])
      .where('ra.courseId = :courseId', { courseId })
      .andWhere('ra.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    // Daily revenue for the course
    const dailyRevenue = await this.revenueAnalyticsRepository
      .createQueryBuilder('ra')
      .select([
        'DATE(ra.date) as date',
        'SUM(ra.amount) as amount',
        'SUM(ra.transactionCount) as transactionCount'
      ])
      .where('ra.courseId = :courseId', { courseId })
      .andWhere('ra.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(ra.date)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      overview: {
        totalRevenue: parseFloat(courseRevenue.totalRevenue) || 0,
        netRevenue: parseFloat(courseRevenue.netRevenue) || 0,
        totalTransactions: parseInt(courseRevenue.totalTransactions) || 0,
        totalRefunds: parseFloat(courseRevenue.totalRefunds) || 0,
        avgPrice: parseFloat(courseRevenue.avgPrice) || 0
      },
      dailyRevenue: dailyRevenue.map(item => ({
        date: item.date,
        amount: parseFloat(item.amount),
        transactionCount: parseInt(item.transactionCount)
      }))
    };
  }

  async addRevenueRecord(data: {
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
    const netRevenue = data.amount - (data.refunds || 0) - (data.taxes || 0) - (data.fees || 0);

    const revenueRecord = this.revenueAnalyticsRepository.create({
      ...data,
      netRevenue,
      transactionCount: data.transactionCount || 1,
      currency: data.currency || 'USD'
    });

    return this.revenueAnalyticsRepository.save(revenueRecord);
  }

  async getFinancialSummary(query: AnalyticsQueryDto) {
    const [metrics, analysisData] = await Promise.all([
      this.getRevenueMetrics(query),
      this.getRevenueAnalysisData(query)
    ]);

    return {
      summary: {
        totalRevenue: metrics.totalRevenue,
        netRevenue: metrics.netRevenue,
        totalTransactions: metrics.totalTransactions,
        avgTransactionValue: metrics.avgTransactionValue,
        revenueGrowth: metrics.revenueGrowth,
        refundRate: metrics.refundRate
      },
      trends: analysisData.dailyRevenue,
      breakdown: metrics.revenueBySource,
      topCourses: metrics.topCourses,
      paymentMethods: analysisData.paymentMethods,
      regions: analysisData.regionAnalysis,
      timeRange: query.timeRange || 'month'
    };
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