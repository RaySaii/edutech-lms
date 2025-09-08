import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { Course } from './course.entity';
import { Content } from './content.entity';

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  DURATION = 'duration',
  RATE = 'rate',
}

export enum AggregationType {
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  UNIQUE_COUNT = 'unique_count',
  PERCENTILE = 'percentile',
}

export enum ReportType {
  USER_ACTIVITY = 'user_activity',
  COURSE_PERFORMANCE = 'course_performance',
  LEARNING_PROGRESS = 'learning_progress',
  ENGAGEMENT_METRICS = 'engagement_metrics',
  COMPLETION_RATES = 'completion_rates',
  TIME_ANALYSIS = 'time_analysis',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  XLSX = 'xlsx',
  PDF = 'pdf',
  HTML = 'html',
}

@Entity('analytics_events')
@Index(['organizationId'])
@Index(['userId'])
@Index(['eventType'])
@Index(['timestamp'])
@Index(['resourceType', 'resourceId'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid', { nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column('varchar', { length: 100 })
  eventType: string; // e.g., 'page_view', 'video_start', 'quiz_completed'

  @Column('varchar', { length: 100, nullable: true })
  resourceType?: string; // e.g., 'course', 'content', 'assessment'

  @Column('uuid', { nullable: true })
  resourceId?: string;

  @Column('jsonb')
  properties: Record<string, any>; // Event-specific data

  @Column('varchar', { length: 100, nullable: true })
  sessionId?: string;

  @Column('varchar', { length: 45, nullable: true })
  ipAddress?: string;

  @Column('varchar', { length: 500, nullable: true })
  userAgent?: string;

  @Column('varchar', { length: 200, nullable: true })
  referrer?: string;

  @Column('varchar', { length: 100, nullable: true })
  deviceType?: string; // 'desktop', 'mobile', 'tablet'

  @Column('varchar', { length: 100, nullable: true })
  browser?: string;

  @Column('varchar', { length: 100, nullable: true })
  operatingSystem?: string;

  @Column('varchar', { length: 100, nullable: true })
  country?: string;

  @Column('varchar', { length: 100, nullable: true })
  city?: string;

  @Column('varchar', { length: 50, nullable: true })
  timezone?: string;

  @Column('timestamp')
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('analytics_metrics')
@Index(['organizationId'])
@Index(['metricName'])
@Index(['timestamp'])
@Index(['dimensions'])
export class AnalyticsMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('varchar', { length: 100 })
  metricName: string; // e.g., 'active_users', 'course_completions', 'engagement_score'

  @Column({
    type: 'enum',
    enum: MetricType,
    default: MetricType.COUNTER,
  })
  type: MetricType;

  @Column('decimal', { precision: 15, scale: 4 })
  value: number;

  @Column('varchar', { length: 20, nullable: true })
  unit?: string; // e.g., 'count', 'seconds', 'bytes', 'percent'

  @Column('jsonb', { nullable: true })
  dimensions?: Record<string, string>; // Grouping dimensions like course_id, user_role, etc.

  @Column('jsonb', { nullable: true })
  metadata?: {
    source?: string; // Where the metric came from
    quality?: number; // Data quality score 0-1
    confidence?: number; // Confidence level 0-1
    tags?: string[];
  };

  @Column('timestamp')
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('analytics_dashboards')
@Index(['organizationId'])
@Index(['createdBy'])
@Index(['isPublic'])
export class AnalyticsDashboard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 200 })
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid')
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column('jsonb')
  layout: {
    grid: Array<{
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
    }>;
    breakpoints: Record<string, number>;
    columns: Record<string, number>;
  };

  @OneToMany(() => DashboardWidget, widget => widget.dashboard, { cascade: true })
  widgets: DashboardWidget[];

  @Column('simple-array', { nullable: true })
  tags?: string[];

  @Column('varchar', { length: 100, nullable: true })
  category?: string;

  @Column('jsonb', { nullable: true })
  settings?: {
    autoRefresh?: number; // seconds
    theme?: 'light' | 'dark';
    density?: 'comfortable' | 'compact';
    showLegend?: boolean;
    showTooltips?: boolean;
  };

  @Column('simple-array', { nullable: true })
  sharedWith?: string[]; // User IDs who can view this dashboard

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastViewedAt?: Date;

  @Column('int', { default: 0 })
  viewCount: number;
}

