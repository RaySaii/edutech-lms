import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptions, In } from 'typeorm';
import { 
  Assessment, 
  AssessmentQuestion, 
  AssessmentAttempt, 
  AssessmentAnswer,
  AssessmentType,
  AssessmentStatus,
  QuestionType,
  DifficultyLevel,
  AttemptStatus,
} from '@edutech-lms/database';
import { CacheService, Cacheable, CacheEvict } from '@edutech-lms/common';

export interface CreateAssessmentDto {
  title: string;
  description?: string;
  type: AssessmentType;
  courseId: string;
  totalPoints: number;
  passingScore: number;
  timeLimit?: number;
  maxAttempts: number;
  showResults: boolean;
  showCorrectAnswers: boolean;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  availableFrom?: Date;
  availableUntil?: Date;
  settings?: any;
}

export interface CreateQuestionDto {
  type: QuestionType;
  question: string;
  explanation?: string;
  points: number;
  order: number;
  difficulty: DifficultyLevel;
  questionData: any;
}

export interface SubmitAnswerDto {
  questionId: string;
  userAnswer: any;
  timeSpent?: number;
}

export interface AssessmentStats {
  totalAssessments: number;
  totalAttempts: number;
  averageScore: number;
  completionRate: number;
  assessmentsByType: Record<string, number>;
  difficultQuestions: Array<{
    questionId: string;
    question: string;
    incorrectCount: number;
    totalAttempts: number;
    difficulty: number;
  }>;
  topPerformers: Array<{
    userId: string;
    userName: string;
    averageScore: number;
    completedAssessments: number;
  }>;
}

