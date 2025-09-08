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
import { AssessmentAnswer } from './assessment-answer.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
  FILL_BLANK = 'fill_blank',
  MATCHING = 'matching',
  ORDERING = 'ordering',
  NUMERIC = 'numeric',
  CODE = 'code',
}

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

@Entity('assessment_questions')
@Index(['assessmentId', 'order'])
@Index(['type', 'difficulty'])
export class AssessmentQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  assessmentId: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  type: QuestionType;

  @Column('text')
  question: string;

  @Column('text', { nullable: true })
  explanation: string;

  @Column('int', { default: 1 })
  points: number;

  @Column('int', { default: 0 })
  order: number;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    default: DifficultyLevel.MEDIUM,
  })
  difficulty: DifficultyLevel;

  @Column({ default: true })
  required: boolean;

  @Column('json', { nullable: true })
  questionData: {
    // For multiple choice/true-false
    options?: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
      explanation?: string;
    }>;
    
    // For fill in the blank
    blanks?: Array<{
      id: string;
      correctAnswers: string[];
      caseSensitive?: boolean;
    }>;
    
    // For matching questions
    pairs?: Array<{
      left: string;
      right: string;
      id: string;
    }>;
    
    // For ordering questions
    items?: Array<{
      id: string;
      text: string;
      correctOrder: number;
    }>;
    
    // For numeric questions
    numericAnswer?: {
      value: number;
      tolerance?: number;
      unit?: string;
    };
    
    // For short answer/essay
    sampleAnswer?: string;
    maxWords?: number;
    minWords?: number;
    
    // For code questions
    language?: string;
    starterCode?: string;
    testCases?: Array<{
      input: string;
      expectedOutput: string;
      points: number;
    }>;
  };

  @Column('json', { nullable: true })
  metadata: {
    tags?: string[];
    category?: string;
    estimatedTime?: number; // in minutes
    references?: string[];
    authorNotes?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Assessment, assessment => assessment.questions, { 
    onDelete: 'CASCADE' 
  })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Assessment;

  @OneToMany(() => AssessmentAnswer, answer => answer.question)
  answers: AssessmentAnswer[];

  // Helper methods
  isCorrect(userAnswer: any): boolean {
    switch (this.type) {
      case QuestionType.MULTIPLE_CHOICE:
        if (Array.isArray(userAnswer)) {
          // Multiple selection
          const correctIds = this.questionData.options
            ?.filter(opt => opt.isCorrect)
            .map(opt => opt.id) || [];
          return userAnswer.length === correctIds.length &&
                 userAnswer.every(id => correctIds.includes(id));
        } else {
          // Single selection
          const correctOption = this.questionData.options?.find(opt => opt.isCorrect);
          return correctOption?.id === userAnswer;
        }
        
      case QuestionType.TRUE_FALSE:
        const correctTF = this.questionData.options?.find(opt => opt.isCorrect);
        return correctTF?.id === userAnswer;
        
      case QuestionType.NUMERIC:
        const numAnswer = this.questionData.numericAnswer;
        if (!numAnswer) return false;
        const tolerance = numAnswer.tolerance || 0;
        const userNum = parseFloat(userAnswer);
        return Math.abs(userNum - numAnswer.value) <= tolerance;
        
      case QuestionType.FILL_BLANK:
        if (!Array.isArray(userAnswer)) return false;
        return this.questionData.blanks?.every((blank, index) => {
          const userValue = userAnswer[index]?.toLowerCase().trim();
          return blank.correctAnswers.some(correct => 
            blank.caseSensitive 
              ? correct.trim() === userAnswer[index]?.trim()
              : correct.toLowerCase().trim() === userValue
          );
        }) || false;
        
      case QuestionType.ORDERING:
        if (!Array.isArray(userAnswer)) return false;
        return this.questionData.items?.every((item, index) => 
          userAnswer[item.correctOrder - 1] === item.id
        ) || false;
        
      case QuestionType.MATCHING:
        if (!Array.isArray(userAnswer)) return false;
        return this.questionData.pairs?.every(pair => {
          const userMatch = userAnswer.find(match => match.left === pair.left);
          return userMatch?.right === pair.right;
        }) || false;
        
      default:
        // For essay, short answer, code - requires manual grading
        return false;
    }
  }

  calculateScore(userAnswer: any): number {
    if (this.type === QuestionType.ESSAY || 
        this.type === QuestionType.SHORT_ANSWER || 
        this.type === QuestionType.CODE) {
      // These require manual grading
      return 0;
    }
    
    return this.isCorrect(userAnswer) ? this.points : 0;
  }
}