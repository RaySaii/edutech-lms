import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Content } from './content.entity';

export enum AssetType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  OTHER = 'other',
}

export enum AssetStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

export enum ProcessingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('media_assets')
@Index(['type'])
@Index(['status'])
@Index(['uploaderId'])
@Index(['createdAt'])
@Index(['mimeType'])
export class MediaAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 255 })
  originalFilename: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number; // File size in bytes

  @Column({
    type: 'enum',
    enum: AssetType,
  })
  type: AssetType;

  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.UPLOADING,
  })
  status: AssetStatus;

  @Column({ type: 'text' })
  url: string; // Primary URL (CDN or storage URL)

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', array: true, default: [] })
  tags: string[];

  @Column({ type: 'uuid' })
  uploaderId: string;

  @Column({ type: 'uuid', nullable: true })
  contentId: string; // Optional association with content

  @Column({ type: 'varchar', length: 64 })
  checksum: string; // File integrity verification

  // Media-specific metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    // Image metadata
    width?: number;
    height?: number;
    aspectRatio?: string;
    colorSpace?: string;
    hasAlpha?: boolean;

    // Video metadata
    duration?: number;
    framerate?: number;
    bitrate?: number;
    codec?: string;
    resolution?: string;

    // Audio metadata
    sampleRate?: number;
    channels?: number;
    album?: string;
    artist?: string;
    title?: string;

    // Document metadata
    pages?: number;
    wordCount?: number;
    author?: string;

    // Processing metadata
    processingTime?: number;
    compressionRatio?: number;
    qualityScore?: number;
  };

  // Processing information
  @Column({ type: 'jsonb', nullable: true })
  processing: {
    status: ProcessingStatus;
    progress: number; // 0-100
    startedAt?: Date;
    completedAt?: Date;
    errorMessage?: string;
    variants?: Array<{
      type: string; // 'thumbnail', 'compressed', 'watermarked', etc.
      url: string;
      size: number;
      metadata: Record<string, any>;
    }>;
    transcoding?: {
      inputFormat: string;
      outputFormat: string;
      quality: string;
      progress: number;
    };
  };

  // Access control
  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'varchar', array: true, default: [] })
  allowedRoles: string[]; // Roles that can access this asset

  @Column({ type: 'uuid', array: true, default: [] })
  allowedUsers: string[]; // Specific users that can access this asset

  // Usage tracking
  @Column({ type: 'int', default: 0 })
  downloadCount: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  // Storage information
  @Column({ type: 'varchar', length: 100 })
  storageProvider: string; // 'aws-s3', 'gcp-storage', 'azure-blob', etc.

  @Column({ type: 'varchar', length: 255 })
  storageKey: string; // Path/key in the storage system

  @Column({ type: 'varchar', length: 100, nullable: true })
  storageRegion: string;

  // Lifecycle management
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  isTemporary: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'uploaderId' })
  uploader: User;

  @ManyToOne(() => Content, content => content.id, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contentId' })
  content: Content;

  // Computed properties
  get formattedSize(): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = this.size;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  get isImage(): boolean {
    return this.type === AssetType.IMAGE;
  }

  get isVideo(): boolean {
    return this.type === AssetType.VIDEO;
  }

  get isAudio(): boolean {
    return this.type === AssetType.AUDIO;
  }

  get isDocument(): boolean {
    return this.type === AssetType.DOCUMENT;
  }

  get isProcessing(): boolean {
    return this.status === AssetStatus.PROCESSING || 
           this.processing?.status === ProcessingStatus.IN_PROGRESS;
  }

  get isReady(): boolean {
    return this.status === AssetStatus.READY;
  }

  get processingProgress(): number {
    return this.processing?.progress || 0;
  }

  get hasVariants(): boolean {
    return this.processing?.variants && this.processing.variants.length > 0;
  }

  get thumbnailOrUrl(): string {
    return this.thumbnailUrl || this.url;
  }
}