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
import { Content } from './content.entity';
import { User } from './user.entity';

export enum VersionStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PUBLISHED = 'published',
}

export enum ChangeType {
  CREATED = 'created',
  MODIFIED = 'modified',
  RESTORED = 'restored',
  APPROVED = 'approved',
  PUBLISHED = 'published',
}

@Entity('content_versions')
@Index(['contentId', 'version'])
@Index(['status'])
@Index(['createdAt'])
export class ContentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  contentId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  contentData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({
    type: 'enum',
    enum: VersionStatus,
    default: VersionStatus.DRAFT,
  })
  status: VersionStatus;

  @Column({
    type: 'enum',
    enum: ChangeType,
    default: ChangeType.CREATED,
  })
  changeType: ChangeType;

  @Column({ type: 'text', nullable: true })
  changeDescription: string;

  @Column({ type: 'uuid' })
  authorId: string;

  @Column({ type: 'uuid', nullable: true })
  reviewerId: string;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @Column({ type: 'bigint', default: 0 })
  size: number; // Content size in bytes

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string; // For content integrity verification

  @Column({ type: 'jsonb', nullable: true })
  approvalWorkflow: {
    requiredApprovals: number;
    currentApprovals: number;
    approvers: Array<{
      userId: string;
      approvedAt: Date;
      comments?: string;
    }>;
    rejections: Array<{
      userId: string;
      rejectedAt: Date;
      reason: string;
    }>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Content, content => content.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId' })
  content: Content;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @ManyToOne(() => User, user => user.id, { nullable: true })
  @JoinColumn({ name: 'reviewerId' })
  reviewer: User;

  // Computed properties
  get isLatest(): boolean {
    return this.status === VersionStatus.PUBLISHED;
  }

  get needsReview(): boolean {
    return this.status === VersionStatus.REVIEW;
  }

  get isApproved(): boolean {
    return this.status === VersionStatus.APPROVED || this.status === VersionStatus.PUBLISHED;
  }

  get approvalProgress(): number {
    if (!this.approvalWorkflow) return 0;
    return (this.approvalWorkflow.currentApprovals / this.approvalWorkflow.requiredApprovals) * 100;
  }
}