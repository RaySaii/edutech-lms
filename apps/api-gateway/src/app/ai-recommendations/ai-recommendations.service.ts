import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  UserLearningProfile,
  ContentFeatures,
  RecommendationModel,
  UserRecommendation,
  RecommendationInteraction,
  ContentSimilarityMatrix,
  UserSimilarityMatrix,
  RecommendationExperiment,
  RecommendationType,
  RecommendationStatus,
  LearningStyle,
  SkillLevel,
  User,
  Organization,
  Course,
  Content,
  Enrollment,
  ContentProgress,
  Assessment,
  AssessmentAttempt,
  ContentStatus,
} from '@edutech-lms/database';

export interface RecommendationRequest {
  userId: string;
  organizationId: string;
  context?: {
    currentContent?: string;
    currentCourse?: string;
    page?: string;
    platform?: string;
  };
  filters?: {
    contentTypes?: string[];
    difficultyLevels?: SkillLevel[];
    maxDuration?: number;
    excludeCompleted?: boolean;
  };
  maxRecommendations?: number;
  diversityLevel?: number; // 0-1
}

export interface RecommendationResponse {
  recommendations: Array<{
    id: string;
    contentId: string;
    courseId?: string;
    title: string;
    description: string;
    thumbnailUrl?: string;
    type: RecommendationType;
    confidenceScore: number;
    relevanceScore: number;
    reasoning: {
      primaryFactors: string[];
      explanation: string;
    };
    metadata: {
      duration?: number;
      difficulty?: SkillLevel;
      skillsLearned?: string[];
      completionRate?: number;
      rating?: number;
    };
  }>;
  metadata: {
    totalAvailable: number;
    algorithmUsed: string;
    personalizationLevel: number;
    diversityScore: number;
    responseTime: number;
  };
}

export interface UserProfileAnalysis {
  interests: string[];
  skillLevels: Record<string, { level: SkillLevel; confidence: number }>;
  learningStyle: LearningStyle;
  preferences: any;
  behavior: any;
  recommendations: {
    skillGaps: string[];
    careerAlignment: string[];
    contentSuggestions: string[];
  };
}

@Injectable()
export class AIRecommendationsService {
  private readonly logger = new Logger(AIRecommendationsService.name);

