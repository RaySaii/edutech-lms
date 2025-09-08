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

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
  DESKTOP = 'desktop',
}

export enum AppVersion {
  STABLE = 'stable',
  BETA = 'beta',
  ALPHA = 'alpha',
}

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum DownloadStatus {
  NOT_DOWNLOADED = 'not_downloaded',
  DOWNLOADING = 'downloading',
  DOWNLOADED = 'downloaded',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

@Entity('mobile_devices')
@Index(['userId'])
@Index(['organizationId'])
@Index(['platform'])
@Index(['lastActiveAt'])
export class MobileDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('varchar', { length: 500, unique: true })
  deviceToken: string; // FCM/APN device token

  @Column({
    type: 'enum',
    enum: DevicePlatform,
  })
  platform: DevicePlatform;

  @Column('varchar', { length: 100 })
  deviceId: string; // Unique device identifier

  @Column('varchar', { length: 200, nullable: true })
  deviceName?: string; // User-friendly device name

  @Column('varchar', { length: 100, nullable: true })
  model?: string;

  @Column('varchar', { length: 50, nullable: true })
  osVersion?: string;

  @Column('varchar', { length: 50, nullable: true })
  appVersion?: string;

  @Column({
    type: 'enum',
    enum: AppVersion,
    default: AppVersion.STABLE,
  })
  versionChannel: AppVersion;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  pushNotificationsEnabled: boolean;

  @Column('jsonb', { nullable: true })
  notificationPreferences?: {
    courses?: boolean;
    announcements?: boolean;
    reminders?: boolean;
    social?: boolean;
    marketing?: boolean;
    quiet_hours?: {
      enabled: boolean;
      start_time: string; // HH:MM format
      end_time: string;
      timezone: string;
    };
  };

  @Column('jsonb', { nullable: true })
  capabilities?: {
    offline_support?: boolean;
    video_download?: boolean;
    biometric_auth?: boolean;
    camera_access?: boolean;
    microphone_access?: boolean;
    location_access?: boolean;
    background_sync?: boolean;
  };

  @Column('jsonb', { nullable: true })
  settings?: {
    offline_mode?: boolean;
    auto_download?: boolean;
    video_quality?: 'auto' | 'high' | 'medium' | 'low';
    cellular_data_usage?: boolean;
    dark_mode?: boolean;
    font_size?: 'small' | 'medium' | 'large';
    language?: string;
    sync_frequency?: number; // minutes
  };

  @OneToMany(() => OfflineContent, content => content.device)
  offlineContent: OfflineContent[];

  @OneToMany(() => MobileSync, sync => sync.device)
  syncHistory: MobileSync[];

  @Column({ nullable: true })
  lastActiveAt?: Date;

  @Column({ nullable: true })
  lastSyncAt?: Date;

  @Column('varchar', { length: 45, nullable: true })
  lastKnownIp?: string;

  @Column('varchar', { length: 100, nullable: true })
  lastKnownLocation?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('offline_content')
@Index(['deviceId'])
@Index(['contentId'])
@Index(['status'])
@Index(['expiresAt'])
export class OfflineContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  deviceId: string;

  @ManyToOne(() => MobileDevice, device => device.offlineContent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' })
  device: MobileDevice;

  @Column('uuid')
  contentId: string;

  @ManyToOne(() => Content, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId' })
  content: Content;

  @Column('uuid', { nullable: true })
  courseId?: string;

  @ManyToOne(() => Course, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @Column({
    type: 'enum',
    enum: DownloadStatus,
    default: DownloadStatus.NOT_DOWNLOADED,
  })
  status: DownloadStatus;

  @Column('bigint', { default: 0 })
  downloadedSize: number; // bytes

  @Column('bigint', { default: 0 })
  totalSize: number; // bytes

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  downloadProgress: number; // 0-100

  @Column('varchar', { length: 500, nullable: true })
  localFilePath?: string;

  @Column('varchar', { length: 100, nullable: true })
  encryption?: string; // Encryption key for offline content

  @Column({ nullable: true })
  expiresAt?: Date; // When offline access expires

  @Column('jsonb', { nullable: true })
  metadata?: {
    quality?: string;
    format?: string;
    duration?: number; // for videos
    size_mb?: number;
    checksum?: string;
    mime_type?: string;
  };

  @Column({ nullable: true })
  downloadStartedAt?: Date;

  @Column({ nullable: true })
  downloadCompletedAt?: Date;

  @Column({ nullable: true })
  lastAccessedAt?: Date;

  @Column('text', { nullable: true })
  errorMessage?: string;

  @Column('int', { default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('mobile_sync')
@Index(['deviceId'])
@Index(['status'])
@Index(['syncType'])
@Index(['createdAt'])
export class MobileSync {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  deviceId: string;

  @ManyToOne(() => MobileDevice, device => device.syncHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' })
  device: MobileDevice;

  @Column('varchar', { length: 50 })
  syncType: string; // 'full', 'incremental', 'content_only', 'progress_only'

  @Column({
    type: 'enum',
    enum: SyncStatus,
    default: SyncStatus.PENDING,
  })
  status: SyncStatus;

  @Column('jsonb', { nullable: true })
  syncData?: {
    courses?: Array<{
      id: string;
      progress: number;
      lastAccessed: string;
    }>;
    content?: Array<{
      id: string;
      progress: number;
      completed: boolean;
      timeSpent: number;
    }>;
    assessments?: Array<{
      id: string;
      attempts: Array<{
        score: number;
        completedAt: string;
      }>;
    }>;
    bookmarks?: Array<{
      id: string;
      contentId: string;
      position: number;
      note?: string;
    }>;
    notes?: Array<{
      id: string;
      contentId: string;
      text: string;
      timestamp: number;
    }>;
  };

  @Column('int', { default: 0 })
  itemsToSync: number;

  @Column('int', { default: 0 })
  itemsSynced: number;

  @Column('int', { default: 0 })
  itemsFailed: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  progress: number; // 0-100

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column('int', { nullable: true })
  duration?: number; // seconds

  @Column('text', { nullable: true })
  errorMessage?: string;

  @Column('jsonb', { nullable: true })
  metadata?: {
    triggered_by?: 'user' | 'auto' | 'schedule';
    network_type?: 'wifi' | 'cellular' | 'unknown';
    battery_level?: number;
    device_storage?: {
      available: number;
      total: number;
    };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('mobile_app_configs')
@Index(['organizationId'])
@Index(['platform'])
@Index(['version'])
export class MobileAppConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({
    type: 'enum',
    enum: DevicePlatform,
  })
  platform: DevicePlatform;

  @Column('varchar', { length: 50 })
  version: string; // App version this config applies to

  @Column('varchar', { length: 50 })
  minVersion: string; // Minimum required app version

  @Column({ default: true })
  isActive: boolean;

  @Column('jsonb')
  config: {
    features?: {
      offline_mode?: boolean;
      video_download?: boolean;
      push_notifications?: boolean;
      biometric_auth?: boolean;
      dark_mode?: boolean;
      social_features?: boolean;
      live_streaming?: boolean;
      screen_recording?: boolean;
    };
    limits?: {
      max_offline_courses?: number;
      max_download_size_mb?: number;
      max_video_quality?: string;
      sync_frequency_minutes?: number;
      offline_expiry_days?: number;
    };
    urls?: {
      api_base?: string;
      cdn_base?: string;
      streaming_base?: string;
      support_url?: string;
      privacy_url?: string;
      terms_url?: string;
    };
    theme?: {
      primary_color?: string;
      secondary_color?: string;
      accent_color?: string;
      logo_url?: string;
      splash_image?: string;
    };
    analytics?: {
      enabled?: boolean;
      crash_reporting?: boolean;
      performance_monitoring?: boolean;
      user_tracking?: boolean;
    };
  };

  @Column({ default: false })
  forceUpdate: boolean; // Force users to update to this version

  @Column('text', { nullable: true })
  updateMessage?: string;

  @Column('varchar', { length: 500, nullable: true })
  downloadUrl?: string; // App store URL

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('push_notifications')
@Index(['deviceId'])
@Index(['status'])
@Index(['scheduledAt'])
@Index(['sentAt'])
export class PushNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  deviceId?: string; // Specific device, or null for broadcast

  @ManyToOne(() => MobileDevice, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' })
  device?: MobileDevice;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('varchar', { length: 200 })
  title: string;

  @Column('text')
  body: string;

  @Column('varchar', { length: 100, nullable: true })
  category?: string; // Notification category

  @Column('jsonb', { nullable: true })
  data?: {
    action?: string;
    resource_id?: string;
    resource_type?: string;
    deep_link?: string;
    image_url?: string;
  };

  @Column({
    type: 'enum',
    enum: ['pending', 'sent', 'delivered', 'failed', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Column({ nullable: true })
  scheduledAt?: Date;

  @Column({ nullable: true })
  sentAt?: Date;

  @Column({ nullable: true })
  deliveredAt?: Date;

  @Column('text', { nullable: true })
  errorMessage?: string;

  @Column('varchar', { length: 100, nullable: true })
  externalMessageId?: string; // FCM/APN message ID

  @Column('int', { default: 0 })
  retryCount: number;

  @Column('jsonb', { nullable: true })
  targeting?: {
    user_ids?: string[];
    platforms?: DevicePlatform[];
    app_versions?: string[];
    countries?: string[];
    languages?: string[];
    user_segments?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('mobile_analytics')
@Index(['deviceId'])
@Index(['eventType'])
@Index(['createdAt'])
export class MobileAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  deviceId: string;

  @ManyToOne(() => MobileDevice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' })
  device: MobileDevice;

  @Column('varchar', { length: 100 })
  eventType: string; // 'app_open', 'content_view', 'download_start', etc.

  @Column('jsonb')
  properties: {
    screen?: string;
    content_id?: string;
    course_id?: string;
    duration?: number;
    network_type?: string;
    battery_level?: number;
    device_storage?: number;
    app_version?: string;
    [key: string]: any;
  };

  @Column('varchar', { length: 100, nullable: true })
  sessionId?: string;

  @Column({ nullable: true })
  timestamp?: Date;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('app_feedback')
@Index(['deviceId'])
@Index(['rating'])
@Index(['createdAt'])
export class AppFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  deviceId: string;

  @ManyToOne(() => MobileDevice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId' })
  device: MobileDevice;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { length: 50 })
  type: string; // 'bug_report', 'feature_request', 'rating', 'general'

  @Column('int', { nullable: true })
  rating?: number; // 1-5 stars

  @Column('varchar', { length: 200, nullable: true })
  subject?: string;

  @Column('text')
  message: string;

  @Column('varchar', { length: 100, nullable: true })
  category?: string; // 'performance', 'ui', 'content', 'sync', etc.

  @Column('jsonb', { nullable: true })
  deviceInfo?: {
    platform: string;
    os_version: string;
    app_version: string;
    device_model: string;
    available_storage: number;
    battery_level: number;
    network_type: string;
  };

  @Column('simple-array', { nullable: true })
  attachments?: string[]; // File URLs

  @Column({
    type: 'enum',
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
  })
  status: string;

  @Column('uuid', { nullable: true })
  assignedTo?: string;

  @Column('text', { nullable: true })
  response?: string;

  @Column({ nullable: true })
  respondedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}