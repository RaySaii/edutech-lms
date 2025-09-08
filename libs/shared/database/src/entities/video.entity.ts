import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Content } from './content.entity';

export enum VideoStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

export enum VideoQuality {
  SD_480 = '480p',
  HD_720 = '720p',
  FHD_1080 = '1080p',
  QHD_1440 = '1440p',
  UHD_4K = '4k',
}

@Entity('videos')
@Index(['status'])
@Index(['uploaderId'])
@Index(['contentId'])
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 1000 })
  originalFileName: string;

  @Column({ length: 500 })
  fileName: string;

  @Column({ length: 1000 })
  filePath: string;

  @Column({ length: 500, nullable: true })
  thumbnailPath: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ type: 'int', default: 0 })
  duration: number; // in seconds

  @Column({
    type: 'enum',
    enum: VideoStatus,
    default: VideoStatus.UPLOADING,
  })
  status: VideoStatus;

  @Column({ type: 'json', nullable: true })
  processingStatus: {
    progress: number;
    currentStep: string;
    error?: string;
  };

  @Column({ type: 'json', nullable: true })
  videoStreams: {
    quality: VideoQuality;
    filePath: string;
    bitrate: number;
    resolution: string;
  }[];

  @Column({ type: 'json', nullable: true })
  metadata: {
    width: number;
    height: number;
    fps: number;
    codec: string;
    bitrate: number;
    aspectRatio: string;
  };

  @Column({ length: 500, nullable: true })
  hlsPlaylistPath: string;

  @Column({ length: 500, nullable: true })
  dashManifestPath: string;

  @Column({ type: 'json', nullable: true })
  subtitles: {
    language: string;
    filePath: string;
    label: string;
  }[];

  @Column({ type: 'json', nullable: true })
  chapters: {
    title: string;
    startTime: number;
    endTime: number;
    description?: string;
  }[];

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'boolean', default: true })
  allowDownload: boolean;

  @Column({ type: 'boolean', default: false })
  requiresAuthentication: boolean;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'json', nullable: true })
  analytics: {
    totalWatchTime: number;
    averageWatchTime: number;
    completionRate: number;
    dropOffPoints: number[];
  };

  @Column('uuid')
  uploaderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploaderId' })
  uploader: User;

  @Column('uuid', { nullable: true })
  contentId: string;

  @ManyToOne(() => Content, content => content.videos, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contentId' })
  content: Content;

  @OneToMany(() => VideoProgress, progress => progress.video, { cascade: true })
  viewerProgress: VideoProgress[];

  @OneToMany(() => VideoBookmark, bookmark => bookmark.video, { cascade: true })
  bookmarks: VideoBookmark[];

  @OneToMany(() => VideoNote, note => note.video, { cascade: true })
  notes: VideoNote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isProcessed(): boolean {
    return this.status === VideoStatus.READY;
  }

  get streamingUrls(): { quality: VideoQuality; url: string }[] {
    if (!this.videoStreams) return [];
    return this.videoStreams.map(stream => ({
      quality: stream.quality,
      url: `/api/videos/${this.id}/stream/${stream.quality}`,
    }));
  }

  get thumbnailUrl(): string {
    return this.thumbnailPath ? `/api/videos/${this.id}/thumbnail` : null;
  }
}

@Entity('video_progress')
@Index(['userId', 'videoId'], { unique: true })
export class VideoProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  videoId: string;

  @ManyToOne(() => Video, video => video.viewerProgress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'videoId' })
  video: Video;

  @Column({ type: 'int', default: 0 })
  currentTime: number; // in seconds

  @Column({ type: 'int', default: 0 })
  watchTime: number; // total time watched in seconds

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  @Column({ type: 'float', default: 0 })
  completionPercentage: number;

  @Column({ type: 'int', default: 1 })
  watchCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastWatchedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('video_bookmarks')
@Index(['userId', 'videoId'])
export class VideoBookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  videoId: string;

  @ManyToOne(() => Video, video => video.bookmarks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'videoId' })
  video: Video;

  @Column({ type: 'int' })
  timestamp: number; // in seconds

  @Column({ length: 200, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('video_notes')
@Index(['userId', 'videoId'])
export class VideoNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  videoId: string;

  @ManyToOne(() => Video, video => video.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'videoId' })
  video: Video;

  @Column({ type: 'int' })
  timestamp: number; // in seconds

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}