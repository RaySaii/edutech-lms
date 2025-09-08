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
import { User, Video } from './index';

@Entity('video_assessments')
@Index(['videoId'])
@Index(['creatorId'])
@Index(['isActive'])
export class VideoAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  videoId: string;

  @Column({ type: 'uuid' })
  creatorId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ 
    type: 'enum', 
    enum: ['quiz', 'knowledge_check', 'interactive', 'survey'],
    default: 'quiz'
  })
  type: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isRequired: boolean;

  @Column({ type: 'int', nullable: true })
  triggerTime: number; // Time in seconds when assessment should appear

  @Column({ 
    type: 'enum', 
    enum: ['during', 'after', 'before'],
    default: 'during'
  })
  timing: string;

  @Column({ type: 'int', nullable: true })
  timeLimit: number; // Time limit in seconds

  @Column({ type: 'int', default: 1 })
  maxAttempts: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  passingScore: number; // Percentage required to pass

  @Column({ default: true })
  showResults: boolean;

  @Column({ default: false })
  showCorrectAnswers: boolean;

  @Column({ default: false })
  randomizeQuestions: boolean;

  @Column({ default: false })
  randomizeAnswers: boolean;

  @Column({ type: 'json', nullable: true })
  settings: {
    allowPause?: boolean;
    showProgress?: boolean;
    allowBacktrack?: boolean;
    showHints?: boolean;
    autoSubmit?: boolean;
    lockVideoProgress?: boolean; // Lock video progress until assessment is completed
  };

  @Column({ type: 'json', nullable: true })
  completionSettings: {
    message?: string;
    redirectUrl?: string;
    unlockNextVideo?: boolean;
    awardPoints?: number;
    issueBadge?: string;
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
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @OneToMany(() => VideoAssessmentQuestion, question => question.assessment, {
    cascade: true,
    eager: false
  })
  questions: VideoAssessmentQuestion[];

  @OneToMany(() => VideoAssessmentAttempt, attempt => attempt.assessment)
  attempts: VideoAssessmentAttempt[];
}

@Entity('video_assessment_questions')
@Index(['assessmentId'])
@Index(['order'])
export class VideoAssessmentQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  assessmentId: string;

  @Column({ type: 'int' })
  order: number;

  @Column({ 
    type: 'enum', 
    enum: ['multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'ordering'],
    default: 'multiple_choice'
  })
  type: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text', nullable: true })
  explanation: string;

  @Column({ type: 'text', nullable: true })
  hint: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1 })
  points: number;

  @Column({ default: false })
  isRequired: boolean;

  @Column({ type: 'int', nullable: true })
  timeLimit: number; // Time limit for this specific question in seconds

  @Column({ type: 'json', nullable: true })
  options: Array<{
    id: string;
    text: string;
    isCorrect?: boolean;
    explanation?: string;
  }>;

  @Column({ type: 'json', nullable: true })
  correctAnswer: any; // Flexible answer storage for different question types

  @Column({ type: 'json', nullable: true })
  metadata: {
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
    category?: string;
    videoTimestamp?: number; // Link question to specific video moment
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => VideoAssessment, assessment => assessment.questions, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'assessmentId' })
  assessment: VideoAssessment;

  @OneToMany(() => VideoAssessmentAnswer, answer => answer.question)
  answers: VideoAssessmentAnswer[];
}

@Entity('video_assessment_attempts')
@Index(['assessmentId'])
@Index(['userId'])
@Index(['completedAt'])
export class VideoAssessmentAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  assessmentId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'int', default: 1 })
  attemptNumber: number;

  @Column({ 
    type: 'enum', 
    enum: ['in_progress', 'completed', 'abandoned', 'expired'],
    default: 'in_progress'
  })
  status: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number; // Score as percentage

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  maxPossibleScore: number;

  @Column({ type: 'int', nullable: true })
  correctAnswers: number;

  @Column({ type: 'int', nullable: true })
  totalQuestions: number;

  @Column({ type: 'int', nullable: true })
  timeSpent: number; // Time spent in seconds

  @Column({ default: false })
  isPassed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'json', nullable: true })
  responses: Array<{
    questionId: string;
    answer: any;
    isCorrect?: boolean;
    points?: number;
    timeSpent?: number;
  }>;

  @Column({ type: 'json', nullable: true })
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    videoCurrentTime?: number;
    cheatingFlags?: string[];
    tabSwitches?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => VideoAssessment, assessment => assessment.attempts, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'assessmentId' })
  assessment: VideoAssessment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => VideoAssessmentAnswer, answer => answer.attempt, {
    cascade: true
  })
  answers: VideoAssessmentAnswer[];
}

@Entity('video_assessment_answers')
@Index(['attemptId'])
@Index(['questionId'])
export class VideoAssessmentAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  attemptId: string;

  @Column({ type: 'uuid' })
  questionId: string;

  @Column({ type: 'json' })
  answer: any; // Store answer based on question type

  @Column({ default: false })
  isCorrect: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  points: number;

  @Column({ type: 'int', nullable: true })
  timeSpent: number; // Time spent on this specific answer in seconds

  @Column({ type: 'text', nullable: true })
  feedback: string; // Automated or manual feedback

  @Column({ type: 'json', nullable: true })
  metadata: {
    confidence?: number; // User's confidence level
    attempts?: number; // Number of times user changed answer
    hints_used?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => VideoAssessmentAttempt, attempt => attempt.answers, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'attemptId' })
  attempt: VideoAssessmentAttempt;

  @ManyToOne(() => VideoAssessmentQuestion, question => question.answers, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'questionId' })
  question: VideoAssessmentQuestion;
}