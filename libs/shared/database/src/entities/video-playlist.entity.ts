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
import { User, Course } from './index';

@Entity('video_playlists')
@Index(['creatorId'])
@Index(['courseId'])
@Index(['isPublic'])
export class VideoPlaylist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  thumbnailUrl: string;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ type: 'uuid' })
  creatorId: string;

  @Column({ type: 'uuid', nullable: true })
  courseId: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ 
    type: 'enum', 
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    nullable: true 
  })
  difficulty: string;

  @Column({ type: 'int', default: 0 })
  totalDuration: number;

  @Column({ type: 'int', default: 0 })
  videoCount: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating: number;

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @Column({ type: 'json', nullable: true })
  settings: {
    autoPlay: boolean;
    allowSkipping: boolean;
    enforceOrder: boolean;
    showProgress: boolean;
    allowDownload: boolean;
    requireCompletion: boolean;
  };

  @Column({ type: 'json', nullable: true })
  metadata: {
    objectives: string[];
    prerequisites: string[];
    targetAudience: string[];
    estimatedCompletionTime: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @OneToMany(() => VideoPlaylistItem, item => item.playlist, { 
    cascade: true,
    eager: false 
  })
  items: VideoPlaylistItem[];

  @OneToMany(() => VideoPlaylistProgress, progress => progress.playlist)
  userProgress: VideoPlaylistProgress[];
}

@Entity('video_playlist_items')
@Index(['playlistId'])
@Index(['videoId'])
@Index(['order'])
export class VideoPlaylistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  playlistId: string;

  @Column({ type: 'uuid' })
  videoId: string;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'text', nullable: true })
  customTitle: string;

  @Column({ type: 'text', nullable: true })
  customDescription: string;

  @Column({ default: false })
  isRequired: boolean;

  @Column({ default: true })
  isVisible: boolean;

  @Column({ type: 'int', nullable: true })
  unlockAfterSeconds: number;

  @Column({ type: 'json', nullable: true })
  settings: {
    startTime?: number;
    endTime?: number;
    skipIntro?: boolean;
    skipOutro?: boolean;
    customThumbnail?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => VideoPlaylist, playlist => playlist.items, { 
    onDelete: 'CASCADE' 
  })
  @JoinColumn({ name: 'playlistId' })
  playlist: VideoPlaylist;

  // Note: We'll reference Video by ID to avoid circular dependencies
  // The Video entity will be loaded separately in services
}

@Entity('video_playlist_progress')
@Index(['playlistId'])
@Index(['userId'])
@Index(['completedAt'])
export class VideoPlaylistProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  playlistId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'int', default: 0 })
  currentItemIndex: number;

  @Column({ type: 'uuid', nullable: true })
  currentVideoId: string;

  @Column({ type: 'int', default: 0 })
  completedVideos: number;

  @Column({ type: 'int', default: 0 })
  totalWatchTime: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progressPercentage: number;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastWatchedAt: Date;

  @Column({ type: 'json', nullable: true })
  videoProgress: Array<{
    videoId: string;
    completed: boolean;
    watchTime: number;
    completedAt?: Date;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => VideoPlaylist, playlist => playlist.userProgress, { 
    onDelete: 'CASCADE' 
  })
  @JoinColumn({ name: 'playlistId' })
  playlist: VideoPlaylist;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}

@Entity('video_playlist_ratings')
@Index(['playlistId'])
@Index(['userId'])
export class VideoPlaylistRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  playlistId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'int', width: 1 })
  rating: number; // 1-5 stars

  @Column({ type: 'text', nullable: true })
  review: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => VideoPlaylist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlistId' })
  playlist: VideoPlaylist;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}