  constructor(
    @InjectRepository(UserLearningProfile)
    private profileRepository: Repository<UserLearningProfile>,
    @InjectRepository(ContentFeatures)
    private featuresRepository: Repository<ContentFeatures>,
    @InjectRepository(RecommendationModel)
    private modelRepository: Repository<RecommendationModel>,
    @InjectRepository(UserRecommendation)
    private recommendationRepository: Repository<UserRecommendation>,
    @InjectRepository(RecommendationInteraction)
    private interactionRepository: Repository<RecommendationInteraction>,
    @InjectRepository(ContentSimilarityMatrix)
    private contentSimilarityRepository: Repository<ContentSimilarityMatrix>,
    @InjectRepository(UserSimilarityMatrix)
    private userSimilarityRepository: Repository<UserSimilarityMatrix>,
    @InjectRepository(RecommendationExperiment)
    private experimentRepository: Repository<RecommendationExperiment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(ContentProgress)
    private progressRepository: Repository<ContentProgress>,
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentAttempt)
    private attemptRepository: Repository<AssessmentAttempt>,
  ) {}

  async getPersonalizedRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResponse> {
    const startTime = Date.now();

    try {
      // Get or create user learning profile
      const userProfile = await this.getUserLearningProfile(
        request.userId,
        request.organizationId
      );

      // Get active recommendation models
      const models = await this.getActiveModels(request.organizationId);

      // Generate recommendations using ensemble approach
      const recommendations = await this.generateEnsembleRecommendations(
        userProfile,
        models,
        request
      );

      // Apply diversity and filtering
      const finalRecommendations = await this.applyDiversityAndFilters(
        recommendations,
        request
      );

      // Store recommendations for tracking
      await this.storeRecommendations(finalRecommendations, request);

      // Calculate metadata
      const metadata = {
        totalAvailable: recommendations.length,
        algorithmUsed: models.map(m => m.modelType).join(', '),
        personalizationLevel: this.calculatePersonalizationLevel(userProfile),
        diversityScore: this.calculateDiversityScore(finalRecommendations),
        responseTime: Date.now() - startTime,
      };

      this.logger.log(`Generated ${finalRecommendations.length} recommendations for user ${request.userId}`);

      return {
        recommendations: finalRecommendations,
        metadata,
      };
    } catch (error) {
      this.logger.error(`Failed to generate recommendations: ${error.message}`);
      throw error;
    }
  }

  async analyzeUserProfile(
    userId: string,
    organizationId: string
  ): Promise<UserProfileAnalysis> {
    try {
      const profile = await this.getUserLearningProfile(userId, organizationId);

      if (!profile) {
        throw new Error('User profile not found');
      }

      // Analyze skill gaps
      const skillGaps = await this.identifySkillGaps(userId, profile);

      // Analyze career alignment
      const careerAlignment = await this.analyzeCareerAlignment(userId, profile);

      // Generate content suggestions
      const contentSuggestions = await this.generateContentSuggestions(userId, profile);

      return {
        interests: profile.interests.topics,
        skillLevels: profile.skillLevels,
        learningStyle: profile.learningStyle,
        preferences: profile.preferences,
        behavior: profile.learningBehavior,
        recommendations: {
          skillGaps,
          careerAlignment,
          contentSuggestions,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to analyze user profile: ${error.message}`);
      throw error;
    }
  }

  async updateUserLearningProfile(
    userId: string,
    organizationId: string,
    updates: Partial<UserLearningProfile>
  ): Promise<UserLearningProfile> {
    try {
      let profile = await this.profileRepository.findOne({
        where: { userId, organizationId },
      });

      if (!profile) {
        profile = this.profileRepository.create({
          userId,
          organizationId,
          interests: { topics: [], categories: [], skills: [], career_goals: [] },
          learningStyle: LearningStyle.MIXED,
          preferences: {
            content_types: ['video', 'text'],
            duration_preference: 'medium',
            difficulty_preference: SkillLevel.INTERMEDIATE,
            language: 'en',
            timezone: 'UTC',
            available_hours: { weekday: 1, weekend: 2 },
          },
          skillLevels: {},
          learningBehavior: {
            session_patterns: {
              preferred_times: ['18:00', '19:00', '20:00'],
              average_duration: 30,
              frequency_per_week: 3,
            },
            completion_rate: 0,
            engagement_score: 0,
            help_seeking_frequency: 0,
            social_learning_preference: 0.5,
          },
          profileCompleteness: 0,
        });
      }

      Object.assign(profile, updates);
      profile.lastProfiledAt = new Date();
      profile.profileCompleteness = this.calculateProfileCompleteness(profile);

      const savedProfile = await this.profileRepository.save(profile);

      this.logger.log(`Updated learning profile for user ${userId}`);
      return savedProfile;
    } catch (error) {
      this.logger.error(`Failed to update user learning profile: ${error.message}`);
      throw error;
    }
  }

  async trackRecommendationInteraction(
    userId: string,
    recommendationId: string,
    interactionType: string,
    interactionData?: any
  ): Promise<void> {
    try {
      // Create interaction record
      const interaction = this.interactionRepository.create({
        userId,
        recommendationId,
        interactionType,
        interactionData,
        ipAddress: interactionData?.ipAddress,
        userAgent: interactionData?.userAgent,
        sessionId: interactionData?.sessionId,
      });

      await this.interactionRepository.save(interaction);

      // Update recommendation status
      await this.updateRecommendationStatus(recommendationId, interactionType);

      this.logger.debug(`Tracked ${interactionType} interaction for recommendation ${recommendationId}`);
    } catch (error) {
      this.logger.error(`Failed to track recommendation interaction: ${error.message}`);
      throw error;
    }
  }

  async generateContentFeatures(contentId: string): Promise<ContentFeatures> {
    try {
      const content = await this.contentRepository.findOne({
        where: { id: contentId },
        relations: ['course'],
      });

      if (!content) {
        throw new Error(`Content ${contentId} not found`);
      }

      // Extract features using various techniques
      const features = {
        topics: await this.extractTopics(content),
        skills: await this.extractSkills(content),
        categories: await this.extractCategories(content),
        difficultyLevel: await this.assessDifficulty(content),
        prerequisites: await this.identifyPrerequisites(content),
        learningObjectives: await this.extractLearningObjectives(content),
        contentCharacteristics: await this.analyzeContentCharacteristics(content),
        languageFeatures: await this.analyzeLanguageFeatures(content),
        engagement: await this.calculateEngagementMetrics(content),
        aiExtractedFeatures: await this.extractAIFeatures(content),
      };

      // Create or update content features
      let contentFeatures = await this.featuresRepository.findOne({
        where: { contentId },
      });

      if (!contentFeatures) {
        contentFeatures = this.featuresRepository.create({
          organizationId: content.course.organizationId,
          contentId,
          ...features,
        });
      } else {
        Object.assign(contentFeatures, features);
      }

      contentFeatures.lastAnalyzedAt = new Date();
      const savedFeatures = await this.featuresRepository.save(contentFeatures);

      this.logger.log(`Generated features for content ${contentId}`);
      return savedFeatures;
    } catch (error) {
      this.logger.error(`Failed to generate content features: ${error.message}`);
      throw error;
    }
  }

  async createRecommendationModel(
    organizationId: string,
    modelData: {
      modelName: string;
      modelType: RecommendationType;
      description: string;
      configuration: any;
    }
  ): Promise<RecommendationModel> {
    try {
      const model = this.modelRepository.create({
        organizationId,
        modelName: modelData.modelName,
        modelType: modelData.modelType,
        description: modelData.description,
        configuration: modelData.configuration,
        trainingData: {
          user_interactions: 0,
          content_items: 0,
          training_period_days: 30,
          last_training: new Date().toISOString(),
          data_quality_score: 0,
        },
        performance: {
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1_score: 0,
          click_through_rate: 0,
          conversion_rate: 0,
          user_satisfaction: 0,
        },
        isActive: false,
        version: '1.0.0',
      });

      const savedModel = await this.modelRepository.save(model);

      this.logger.log(`Created recommendation model: ${savedModel.id}`);
      return savedModel;
    } catch (error) {
      this.logger.error(`Failed to create recommendation model: ${error.message}`);
      throw error;
    }
  }

  // Background processing methods

  @Cron(CronExpression.EVERY_HOUR)
  async updateUserProfiles(): Promise<void> {
    try {
      // Get users who need profile updates
      const users = await this.userRepository
        .createQueryBuilder('user')
        .leftJoin('user.learningProfile', 'profile')
        .where('profile.lastProfiledAt IS NULL OR profile.lastProfiledAt < :threshold', {
          threshold: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        })
        .take(100) // Process in batches
        .getMany();

      for (const user of users) {
        await this.refreshUserProfile(user.id, user.organizationId);
      }

      this.logger.log(`Updated profiles for ${users.length} users`);
    } catch (error) {
      this.logger.error(`Failed to update user profiles: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async updateContentSimilarityMatrix(): Promise<void> {
    try {
      // Get content items that need similarity calculation
      const contents = await this.contentRepository.find({
        where: { status: ContentStatus.PUBLISHED },
        take: 500, // Process in batches
      });

      await this.calculateContentSimilarities(contents);

      this.logger.log(`Updated content similarity matrix for ${contents.length} items`);
    } catch (error) {
      this.logger.error(`Failed to update content similarity matrix: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async trainRecommendationModels(): Promise<void> {
    try {
      const models = await this.modelRepository.find({
        where: { isActive: true },
      });

      for (const model of models) {
        await this.trainModel(model);
      }

      this.logger.log(`Trained ${models.length} recommendation models`);
    } catch (error) {
      this.logger.error(`Failed to train recommendation models: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredRecommendations(): Promise<void> {
    try {
      const expired = await this.recommendationRepository.update(
        {
          expiresAt: MoreThan(new Date()),
          status: In([RecommendationStatus.ACTIVE]),
        },
        { status: RecommendationStatus.EXPIRED }
      );

      this.logger.log(`Expired ${expired.affected} recommendations`);
    } catch (error) {
      this.logger.error(`Failed to cleanup expired recommendations: ${error.message}`);
    }
  }

  // Private helper methods

  private async getUserLearningProfile(
    userId: string,
    organizationId: string
  ): Promise<UserLearningProfile> {
    let profile = await this.profileRepository.findOne({
      where: { userId, organizationId },
    });

    if (!profile) {
      // Create initial profile from user behavior
      profile = await this.createInitialProfile(userId, organizationId);
    }

    return profile;
  }

  private async createInitialProfile(
    userId: string,
    organizationId: string
  ): Promise<UserLearningProfile> {
    // Analyze user's historical data to create initial profile
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course'],
    });

    const attempts = await this.attemptRepository.find({
      where: { userId },
      relations: ['assessment'],
    });

    const progress = await this.progressRepository.find({
      where: { userId },
      relations: ['content'],
    });

    // Extract interests from enrolled courses
    const topics = enrollments
      .map(e => e.course.category)
      .filter(Boolean)
      .slice(0, 10);

    const skills = enrollments
      .flatMap(e => e.course.tags || [])
      .slice(0, 15);

    // Calculate skill levels from assessment attempts
    const skillLevels = this.calculateSkillLevelsFromAttempts(attempts);

    // Analyze learning behavior
    const learningBehavior = this.analyzeLearningBehavior(progress, enrollments);

    const profile = this.profileRepository.create({
      userId,
      organizationId,
      interests: {
        topics,
        categories: [...new Set(topics)],
        skills,
        career_goals: [],
      },
      learningStyle: this.inferLearningStyle(progress),
      preferences: {
        content_types: this.inferContentTypePreferences(progress),
        duration_preference: this.inferDurationPreference(progress),
        difficulty_preference: this.inferDifficultyPreference(attempts),
        language: 'en',
        timezone: 'UTC',
        available_hours: { weekday: 1, weekend: 2 },
      },
      skillLevels,
      learningBehavior,
      profileCompleteness: 0.3, // Initial completeness
    });

    return this.profileRepository.save(profile);
  }

  private async getActiveModels(organizationId: string): Promise<RecommendationModel[]> {
    return this.modelRepository.find({
      where: { organizationId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  private async generateEnsembleRecommendations(
    userProfile: UserLearningProfile,
    models: RecommendationModel[],
    request: RecommendationRequest
  ): Promise<any[]> {
    const allRecommendations = [];

    for (const model of models) {
      const recommendations = await this.generateModelRecommendations(
        model,
        userProfile,
        request
      );
      allRecommendations.push(...recommendations);
    }

    // Combine and rank recommendations using ensemble method
    return this.combineRecommendations(allRecommendations);
  }

  private async generateModelRecommendations(
    model: RecommendationModel,
    userProfile: UserLearningProfile,
    request: RecommendationRequest
  ): Promise<any[]> {
    switch (model.modelType) {
      case RecommendationType.CONTENT_BASED:
        return this.generateContentBasedRecommendations(userProfile, request);
      case RecommendationType.COLLABORATIVE:
        return this.generateCollaborativeRecommendations(userProfile, request);
      case RecommendationType.HYBRID:
        return this.generateHybridRecommendations(userProfile, request);
      case RecommendationType.TRENDING:
        return this.generateTrendingRecommendations(request);
      case RecommendationType.CAREER_PATH:
        return this.generateCareerPathRecommendations(userProfile, request);
      case RecommendationType.SKILL_GAP:
        return this.generateSkillGapRecommendations(userProfile, request);
      case RecommendationType.CONTEXTUAL:
        return this.generateContextualRecommendations(userProfile, request);
      default:
        return [];
    }
  }

  private async generateContentBasedRecommendations(
    userProfile: UserLearningProfile,
    request: RecommendationRequest
  ): Promise<any[]> {
    // Find content similar to user's interests and past interactions
    const userInterests = userProfile.interests.topics;
    const userSkills = Object.keys(userProfile.skillLevels);

    const similarContent = await this.contentRepository
      .createQueryBuilder('content')
      .leftJoin('content.features', 'features')
      .where('features.topics && :interests', { interests: userInterests })
      .orWhere('features.skills && :skills', { skills: userSkills })
      .andWhere('content.organizationId = :organizationId', { 
        organizationId: request.organizationId 
      })
      .andWhere('content.isActive = true')
      .limit(50)
      .getMany();

    return similarContent.map(content => ({
      contentId: content.id,
      courseId: content.courseId,
      type: RecommendationType.CONTENT_BASED,
      confidenceScore: 0.8,
      relevanceScore: 0.75,
      reasoning: {
        primaryFactors: ['topic_match', 'skill_alignment'],
        explanation: 'Recommended based on your interests and learning history',
      },
    }));
  }

  private async generateCollaborativeRecommendations(
    userProfile: UserLearningProfile,
    request: RecommendationRequest
  ): Promise<any[]> {
    // Find users with similar profiles and recommend content they liked
    const similarUsers = await this.userSimilarityRepository
      .createQueryBuilder('similarity')
      .where('similarity.userId1 = :userId', { userId: request.userId })
      .andWhere('similarity.similarityScore > 0.7')
      .orderBy('similarity.similarityScore', 'DESC')
      .limit(10)
      .getMany();

    const similarUserIds = similarUsers.map(s => s.userId2);

    const recommendations = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoin('enrollment.course', 'course')
      .leftJoin('course.contents', 'content')
      .where('enrollment.userId IN (:...userIds)', { userIds: similarUserIds })
      .andWhere('enrollment.status = :status', { status: 'completed' })
      .andWhere('course.organizationId = :organizationId', { 
        organizationId: request.organizationId 
      })
      .limit(30)
      .getMany();

    return recommendations.map(rec => ({
      contentId: rec.courseId, // Use course ID as content reference
      courseId: rec.courseId,
      type: RecommendationType.COLLABORATIVE,
      confidenceScore: 0.7,
      relevanceScore: 0.8,
      reasoning: {
        primaryFactors: ['similar_users', 'high_completion'],
        explanation: 'Users with similar interests completed this content',
      },
    }));
  }

  private async generateHybridRecommendations(
    userProfile: UserLearningProfile,
    request: RecommendationRequest
  ): Promise<any[]> {
    // Combine content-based and collaborative filtering
    const [contentBased, collaborative] = await Promise.all([
      this.generateContentBasedRecommendations(userProfile, request),
      this.generateCollaborativeRecommendations(userProfile, request),
    ]);

    // Weight and combine recommendations
    const hybrid = [...contentBased, ...collaborative].map(rec => ({
      ...rec,
      type: RecommendationType.HYBRID,
      confidenceScore: rec.confidenceScore * 0.9, // Slightly lower confidence for hybrid
    }));

    return hybrid;
  }

  private async generateTrendingRecommendations(
    request: RecommendationRequest
  ): Promise<any[]> {
    // Find trending content based on recent enrollments and engagement
    const trending = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoin('enrollment.course', 'course')
      .select(['course.id', 'COUNT(enrollment.id) as enrollment_count'])
      .where('enrollment.enrolledAt > :date', { 
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      })
      .andWhere('course.organizationId = :organizationId', { 
        organizationId: request.organizationId 
      })
      .groupBy('course.id')
      .orderBy('enrollment_count', 'DESC')
      .limit(20)
      .getRawMany();

    return trending.map(trend => ({
      courseId: trend.course_id,
      type: RecommendationType.TRENDING,
      confidenceScore: 0.6,
      relevanceScore: 0.5,
      reasoning: {
        primaryFactors: ['trending', 'popular'],
        explanation: 'Popular content that others are currently learning',
      },
    }));
  }

  private async generateCareerPathRecommendations(
    userProfile: UserLearningProfile,
    request: RecommendationRequest
  ): Promise<any[]> {
    if (!userProfile.careerPath) {
      return [];
    }

    const { target_role, required_skills, skill_gaps } = userProfile.careerPath;

    // Find content that addresses skill gaps for career progression
    const careerContent = await this.contentRepository
      .createQueryBuilder('content')
      .leftJoin('content.features', 'features')
      .where('features.skills && :skillGaps', { skillGaps: skill_gaps })
      .andWhere('content.organizationId = :organizationId', { 
        organizationId: request.organizationId 
      })
      .andWhere('content.isActive = true')
      .limit(25)
      .getMany();

    return careerContent.map(content => ({
      contentId: content.id,
      courseId: content.courseId,
      type: RecommendationType.CAREER_PATH,
      confidenceScore: 0.85,
      relevanceScore: 0.9,
      reasoning: {
        primaryFactors: ['career_alignment', 'skill_gap'],
        explanation: `Helps you progress toward ${target_role} role`,
      },
    }));
  }

  private async generateSkillGapRecommendations(
    userProfile: UserLearningProfile,
    request: RecommendationRequest
  ): Promise<any[]> {
    // Identify skill gaps from user's current level vs required levels
    const skillGaps = await this.identifySkillGaps(request.userId, userProfile);

    const gapContent = await this.contentRepository
      .createQueryBuilder('content')
      .leftJoin('content.features', 'features')
      .where('features.skills && :skillGaps', { skillGaps })
      .andWhere('content.organizationId = :organizationId', { 
        organizationId: request.organizationId 
      })
      .andWhere('content.isActive = true')
      .limit(20)
      .getMany();

    return gapContent.map(content => ({
      contentId: content.id,
      courseId: content.courseId,
      type: RecommendationType.SKILL_GAP,
      confidenceScore: 0.8,
      relevanceScore: 0.85,
      reasoning: {
        primaryFactors: ['skill_gap', 'competency_building'],
        explanation: 'Addresses identified gaps in your skill set',
      },
    }));
  }

  private async generateContextualRecommendations(
    userProfile: UserLearningProfile,
    request: RecommendationRequest
  ): Promise<any[]> {
    const context = request.context;
    if (!context) return [];

    let contextualContent = [];

    // If user is currently viewing content, recommend related content
    if (context.currentContent) {
      const similarities = await this.contentSimilarityRepository.find({
        where: { contentId1: context.currentContent },
        order: { similarityScore: 'DESC' },
        take: 15,
      });

      contextualContent = similarities.map(sim => ({
        contentId: sim.contentId2,
        type: RecommendationType.CONTEXTUAL,
        confidenceScore: sim.similarityScore,
        relevanceScore: sim.similarityScore,
        reasoning: {
          primaryFactors: ['content_similarity', 'current_context'],
          explanation: 'Related to what you are currently learning',
        },
      }));
    }

    return contextualContent;
  }

  private combineRecommendations(recommendations: any[]): any[] {
    // Group by content and combine scores
    const combined = new Map();

    recommendations.forEach(rec => {
      const key = rec.contentId || rec.courseId;
      if (!combined.has(key)) {
        combined.set(key, rec);
      } else {
        const existing = combined.get(key);
        existing.confidenceScore = Math.max(existing.confidenceScore, rec.confidenceScore);
        existing.relevanceScore = (existing.relevanceScore + rec.relevanceScore) / 2;
      }
    });

    return Array.from(combined.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private async applyDiversityAndFilters(
    recommendations: any[],
    request: RecommendationRequest
  ): Promise<any[]> {
    let filtered = recommendations;

    // Apply filters
    if (request.filters) {
      // Filter logic here
    }

    // Apply diversity
    if (request.diversityLevel && request.diversityLevel > 0) {
      filtered = this.applyDiversityFiltering(filtered, request.diversityLevel);
    }

    // Limit results
    const maxRecommendations = request.maxRecommendations || 10;
    return filtered.slice(0, maxRecommendations);
  }

  private applyDiversityFiltering(recommendations: any[], diversityLevel: number): any[] {
    // Implement diversity algorithm to avoid similar content
    // This is a simplified version - in practice, you'd use more sophisticated algorithms
    const diverse = [];
    const seenTypes = new Set();
    const seenTopics = new Set();

    for (const rec of recommendations) {
      if (diverse.length >= 20) break; // Max diverse set

      const shouldInclude = diversityLevel === 0 || 
        (!seenTypes.has(rec.type) || !seenTopics.has(rec.primaryTopic));

      if (shouldInclude) {
        diverse.push(rec);
        seenTypes.add(rec.type);
        seenTopics.add(rec.primaryTopic);
      }
    }

    return diverse;
  }

  private async storeRecommendations(
    recommendations: any[],
    request: RecommendationRequest
  ): Promise<void> {
    // Store recommendations for tracking and analysis
    const storedRecs = recommendations.map(rec => 
      this.recommendationRepository.create({
        organizationId: request.organizationId,
        userId: request.userId,
        contentId: rec.contentId,
        courseId: rec.courseId,
        modelId: 'ensemble', // For ensemble recommendations
        recommendationType: rec.type,
        confidenceScore: rec.confidenceScore,
        relevanceScore: rec.relevanceScore,
        reasoning: rec.reasoning,
        metadata: {
          recommendation_context: request.context?.page || 'unknown',
          personalization_level: 0.8,
          novelty_score: 0.7,
          diversity_contribution: 0.6,
          temporal_relevance: 0.9,
        },
        status: RecommendationStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
    );

    await this.recommendationRepository.save(storedRecs);
  }

  private calculatePersonalizationLevel(profile: UserLearningProfile): number {
    return profile.profileCompleteness * 0.8 + 0.2; // Minimum 20% personalization
  }

  private calculateDiversityScore(recommendations: any[]): number {
    if (recommendations.length === 0) return 0;

    const types = new Set(recommendations.map(r => r.type));
    return types.size / recommendations.length;
  }

  private calculateProfileCompleteness(profile: UserLearningProfile): number {
    let completeness = 0;

    // Check various profile components
    if (profile.interests.topics.length > 0) completeness += 0.2;
    if (Object.keys(profile.skillLevels).length > 0) completeness += 0.2;
    if (profile.preferences.content_types.length > 0) completeness += 0.15;
    if (profile.learningBehavior.session_patterns) completeness += 0.15;
    if (profile.careerPath) completeness += 0.3;

    return Math.min(completeness, 1.0);
  }

  // Additional helper methods would continue here...
  // (Implementation details for skill analysis, content extraction, etc.)

  private async refreshUserProfile(userId: string, organizationId: string): Promise<void> {
    // Implementation for refreshing user profile based on recent activity
    this.logger.debug(`Refreshing profile for user ${userId}`);
  }

  private async calculateContentSimilarities(contents: Content[]): Promise<void> {
    // Implementation for calculating content similarity matrix
    this.logger.debug(`Calculating similarities for ${contents.length} content items`);
  }

  private async trainModel(model: RecommendationModel): Promise<void> {
    // Implementation for training/updating recommendation models
    this.logger.debug(`Training model ${model.id}`);
  }

  private async updateRecommendationStatus(
    recommendationId: string,
    interactionType: string
  ): Promise<void> {
    const statusMap = {
      'view': RecommendationStatus.ACTIVE,
      'click': RecommendationStatus.CLICKED,
      'enroll': RecommendationStatus.ENROLLED,
      'dismiss': RecommendationStatus.DISMISSED,
    };

    const status = statusMap[interactionType];
    if (status) {
      await this.recommendationRepository.update(
        { id: recommendationId },
        { status }
      );
    }
  }

  private async extractTopics(content: Content): Promise<string[]> {
    // Simple topic extraction - in production, use NLP libraries
    const text = `${content.title} ${content.description}`;
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(word => word.length > 4).slice(0, 10);
  }

  private async extractSkills(content: Content): Promise<string[]> {
    // Extract skills from content - in production, use skill taxonomies
    return content.course?.tags || [];
  }

  private async extractCategories(content: Content): Promise<string[]> {
    return [content.type || 'general'];
  }

  private async assessDifficulty(content: Content): Promise<SkillLevel> {
    // Simple difficulty assessment - in production, use ML models
    return SkillLevel.INTERMEDIATE;
  }

  private async identifyPrerequisites(content: Content): Promise<string[]> {
    // Identify prerequisites - in production, use course dependency analysis
    return [];
  }

  private async extractLearningObjectives(content: Content): Promise<string[]> {
    // Extract learning objectives from content
    return [];
  }

  private async analyzeContentCharacteristics(content: Content): Promise<any> {
    return {
      content_type: content.type,
      duration_minutes: content.duration || 30,
      interactivity_level: 0.5,
      multimedia_richness: 0.7,
      practical_exercises: false,
      assessments_included: false,
    };
  }

  private async analyzeLanguageFeatures(content: Content): Promise<any> {
    return {
      primary_language: 'en',
      reading_level: 8,
      technical_complexity: 0.6,
      jargon_density: 0.4,
    };
  }

  private async calculateEngagementMetrics(content: Content): Promise<any> {
    return {
      average_rating: 4.0,
      completion_rate: 0.75,
      engagement_score: 0.8,
      time_to_complete: 45,
    };
  }

  private async extractAIFeatures(content: Content): Promise<any> {
    // AI-powered feature extraction - in production, integrate with ML services
    return {
      key_concepts: ['programming', 'javascript', 'web development'],
      sentiment_score: 0.7,
      readability_score: 0.8,
      conceptual_complexity: 0.6,
      practical_application_score: 0.9,
    };
  }

  private async identifySkillGaps(userId: string, profile: UserLearningProfile): Promise<string[]> {
    // Identify skill gaps based on career path and current skills
    if (!profile.careerPath) return [];

    const requiredSkills = profile.careerPath.required_skills || [];
    const currentSkills = Object.keys(profile.skillLevels);

    return requiredSkills.filter(skill => !currentSkills.includes(skill));
  }

  private async analyzeCareerAlignment(userId: string, profile: UserLearningProfile): Promise<string[]> {
    // Analyze how well current learning aligns with career goals
    return ['Consider advanced programming courses', 'Focus on leadership skills'];
  }

  private async generateContentSuggestions(userId: string, profile: UserLearningProfile): Promise<string[]> {
    // Generate general content suggestions
    return ['Interactive coding tutorials', 'Project-based learning', 'Peer collaboration opportunities'];
  }

  private calculateSkillLevelsFromAttempts(attempts: AssessmentAttempt[]): Record<string, any> {
    // Calculate skill levels from assessment performance
    const skillLevels = {};
    
    attempts.forEach(attempt => {
      const skill = attempt.assessment?.title || 'general';
      if (!skillLevels[skill]) {
        skillLevels[skill] = {
          level: attempt.isPassed ? SkillLevel.INTERMEDIATE : SkillLevel.BEGINNER,
          confidence: attempt.score / 100,
          last_assessed: attempt.completedAt?.toISOString(),
          evidence_count: 1,
        };
      } else {
        skillLevels[skill].evidence_count++;
        skillLevels[skill].confidence = (skillLevels[skill].confidence + attempt.score / 100) / 2;
      }
    });

    return skillLevels;
  }

  private analyzeLearningBehavior(progress: ContentProgress[], enrollments: Enrollment[]): any {
    // Analyze learning behavior patterns
    const completedCount = progress.filter(p => p.isCompleted).length;
    const totalCount = progress.length;
    const completionRate = totalCount > 0 ? completedCount / totalCount : 0;

    return {
      session_patterns: {
        preferred_times: ['19:00', '20:00'],
        average_duration: 35,
        frequency_per_week: 3,
      },
      completion_rate: completionRate,
      engagement_score: completionRate * 0.8,
      help_seeking_frequency: 0.2,
      social_learning_preference: 0.6,
    };
  }

  private inferLearningStyle(progress: ContentProgress[]): LearningStyle {
    // Infer learning style from content preferences
    return LearningStyle.MIXED;
  }

  private inferContentTypePreferences(progress: ContentProgress[]): string[] {
    // Infer content type preferences
    return ['video', 'text', 'interactive'];
  }

  private inferDurationPreference(progress: ContentProgress[]): 'short' | 'medium' | 'long' {
    // Infer duration preferences
    return 'medium';
  }

  private inferDifficultyPreference(attempts: AssessmentAttempt[]): SkillLevel {
    // Infer difficulty preferences from assessment performance
    return SkillLevel.INTERMEDIATE;
  }
}