@Entity('dashboard_widgets')
@Index(['dashboardId'])
@Index(['type'])
export class DashboardWidget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  dashboardId: string;

  @ManyToOne(() => AnalyticsDashboard, dashboard => dashboard.widgets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dashboardId' })
  dashboard: AnalyticsDashboard;

  @Column('varchar', { length: 100 })
  title: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('varchar', { length: 50 })
  type: string; // 'chart', 'metric', 'table', 'text', 'iframe'

  @Column('varchar', { length: 50, nullable: true })
  chartType?: string; // 'line', 'bar', 'pie', 'area', 'scatter', 'heatmap'

  @Column('jsonb')
  query: {
    metrics: Array<{
      name: string;
      aggregation: AggregationType;
      field?: string;
    }>;
    dimensions?: string[];
    filters?: Array<{
      field: string;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
      value: any;
    }>;
    timeRange: {
      type: 'relative' | 'absolute';
      value: string; // '7d', '1M', '2023-01-01 to 2023-12-31'
    };
    groupBy?: string[];
    limit?: number;
  };

  @Column('jsonb', { nullable: true })
  visualization?: {
    colors?: string[];
    xAxis?: {
      title?: string;
      type?: 'category' | 'datetime' | 'numeric';
      format?: string;
    };
    yAxis?: {
      title?: string;
      format?: string;
      min?: number;
      max?: number;
    };
    legend?: {
      position?: 'top' | 'bottom' | 'left' | 'right' | 'none';
      align?: 'start' | 'center' | 'end';
    };
    tooltip?: {
      format?: string;
      enabled?: boolean;
    };
    annotations?: Array<{
      type: 'line' | 'area' | 'point';
      value: any;
      label?: string;
      color?: string;
    }>;
  };

  @Column('int', { default: 0 })
  position: number; // Order in dashboard

  @Column('jsonb', { nullable: true })
  size?: {
    width: number;
    height: number;
  };

  @Column({ default: true })
  isVisible: boolean;

  @Column('int', { default: 300 })
  refreshInterval: number; // seconds

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('analytics_reports')
@Index(['organizationId'])
@Index(['type'])
@Index(['createdBy'])
@Index(['scheduledAt'])
export class AnalyticsReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 200 })
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ReportType,
  })
  type: ReportType;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid')
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column('jsonb')
  configuration: {
    metrics: string[];
    dimensions: string[];
    filters: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    timeRange: {
      type: 'relative' | 'absolute';
      value: string;
    };
    groupBy?: string[];
    orderBy?: Array<{
      field: string;
      direction: 'asc' | 'desc';
    }>;
    limit?: number;
  };

  @Column({
    type: 'enum',
    enum: ReportFormat,
    default: ReportFormat.JSON,
  })
  format: ReportFormat;

  @Column({ default: false })
  isScheduled: boolean;

  @Column('varchar', { length: 100, nullable: true })
  schedule?: string; // Cron expression

  @Column({ nullable: true })
  scheduledAt?: Date;

  @Column('simple-array', { nullable: true })
  recipients?: string[]; // Email addresses

  @Column({ default: true })
  isActive: boolean;

  @Column('varchar', { length: 500, nullable: true })
  outputPath?: string; // Where the generated report is stored

  @Column({ nullable: true })
  lastRunAt?: Date;

  @Column({ nullable: true })
  nextRunAt?: Date;

  @Column('text', { nullable: true })
  lastRunStatus?: string;

  @Column('text', { nullable: true })
  lastRunError?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('user_analytics_profiles')
@Index(['organizationId'])
@Index(['userId'])
export class UserAnalyticsProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Learning behavior analytics
  @Column('jsonb', { nullable: true })
  learningPatterns?: {
    preferredTimeOfDay?: string[]; // Hours when user is most active
    averageSessionDuration?: number; // in minutes
    sessionsPerWeek?: number;
    preferredContentTypes?: string[]; // video, text, interactive, etc.
    completionRate?: number; // 0-100
    engagementScore?: number; // 0-100
    streakDays?: number; // Current learning streak
    longestStreak?: number;
  };

  // Performance analytics
  @Column('jsonb', { nullable: true })
  performanceMetrics?: {
    averageQuizScore?: number;
    timeToCompletion?: number; // Average time to complete courses
    retryRate?: number; // How often they retry assessments
    helpSeekingBehavior?: number; // Frequency of asking for help
    difficultyPreference?: 'easy' | 'medium' | 'hard';
    masteryLevel?: Record<string, number>; // Subject -> mastery score
  };

  // Engagement analytics
  @Column('jsonb', { nullable: true })
  engagementMetrics?: {
    forumParticipation?: number; // Posts/comments per week
    peerInteraction?: number; // Interactions with other students
    contentRating?: number; // Average rating given to content
    feedbackFrequency?: number; // How often they provide feedback
    socialSharing?: number; // How often they share achievements
  };

  // Predictive analytics
  @Column('jsonb', { nullable: true })
  predictions?: {
    completionProbability?: number; // 0-100 likelihood to complete current courses
    churnRisk?: number; // 0-100 risk of stopping learning
    nextBestContent?: string[]; // Recommended content IDs
    skillGaps?: string[]; // Areas needing improvement
    careerRecommendations?: string[];
  };

  @Column({ nullable: true })
  lastCalculatedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}