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

export enum LearningPathStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum PathDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

@Entity('learning_paths')
@Index(['organizationId'])
@Index(['createdBy'])
@Index(['status'])
@Index(['isPublic'])
export class LearningPath {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 200 })
  title: string;

  @Column('text')
  description: string;

  @Column('text', { nullable: true })
  shortDescription?: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid')
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({
    type: 'enum',
    enum: LearningPathStatus,
    default: LearningPathStatus.DRAFT,
  })
  status: LearningPathStatus;

  @Column({
    type: 'enum',
    enum: PathDifficulty,
    default: PathDifficulty.BEGINNER,
  })
  difficulty: PathDifficulty;

  @Column({ default: true })
  isPublic: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @Column('varchar', { length: 500, nullable: true })
  thumbnailUrl?: string;

  @Column('varchar', { length: 500, nullable: true })
  bannerImageUrl?: string;

  @Column('int', { default: 0 })
  estimatedDurationHours: number;

  @Column('int', { default: 0 })
  totalCourses: number;

  @Column('int', { default: 0 })
  enrollmentCount: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column('int', { default: 0 })
  reviewCount: number;

  @Column('simple-array', { nullable: true })
  tags?: string[];

  @Column('simple-array', { nullable: true })
  categories?: string[];

  @Column('simple-array', { nullable: true })
  skills?: string[]; // Skills that will be learned

  @Column('simple-array', { nullable: true })
  prerequisites?: string[]; // Required skills before starting

  @Column('jsonb', { nullable: true })
  learningObjectives?: string[]; // What learners will achieve

  @Column('jsonb', { nullable: true })
  targetAudience?: {
    roles?: string[];
    experienceLevel?: string[];
    industries?: string[];
  };

  @OneToMany(() => LearningPathItem, item => item.learningPath, {
    cascade: true,
    eager: false,
  })
  items: LearningPathItem[];

  @OneToMany(() => LearningPathEnrollment, enrollment => enrollment.learningPath)
  enrollments: LearningPathEnrollment[];

  @Column('jsonb', { nullable: true })
  metadata?: {
    language?: string;
    level?: string;
    certificationOffered?: boolean;
    hasDeadlines?: boolean;
    isSelfPaced?: boolean;
    supportAvailable?: boolean;
    completionCriteria?: {
      requireAllCourses?: boolean;
      minimumScore?: number;
      timeLimit?: number; // in days
    };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  publishedAt?: Date;
}

@Entity('learning_path_items')
@Index(['learningPathId'])
@Index(['courseId'])
@Index(['orderIndex'])
export class LearningPathItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  learningPathId: string;

  @ManyToOne(() => LearningPath, path => path.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'learningPathId' })
  learningPath: LearningPath;

  @Column('uuid')
  courseId: string;

  // We'll need to import Course entity later
  // @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'courseId' })
  // course: Course;

  @Column('int')
  orderIndex: number;

  @Column({ default: true })
  isRequired: boolean; // If false, it's optional

  @Column({ default: false })
  isLocked: boolean; // If true, must complete previous items first

  @Column('int', { nullable: true })
  estimatedHours?: number;

  @Column('text', { nullable: true })
  description?: string; // Why this course is in the path

  @Column('jsonb', { nullable: true })
  completionCriteria?: {
    minimumScore?: number;
    requireCertification?: boolean;
    timeLimit?: number; // in days from enrollment
  };

  @Column('jsonb', { nullable: true })
  unlockConditions?: Array<{
    type: 'course_completion' | 'assessment_score' | 'time_delay';
    value: any;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('learning_path_enrollments')
@Index(['learningPathId'])
@Index(['userId'])
@Index(['status'])
@Index(['enrolledAt'])
export class LearningPathEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  learningPathId: string;

  @ManyToOne(() => LearningPath, path => path.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'learningPathId' })
  learningPath: LearningPath;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['enrolled', 'in_progress', 'completed', 'paused', 'dropped'],
    default: 'enrolled',
  })
  status: string;

  @Column('int', { default: 0 })
  currentItemIndex: number; // Current position in the path

  @Column('int', { default: 0 })
  completedItems: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  progressPercentage: number;

  @Column('int', { default: 0 })
  totalTimeSpent: number; // in minutes

  @Column({ nullable: true })
  targetCompletionDate?: Date;

  @Column({ nullable: true })
  actualCompletionDate?: Date;

  @Column('decimal', { precision: 3, scale: 2, nullable: true })
  averageScore?: number;

  @Column('jsonb', { nullable: true })
  itemProgress?: Array<{
    courseId: string;
    status: 'not_started' | 'in_progress' | 'completed';
    progressPercentage: number;
    score?: number;
    completedAt?: string;
    timeSpent: number; // in minutes
  }>;

  @Column('jsonb', { nullable: true })
  preferences?: {
    notifications?: boolean;
    reminderFrequency?: 'daily' | 'weekly' | 'none';
    studyGoals?: {
      hoursPerWeek?: number;
      targetCompletionDate?: string;
    };
  };

  @CreateDateColumn()
  enrolledAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastAccessedAt?: Date;
}