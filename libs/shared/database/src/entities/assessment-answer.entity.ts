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
import { AssessmentAttempt } from './assessment-attempt.entity';
import { AssessmentQuestion } from './assessment-question.entity';
import { User } from './user.entity';

@Entity('assessment_answers')
@Index(['attemptId', 'questionId'], { unique: true })
@Index(['questionId', 'isCorrect'])
export class AssessmentAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  attemptId: string;

  @Column('uuid')
  questionId: string;

  @Column('json')
  userAnswer: any;

  @Column('boolean', { nullable: true })
  isCorrect: boolean;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  earnedPoints: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  maxPoints: number;

  @Column('int', { nullable: true })
  timeSpent: number; // in seconds

  @Column({ default: false })
  flagged: boolean;

  @Column({ default: false })
  needsManualGrading: boolean;

  @Column('text', { nullable: true })
  feedback: string;

  @Column('uuid', { nullable: true })
  gradedBy: string;

  @Column('timestamp', { nullable: true })
  gradedAt: Date;

  @Column('json', { nullable: true })
  answerData: {
    // For tracking answer history
    answerHistory?: Array<{
      answer: any;
      timestamp: Date;
    }>;
    
    // For essay/short answer grading
    rubricScores?: Record<string, number>;
    gradingNotes?: string;
    
    // For code questions
    codeExecutionResult?: {
      output: string;
      error?: string;
      testsPassed: number;
      totalTests: number;
    };
    
    // For tracking user interaction
    interactions?: Array<{
      type: 'focus' | 'blur' | 'change' | 'submit';
      timestamp: Date;
      data?: any;
    }>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => AssessmentAttempt, attempt => attempt.answers, { 
    onDelete: 'CASCADE' 
  })
  @JoinColumn({ name: 'attemptId' })
  attempt: AssessmentAttempt;

  @ManyToOne(() => AssessmentQuestion, question => question.answers, { 
    onDelete: 'CASCADE' 
  })
  @JoinColumn({ name: 'questionId' })
  question: AssessmentQuestion;

  @ManyToOne(() => User, user => user.id, { nullable: true })
  @JoinColumn({ name: 'gradedBy' })
  grader: User;

  // Helper methods
  autoGrade(): void {
    if (!this.question) return;

    this.maxPoints = this.question.points;
    this.isCorrect = this.question.isCorrect(this.userAnswer);
    this.earnedPoints = this.question.calculateScore(this.userAnswer);
    
    // Mark for manual grading if needed
    this.needsManualGrading = this.question.type === 'essay' || 
                             this.question.type === 'short_answer' || 
                             this.question.type === 'code';
  }

  manualGrade(points: number, feedback: string, graderId: string): void {
    this.earnedPoints = points;
    this.maxPoints = this.question?.points || points;
    this.isCorrect = points > 0;
    this.feedback = feedback;
    this.gradedBy = graderId;
    this.gradedAt = new Date();
    this.needsManualGrading = false;
  }

  addInteraction(type: string, data?: any): void {
    if (!this.answerData) {
      this.answerData = {};
    }
    
    if (!this.answerData.interactions) {
      this.answerData.interactions = [];
    }

    this.answerData.interactions.push({
      type: type as any,
      timestamp: new Date(),
      data,
    });
  }

  saveAnswerToHistory(): void {
    if (!this.answerData) {
      this.answerData = {};
    }
    
    if (!this.answerData.answerHistory) {
      this.answerData.answerHistory = [];
    }

    this.answerData.answerHistory.push({
      answer: this.userAnswer,
      timestamp: new Date(),
    });
  }

  get hasBeenGraded(): boolean {
    return this.gradedAt !== null || 
           (!this.needsManualGrading && this.earnedPoints !== null);
  }

  get gradingStatus(): 'not_graded' | 'auto_graded' | 'manually_graded' | 'needs_manual' {
    if (this.needsManualGrading && !this.gradedAt) {
      return 'needs_manual';
    }
    
    if (this.gradedAt && this.gradedBy) {
      return 'manually_graded';
    }
    
    if (!this.needsManualGrading && this.earnedPoints !== null) {
      return 'auto_graded';
    }
    
    return 'not_graded';
  }
}