import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@edutech-lms/auth';
import { UserRole, ApiRateLimit } from '@edutech-lms/common';
import { 
  AssessmentService, 
  CreateAssessmentDto, 
  CreateQuestionDto, 
  SubmitAnswerDto 
} from './assessment.service';
import { AssessmentType, AssessmentStatus } from '@edutech-lms/database';

@ApiTags('Assessments')
@Controller('assessments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiRateLimit()
export class AssessmentController {
  private readonly logger = new Logger(AssessmentController.name);

  constructor(private readonly assessmentService: AssessmentService) {}

  // Assessment CRUD
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new assessment' })
  @ApiResponse({ status: 201, description: 'Assessment created successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions - teacher role required' })
  async createAssessment(
    @Body(ValidationPipe) createDto: CreateAssessmentDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Assessment creation requested by user: ${user.id}`);
    
    const assessment = await this.assessmentService.createAssessment(createDto, user.id);
    
    return {
      success: true,
      message: 'Assessment created successfully',
      data: assessment,
    };
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get assessments for a course' })
  @ApiQuery({ name: 'status', required: false, enum: AssessmentStatus })
  @ApiResponse({ status: 200, description: 'Assessments retrieved successfully' })
  async getAssessmentsByCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query('status') status?: AssessmentStatus,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Course assessments requested for course: ${courseId} by user: ${user.id}`);
    
    const assessments = await this.assessmentService.findAssessmentsByCourse(courseId, status);
    
    return {
      success: true,
      data: assessments,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assessment by ID' })
  @ApiResponse({ status: 200, description: 'Assessment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async getAssessmentById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Assessment details requested for: ${id} by user: ${user.id}`);
    
    const assessment = await this.assessmentService.findAssessmentById(id);
    
    return {
      success: true,
      data: assessment,
    };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update assessment' })
  @ApiResponse({ status: 200, description: 'Assessment updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to update this assessment' })
  async updateAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: Partial<CreateAssessmentDto>,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Assessment update requested for: ${id} by user: ${user.id}`);
    
    const assessment = await this.assessmentService.updateAssessment(id, updateDto, user.id);
    
    return {
      success: true,
      message: 'Assessment updated successfully',
      data: assessment,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete assessment' })
  @ApiResponse({ status: 200, description: 'Assessment deleted successfully' })
  async deleteAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Assessment deletion requested for: ${id} by user: ${user.id}`);
    
    await this.assessmentService.deleteAssessment(id, user.id);
    
    return {
      success: true,
      message: 'Assessment deleted successfully',
    };
  }

  @Post(':id/publish')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Publish assessment' })
  @ApiResponse({ status: 200, description: 'Assessment published successfully' })
  async publishAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Assessment publish requested for: ${id} by user: ${user.id}`);
    
    const assessment = await this.assessmentService.publishAssessment(id, user.id);
    
    return {
      success: true,
      message: 'Assessment published successfully',
      data: assessment,
    };
  }

  // Question Management
  @Post(':id/questions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add question to assessment' })
  @ApiResponse({ status: 201, description: 'Question added successfully' })
  async addQuestion(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @Body(ValidationPipe) questionDto: CreateQuestionDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Question addition requested for assessment: ${assessmentId} by user: ${user.id}`);
    
    const question = await this.assessmentService.addQuestion(assessmentId, questionDto, user.id);
    
    return {
      success: true,
      message: 'Question added successfully',
      data: question,
    };
  }

  @Put('questions/:questionId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update question' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  async updateQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body(ValidationPipe) updateDto: Partial<CreateQuestionDto>,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Question update requested for: ${questionId} by user: ${user.id}`);
    
    const question = await this.assessmentService.updateQuestion(questionId, updateDto, user.id);
    
    return {
      success: true,
      message: 'Question updated successfully',
      data: question,
    };
  }

  @Delete('questions/:questionId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete question' })
  @ApiResponse({ status: 200, description: 'Question deleted successfully' })
  async deleteQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Question deletion requested for: ${questionId} by user: ${user.id}`);
    
    await this.assessmentService.deleteQuestion(questionId, user.id);
    
    return {
      success: true,
      message: 'Question deleted successfully',
    };
  }

  // Assessment Taking
  @Post(':id/start')
  @ApiOperation({ summary: 'Start assessment attempt' })
  @ApiResponse({ status: 201, description: 'Assessment attempt started successfully' })
  @ApiResponse({ status: 400, description: 'Cannot start assessment (not available, max attempts exceeded, etc.)' })
  async startAssessment(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Assessment start requested for: ${assessmentId} by user: ${user.id}`);
    
    const attempt = await this.assessmentService.startAssessment(assessmentId, user.id);
    
    return {
      success: true,
      message: 'Assessment attempt started successfully',
      data: attempt,
    };
  }

  @Post('attempts/:attemptId/answers')
  @ApiOperation({ summary: 'Submit answer to question' })
  @ApiResponse({ status: 201, description: 'Answer submitted successfully' })
  async submitAnswer(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body(ValidationPipe) answerDto: SubmitAnswerDto,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Answer submission for attempt: ${attemptId} by user: ${user.id}`);
    
    const answer = await this.assessmentService.submitAnswer(attemptId, answerDto, user.id);
    
    return {
      success: true,
      message: 'Answer submitted successfully',
      data: answer,
    };
  }

  @Post('attempts/:attemptId/submit')
  @ApiOperation({ summary: 'Submit complete assessment' })
  @ApiResponse({ status: 200, description: 'Assessment submitted successfully' })
  async submitAssessment(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() body: { feedback?: string },
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Assessment submission for attempt: ${attemptId} by user: ${user.id}`);
    
    const attempt = await this.assessmentService.submitAssessment(attemptId, user.id, body.feedback);
    
    return {
      success: true,
      message: 'Assessment submitted successfully',
      data: attempt,
    };
  }

  // Grading
  @Post('answers/:answerId/grade')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Grade answer manually' })
  @ApiResponse({ status: 200, description: 'Answer graded successfully' })
  async gradeAnswer(
    @Param('answerId', ParseUUIDPipe) answerId: string,
    @Body() gradeDto: { points: number; feedback: string },
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Answer grading requested for: ${answerId} by user: ${user.id}`);
    
    const answer = await this.assessmentService.gradeAnswer(
      answerId, 
      gradeDto.points, 
      gradeDto.feedback, 
      user.id
    );
    
    return {
      success: true,
      message: 'Answer graded successfully',
      data: answer,
    };
  }

  // Results and Analytics
  @Get(':id/attempts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get assessment attempts (teachers only)' })
  @ApiResponse({ status: 200, description: 'Assessment attempts retrieved successfully' })
  async getAssessmentAttempts(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Assessment attempts requested for: ${assessmentId} by user: ${user.id}`);
    
    const attempts = await this.assessmentService.getAssessmentAttempts(assessmentId);
    
    return {
      success: true,
      data: attempts,
    };
  }

  @Get('user/attempts')
  @ApiOperation({ summary: 'Get user\'s assessment attempts' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filter by course ID' })
  @ApiResponse({ status: 200, description: 'User attempts retrieved successfully' })
  async getUserAttempts(
    @CurrentUser() user: any,
    @Query('courseId') courseId?: string,
  ) {
    this.logger.log(`User attempts requested by user: ${user.id}`);
    
    const attempts = await this.assessmentService.getUserAttempts(user.id, courseId);
    
    return {
      success: true,
      data: attempts,
    };
  }

  @Get('course/:courseId/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get assessment statistics for course (teachers only)' })
  @ApiResponse({ status: 200, description: 'Assessment statistics retrieved successfully' })
  async getAssessmentStats(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Assessment stats requested for course: ${courseId} by user: ${user.id}`);
    
    const stats = await this.assessmentService.getAssessmentStats(courseId);
    
    return {
      success: true,
      data: {
        ...stats,
        generatedAt: new Date().toISOString(),
        generatedBy: user.id,
      },
    };
  }

  // Bulk Operations
  @Post(':id/questions/bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add multiple questions to assessment' })
  @ApiResponse({ status: 201, description: 'Questions added successfully' })
  async addBulkQuestions(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @Body() questionsDto: { questions: CreateQuestionDto[] },
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Bulk question addition requested for assessment: ${assessmentId} by user: ${user.id}`);
    
    const addedQuestions = [];
    for (const questionDto of questionsDto.questions) {
      try {
        const question = await this.assessmentService.addQuestion(assessmentId, questionDto, user.id);
        addedQuestions.push(question);
      } catch (error) {
        this.logger.error(`Failed to add question: ${error.message}`);
        addedQuestions.push({ error: error.message });
      }
    }
    
    return {
      success: true,
      message: `${addedQuestions.filter(q => !q.error).length}/${questionsDto.questions.length} questions added successfully`,
      data: addedQuestions,
    };
  }

  @Post(':id/duplicate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Duplicate assessment' })
  @ApiResponse({ status: 201, description: 'Assessment duplicated successfully' })
  async duplicateAssessment(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @Body() duplicateDto: { title: string; courseId?: string },
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Assessment duplication requested for: ${assessmentId} by user: ${user.id}`);
    
    const originalAssessment = await this.assessmentService.findAssessmentById(assessmentId);
    
    const duplicatedAssessment = await this.assessmentService.createAssessment({
      ...originalAssessment,
      title: duplicateDto.title,
      courseId: duplicateDto.courseId || originalAssessment.courseId,
    }, user.id);

    // Copy questions
    for (const question of originalAssessment.questions) {
      await this.assessmentService.addQuestion(duplicatedAssessment.id, {
        type: question.type,
        question: question.question,
        explanation: question.explanation,
        points: question.points,
        order: question.order,
        difficulty: question.difficulty,
        questionData: question.questionData,
      }, user.id);
    }
    
    return {
      success: true,
      message: 'Assessment duplicated successfully',
      data: duplicatedAssessment,
    };
  }
}