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

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}

export enum NotificationCategory {
  SYSTEM = 'system',
  COURSE = 'course',
  ASSIGNMENT = 'assignment',
  ASSESSMENT = 'assessment',
  ANNOUNCEMENT = 'announcement',
  REMINDER = 'reminder',
  ACHIEVEMENT = 'achievement',
  SOCIAL = 'social',
  BILLING = 'billing',
  SECURITY = 'security',
}

@Entity('notification_campaigns')
@Index(['organizationId'])
@Index(['createdBy'])
@Index(['status'])
@Index(['scheduledAt'])
export class NotificationCampaign {
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

  @Column({
    type: 'enum',
    enum: NotificationCategory,
    default: NotificationCategory.SYSTEM,
  })
  category: NotificationCategory;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @Column({
    type: 'enum',
    enum: ['draft', 'scheduled', 'running', 'completed', 'cancelled'],
    default: 'draft',
  })
  status: string;

  @Column('simple-array')
  channels: NotificationChannel[];

  @Column('jsonb')
  content: {
    subject?: string;
    title: string;
    body: string;
    html?: string;
    attachments?: Array<{
      name: string;
      url: string;
      type: string;
    }>;
    actions?: Array<{
      text: string;
      url: string;
      type: 'primary' | 'secondary';
    }>;
  };

  @Column('jsonb')
  audience: {
    targetType: 'all' | 'roles' | 'courses' | 'segments' | 'custom';
    roles?: string[];
    courseIds?: string[];
    segmentIds?: string[];
    userIds?: string[];
    filters?: {
      enrollmentStatus?: string[];
      lastLoginDays?: number;
      courseProgress?: { min?: number; max?: number };
      tags?: string[];
    };
  };

  @Column({ nullable: true })
  scheduledAt?: Date;

  @Column('int', { default: 0 })
  totalRecipients: number;

  @Column('int', { default: 0 })
  sentCount: number;

  @Column('int', { default: 0 })
  deliveredCount: number;

  @Column('int', { default: 0 })
  failedCount: number;

  @Column('int', { default: 0 })
  openedCount: number;

  @Column('int', { default: 0 })
  clickedCount: number;

  @Column('jsonb', { nullable: true })
  settings?: {
    batchSize?: number;
    delayBetweenBatches?: number; // in seconds
    timezone?: string;
    allowUnsubscribe?: boolean;
    trackOpens?: boolean;
    trackClicks?: boolean;
    retryAttempts?: number;
  };

  @OneToMany(() => CampaignDelivery, delivery => delivery.campaign)
  deliveries: CampaignDelivery[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  sentAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;
}

@Entity('campaign_deliveries')
@Index(['campaignId'])
@Index(['userId'])
@Index(['channel'])
@Index(['status'])
@Index(['scheduledAt'])
export class CampaignDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  campaignId: string;

