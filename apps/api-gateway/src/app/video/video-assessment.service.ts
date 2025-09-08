import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { 
  VideoAssessment, 
  VideoAssessmentQuestion, 
  VideoAssessmentAttempt, 
  VideoAssessmentAnswer,
  Video,
  User
} from '@edutech-lms/database';

export interface CreateAssessmentDto {
  title: string;
  description?: string;
  type?: 'quiz' | 'knowledge_check' | 'interactive' | 'survey';
  isRequired?: boolean;
  triggerTime?: number;
  timing?: 'during' | 'after' | 'before';
  timeLimit?: number;
  maxAttempts?: number;
  passingScore?: number;
  showResults?: boolean;
  showCorrectAnswers?: boolean;
  randomizeQuestions?: boolean;
  randomizeAnswers?: boolean;
  settings?: {
    allowPause?: boolean;
    showProgress?: boolean;
    allowBacktrack?: boolean;
    showHints?: boolean;
    autoSubmit?: boolean;
    lockVideoProgress?: boolean;
  };
  completionSettings?: {
    message?: string;
    redirectUrl?: string;
    unlockNextVideo?: boolean;
    awardPoints?: number;
    issueBadge?: string;
  };
}

export interface CreateQuestionDto {
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'matching' | 'ordering';
  question: string;
  explanation?: string;
  hint?: string;
  points?: number;
  isRequired?: boolean;
  timeLimit?: number;
  options?: Array<{
    text: string;
    isCorrect?: boolean;
    explanation?: string;
  }>;
  correctAnswer?: any;
  metadata?: {
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
    category?: string;
    videoTimestamp?: number;
  };
}

export interface SubmitAnswerDto {
  questionId: string;
  answer: any;
  timeSpent?: number;
  confidence?: number;
}

export interface StartAttemptDto {
  userAgent?: string;
  videoCurrentTime?: number;
}

@Injectable()
export class VideoAssessmentService {
  private readonly logger = new Logger(VideoAssessmentService.name);

  constructor(
    @InjectRepository(VideoAssessment)
    private assessmentRepository: Repository<VideoAssessment>,
    @InjectRepository(VideoAssessmentQuestion)
    private questionRepository: Repository<VideoAssessmentQuestion>,
    @InjectRepository(VideoAssessmentAttempt)
    private attemptRepository: Repository<VideoAssessmentAttempt>,
    @InjectRepository(VideoAssessmentAnswer)
    private answerRepository: Repository<VideoAssessmentAnswer>,
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private entityManager: EntityManager,
  ) {}

  async createAssessment(
    videoId: string, 
    createDto: CreateAssessmentDto, 
    creatorId: string
  ): Promise<VideoAssessment> {
    // Validate video exists
    const video = await this.videoRepository.findOne({ where: { id: videoId } });
    if (!video) {
      throw new NotFoundException(`Video ${videoId} not found`);
    }

    const assessment = this.assessmentRepository.create({
      videoId,
      creatorId,
      ...createDto,
      settings: {
        allowPause: true,
        showProgress: true,
        allowBacktrack: false,
        showHints: false,
        autoSubmit: false,
        lockVideoProgress: false,
        ...createDto.settings,
      },
      completionSettings: {
        message: 'Great job! Assessment completed.',
        unlockNextVideo: false,
        awardPoints: 0,
        ...createDto.completionSettings,
      },
    });

    const savedAssessment = await this.assessmentRepository.save(assessment);
    this.logger.log(`Assessment created: ${savedAssessment.id} for video ${videoId}`);

    return savedAssessment;
  }

