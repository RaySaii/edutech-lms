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
import { ContentVersion } from './content-version.entity';
import { User } from './user.entity';

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REVISION = 'needs_revision',
  ESCALATED = 'escalated',
}

export enum ApprovalType {
  CONTENT_REVIEW = 'content_review',
  TECHNICAL_REVIEW = 'technical_review',
  LEGAL_REVIEW = 'legal_review',
  FINAL_APPROVAL = 'final_approval',
}

@Entity('content_approvals')
@Index(['contentId', 'status'])
@Index(['approverId', 'status'])
@Index(['type', 'status'])
@Index(['createdAt'])
export class ContentApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  contentId: string;

  @Column({ type: 'uuid', nullable: true })
  versionId: string;

  @Column({
    type: 'enum',
    enum: ApprovalType,
  })
  type: ApprovalType;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  @Column({ type: 'uuid' })
  requesterId: string; // Who requested the approval

  @Column({ type: 'uuid', nullable: true })
  approverId: string; // Who is assigned to approve

  @Column({ type: 'int', default: 1 })
  priority: number; // 1-5 (1 = highest priority)

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'text', nullable: true })
  requestNotes: string;

  @Column({ type: 'text', nullable: true })
  approverNotes: string;

  @Column({ type: 'jsonb', nullable: true })
  checklist: Array<{
    item: string;
    checked: boolean;
    notes?: string;
    requiredForApproval: boolean;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  reviewCriteria: {
    accuracy?: boolean;
    completeness?: boolean;
    clarity?: boolean;
    compliance?: boolean;
    technicalQuality?: boolean;
    accessibility?: boolean;
    brandConsistency?: boolean;
    customCriteria?: Array<{
      name: string;
      description: string;
      passed: boolean;
      notes?: string;
    }>;
  };

  @Column({ type: 'timestamp', nullable: true })
  reviewStartedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewCompletedAt: Date;

  @Column({ type: 'int', nullable: true })
  reviewTimeMinutes: number; // Time spent reviewing

  @Column({ type: 'jsonb', nullable: true })
  escalation: {
    escalatedAt: Date;
    escalatedBy: string;
    escalatedTo: string;
    reason: string;
    originalDueDate: Date;
    newDueDate: Date;
  };

  @Column({ type: 'jsonb', nullable: true })
  revisionRequests: Array<{
    requestedAt: Date;
    requestedBy: string;
    description: string;
    resolved: boolean;
    resolvedAt?: Date;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Content, content => content.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId' })
  content: Content;

  @ManyToOne(() => ContentVersion, version => version.id, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'versionId' })
  version: ContentVersion;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @ManyToOne(() => User, user => user.id, { nullable: true })
  @JoinColumn({ name: 'approverId' })
  approver: User;

  // Computed properties
  get isOverdue(): boolean {
    return this.dueDate ? new Date() > this.dueDate && this.status === ApprovalStatus.PENDING : false;
  }

  get daysOverdue(): number {
    if (!this.isOverdue) return 0;
    const diffTime = Math.abs(new Date().getTime() - this.dueDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get isUrgent(): boolean {
    return this.priority <= 2;
  }

  get checklistCompletion(): number {
    if (!this.checklist || this.checklist.length === 0) return 100;
    const completed = this.checklist.filter(item => item.checked).length;
    return (completed / this.checklist.length) * 100;
  }

  get requiredItemsCompleted(): boolean {
    if (!this.checklist) return true;
    const requiredItems = this.checklist.filter(item => item.requiredForApproval);
    return requiredItems.every(item => item.checked);
  }

  get canApprove(): boolean {
    return this.status === ApprovalStatus.PENDING && 
           this.requiredItemsCompleted && 
           this.approverId !== null;
  }

  get hasRevisionRequests(): boolean {
    return this.revisionRequests && this.revisionRequests.some(req => !req.resolved);
  }

  get timeToReview(): number {
    if (!this.reviewStartedAt || !this.reviewCompletedAt) return 0;
    const diffTime = this.reviewCompletedAt.getTime() - this.reviewStartedAt.getTime();
    return Math.floor(diffTime / (1000 * 60)); // Returns minutes
  }
}