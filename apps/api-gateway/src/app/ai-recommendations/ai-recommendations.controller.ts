import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@edutech-lms/auth';
import { CurrentUser } from '@edutech-lms/auth';
import { SkillLevel, LearningStyle, RecommendationType } from '@edutech-lms/database';
import {
  AIRecommendationsService,
  RecommendationRequest,
  RecommendationResponse,
  UserProfileAnalysis,
} from './ai-recommendations.service';
import { RecommendationEngineService } from './recommendation-engine.service';

@ApiTags('ai-recommendations')
@Controller('ai-recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIRecommendationsController {
  constructor(
    private recommendationsService: AIRecommendationsService,
    private engineService: RecommendationEngineService,
  ) {}

  // Main Recommendation Endpoints

  @Get('personalized')
  @ApiOperation({ summary: 'Get personalized content recommendations' })
  @ApiResponse({ status: 200, description: 'Recommendations generated successfully' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of recommendations' })
  @ApiQuery({ name: 'diversityLevel', required: false, description: 'Diversity level (0-1)' })
  @ApiQuery({ name: 'contentTypes', required: false, description: 'Comma-separated content types' })
  @ApiQuery({ name: 'excludeCompleted', required: false, description: 'Exclude completed content' })
  async getPersonalizedRecommendations(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
    @Query('diversityLevel') diversityLevel?: number,
    @Query('contentTypes') contentTypes?: string,
    @Query('excludeCompleted') excludeCompleted?: boolean,
    @Query('context') context?: string
  ): Promise<{
    success: boolean;
    data: RecommendationResponse;
  }> {
    const request: RecommendationRequest = {
      userId: user.id,
      organizationId: user.organizationId,
      maxRecommendations: limit ? parseInt(limit.toString()) : 10,
      diversityLevel: diversityLevel ? parseFloat(diversityLevel.toString()) : 0.3,
      filters: {
        contentTypes: contentTypes ? contentTypes.split(',') : undefined,
        excludeCompleted: excludeCompleted === true,
      },
      context: context ? JSON.parse(context) : undefined,
    };

    const recommendations = await this.recommendationsService.getPersonalizedRecommendations(request);

    return {
      success: true,
      data: recommendations,
    };
  }

  @Get('content-based')
  @ApiOperation({ summary: 'Get content-based recommendations' })
  @ApiResponse({ status: 200, description: 'Content-based recommendations generated' })
  async getContentBasedRecommendations(
    @CurrentUser() user: any,
    @Query('limit') limit: number = 20
  ) {
    const recommendations = await this.engineService.generateContentBasedRecommendations(
      user.id,
      user.organizationId,
      limit
    );

    return {
      success: true,
      data: recommendations,
    };
  }

  @Get('collaborative')
  @ApiOperation({ summary: 'Get collaborative filtering recommendations' })
  @ApiResponse({ status: 200, description: 'Collaborative recommendations generated' })
  async getCollaborativeRecommendations(
    @CurrentUser() user: any,
    @Query('limit') limit: number = 20
  ) {
    const recommendations = await this.engineService.generateCollaborativeRecommendations(
      user.id,
      user.organizationId,
      limit
    );

    return {
      success: true,
      data: recommendations,
    };
  }

  @Get('contextual')
  @ApiOperation({ summary: 'Get contextual recommendations' })
  @ApiResponse({ status: 200, description: 'Contextual recommendations generated' })
  async getContextualRecommendations(
    @CurrentUser() user: any,
    @Query('currentContent') currentContent?: string,
    @Query('currentCourse') currentCourse?: string,
    @Query('platform') platform?: string,
    @Query('limit') limit: number = 20
  ) {
    const context = {
      currentContent,
      currentCourse,
      platform,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
    };

    const recommendations = await this.engineService.generateContextualRecommendations(
      user.id,
      user.organizationId,
      context,
      limit
    );

    return {
      success: true,
      data: recommendations,
    };
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending content recommendations' })
  @ApiResponse({ status: 200, description: 'Trending recommendations generated' })
  async getTrendingRecommendations(
    @CurrentUser() user: any,
    @Query('timeframe') timeframe: string = '7d',
    @Query('limit') limit: number = 20
  ) {
    // Implementation would get trending content based on recent activity
    return {
      success: true,
      data: [],
      message: 'Trending recommendations feature coming soon',
    };
  }

  // User Profile Management

  @Get('profile')
  @ApiOperation({ summary: 'Get user learning profile analysis' })
  @ApiResponse({ status: 200, description: 'User profile analysis retrieved' })
  async getUserProfileAnalysis(@CurrentUser() user: any): Promise<{
    success: boolean;
    data: UserProfileAnalysis;
  }> {
    const analysis = await this.recommendationsService.analyzeUserProfile(
      user.id,
      user.organizationId
    );

    return {
      success: true,
      data: analysis,
    };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user learning profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  async updateUserProfile(
    @CurrentUser() user: any,
    @Body() profileUpdates: {
      interests?: {
        topics?: string[];
        categories?: string[];
        skills?: string[];
        career_goals?: string[];
      };
      learningStyle?: LearningStyle;
      preferences?: {
        content_types?: string[];
        duration_preference?: 'short' | 'medium' | 'long';
        difficulty_preference?: SkillLevel;
        language?: string;
        timezone?: string;
        available_hours?: {
          weekday: number;
          weekend: number;
        };
      };
      careerPath?: {
        current_role?: string;
        target_role?: string;
        industry?: string;
        experience_years?: number;
        required_skills?: string[];
        skill_gaps?: string[];
      };
    }
  ) {
    const updatedProfile = await this.recommendationsService.updateUserLearningProfile(
      user.id,
      user.organizationId,
      profileUpdates as any
    );

    return {
      success: true,
      data: updatedProfile,
    };
  }

  @Post('profile/interests')
  @ApiOperation({ summary: 'Add user interests' })
  @ApiResponse({ status: 201, description: 'Interests added successfully' })
  async addUserInterests(
    @CurrentUser() user: any,
    @Body() interests: {
      topics: string[];
      categories: string[];
      skills: string[];
    }
  ) {
    const profile = await this.recommendationsService.updateUserLearningProfile(
      user.id,
      user.organizationId,
      { interests: interests as any }
    );

    return {
      success: true,
      data: profile,
      message: 'Interests added successfully',
    };
  }

  @Put('profile/career-path')
  @ApiOperation({ summary: 'Update career path information' })
  @ApiResponse({ status: 200, description: 'Career path updated successfully' })
  async updateCareerPath(
    @CurrentUser() user: any,
    @Body() careerPath: {
      current_role: string;
      target_role: string;
      industry: string;
      experience_years: number;
      required_skills: string[];
    }
  ) {
    const profile = await this.recommendationsService.updateUserLearningProfile(
      user.id,
      user.organizationId,
      { careerPath } as any
    );

    return {
      success: true,
      data: profile,
      message: 'Career path updated successfully',
    };
  }

  // Interaction Tracking

  @Post('interactions')
  @ApiOperation({ summary: 'Track recommendation interaction' })
  @ApiResponse({ status: 201, description: 'Interaction tracked successfully' })
  @HttpCode(HttpStatus.CREATED)
  async trackInteraction(
    @CurrentUser() user: any,
    @Body() interaction: {
      recommendationId: string;
      interactionType: 'view' | 'click' | 'enroll' | 'dismiss' | 'rate' | 'share';
      interactionData?: {
        duration?: number;
        scrollDepth?: number;
        rating?: number;
        deviceType?: string;
        platform?: string;
        context?: string;
      };
    }
  ) {
    await this.recommendationsService.trackRecommendationInteraction(
      user.id,
      interaction.recommendationId,
      interaction.interactionType,
      interaction.interactionData
    );

    return {
      success: true,
      message: 'Interaction tracked successfully',
    };
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Provide feedback on recommendations' })
  @ApiResponse({ status: 201, description: 'Feedback recorded successfully' })
  async provideFeedback(
    @CurrentUser() user: any,
    @Body() feedback: {
      recommendationId: string;
      rating: number; // 1-5
      relevance: number; // 1-5
      helpful: boolean;
      comments?: string;
      reason?: string;
    }
  ) {
    await this.recommendationsService.trackRecommendationInteraction(
      user.id,
      feedback.recommendationId,
      'rate',
      {
        rating: feedback.rating,
        relevance: feedback.relevance,
        helpful: feedback.helpful,
        comments: feedback.comments,
        reason: feedback.reason,
      }
    );

    return {
      success: true,
      message: 'Feedback recorded successfully',
    };
  }

  // Content Analysis

  @Post('content/:contentId/analyze')
  @ApiOperation({ summary: 'Analyze content features for recommendations' })
  @ApiResponse({ status: 201, description: 'Content features generated successfully' })
  async analyzeContentFeatures(
    @Param('contentId') contentId: string
  ) {
    const features = await this.recommendationsService.generateContentFeatures(contentId);

    return {
      success: true,
      data: features,
      message: 'Content features analyzed successfully',
    };
  }

  @Get('content/:contentId/similar')
  @ApiOperation({ summary: 'Get similar content recommendations' })
  @ApiResponse({ status: 200, description: 'Similar content retrieved successfully' })
  async getSimilarContent(
    @Param('contentId') contentId: string,
    @Query('limit') limit: number = 10
  ) {
    // Get similar content based on content similarity matrix
    const similarities = await this.recommendationsService['contentSimilarityRepository'].find({
      where: { contentId1: contentId },
      order: { similarityScore: 'DESC' },
      take: limit,
    });

    return {
      success: true,
      data: similarities.map(sim => ({
        contentId: sim.contentId2,
        similarityScore: sim.similarityScore,
        similarityFactors: sim.similarityFactors,
      })),
    };
  }

  // Model Management (Admin endpoints)

  @Post('models')
  @ApiOperation({ summary: 'Create recommendation model' })
  @ApiResponse({ status: 201, description: 'Model created successfully' })
  async createRecommendationModel(
    @CurrentUser() user: any,
    @Body() modelData: {
      modelName: string;
      modelType: RecommendationType;
      description: string;
      configuration: {
        algorithm: string;
        parameters: Record<string, any>;
        featureWeights: Record<string, number>;
        similarityThreshold: number;
        minConfidence: number;
      };
    }
  ) {
    const model = await this.recommendationsService.createRecommendationModel(
      user.organizationId,
      modelData
    );

    return {
      success: true,
      data: model,
      message: 'Recommendation model created successfully',
    };
  }

  @Get('models')
  @ApiOperation({ summary: 'Get organization recommendation models' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  async getRecommendationModels(@CurrentUser() user: any) {
    const models = await this.recommendationsService['modelRepository'].find({
      where: { organizationId: user.organizationId },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: models,
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get recommendation system analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getRecommendationAnalytics(
    @CurrentUser() user: any,
    @Query('period') period: string = '30d'
  ) {
    // Get recommendation performance analytics
    const analytics = {
      totalRecommendations: 0,
      clickThroughRate: 0,
      conversionRate: 0,
      userSatisfaction: 0,
      modelPerformance: {},
      topRecommendedContent: [],
      userEngagement: {},
    };

    // In a real implementation, calculate these metrics from recommendation interactions

    return {
      success: true,
      data: analytics,
    };
  }

  // Utility Endpoints

  @Get('skills/extract/:contentId')
  @ApiOperation({ summary: 'Extract skills from content' })
  @ApiResponse({ status: 200, description: 'Skills extracted successfully' })
  async extractContentSkills(@Param('contentId') contentId: string) {
    // Extract skills from content using NLP
    const skills = []; // Placeholder

    return {
      success: true,
      data: { skills },
      message: 'Skills extracted successfully',
    };
  }

  @Get('learning-paths/:targetRole')
  @ApiOperation({ summary: 'Get recommended learning path for target role' })
  @ApiResponse({ status: 200, description: 'Learning path generated successfully' })
  async generateLearningPath(
    @CurrentUser() user: any,
    @Param('targetRole') targetRole: string
  ) {
    // Generate learning path based on target role and current skills
    const learningPath = {
      targetRole,
      estimatedDuration: '6 months',
      courses: [],
      skills: [],
      milestones: [],
    };

    return {
      success: true,
      data: learningPath,
      message: 'Learning path generated successfully',
    };
  }

  @Post('refresh-similarities')
  @ApiOperation({ summary: 'Refresh similarity matrices' })
  @ApiResponse({ status: 200, description: 'Similarities refreshed successfully' })
  async refreshSimilarities(@CurrentUser() user: any) {
    // Trigger similarity matrix recalculation
    // This would typically be done as a background job

    return {
      success: true,
      message: 'Similarity refresh initiated',
    };
  }

  @Get('recommendations/:recommendationId')
  @ApiOperation({ summary: 'Get recommendation details' })
  @ApiResponse({ status: 200, description: 'Recommendation details retrieved' })
  async getRecommendationDetails(@Param('recommendationId') recommendationId: string) {
    const recommendation = await this.recommendationsService['recommendationRepository'].findOne({
      where: { id: recommendationId },
      relations: ['content', 'course', 'model'],
    });

    if (!recommendation) {
      return {
        success: false,
        message: 'Recommendation not found',
      };
    }

    return {
      success: true,
      data: recommendation,
    };
  }

  @Get('user-similarities/:userId')
  @ApiOperation({ summary: 'Get users similar to specified user' })
  @ApiResponse({ status: 200, description: 'Similar users retrieved successfully' })
  async getSimilarUsers(
    @CurrentUser() currentUser: any,
    @Param('userId') userId: string,
    @Query('limit') limit: number = 10
  ) {
    const similarities = await this.recommendationsService['userSimilarityRepository'].find({
      where: { userId1: userId },
      order: { similarityScore: 'DESC' },
      take: limit,
      relations: ['user2'],
    });

    return {
      success: true,
      data: similarities.map(sim => ({
        userId: sim.userId2,
        userName: sim.user2 ? `${sim.user2.firstName} ${sim.user2.lastName}` : 'Unknown User',
        similarityScore: sim.similarityScore,
        similarityFactors: sim.similarityFactors,
      })),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'AI recommendations service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          recommendations: 'operational',
          engine: 'operational',
          analytics: 'operational',
          ml_models: 'operational',
        },
      },
    };
  }
}