  @ManyToOne(() => NotificationCampaign, campaign => campaign.deliveries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaignId' })
  campaign: NotificationCampaign;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column('varchar', { length: 500, nullable: true })
  recipientAddress?: string; // email, phone, device token, etc.

  @Column('jsonb', { nullable: true })
  personalizedContent?: {
    subject?: string;
    title?: string;
    body?: string;
    variables?: Record<string, any>;
  };

  @Column({ nullable: true })
  scheduledAt?: Date;

  @Column({ nullable: true })
  sentAt?: Date;

  @Column({ nullable: true })
  deliveredAt?: Date;

  @Column({ nullable: true })
  openedAt?: Date;

  @Column({ nullable: true })
  clickedAt?: Date;

  @Column('int', { default: 0 })
  attemptCount: number;

  @Column('text', { nullable: true })
  errorMessage?: string;

  @Column('jsonb', { nullable: true })
  metadata?: {
    providerId?: string; // external service ID
    messageId?: string;
    trackingId?: string;
    deliveryInfo?: Record<string, any>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('notification_automations')
@Index(['organizationId'])
@Index(['triggerEvent'])
@Index(['isActive'])
export class NotificationAutomation {
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

  @Column({ default: true })
  isActive: boolean;

  @Column('varchar', { length: 100 })
  triggerEvent: string; // e.g., 'user.enrolled', 'course.completed', 'assessment.failed'

  @Column('jsonb')
  triggerConditions: {
    filters?: Record<string, any>;
    delay?: {
      amount: number;
      unit: 'minutes' | 'hours' | 'days';
    };
    frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
    maxOccurrences?: number;
  };

  @Column({
    type: 'enum',
    enum: NotificationCategory,
    default: NotificationCategory.SYSTEM,
  })
  category: NotificationCategory;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @Column('simple-array')
  channels: NotificationChannel[];

  @Column('jsonb')
  content: {
    template: string; // Template ID or inline template
    variables?: Record<string, string>; // Variable mappings
    subject?: string;
    title: string;
    body: string;
    actions?: Array<{
      text: string;
      url: string;
      type: 'primary' | 'secondary';
    }>;
  };

  @Column('jsonb')
  audience: {
    targetType: 'trigger_user' | 'roles' | 'segments' | 'custom';
    roles?: string[];
    segmentIds?: string[];
    userIds?: string[];
  };

  @Column('int', { default: 0 })
  totalTriggered: number;

  @Column('int', { default: 0 })
  totalSent: number;

  @Column('int', { default: 0 })
  totalDelivered: number;

  @OneToMany(() => AutomationExecution, execution => execution.automation)
  executions: AutomationExecution[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('automation_executions')
@Index(['automationId'])
@Index(['userId'])
@Index(['status'])
@Index(['triggerData'])
@Index(['scheduledAt'])
export class AutomationExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  automationId: string;

  @ManyToOne(() => NotificationAutomation, automation => automation.executions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'automationId' })
  automation: NotificationAutomation;

  @Column('uuid', { nullable: true })
  userId?: string; // User who triggered the automation

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({
    type: 'enum',
    enum: ['pending', 'scheduled', 'running', 'completed', 'failed', 'skipped'],
    default: 'pending',
  })
  status: string;

  @Column('jsonb')
  triggerData: Record<string, any>; // Data that triggered the automation

  @Column({ nullable: true })
  scheduledAt?: Date;

  @Column({ nullable: true })
  executedAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column('int', { default: 0 })
  recipientCount: number;

  @Column('int', { default: 0 })
  successCount: number;

  @Column('int', { default: 0 })
  failureCount: number;

  @Column('text', { nullable: true })
  errorMessage?: string;

  @Column('jsonb', { nullable: true })
  executionLog?: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: Record<string, any>;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('notification_segments')
@Index(['organizationId'])
@Index(['isActive'])
export class NotificationSegment {
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

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDynamic: boolean; // If true, recalculate members dynamically

  @Column('jsonb')
  criteria: {
    rules: Array<{
      field: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
      value: any;
      logicalOperator?: 'AND' | 'OR';
    }>;
    userRoles?: string[];
    courseFilters?: {
      enrolledIn?: string[];
      completedCourses?: string[];
      progressRange?: { min: number; max: number };
    };
    activityFilters?: {
      lastLoginDays?: number;
      totalTimeSpent?: { min?: number; max?: number };
      engagementLevel?: 'low' | 'medium' | 'high';
    };
    customTags?: string[];
  };

  @Column('int', { default: 0 })
  memberCount: number;

  @Column({ nullable: true })
  lastCalculatedAt?: Date;

  @OneToMany(() => SegmentMembership, membership => membership.segment)
  memberships: SegmentMembership[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('segment_memberships')
@Index(['segmentId'])
@Index(['userId'])
@Index(['addedAt'])
export class SegmentMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  segmentId: string;

  @ManyToOne(() => NotificationSegment, segment => segment.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'segmentId' })
  segment: NotificationSegment;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: true })
  isActive: boolean;

  @Column('jsonb', { nullable: true })
  metadata?: {
    addedBy?: 'system' | 'manual';
    matchedCriteria?: string[];
    tags?: string[];
  };

  @CreateDateColumn()
  addedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}