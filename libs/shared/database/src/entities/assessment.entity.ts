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
import { Course } from './course.entity';
import { User } from './user.entity';
import { AssessmentQuestion } from './assessment-question.entity';
import { AssessmentAttempt } from './assessment-attempt.entity';

export enum AssessmentType {
  QUIZ = 'quiz',
  EXAM = 'exam',
  ASSIGNMENT = 'assignment',
  SURVEY = 'survey',
  PRACTICE = 'practice',
}

export enum AssessmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum GradingMethod {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual',
  MIXED = 'mixed',
}

@Entity('assessments')
@Index(['courseId', 'status'])
@Index(['createdBy', 'type'])
export class Assessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: AssessmentType,
    default: AssessmentType.QUIZ,
  })
  type: AssessmentType;

  @Column({
    type: 'enum',
    enum: AssessmentStatus,
    default: AssessmentStatus.DRAFT,
  })
  status: AssessmentStatus;

  @Column({
    type: 'enum',
    enum: GradingMethod,
    default: GradingMethod.AUTOMATIC,
  })
  gradingMethod: GradingMethod;

  @Column('uuid')
  courseId: string;

  @Column('uuid')
  createdBy: string;

  @Column('int', { default: 100 })
  totalPoints: number;

  @Column('int', { default: 60 })
  passingScore: number;

  @Column('int', { nullable: true })
  timeLimit: number; // in minutes

  @Column('int', { default: 1 })
  maxAttempts: number;

  @Column({ default: true })
  showResults: boolean;

  @Column({ default: true })
  showCorrectAnswers: boolean;

  @Column({ default: false })
  shuffleQuestions: boolean;

  @Column({ default: false })
  shuffleAnswers: boolean;

  @Column({ default: false })
  requirePasswordAccess: boolean;

  @Column({ nullable: true })
  accessPassword: string;

  @Column('timestamp', { nullable: true })
  availableFrom: Date;

  @Column('timestamp', { nullable: true })
  availableUntil: Date;

  @Column('json', { nullable: true })
  settings: {
    allowReview?: boolean;
    showScoreAfterSubmission?: boolean;
    randomizeQuestionOrder?: boolean;
    preventBacktracking?: boolean;
    requireFullscreen?: boolean;
    enableProctoring?: boolean;
    instructions?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Course, course => course.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @OneToMany(() => AssessmentQuestion, question => question.assessment, {
    cascade: true,
  })
  questions: AssessmentQuestion[];

  @OneToMany(() => AssessmentAttempt, attempt => attempt.assessment)
  attempts: AssessmentAttempt[];

  // Virtual properties
  get totalQuestions(): number {
    return this.questions ? this.questions.length : 0;
  }

  get averageScore(): number {
    if (!this.attempts || this.attempts.length === 0) return 0;
    const completedAttempts = this.attempts.filter(a => a.completedAt);
    if (completedAttempts.length === 0) return 0;
    
    const totalScore = completedAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
    return Math.round((totalScore / completedAttempts.length) * 100) / 100;
  }

  get completionRate(): number {
    if (!this.attempts || this.attempts.length === 0) return 0;
    const completedAttempts = this.attempts.filter(a => a.completedAt);
    return Math.round((completedAttempts.length / this.attempts.length) * 100);
  }
}