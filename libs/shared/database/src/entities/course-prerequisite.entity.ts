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
import { Course } from './course.entity';

export enum PrerequisiteType {
  COURSE_COMPLETION = 'course_completion',
  ASSESSMENT_SCORE = 'assessment_score',
  SKILL_LEVEL = 'skill_level',
  TIME_SPENT = 'time_spent',
  CERTIFICATION = 'certification',
  CUSTOM_RULE = 'custom_rule',
}

export enum PrerequisiteOperator {
  EQUALS = 'equals',
  GREATER_THAN = 'greater_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN = 'less_than',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  BETWEEN = 'between',
  IN = 'in',
  NOT_IN = 'not_in',
}

@Entity('course_prerequisites')
@Index(['courseId'])
@Index(['prerequisiteCourseId'])
@Index(['isActive'])
export class CoursePrerequisite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  courseId: string;

  @ManyToOne(() => Course, course => course.prerequisites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({
    type: 'enum',
    enum: PrerequisiteType,
    default: PrerequisiteType.COURSE_COMPLETION,
  })
  type: PrerequisiteType;

  // For course completion prerequisites
  @Column('uuid', { nullable: true })
  prerequisiteCourseId?: string;

  @ManyToOne(() => Course, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prerequisiteCourseId' })
  prerequisiteCourse?: Course;

  // For assessment score prerequisites
  @Column('uuid', { nullable: true })
  assessmentId?: string;

  // For skill level prerequisites
  @Column('varchar', { length: 100, nullable: true })
  skillName?: string;

  // For certification prerequisites
  @Column('varchar', { length: 100, nullable: true })
  certificationName?: string;

  @Column({
    type: 'enum',
    enum: PrerequisiteOperator,
    default: PrerequisiteOperator.GREATER_THAN_OR_EQUAL,
  })
  operator: PrerequisiteOperator;

  @Column('jsonb', { nullable: true })
  requiredValue: any; // Can be number, string, array, object

  @Column('text', { nullable: true })
  description?: string;

  @Column({ default: true })
  isRequired: boolean; // If false, it's optional/recommended

  @Column({ default: true })
  isActive: boolean;

  @Column('int', { default: 0 })
  orderIndex: number; // For displaying prerequisites in order

  @Column('jsonb', { nullable: true })
  metadata?: {
    customRule?: string; // JavaScript expression for custom rules
    errorMessage?: string;
    helpText?: string;
    estimatedTimeToComplete?: number; // in minutes
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}