  async addQuestion(
    assessmentId: string, 
    createDto: CreateQuestionDto, 
    userId: string
  ): Promise<VideoAssessmentQuestion> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id: assessmentId }
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found`);
    }

    if (assessment.creatorId !== userId) {
      throw new ForbiddenException('Only assessment creator can add questions');
    }

    // Get next order number
    const maxOrder = await this.questionRepository
      .createQueryBuilder('question')
      .select('MAX(question.order)', 'maxOrder')
      .where('question.assessmentId = :assessmentId', { assessmentId })
      .getRawOne();

    const nextOrder = (maxOrder?.maxOrder || 0) + 1;

    // Validate question based on type
    this.validateQuestionData(createDto);

    const question = this.questionRepository.create({
      assessmentId,
      order: nextOrder,
      ...createDto,
      points: createDto.points || 1,
      metadata: {
        difficulty: 'medium',
        tags: [],
        ...createDto.metadata,
      },
    });

    const savedQuestion = await this.questionRepository.save(question);
    this.logger.log(`Question added to assessment ${assessmentId}: ${savedQuestion.id}`);

    return savedQuestion;
  }

  async startAttempt(
    assessmentId: string, 
    userId: string, 
    startDto: StartAttemptDto = {}
  ): Promise<VideoAssessmentAttempt> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id: assessmentId },
      relations: ['questions']
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found`);
    }

    if (!assessment.isActive) {
      throw new BadRequestException('Assessment is not active');
    }

    // Check if user has exceeded max attempts
    const existingAttempts = await this.attemptRepository.count({
      where: { assessmentId, userId }
    });

    if (existingAttempts >= assessment.maxAttempts) {
      throw new BadRequestException(`Maximum attempts (${assessment.maxAttempts}) exceeded`);
    }

    // Check if user has an active attempt
    const activeAttempt = await this.attemptRepository.findOne({
      where: { 
        assessmentId, 
        userId, 
        status: 'in_progress' 
      }
    });

    if (activeAttempt) {
      return activeAttempt; // Return existing attempt
    }

    // Calculate expiration time
    let expiresAt: Date | null = null;
    if (assessment.timeLimit) {
      expiresAt = new Date(Date.now() + assessment.timeLimit * 1000);
    }

    const attempt = this.attemptRepository.create({
      assessmentId,
      userId,
      attemptNumber: existingAttempts + 1,
      startedAt: new Date(),
      expiresAt,
      totalQuestions: assessment.questions?.length || 0,
      maxPossibleScore: assessment.questions?.reduce((sum, q) => sum + q.points, 0) || 0,
      responses: [],
      metadata: {
        userAgent: startDto.userAgent,
        videoCurrentTime: startDto.videoCurrentTime,
        cheatingFlags: [],
        tabSwitches: 0,
      },
    });

    const savedAttempt = await this.attemptRepository.save(attempt);
    this.logger.log(`Assessment attempt started: ${savedAttempt.id} by user ${userId}`);

    return savedAttempt;
  }

  async submitAnswer(
    attemptId: string, 
    submitDto: SubmitAnswerDto, 
    userId: string
  ): Promise<VideoAssessmentAnswer> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, userId },
      relations: ['assessment', 'assessment.questions']
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found for user`);
    }

    if (attempt.status !== 'in_progress') {
      throw new BadRequestException('Cannot submit answer to non-active attempt');
    }

    // Check if attempt has expired
    if (attempt.expiresAt && new Date() > attempt.expiresAt) {
      attempt.status = 'expired';
      await this.attemptRepository.save(attempt);
      throw new BadRequestException('Assessment attempt has expired');
    }

    // Find the question
    const question = attempt.assessment.questions?.find(q => q.id === submitDto.questionId);
    if (!question) {
      throw new NotFoundException(`Question ${submitDto.questionId} not found`);
    }

    // Check if answer already exists
    let answer = await this.answerRepository.findOne({
      where: { attemptId, questionId: submitDto.questionId }
    });

    const isCorrect = this.evaluateAnswer(question, submitDto.answer);
    const points = isCorrect ? question.points : 0;

    if (answer) {
      // Update existing answer
      answer.answer = submitDto.answer;
      answer.isCorrect = isCorrect;
      answer.points = points;
      answer.timeSpent = submitDto.timeSpent;
      answer.metadata = {
        confidence: submitDto.confidence,
        attempts: (answer.metadata?.attempts || 0) + 1,
      };
    } else {
      // Create new answer
      answer = this.answerRepository.create({
        attemptId,
        questionId: submitDto.questionId,
        answer: submitDto.answer,
        isCorrect,
        points,
        timeSpent: submitDto.timeSpent,
        metadata: {
          confidence: submitDto.confidence,
          attempts: 1,
        },
      });
    }

    const savedAnswer = await this.answerRepository.save(answer);

    // Update attempt responses
    const existingResponseIndex = attempt.responses?.findIndex(r => r.questionId === submitDto.questionId) || -1;
    const response = {
      questionId: submitDto.questionId,
      answer: submitDto.answer,
      isCorrect,
      points,
      timeSpent: submitDto.timeSpent,
    };

    if (existingResponseIndex >= 0) {
      attempt.responses[existingResponseIndex] = response;
    } else {
      attempt.responses = [...(attempt.responses || []), response];
    }

    await this.attemptRepository.save(attempt);

    this.logger.log(`Answer submitted for attempt ${attemptId}, question ${submitDto.questionId}`);
    return savedAnswer;
  }

  async completeAttempt(attemptId: string, userId: string): Promise<VideoAssessmentAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, userId },
      relations: ['assessment', 'answers']
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found for user`);
    }

    if (attempt.status !== 'in_progress') {
      throw new BadRequestException('Attempt is not in progress');
    }

    // Calculate final score
    const totalPoints = attempt.answers?.reduce((sum, answer) => sum + answer.points, 0) || 0;
    const correctAnswers = attempt.answers?.filter(answer => answer.isCorrect).length || 0;
    const score = attempt.maxPossibleScore > 0 ? (totalPoints / attempt.maxPossibleScore) * 100 : 0;
    const isPassed = attempt.assessment.passingScore ? score >= attempt.assessment.passingScore : true;

    // Calculate time spent
    const timeSpent = attempt.startedAt ? 
      Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000) : 0;

    attempt.status = 'completed';
    attempt.completedAt = new Date();
    attempt.score = score;
    attempt.correctAnswers = correctAnswers;
    attempt.timeSpent = timeSpent;
    attempt.isPassed = isPassed;

    const completedAttempt = await this.attemptRepository.save(attempt);

    this.logger.log(`Assessment attempt completed: ${attemptId} - Score: ${score}% - Passed: ${isPassed}`);

    return completedAttempt;
  }

  async getAssessmentsByVideo(videoId: string): Promise<VideoAssessment[]> {
    return this.assessmentRepository.find({
      where: { videoId, isActive: true },
      relations: ['creator', 'questions'],
      order: { triggerTime: 'ASC' }
    });
  }

  async getAssessmentById(assessmentId: string): Promise<VideoAssessment> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id: assessmentId },
      relations: ['creator', 'questions', 'video']
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found`);
    }

    // Sort questions by order
    if (assessment.questions) {
      assessment.questions.sort((a, b) => a.order - b.order);
    }

    return assessment;
  }

  async getUserAttempts(
    assessmentId: string, 
    userId: string
  ): Promise<VideoAssessmentAttempt[]> {
    return this.attemptRepository.find({
      where: { assessmentId, userId },
      relations: ['answers'],
      order: { createdAt: 'DESC' }
    });
  }

  async getAttemptById(
    attemptId: string, 
    userId: string
  ): Promise<VideoAssessmentAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, userId },
      relations: ['assessment', 'assessment.questions', 'answers']
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt ${attemptId} not found for user`);
    }

    return attempt;
  }

  async getAssessmentStatistics(assessmentId: string): Promise<{
    totalAttempts: number;
    uniqueParticipants: number;
    averageScore: number;
    passRate: number;
    averageTimeSpent: number;
    questionStatistics: Array<{
      questionId: string;
      question: string;
      correctAnswers: number;
      totalAnswers: number;
      successRate: number;
      averageTimeSpent: number;
    }>;
    difficultyDistribution: { [key: string]: number };
  }> {
    const attempts = await this.attemptRepository.find({
      where: { assessmentId, status: 'completed' },
      relations: ['answers']
    });

    const assessment = await this.assessmentRepository.findOne({
      where: { id: assessmentId },
      relations: ['questions']
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found`);
    }

    const totalAttempts = attempts.length;
    const uniqueParticipants = new Set(attempts.map(a => a.userId)).size;
    const averageScore = attempts.length > 0 ? 
      attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length : 0;
    const passRate = attempts.length > 0 ? 
      (attempts.filter(a => a.isPassed).length / attempts.length) * 100 : 0;
    const averageTimeSpent = attempts.length > 0 ? 
      attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / attempts.length : 0;

    // Question-level statistics
    const questionStatistics = assessment.questions?.map(question => {
      const questionAnswers = attempts.flatMap(a => 
        a.answers?.filter(ans => ans.questionId === question.id) || []
      );
      
      const correctAnswers = questionAnswers.filter(ans => ans.isCorrect).length;
      const totalAnswers = questionAnswers.length;
      const successRate = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;
      const avgTimeSpent = questionAnswers.length > 0 ? 
        questionAnswers.reduce((sum, ans) => sum + (ans.timeSpent || 0), 0) / questionAnswers.length : 0;

      return {
        questionId: question.id,
        question: question.question,
        correctAnswers,
        totalAnswers,
        successRate,
        averageTimeSpent: avgTimeSpent,
      };
    }) || [];

    // Difficulty distribution
    const difficultyDistribution: { [key: string]: number } = {};
    assessment.questions?.forEach(question => {
      const difficulty = question.metadata?.difficulty || 'medium';
      difficultyDistribution[difficulty] = (difficultyDistribution[difficulty] || 0) + 1;
    });

    return {
      totalAttempts,
      uniqueParticipants,
      averageScore,
      passRate,
      averageTimeSpent,
      questionStatistics,
      difficultyDistribution,
    };
  }

  async deleteAssessment(assessmentId: string, userId: string): Promise<void> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id: assessmentId }
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found`);
    }

    if (assessment.creatorId !== userId) {
      throw new ForbiddenException('Only assessment creator can delete assessment');
    }

    await this.assessmentRepository.remove(assessment);
    this.logger.log(`Assessment deleted: ${assessmentId} by user ${userId}`);
  }

  async updateQuestion(
    questionId: string, 
    updateDto: Partial<CreateQuestionDto>, 
    userId: string
  ): Promise<VideoAssessmentQuestion> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['assessment']
    });

    if (!question) {
      throw new NotFoundException(`Question ${questionId} not found`);
    }

    if (question.assessment.creatorId !== userId) {
      throw new ForbiddenException('Only assessment creator can update questions');
    }

    if (updateDto.type && updateDto.type !== question.type) {
      this.validateQuestionData({ ...question, ...updateDto } as CreateQuestionDto);
    }

    Object.assign(question, updateDto);
    
    if (updateDto.metadata) {
      question.metadata = { ...question.metadata, ...updateDto.metadata };
    }

    const updatedQuestion = await this.questionRepository.save(question);
    this.logger.log(`Question updated: ${questionId}`);

    return updatedQuestion;
  }

  async deleteQuestion(questionId: string, userId: string): Promise<void> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['assessment']
    });

    if (!question) {
      throw new NotFoundException(`Question ${questionId} not found`);
    }

    if (question.assessment.creatorId !== userId) {
      throw new ForbiddenException('Only assessment creator can delete questions');
    }

    const removedOrder = question.order;
    await this.questionRepository.remove(question);

    // Reorder remaining questions
    await this.reorderQuestions(question.assessmentId, removedOrder);

    this.logger.log(`Question deleted: ${questionId}`);
  }

  private validateQuestionData(createDto: CreateQuestionDto): void {
    switch (createDto.type) {
      case 'multiple_choice':
        if (!createDto.options || createDto.options.length < 2) {
          throw new BadRequestException('Multiple choice questions must have at least 2 options');
        }
        if (!createDto.options.some(opt => opt.isCorrect)) {
          throw new BadRequestException('Multiple choice questions must have at least one correct answer');
        }
        break;

      case 'true_false':
        if (!createDto.correctAnswer || typeof createDto.correctAnswer !== 'boolean') {
          throw new BadRequestException('True/false questions must have a boolean correct answer');
        }
        break;

      case 'short_answer':
      case 'essay':
        if (!createDto.correctAnswer && createDto.type === 'short_answer') {
          throw new BadRequestException('Short answer questions should have expected answers');
        }
        break;

      case 'matching':
        if (!createDto.options || createDto.options.length < 2) {
          throw new BadRequestException('Matching questions must have at least 2 pairs');
        }
        break;

      case 'ordering':
        if (!createDto.options || createDto.options.length < 2) {
          throw new BadRequestException('Ordering questions must have at least 2 items');
        }
        break;
    }
  }

  private evaluateAnswer(question: VideoAssessmentQuestion, userAnswer: any): boolean {
    switch (question.type) {
      case 'multiple_choice':
        if (Array.isArray(userAnswer)) {
          // Multiple correct answers
          const correctOptions = question.options?.filter(opt => opt.isCorrect).map(opt => opt.id) || [];
          return userAnswer.length === correctOptions.length && 
                 userAnswer.every(id => correctOptions.includes(id));
        } else {
          // Single correct answer
          const correctOption = question.options?.find(opt => opt.isCorrect);
          return correctOption?.id === userAnswer;
        }

      case 'true_false':
        return question.correctAnswer === userAnswer;

      case 'short_answer':
        if (typeof question.correctAnswer === 'string' && typeof userAnswer === 'string') {
          return question.correctAnswer.toLowerCase().trim() === userAnswer.toLowerCase().trim();
        }
        return false;

      case 'ordering':
        const correctOrder = question.options?.map((_, index) => index) || [];
        return JSON.stringify(correctOrder) === JSON.stringify(userAnswer);

      case 'matching':
        // For matching, userAnswer should be an object mapping items to their matches
        // This is a simplified implementation
        return JSON.stringify(question.correctAnswer) === JSON.stringify(userAnswer);

      case 'essay':
        // Essays typically require manual grading
        return false;

      default:
        return false;
    }
  }

  private async reorderQuestions(assessmentId: string, removedOrder: number): Promise<void> {
    const questions = await this.questionRepository.find({
      where: { assessmentId },
      order: { order: 'ASC' }
    });

    for (const question of questions) {
      if (question.order > removedOrder) {
        question.order -= 1;
        await this.questionRepository.save(question);
      }
    }
  }

  async getLeaderboard(
    assessmentId: string, 
    limit: number = 10
  ): Promise<Array<{
    userId: string;
    userName: string;
    bestScore: number;
    bestTime: number;
    attemptCount: number;
    completedAt: Date;
  }>> {
    const query = `
      SELECT 
        u.id as "userId",
        CONCAT(u."firstName", ' ', u."lastName") as "userName",
        MAX(a.score) as "bestScore",
        MIN(a."timeSpent") as "bestTime",
        COUNT(a.id) as "attemptCount",
        MAX(a."completedAt") as "completedAt"
      FROM video_assessment_attempts a
      JOIN users u ON a."userId" = u.id
      WHERE a."assessmentId" = $1 AND a.status = 'completed'
      GROUP BY u.id, u."firstName", u."lastName"
      ORDER BY "bestScore" DESC, "bestTime" ASC
      LIMIT $2
    `;

    const results = await this.entityManager.query(query, [assessmentId, limit]);
    return results;
  }
}