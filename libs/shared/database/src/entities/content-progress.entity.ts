import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Content } from './content.entity';

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

@Entity('content_progress')
@Unique(['userId', 'contentId'])
@Index(['userId', 'status'])
@Index(['contentId', 'status'])
export class ContentProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  contentId: string;

  @ManyToOne(() => Content, (content) => content.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId' })
  content: Content;

  @Column({
    type: 'enum',
    enum: ProgressStatus,
    default: ProgressStatus.NOT_STARTED,
  })
  status: ProgressStatus;

  // Progress tracking
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionPercentage: number;

  @Column({ nullable: true })
  currentPosition: number; // Current position in seconds for video/audio

  @Column({ nullable: true })
  timeSpent: number; // Total time spent in seconds

  @Column({ nullable: true })
  lastAccessedAt: Date;

  // Engagement metrics
  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: false })
  isBookmarked: boolean;

  @Column({ type: 'json', nullable: true })
  notes: Record<string, any>; // User notes and annotations

  // Quiz/Assessment specific
  @Column({ nullable: true })
  score: number;

  @Column({ nullable: true })
  attempts: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties
  get isCompleted(): boolean {
    return this.status === ProgressStatus.COMPLETED || this.completionPercentage >= 100;
  }

  get isInProgress(): boolean {
    return this.status === ProgressStatus.IN_PROGRESS && this.completionPercentage > 0 && this.completionPercentage < 100;
  }
}