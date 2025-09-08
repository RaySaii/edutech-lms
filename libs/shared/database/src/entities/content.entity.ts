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
import { Course } from './course.entity';

export enum ContentType {
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  IMAGE = 'image',
  TEXT = 'text',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
}

export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('contents')
@Index(['courseId', 'status'])
@Index(['type', 'status'])
@Index(['uploaderId'])
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ContentType,
    default: ContentType.TEXT,
  })
  type: ContentType;

  @Column({
    type: 'enum',
    enum: ContentStatus,
    default: ContentStatus.DRAFT,
  })
  status: ContentStatus;

  // File storage information
  @Column({ length: 500, nullable: true })
  filePath: string;

  @Column({ length: 500, nullable: true })
  fileName: string;

  @Column({ nullable: true })
  fileSize: number;

  @Column({ length: 100, nullable: true })
  mimeType: string;

  // Media-specific metadata
  @Column({ nullable: true })
  duration: number; // in seconds for video/audio

  @Column({ nullable: true })
  width: number; // for images/videos

  @Column({ nullable: true })
  height: number; // for images/videos

  // Content metadata
  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  // Relationships
  @Column({ type: 'uuid', nullable: true })
  courseId: string;

  @ManyToOne(() => Course, (course) => course.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ type: 'uuid' })
  uploaderId: string;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploaderId' })
  uploader: User;

  // Learning management
  @Column({ nullable: true })
  order: number;

  @Column({ default: true })
  isRequired: boolean;

  @Column({ default: false })
  isDownloadable: boolean;

  // Content accessibility
  @Column({ type: 'text', nullable: true })
  transcript: string; // For video/audio content

  @Column({ type: 'json', nullable: true })
  captions: Record<string, any>; // Multi-language captions

  // Analytics and engagement
  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  downloadCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get fileUrl(): string {
    return this.filePath ? `/api/content/${this.id}/file` : null;
  }

  get thumbnailUrl(): string {
    if (this.type === ContentType.VIDEO || this.type === ContentType.IMAGE) {
      return `/api/content/${this.id}/thumbnail`;
    }
    return null;
  }
}