@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);

  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentQuestion)
    private questionRepository: Repository<AssessmentQuestion>,
    @InjectRepository(AssessmentAttempt)
    private attemptRepository: Repository<AssessmentAttempt>,
    @InjectRepository(AssessmentAnswer)
    private answerRepository: Repository<AssessmentAnswer>,
    private cacheService: CacheService,
  ) {}

  // Assessment CRUD Operations
  async createAssessment(createDto: CreateAssessmentDto, createdBy: string): Promise<Assessment> {
    const assessment = this.assessmentRepository.create({
      ...createDto,
      createdBy,
      status: AssessmentStatus.DRAFT,
    });

    const savedAssessment = await this.assessmentRepository.save(assessment);
    
    // Clear related caches
    await this.clearAssessmentCaches(savedAssessment.courseId);
    
    this.logger.log(`Assessment created: ${savedAssessment.id} by user: ${createdBy}`);
    return savedAssessment;
  }

  @Cacheable('assessment:${id}', { ttl: 1800, tags: ['assessments'] })
  async findAssessmentById(id: string): Promise<Assessment> {
    const assessment = await this.assessmentRepository.findOne({
      where: { id },
      relations: ['course', 'creator', 'questions', 'attempts'],
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment with ID ${id} not found`);
    }

    return assessment;
  }

  @Cacheable('assessments:course:${courseId}', { ttl: 900, tags: ['assessments'] })
  async findAssessmentsByCourse(courseId: string, status?: AssessmentStatus): Promise<Assessment[]> {
    const where: any = { courseId };
    if (status) {
      where.status = status;
    }

    return this.assessmentRepository.find({
      where,
      relations: ['questions'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateAssessment(id: string, updateDto: Partial<CreateAssessmentDto>, userId: string): Promise<Assessment> {
    const assessment = await this.findAssessmentById(id);
    
    // Check permissions
    if (assessment.createdBy !== userId) {
      throw new ForbiddenException('You can only edit your own assessments');
    }

    Object.assign(assessment, updateDto);
    const updatedAssessment = await this.assessmentRepository.save(assessment);
    
    await this.clearAssessmentCaches(assessment.courseId, id);
    
    this.logger.log(`Assessment updated: ${id} by user: ${userId}`);
    return updatedAssessment;
  }

  @CacheEvict(['assessments'])
  async deleteAssessment(id: string, userId: string): Promise<void> {
    const assessment = await this.findAssessmentById(id);
    
    // Check permissions
    if (assessment.createdBy !== userId) {
      throw new ForbiddenException('You can only delete your own assessments');
    }

    await this.assessmentRepository.remove(assessment);
    await this.clearAssessmentCaches(assessment.courseId, id);
    
    this.logger.log(`Assessment deleted: ${id} by user: ${userId}`);
  }

  async publishAssessment(id: string, userId: string): Promise<Assessment> {
    const assessment = await this.findAssessmentById(id);
    
    if (assessment.createdBy !== userId) {
      throw new ForbiddenException('You can only publish your own assessments');
    }

    if (assessment.questions.length === 0) {
      throw new BadRequestException('Cannot publish assessment without questions');
    }

    assessment.status = AssessmentStatus.PUBLISHED;
    const publishedAssessment = await this.assessmentRepository.save(assessment);
    
    await this.clearAssessmentCaches(assessment.courseId, id);
    
    this.logger.log(`Assessment published: ${id} by user: ${userId}`);
    return publishedAssessment;
  }

  // Question Management
  async addQuestion(assessmentId: string, questionDto: CreateQuestionDto, userId: string): Promise<AssessmentQuestion> {
    const assessment = await this.findAssessmentById(assessmentId);
    
    if (assessment.createdBy !== userId) {
      throw new ForbiddenException('You can only add questions to your own assessments');
    }

    if (assessment.status === AssessmentStatus.PUBLISHED) {
      throw new BadRequestException('Cannot modify published assessments');
    }

    const question = this.questionRepository.create({
      ...questionDto,
      assessmentId,
    });

    const savedQuestion = await this.questionRepository.save(question);
    await this.clearAssessmentCaches(assessment.courseId, assessmentId);
    
    this.logger.log(`Question added to assessment: ${assessmentId} by user: ${userId}`);
    return savedQuestion;
  }

  async updateQuestion(questionId: string, updateDto: Partial<CreateQuestionDto>, userId: string): Promise<AssessmentQuestion> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['assessment'],
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    if (question.assessment.createdBy !== userId) {
      throw new ForbiddenException('You can only edit questions in your own assessments');
    }

    if (question.assessment.status === AssessmentStatus.PUBLISHED) {
      throw new BadRequestException('Cannot modify published assessments');
    }

    Object.assign(question, updateDto);
    const updatedQuestion = await this.questionRepository.save(question);
    
    await this.clearAssessmentCaches(question.assessment.courseId, question.assessmentId);
    
    return updatedQuestion;
  }

  async deleteQuestion(questionId: string, userId: string): Promise<void> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['assessment'],
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    if (question.assessment.createdBy !== userId) {
      throw new ForbiddenException('You can only delete questions from your own assessments');
    }

    if (question.assessment.status === AssessmentStatus.PUBLISHED) {
      throw new BadRequestException('Cannot modify published assessments');
    }

    await this.questionRepository.remove(question);
    await this.clearAssessmentCaches(question.assessment.courseId, question.assessmentId);
  }

  // Assessment Taking
  async startAssessment(assessmentId: string, userId: string): Promise<AssessmentAttempt> {
    const assessment = await this.findAssessmentById(assessmentId);
    
    if (assessment.status !== AssessmentStatus.PUBLISHED) {
      throw new BadRequestException('Assessment is not available');
    }

    // Check availability dates
    const now = new Date();
    if (assessment.availableFrom && now < assessment.availableFrom) {
      throw new BadRequestException('Assessment is not yet available');
    }
    if (assessment.availableUntil && now > assessment.availableUntil) {
      throw new BadRequestException('Assessment is no longer available');
    }

    // Check attempt limits
    const previousAttempts = await this.attemptRepository.count({
      where: { assessmentId, userId },
    });

    if (previousAttempts >= assessment.maxAttempts) {
      throw new BadRequestException('Maximum attempts exceeded');
    }

    const attempt = this.attemptRepository.create({
      assessmentId,
      userId,
      attemptNumber: previousAttempts + 1,
      startedAt: new Date(),
      status: AttemptStatus.IN_PROGRESS,
      maxScore: assessment.totalPoints,
    });

    const savedAttempt = await this.attemptRepository.save(attempt);
    
    this.logger.log(`Assessment attempt started: ${assessmentId} by user: ${userId}`);
    return savedAttempt;
  }

  async submitAnswer(attemptId: string, answerDto: SubmitAnswerDto, userId: string): Promise<AssessmentAnswer> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, userId },
      relations: ['assessment'],
    });

    if (!attempt) {
      throw new NotFoundException('Assessment attempt not found');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Assessment attempt is not active');
    }

    const question = await this.questionRepository.findOne({ where: { id: answerDto.questionId } });
    if (!question || question.assessmentId !== attempt.assessmentId) {
      throw new BadRequestException('Invalid question');
    }

    // Find existing answer or create new one
    let answer = await this.answerRepository.findOne({
      where: { attemptId, questionId: answerDto.questionId },
    });

    if (answer) {
      // Update existing answer
      answer.saveAnswerToHistory();
      answer.userAnswer = answerDto.userAnswer;
      if (answerDto.timeSpent) {
        answer.timeSpent = answerDto.timeSpent;
      }
    } else {
      // Create new answer
      answer = this.answerRepository.create({
        attemptId,
        questionId: answerDto.questionId,
        userAnswer: answerDto.userAnswer,
        timeSpent: answerDto.timeSpent,
      });
    }

    answer.question = question;
    answer.autoGrade();

    const savedAnswer = await this.answerRepository.save(answer);
    
    this.logger.log(`Answer submitted for question: ${answerDto.questionId} in attempt: ${attemptId}`);
    return savedAnswer;
  }

  async submitAssessment(attemptId: string, userId: string, feedback?: string): Promise<AssessmentAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, userId },
      relations: ['assessment', 'answers', 'answers.question'],
    });

    if (!attempt) {
      throw new NotFoundException('Assessment attempt not found');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Assessment attempt is not active');
    }

    attempt.markAsCompleted(feedback);
    const submittedAttempt = await this.attemptRepository.save(attempt);
    
    // Auto-grade if all questions are automatically gradable
    const needsManualGrading = attempt.answers.some(answer => answer.needsManualGrading);
    if (!needsManualGrading) {
      submittedAttempt.status = AttemptStatus.GRADED;
    }

    await this.attemptRepository.save(submittedAttempt);
    
    this.logger.log(`Assessment submitted: ${attemptId} by user: ${userId}`);
    return submittedAttempt;
  }

  // Grading
  async gradeAnswer(answerId: string, points: number, feedback: string, graderId: string): Promise<AssessmentAnswer> {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
      relations: ['question', 'attempt'],
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    answer.manualGrade(points, feedback, graderId);
    const gradedAnswer = await this.answerRepository.save(answer);
    
    // Check if all answers in the attempt are graded
    const pendingAnswers = await this.answerRepository.count({
      where: { 
        attemptId: answer.attemptId,
        needsManualGrading: true,
        gradedAt: null,
      },
    });

    if (pendingAnswers === 0) {
      // All answers are graded, update attempt status
      answer.attempt.markAsGraded(graderId);
      await this.attemptRepository.save(answer.attempt);
    }

    this.logger.log(`Answer graded: ${answerId} by user: ${graderId}`);
    return gradedAnswer;
  }

  // Analytics and Reporting
  @Cacheable('assessment:stats:${courseId}', { ttl: 1800, tags: ['assessment-stats'] })
  async getAssessmentStats(courseId: string): Promise<AssessmentStats> {
    const assessments = await this.assessmentRepository.find({
      where: { courseId },
      relations: ['attempts', 'questions'],
    });

    const totalAssessments = assessments.length;
    const allAttempts = assessments.flatMap(a => a.attempts);
    const completedAttempts = allAttempts.filter(a => a.isCompleted);

    const totalAttempts = allAttempts.length;
    const averageScore = completedAttempts.length > 0 
      ? completedAttempts.reduce((sum, a) => sum + a.percentage, 0) / completedAttempts.length
      : 0;
    
    const completionRate = totalAttempts > 0 
      ? (completedAttempts.length / totalAttempts) * 100 
      : 0;

    const assessmentsByType = assessments.reduce((acc, assessment) => {
      acc[assessment.type] = (acc[assessment.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // This would typically involve more complex queries for difficult questions and top performers
    const difficultQuestions = [];
    const topPerformers = [];

    return {
      totalAssessments,
      totalAttempts,
      averageScore,
      completionRate,
      assessmentsByType,
      difficultQuestions,
      topPerformers,
    };
  }

  async getAssessmentAttempts(assessmentId: string): Promise<AssessmentAttempt[]> {
    return this.attemptRepository.find({
      where: { assessmentId },
      relations: ['user', 'answers'],
      order: { startedAt: 'DESC' },
    });
  }

  async getUserAttempts(userId: string, courseId?: string): Promise<AssessmentAttempt[]> {
    const where: any = { userId };
    
    if (courseId) {
      const assessmentIds = await this.assessmentRepository.find({
        where: { courseId },
        select: ['id'],
      });
      where.assessmentId = In(assessmentIds.map(a => a.id));
    }

    return this.attemptRepository.find({
      where,
      relations: ['assessment', 'answers'],
      order: { startedAt: 'DESC' },
    });
  }

  // Helper Methods
  private async clearAssessmentCaches(courseId: string, assessmentId?: string): Promise<void> {
    const patterns = [
      `assessments:course:${courseId}`,
      'assessment:stats:*',
    ];

    if (assessmentId) {
      patterns.push(`assessment:${assessmentId}`);
    }

    await Promise.all(
      patterns.map(pattern => this.cacheService.deleteByPattern(pattern, 'assessments'))
    );
  }
}