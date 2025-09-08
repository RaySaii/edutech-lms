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
import { Assessment } from './assessment.entity';
import { User } from './user.entity';
import { AssessmentAnswer } from './assessment-answer.entity';

export enum AttemptStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  ABANDONED = 'abandoned',
  EXPIRED = 'expired',
}

@Entity('assessment_attempts')
@Index(['assessmentId', 'userId'])
@Index(['status', 'startedAt'])
@Index(['userId', 'completedAt'])
export class AssessmentAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  assessmentId: string;

  @Column('uuid')
  userId: string;

  @Column('int', { default: 1 })
  attemptNumber: number;

  @Column({
    type: 'enum',
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
  })
  status: AttemptStatus;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  score: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  maxScore: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  percentage: number;

  @Column('int', { nullable: true })
  timeSpent: number; // in minutes

  @Column('timestamp', { nullable: true })
  startedAt: Date;

  @Column('timestamp', { nullable: true })
  completedAt: Date;

  @Column('timestamp', { nullable: true })
  submittedAt: Date;

  @Column('timestamp', { nullable: true })
  gradedAt: Date;

  @Column('uuid', { nullable: true })
  gradedBy: string;

  @Column('text', { nullable: true })
  feedback: string;

  @Column('json', { nullable: true })
  attemptData: {
    ipAddress?: string;
    userAgent?: string;
    browserInfo?: {
      name: string;
      version: string;
      os: string;
    };
    proctoring?: {
      suspiciousActivities?: Array<{
        type: string;
        timestamp: Date;
        description: string;
      }>;
      focusLost?: number;
      tabSwitches?: number;
      fullscreenExits?: number;
    };
    warnings?: Array<{
      type: string;
      timestamp: Date;
      message: string;
    }>;
    sessionData?: {
      questionOrder?: string[];
      reviewedQuestions?: string[];
      flaggedQuestions?: string[];
    };
  };

  @Column('json', { nullable: true })
  gradingData: {
    autoGradedPoints?: number;
    manualGradedPoints?: number;
    totalPossiblePoints?: number;
    gradingNotes?: string;
    rubricScores?: Record<string, number>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Assessment, assessment => assessment.attempts, { 
    onDelete: 'CASCADE' 
  })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Assessment;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => User, user => user.id, { nullable: true })
  @JoinColumn({ name: 'gradedBy' })
  grader: User;

  @OneToMany(() => AssessmentAnswer, answer => answer.attempt, {
    cascade: true,
  })
  answers: AssessmentAnswer[];

  // Helper methods
  get isCompleted(): boolean {
    return this.status === AttemptStatus.SUBMITTED || 
           this.status === AttemptStatus.GRADED;
  }

  get isPassed(): boolean {
    if (!this.percentage || !this.assessment?.passingScore) return false;
    return this.percentage >= this.assessment.passingScore;
  }

  get grade(): string {
    if (!this.percentage) return 'N/A';
    
    if (this.percentage >= 90) return 'A';
    if (this.percentage >= 80) return 'B';
    if (this.percentage >= 70) return 'C';
    if (this.percentage >= 60) return 'D';
    return 'F';
  }

  calculateScore(): void {
    if (!this.answers || this.answers.length === 0) {
      this.score = 0;
      this.percentage = 0;
      return;
    }

    const totalEarnedPoints = this.answers.reduce((sum, answer) => sum + (answer.earnedPoints || 0), 0);
    const totalPossiblePoints = this.assessment?.totalPoints || 0;

    this.score = totalEarnedPoints;
    this.maxScore = totalPossiblePoints;
    this.percentage = totalPossiblePoints > 0 ? (totalEarnedPoints / totalPossiblePoints) * 100 : 0;
  }

  markAsCompleted(feedback?: string): void {
    this.status = AttemptStatus.SUBMITTED;
    this.completedAt = new Date();
    this.submittedAt = new Date();
    
    if (feedback) {
      this.feedback = feedback;
    }

    if (this.startedAt) {
      this.timeSpent = Math.round((this.completedAt.getTime() - this.startedAt.getTime()) / (1000 * 60));
    }

    this.calculateScore();
  }

  markAsGraded(graderId: string, feedback?: string): void {
    this.status = AttemptStatus.GRADED;
    this.gradedAt = new Date();
    this.gradedBy = graderId;
    
    if (feedback) {
      this.feedback = feedback;
    }

    this.calculateScore();
  }
}