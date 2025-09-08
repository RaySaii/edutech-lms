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
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';
import { User, Video } from './index';

@Entity('video_comments')
@Tree('closure-table')
@Index(['videoId'])
@Index(['authorId'])
@Index(['timestamp'])
@Index(['isModerated'])
export class VideoComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  videoId: string;

  @Column({ type: 'uuid' })
  authorId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  timestamp: number; // Video timestamp in seconds

  @Column({ default: false })
  isEdited: boolean;

  @Column({ default: false })
  isModerated: boolean;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: false })
  isHighlighted: boolean; // For instructor highlights

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  dislikeCount: number;

  @Column({ type: 'int', default: 0 })
  replyCount: number;

  @Column({ 
    type: 'enum', 
    enum: ['active', 'hidden', 'deleted', 'flagged'],
    default: 'active'
  })
  status: string;

  @Column({ type: 'json', nullable: true })
  metadata: {
    editHistory?: Array<{
      timestamp: Date;
      previousContent: string;
    }>;
    moderationFlags?: string[];
    reactionCounts?: { [emoji: string]: number };
    mentions?: string[]; // User IDs mentioned in comment
    attachments?: Array<{
      type: 'image' | 'link' | 'file';
      url: string;
      name?: string;
    }>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Video, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'videoId' })
  video: Video;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @TreeChildren()
  replies: VideoComment[];

  @TreeParent()
  parent: VideoComment;

  @OneToMany(() => VideoCommentReaction, reaction => reaction.comment)
  reactions: VideoCommentReaction[];

  @OneToMany(() => VideoCommentReport, report => report.comment)
  reports: VideoCommentReport[];
}

@Entity('video_comment_reactions')
@Index(['commentId'])
@Index(['userId'])
@Index(['type'])
export class VideoCommentReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  commentId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ 
    type: 'enum', 
    enum: ['like', 'dislike', 'love', 'laugh', 'wow', 'sad', 'angry'],
    default: 'like'
  })
  type: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => VideoComment, comment => comment.reactions, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'commentId' })
  comment: VideoComment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}

@Entity('video_comment_reports')
@Index(['commentId'])
@Index(['reporterId'])
@Index(['status'])
export class VideoCommentReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  commentId: string;

  @Column({ type: 'uuid' })
  reporterId: string;

  @Column({ 
    type: 'enum', 
    enum: ['spam', 'harassment', 'inappropriate', 'misinformation', 'copyright', 'other'],
    default: 'inappropriate'
  })
  reason: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ 
    type: 'enum', 
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending'
  })
  status: string;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => VideoComment, comment => comment.reports, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'commentId' })
  comment: VideoComment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer: User;
}

@Entity('video_discussion_threads')
@Index(['videoId'])
@Index(['creatorId'])
@Index(['isPinned'])
export class VideoDiscussionThread {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  videoId: string;

  @Column({ type: 'uuid' })
  creatorId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  timestamp: number; // Video timestamp this discussion relates to

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: false })
  isLocked: boolean;

  @Column({ default: false })
  isResolved: boolean;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  commentCount: number;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ 
    type: 'enum', 
    enum: ['question', 'discussion', 'announcement', 'feedback'],
    default: 'discussion'
  })
  type: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Video, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'videoId' })
  video: Video;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @OneToMany(() => VideoThreadComment, comment => comment.thread)
  comments: VideoThreadComment[];
}

@Entity('video_thread_comments')
@Index(['threadId'])
@Index(['authorId'])
export class VideoThreadComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  threadId: string;

  @Column({ type: 'uuid' })
  authorId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false })
  isEdited: boolean;

  @Column({ default: false })
  isModerated: boolean;

  @Column({ default: false })
  isBestAnswer: boolean; // For Q&A threads

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ 
    type: 'enum', 
    enum: ['active', 'hidden', 'deleted'],
    default: 'active'
  })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => VideoDiscussionThread, thread => thread.comments, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'threadId' })
  thread: VideoDiscussionThread;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'authorId' })
  author: User;
}