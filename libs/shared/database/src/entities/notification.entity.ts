import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  SYSTEM = 'system',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationCategory {
  WELCOME = 'welcome',
  COURSE_ENROLLMENT = 'course_enrollment',
  COURSE_COMPLETION = 'course_completion',
  PASSWORD_RESET = 'password_reset',
  COURSE_REMINDER = 'course_reminder',
  ASSIGNMENT_DUE = 'assignment_due',
  GRADE_AVAILABLE = 'grade_available',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  PAYMENT_DUE = 'payment_due',
  PAYMENT_RECEIVED = 'payment_received',
  CERTIFICATE_READY = 'certificate_ready',
  DISCUSSION_REPLY = 'discussion_reply',
  ANNOUNCEMENT = 'announcement',
}

@Entity('notifications')
@Index(['userId', 'status'])
@Index(['userId', 'createdAt'])
@Index(['type', 'status'])
@Index(['category', 'createdAt'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.IN_APP,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  @Index()
  status: NotificationStatus;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column({
    type: 'enum',
    enum: NotificationCategory,
  })
  @Index()
  category: NotificationCategory;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    courseId?: string;
    assignmentId?: string;
    paymentId?: string;
    actionUrl?: string;
    imageUrl?: string;
    expiresAt?: Date;
    retryCount?: number;
    lastRetryAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
    clickedAt?: Date;
    templateId?: string;
    templateData?: any;
  };

  @Column({ nullable: true })
  scheduledFor?: Date;

  @Column({ nullable: true })
  sentAt?: Date;

  @Column({ nullable: true })
  deliveredAt?: Date;

  @Column({ nullable: true })
  readAt?: Date;

  @Column({ nullable: true })
  clickedAt?: Date;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Computed properties
  get isRead(): boolean {
    return this.status === NotificationStatus.READ;
  }

  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get canRetry(): boolean {
    return this.status === NotificationStatus.FAILED && this.retryCount < 3;
  }
}