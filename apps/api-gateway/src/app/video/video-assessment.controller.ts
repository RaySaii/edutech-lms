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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@edutech-lms/auth';
import { 
  VideoAssessmentService,
  CreateAssessmentDto,
  CreateQuestionDto,
  SubmitAnswerDto,
  StartAttemptDto
} from './video-assessment.service';
import { Request } from 'express';

@ApiTags('Video Assessments')
@Controller('videos/:videoId/assessments')
@UseGuards(JwtAuthGuard)
export class VideoAssessmentController {
  constructor(private readonly assessmentService: VideoAssessmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create assessment for video' })
  @ApiResponse({ status: 201, description: 'Assessment created successfully' })
  async createAssessment(
    @Param('videoId') videoId: string,
    @Body() createDto: CreateAssessmentDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.assessmentService.createAssessment(videoId, createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assessments for video' })
  async getVideoAssessments(
    @Param('videoId') videoId: string,
  ) {
    return this.assessmentService.getAssessmentsByVideo(videoId);
  }

  @Get(':assessmentId')
  @ApiOperation({ summary: 'Get assessment details' })
  async getAssessment(
    @Param('assessmentId') assessmentId: string,
  ) {
    return this.assessmentService.getAssessmentById(assessmentId);
  }

  @Delete(':assessmentId')
  @ApiOperation({ summary: 'Delete assessment' })
  @ApiResponse({ status: 200, description: 'Assessment deleted successfully' })
  async deleteAssessment(
    @Param('assessmentId') assessmentId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    await this.assessmentService.deleteAssessment(assessmentId, userId);
    return { message: 'Assessment deleted successfully' };
  }

  @Post(':assessmentId/questions')
  @ApiOperation({ summary: 'Add question to assessment' })
  @ApiResponse({ status: 201, description: 'Question added successfully' })
  async addQuestion(
    @Param('assessmentId') assessmentId: string,
    @Body() createDto: CreateQuestionDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.assessmentService.addQuestion(assessmentId, createDto, userId);
  }

  @Put(':assessmentId/questions/:questionId')
  @ApiOperation({ summary: 'Update question' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  async updateQuestion(
    @Param('questionId') questionId: string,
    @Body() updateDto: Partial<CreateQuestionDto>,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.assessmentService.updateQuestion(questionId, updateDto, userId);
  }

  @Delete(':assessmentId/questions/:questionId')
  @ApiOperation({ summary: 'Delete question' })
  @ApiResponse({ status: 200, description: 'Question deleted successfully' })
  async deleteQuestion(
    @Param('questionId') questionId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    await this.assessmentService.deleteQuestion(questionId, userId);
    return { message: 'Question deleted successfully' };
  }

  @Post(':assessmentId/start')
  @ApiOperation({ summary: 'Start assessment attempt' })
  @ApiResponse({ status: 201, description: 'Assessment attempt started' })
  async startAttempt(
    @Param('assessmentId') assessmentId: string,
    @Body() startDto: StartAttemptDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.assessmentService.startAttempt(assessmentId, userId, startDto);
  }

  @Get(':assessmentId/attempts')
  @ApiOperation({ summary: 'Get user attempts for assessment' })
  async getUserAttempts(
    @Param('assessmentId') assessmentId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.assessmentService.getUserAttempts(assessmentId, userId);
  }

  @Get(':assessmentId/attempts/:attemptId')
  @ApiOperation({ summary: 'Get specific attempt details' })
  async getAttempt(
    @Param('attemptId') attemptId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.assessmentService.getAttemptById(attemptId, userId);
  }

  @Post(':assessmentId/attempts/:attemptId/submit')
  @ApiOperation({ summary: 'Submit answer for attempt' })
  @ApiResponse({ status: 201, description: 'Answer submitted successfully' })
  async submitAnswer(
    @Param('attemptId') attemptId: string,
    @Body() submitDto: SubmitAnswerDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.assessmentService.submitAnswer(attemptId, submitDto, userId);
  }

  @Post(':assessmentId/attempts/:attemptId/complete')
  @ApiOperation({ summary: 'Complete assessment attempt' })
  @ApiResponse({ status: 200, description: 'Assessment completed successfully' })
  async completeAttempt(
    @Param('attemptId') attemptId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.assessmentService.completeAttempt(attemptId, userId);
  }

  @Get(':assessmentId/statistics')
  @ApiOperation({ summary: 'Get assessment statistics (admin/creator only)' })
  async getAssessmentStatistics(
    @Param('assessmentId') assessmentId: string,
    @Req() req: Request,
  ) {
    // In a real implementation, you'd check admin/creator permissions
    return this.assessmentService.getAssessmentStatistics(assessmentId);
  }

  @Get(':assessmentId/leaderboard')
  @ApiOperation({ summary: 'Get assessment leaderboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLeaderboard(
    @Param('assessmentId') assessmentId: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.assessmentService.getLeaderboard(assessmentId, limit);
  }

  @Post(':assessmentId/duplicate')
  @ApiOperation({ summary: 'Duplicate assessment to another video' })
  @ApiResponse({ status: 201, description: 'Assessment duplicated successfully' })
  async duplicateAssessment(
    @Param('assessmentId') assessmentId: string,
    @Body('targetVideoId') targetVideoId: string,
    @Body('title') title?: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    
    // Get original assessment with questions
    const originalAssessment = await this.assessmentService.getAssessmentById(assessmentId);
    
    // Create new assessment
    const createDto: CreateAssessmentDto = {
      title: title || `Copy of ${originalAssessment.title}`,
      description: originalAssessment.description,
      type: originalAssessment.type as any,
      isRequired: originalAssessment.isRequired,
      triggerTime: originalAssessment.triggerTime,
      timing: originalAssessment.timing as any,
      timeLimit: originalAssessment.timeLimit,
      maxAttempts: originalAssessment.maxAttempts,
      passingScore: originalAssessment.passingScore,
      showResults: originalAssessment.showResults,
      showCorrectAnswers: originalAssessment.showCorrectAnswers,
      randomizeQuestions: originalAssessment.randomizeQuestions,
      randomizeAnswers: originalAssessment.randomizeAnswers,
      settings: originalAssessment.settings,
      completionSettings: originalAssessment.completionSettings,
    };

    const newAssessment = await this.assessmentService.createAssessment(
      targetVideoId, 
      createDto, 
      userId
    );

    // Copy all questions
    if (originalAssessment.questions) {
      for (const question of originalAssessment.questions) {
        const questionDto: CreateQuestionDto = {
          type: question.type as any,
          question: question.question,
          explanation: question.explanation,
          hint: question.hint,
          points: question.points,
          isRequired: question.isRequired,
          timeLimit: question.timeLimit,
          options: question.options,
          correctAnswer: question.correctAnswer,
          metadata: question.metadata,
        };

        await this.assessmentService.addQuestion(newAssessment.id, questionDto, userId);
      }
    }

    return newAssessment;
  }

  @Post('batch-create')
  @ApiOperation({ summary: 'Create multiple assessments from template' })
  @ApiResponse({ status: 201, description: 'Assessments created successfully' })
  async batchCreateAssessments(
    @Body() batchData: {
      videoIds: string[];
      template: CreateAssessmentDto;
      questions: CreateQuestionDto[];
    },
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    const results = [];

    for (const videoId of batchData.videoIds) {
      try {
        // Create assessment
        const assessment = await this.assessmentService.createAssessment(
          videoId,
          batchData.template,
          userId
        );

        // Add questions
        for (const questionDto of batchData.questions) {
          await this.assessmentService.addQuestion(assessment.id, questionDto, userId);
        }

        results.push({ success: true, videoId, assessment });
      } catch (error) {
        results.push({ 
          success: false, 
          videoId,
          error: error.message 
        });
      }
    }

    return {
      totalVideos: batchData.videoIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }
}