import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Course } from './course.entity';
import { User } from './user.entity';

export enum DependencyType {
  PREREQUISITE = 'prerequisite',
  CO_REQUISITE = 'co_requisite',
  RECOMMENDED = 'recommended',
  SEQUENCE = 'sequence',
}

export enum DependencyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_APPROVAL = 'pending_approval',
}

@Entity('course_dependencies')
@Index(['sourceId'])
@Index(['targetId'])
@Index(['type'])
@Index(['status'])
@Unique(['sourceId', 'targetId', 'type'])
export class CourseDependency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  sourceId: string; // The course that has the dependency

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sourceId' })
  sourceCourse: Course;

  @Column('uuid')
  targetId: string; // The course that is required

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'targetId' })
  targetCourse: Course;

  @Column({
    type: 'enum',
    enum: DependencyType,
    default: DependencyType.PREREQUISITE,
  })
  type: DependencyType;

  @Column({
    type: 'enum',
    enum: DependencyStatus,
    default: DependencyStatus.ACTIVE,
  })
  status: DependencyStatus;

  @Column({ default: true })
  isRequired: boolean;

  @Column('text', { nullable: true })
  description?: string;

  @Column('int', { default: 0 })
  orderIndex: number; // For sequenced dependencies

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  minimumScore?: number; // Required score in target course

  @Column('int', { nullable: true })
  gracePeriodDays?: number; // Days after target completion before source unlocks

  @Column('jsonb', { nullable: true })
  conditions?: {
    completionPercentage?: number;
    timeSpent?: number; // minimum minutes in target course
    assessmentScores?: {
      assessmentId: string;
      minimumScore: number;
    }[];
    customRule?: string; // JavaScript expression
  };

  @Column('uuid')
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('user_dependency_progress')
@Index(['userId'])
@Index(['dependencyId'])
@Index(['status'])
@Unique(['userId', 'dependencyId'])
export class UserDependencyProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  dependencyId: string;

  @ManyToOne(() => CourseDependency, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dependencyId' })
  dependency: CourseDependency;

  @Column({
    type: 'enum',
    enum: ['not_started', 'in_progress', 'satisfied', 'waived', 'failed'],
    default: 'not_started',
  })
  status: string;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  progressPercentage: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  currentScore?: number;

  @Column({ nullable: true })
  satisfiedAt?: Date;

  @Column({ nullable: true })
  waiveReason?: string;

  @Column('uuid', { nullable: true })
  waivedBy?: string; // Admin who waived the requirement

  @Column('jsonb', { nullable: true })
  conditionResults?: {
    completionPercentage?: {
      current: number;
      required: number;
      satisfied: boolean;
    };
    timeSpent?: {
      current: number;
      required: number;
      satisfied: boolean;
    };
    assessmentScores?: Array<{
      assessmentId: string;
      currentScore: number;
      requiredScore: number;
      satisfied: boolean;
    }>;
    customRule?: {
      expression: string;
      result: boolean;
      evaluatedAt: string;
    };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('course_sequences')
@Index(['organizationId'])
@Index(['createdBy'])
@Index(['isActive'])
export class CourseSequence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 200 })
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('uuid')
  organizationId: string;

  @Column('uuid')
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isFlexible: boolean; // Allow non-linear progression

  @Column('int', { nullable: true })
  estimatedWeeks?: number;

  @Column('jsonb', { nullable: true })
  sequenceItems?: Array<{
    courseId: string;
    orderIndex: number;
    isRequired: boolean;
    unlockDelay?: number; // days after previous course completion
    conditions?: {
      minimumScore?: number;
      completionPercentage?: number;
    };
  }>;

  @Column('jsonb', { nullable: true })
  milestones?: Array<{
    id: string;
    name: string;
    description?: string;
    afterCourseIndex: number; // Milestone appears after this course
    requirements?: {
      allPreviousCompleted?: boolean;
      averageScore?: number;
    };
    rewards?: {
      badge?: string;
      certificate?: string;
      points?: number;
    };
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}