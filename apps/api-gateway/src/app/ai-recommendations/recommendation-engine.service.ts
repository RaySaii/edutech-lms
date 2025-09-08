import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserLearningProfile,
  ContentFeatures,
  RecommendationModel,
  UserRecommendation,
  ContentSimilarityMatrix,
  UserSimilarityMatrix,
  RecommendationType,
  SkillLevel,
  LearningStyle,
  User,
  Content,
  Course,
  Enrollment,
  ContentProgress,
  AssessmentAttempt,
  ContentStatus,
} from '@edutech-lms/database';

interface SimilarityScore {
  itemId: string;
  score: number;
}

interface UserVector {
  userId: string;
  features: Record<string, number>;
}

interface ContentVector {
  contentId: string;
  features: Record<string, number>;
}

@Injectable()
export class RecommendationEngineService {
  private readonly logger = new Logger(RecommendationEngineService.name);

  constructor(
    @InjectRepository(UserLearningProfile)
    private profileRepository: Repository<UserLearningProfile>,
    @InjectRepository(ContentFeatures)
    private featuresRepository: Repository<ContentFeatures>,
    @InjectRepository(ContentSimilarityMatrix)
    private contentSimilarityRepository: Repository<ContentSimilarityMatrix>,
    @InjectRepository(UserSimilarityMatrix)
    private userSimilarityRepository: Repository<UserSimilarityMatrix>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(ContentProgress)
    private progressRepository: Repository<ContentProgress>,
    @InjectRepository(AssessmentAttempt)
    private attemptRepository: Repository<AssessmentAttempt>,
  ) {}

  // Content-Based Filtering Implementation

  async generateContentBasedRecommendations(
    userId: string,
    organizationId: string,
    limit: number = 20
  ): Promise<SimilarityScore[]> {
    try {
      const userProfile = await this.profileRepository.findOne({
        where: { userId, organizationId },
      });

      if (!userProfile) {
        throw new Error(`User profile not found for user ${userId}`);
      }

      // Get user's interaction history
      const userInteractions = await this.getUserInteractionVector(userId);

      // Get all content features
      const contentFeatures = await this.featuresRepository.find({
        where: { organizationId },
        relations: ['content'],
      });

      const recommendations = [];

      for (const feature of contentFeatures) {
        // Skip content user has already interacted with
        if (userInteractions.interactedContent.has(feature.contentId)) {
          continue;
        }

        const similarity = this.calculateContentUserSimilarity(
          feature,
          userProfile,
          userInteractions
        );

        if (similarity > 0.3) { // Minimum threshold
          recommendations.push({
            itemId: feature.contentId,
            score: similarity,
          });
        }
      }

      // Sort by similarity score and return top N
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      this.logger.error(`Content-based recommendation failed: ${error.message}`);
      return [];
    }
  }

  private calculateContentUserSimilarity(
    contentFeature: ContentFeatures,
    userProfile: UserLearningProfile,
    userInteractions: any
  ): number {
    let similarity = 0;
    let weightSum = 0;

    // Topic similarity
    const topicSimilarity = this.calculateTopicSimilarity(
      contentFeature.topics,
      userProfile.interests.topics
    );
    similarity += topicSimilarity * 0.3;
    weightSum += 0.3;

    // Skill similarity
    const skillSimilarity = this.calculateSkillSimilarity(
      contentFeature.skills,
      Object.keys(userProfile.skillLevels)
    );
    similarity += skillSimilarity * 0.25;
    weightSum += 0.25;

    // Difficulty level match
    const difficultyMatch = this.calculateDifficultyMatch(
      contentFeature.difficultyLevel,
      userProfile.preferences.difficulty_preference
    );
    similarity += difficultyMatch * 0.2;
    weightSum += 0.2;

    // Content type preference
    const contentTypeMatch = this.calculateContentTypeMatch(
      contentFeature.contentCharacteristics.content_type,
      userProfile.preferences.content_types
    );
    similarity += contentTypeMatch * 0.15;
    weightSum += 0.15;

    // Learning style alignment
    const learningStyleMatch = this.calculateLearningStyleAlignment(
      contentFeature.contentCharacteristics,
      userProfile.learningStyle
    );
    similarity += learningStyleMatch * 0.1;
    weightSum += 0.1;

    return weightSum > 0 ? similarity / weightSum : 0;
  }

  // Collaborative Filtering Implementation

  async generateCollaborativeRecommendations(
    userId: string,
    organizationId: string,
    limit: number = 20
  ): Promise<SimilarityScore[]> {
    try {
      // Find similar users
      const similarUsers = await this.findSimilarUsers(userId, organizationId);

      if (similarUsers.length === 0) {
        return [];
      }

      // Get content liked by similar users
      const recommendations = new Map<string, number>();

      for (const similarUser of similarUsers) {
        const userContent = await this.getUserPositiveInteractions(
          similarUser.itemId,
          organizationId
        );

        for (const content of userContent) {
          const currentScore = recommendations.get(content.contentId) || 0;
          const weightedScore = content.rating * similarUser.score;
          recommendations.set(content.contentId, currentScore + weightedScore);
        }
      }

      // Convert to array and sort
      const result = Array.from(recommendations.entries())
        .map(([contentId, score]) => ({
          itemId: contentId,
          score: score / similarUsers.length, // Average score
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return result;
    } catch (error) {
      this.logger.error(`Collaborative filtering failed: ${error.message}`);
      return [];
    }
  }

  private async findSimilarUsers(
    userId: string,
    organizationId: string,
    minSimilarity: number = 0.3
  ): Promise<SimilarityScore[]> {
    // First check if we have precomputed similarities
    let similarities = await this.userSimilarityRepository.find({
      where: { userId1: userId },
      order: { similarityScore: 'DESC' },
      take: 50,
    });

    if (similarities.length === 0) {
      // Compute similarities on-the-fly
      similarities = await this.computeUserSimilarities(userId, organizationId);
    }

    return similarities
      .filter(sim => sim.similarityScore >= minSimilarity)
      .map(sim => ({
        itemId: sim.userId2,
        score: sim.similarityScore,
      }));
  }

  private async computeUserSimilarities(
    targetUserId: string,
    organizationId: string
  ): Promise<any[]> {
    // Get all users in organization
    const users = await this.userRepository.find({
      where: { organizationId },
    });

    const targetUserVector = await this.buildUserVector(targetUserId);
    const similarities = [];

    for (const user of users) {
      if (user.id === targetUserId) continue;

      const userVector = await this.buildUserVector(user.id);
      const similarity = this.calculateCosineSimilarity(
        targetUserVector.features,
        userVector.features
      );

      if (similarity > 0.1) {
        similarities.push({
          userId1: targetUserId,
          userId2: user.id,
          similarityScore: similarity,
          algorithmUsed: 'cosine_similarity',
        });
      }
    }

    return similarities;
  }

  private async buildUserVector(userId: string): Promise<UserVector> {
    const features: Record<string, number> = {};

    // Get user's enrollments and ratings
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course'],
    });

    const progress = await this.progressRepository.find({
      where: { userId },
      relations: ['content'],
    });

    const attempts = await this.attemptRepository.find({
      where: { userId },
      relations: ['assessment'],
    });

    // Build feature vector from interactions
    enrollments.forEach(enrollment => {
      if (enrollment.course.category) {
        features[`category_${enrollment.course.category}`] = 1;
      }

      if (enrollment.course.tags) {
        enrollment.course.tags.forEach(tag => {
          features[`tag_${tag}`] = (features[`tag_${tag}`] || 0) + 1;
        });
      }
    });

    // Add completion rate features
    const completedCount = progress.filter(p => p.isCompleted).length;
    const totalCount = progress.length;
    features['completion_rate'] = totalCount > 0 ? completedCount / totalCount : 0;

    // Add skill level features
    attempts.forEach(attempt => {
      const skill = attempt.assessment?.title || 'general';
      features[`skill_${skill}`] = Math.max(
        features[`skill_${skill}`] || 0,
        attempt.score / 100
      );
    });

    return {
      userId,
      features,
    };
  }

  // Matrix Factorization for Collaborative Filtering

  async generateMatrixFactorizationRecommendations(
    userId: string,
    organizationId: string,
    factors: number = 50,
    limit: number = 20
  ): Promise<SimilarityScore[]> {
    try {
      // Build user-item interaction matrix
      const { userMatrix, contentMatrix, userIndex, contentIndex } = 
        await this.buildInteractionMatrix(organizationId);

      // Perform matrix factorization (simplified SVD)
      const { userFactors, itemFactors } = await this.performMatrixFactorization(
        userMatrix,
        factors
      );

      const userIdx = userIndex.get(userId);
      if (userIdx === undefined) {
        return [];
      }

      // Generate recommendations
      const recommendations = [];
      const userVector = userFactors[userIdx];

      contentIndex.forEach((contentIdx, contentId) => {
        // Skip if user has already interacted with this content
        if (userMatrix[userIdx][contentIdx] > 0) {
          return;
        }

        const itemVector = itemFactors[contentIdx];
        const score = this.calculateDotProduct(userVector, itemVector);

        if (score > 0) {
          recommendations.push({
            itemId: contentId,
            score,
          });
        }
      });

      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      this.logger.error(`Matrix factorization failed: ${error.message}`);
      return [];
    }
  }

  private async buildInteractionMatrix(organizationId: string): Promise<{
    userMatrix: number[][];
    contentMatrix: number[][];
    userIndex: Map<string, number>;
    contentIndex: Map<string, number>;
  }> {
    // Get all users and content
    const users = await this.userRepository.find({
      where: { organizationId },
    });

    const contents = await this.contentRepository.find({
      where: { status: ContentStatus.PUBLISHED },
    });

    // Create index mappings
    const userIndex = new Map<string, number>();
    const contentIndex = new Map<string, number>();

    users.forEach((user, idx) => userIndex.set(user.id, idx));
    contents.forEach((content, idx) => contentIndex.set(content.id, idx));

    // Initialize matrices
    const userMatrix: number[][] = Array(users.length)
      .fill(0)
      .map(() => Array(contents.length).fill(0));

    const contentMatrix: number[][] = Array(contents.length)
      .fill(0)
      .map(() => Array(users.length).fill(0));

    // Fill matrices with interaction data
    const progress = await this.progressRepository.find({
      where: { 
        userId: { $in: users.map(u => u.id) } as any,
        contentId: { $in: contents.map(c => c.id) } as any,
      },
    });

    progress.forEach(p => {
      const userIdx = userIndex.get(p.userId);
      const contentIdx = contentIndex.get(p.contentId);

      if (userIdx !== undefined && contentIdx !== undefined) {
        const score = p.isCompleted ? 1 : p.completionPercentage / 100;
        userMatrix[userIdx][contentIdx] = score;
        contentMatrix[contentIdx][userIdx] = score;
      }
    });

    return {
      userMatrix,
      contentMatrix,
      userIndex,
      contentIndex,
    };
  }

  private async performMatrixFactorization(
    matrix: number[][],
    factors: number
  ): Promise<{
    userFactors: number[][];
    itemFactors: number[][];
  }> {
    const users = matrix.length;
    const items = matrix[0]?.length || 0;

    // Initialize factor matrices with random values
    const userFactors = Array(users)
      .fill(0)
      .map(() => Array(factors).fill(0).map(() => Math.random() * 0.1));

    const itemFactors = Array(items)
      .fill(0)
      .map(() => Array(factors).fill(0).map(() => Math.random() * 0.1));

    // Simplified gradient descent (in production, use more sophisticated methods)
    const learningRate = 0.01;
    const regularization = 0.01;
    const iterations = 100;

    for (let iter = 0; iter < iterations; iter++) {
      for (let u = 0; u < users; u++) {
        for (let i = 0; i < items; i++) {
          if (matrix[u][i] > 0) {
            const prediction = this.calculateDotProduct(userFactors[u], itemFactors[i]);
            const error = matrix[u][i] - prediction;

            // Update factors
            for (let f = 0; f < factors; f++) {
              const userFactor = userFactors[u][f];
              const itemFactor = itemFactors[i][f];

              userFactors[u][f] += learningRate * (error * itemFactor - regularization * userFactor);
              itemFactors[i][f] += learningRate * (error * userFactor - regularization * itemFactor);
            }
          }
        }
      }
    }

    return {
      userFactors,
      itemFactors,
    };
  }

  // Deep Learning Based Recommendations

  async generateDeepLearningRecommendations(
    userId: string,
    organizationId: string,
    limit: number = 20
  ): Promise<SimilarityScore[]> {
    try {
      // This would typically call an external ML service or use a local model
      // For now, we'll use a hybrid approach as a placeholder

      const [contentBased, collaborative] = await Promise.all([
        this.generateContentBasedRecommendations(userId, organizationId, 30),
        this.generateCollaborativeRecommendations(userId, organizationId, 30),
      ]);

      // Combine using learned weights (in production, these would be learned from data)
      const combined = new Map<string, number>();

      contentBased.forEach(rec => {
        combined.set(rec.itemId, (combined.get(rec.itemId) || 0) + rec.score * 0.6);
      });

      collaborative.forEach(rec => {
        combined.set(rec.itemId, (combined.get(rec.itemId) || 0) + rec.score * 0.4);
      });

      return Array.from(combined.entries())
        .map(([itemId, score]) => ({ itemId, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      this.logger.error(`Deep learning recommendation failed: ${error.message}`);
      return [];
    }
  }

  // Contextual Recommendations

  async generateContextualRecommendations(
    userId: string,
    organizationId: string,
    context: {
      currentContent?: string;
      currentCourse?: string;
      timeOfDay?: number;
      dayOfWeek?: number;
      platform?: string;
      location?: string;
    },
    limit: number = 20
  ): Promise<SimilarityScore[]> {
    try {
      const recommendations = [];

      // Content-to-content recommendations
      if (context.currentContent) {
        const contentSims = await this.contentSimilarityRepository.find({
          where: { contentId1: context.currentContent },
          order: { similarityScore: 'DESC' },
          take: limit,
        });

        recommendations.push(
          ...contentSims.map(sim => ({
            itemId: sim.contentId2,
            score: sim.similarityScore,
          }))
        );
      }

      // Time-based recommendations
      if (context.timeOfDay !== undefined) {
        const timeBasedRecs = await this.getTimeBasedRecommendations(
          userId,
          organizationId,
          context.timeOfDay
        );
        recommendations.push(...timeBasedRecs);
      }

      // Platform-specific recommendations
      if (context.platform) {
        const platformRecs = await this.getPlatformSpecificRecommendations(
          userId,
          organizationId,
          context.platform
        );
        recommendations.push(...platformRecs);
      }

      // Combine and deduplicate
      const combined = new Map<string, number>();
      recommendations.forEach(rec => {
        const currentScore = combined.get(rec.itemId) || 0;
        combined.set(rec.itemId, Math.max(currentScore, rec.score));
      });

      return Array.from(combined.entries())
        .map(([itemId, score]) => ({ itemId, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      this.logger.error(`Contextual recommendation failed: ${error.message}`);
      return [];
    }
  }

  // Utility methods

  private calculateCosineSimilarity(vector1: Record<string, number>, vector2: Record<string, number>): number {
    const keys1 = new Set(Object.keys(vector1));
    const keys2 = new Set(Object.keys(vector2));
    const commonKeys = new Set([...keys1].filter(k => keys2.has(k)));

    if (commonKeys.size === 0) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    commonKeys.forEach(key => {
      const val1 = vector1[key] || 0;
      const val2 = vector2[key] || 0;
      
      dotProduct += val1 * val2;
      norm1 += val1 * val1;
      norm2 += val2 * val2;
    });

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  private calculateDotProduct(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) return 0;

    return vector1.reduce((sum, val, idx) => sum + val * vector2[idx], 0);
  }

  private calculateTopicSimilarity(contentTopics: string[], userTopics: string[]): number {
    if (!contentTopics.length || !userTopics.length) return 0;

    const contentSet = new Set(contentTopics.map(t => t.toLowerCase()));
    const userSet = new Set(userTopics.map(t => t.toLowerCase()));
    
    const intersection = new Set([...contentSet].filter(t => userSet.has(t)));
    const union = new Set([...contentSet, ...userSet]);

    return intersection.size / union.size; // Jaccard similarity
  }

  private calculateSkillSimilarity(contentSkills: string[], userSkills: string[]): number {
    return this.calculateTopicSimilarity(contentSkills, userSkills);
  }

  private calculateDifficultyMatch(contentDifficulty: SkillLevel, userPreference: SkillLevel): number {
    const difficultyOrder = {
      [SkillLevel.BEGINNER]: 1,
      [SkillLevel.INTERMEDIATE]: 2,
      [SkillLevel.ADVANCED]: 3,
      [SkillLevel.EXPERT]: 4,
    };

    const contentLevel = difficultyOrder[contentDifficulty];
    const userLevel = difficultyOrder[userPreference];

    const difference = Math.abs(contentLevel - userLevel);
    return Math.max(0, 1 - difference / 3); // Normalize to 0-1
  }

  private calculateContentTypeMatch(contentType: string, userPreferences: string[]): number {
    return userPreferences.includes(contentType) ? 1 : 0;
  }

  private calculateLearningStyleAlignment(characteristics: any, userStyle: LearningStyle): number {
    // Simplified learning style alignment
    const alignmentScores = {
      [LearningStyle.VISUAL]: characteristics.multimedia_richness || 0.5,
      [LearningStyle.AUDITORY]: characteristics.content_type === 'audio' ? 1 : 0.3,
      [LearningStyle.READING]: characteristics.content_type === 'text' ? 1 : 0.4,
      [LearningStyle.KINESTHETIC]: characteristics.practical_exercises ? 1 : 0.2,
      [LearningStyle.MIXED]: 0.7, // Mixed learners are adaptable
    };

    return alignmentScores[userStyle] || 0.5;
  }

  private async getUserInteractionVector(userId: string): Promise<{
    interactedContent: Set<string>;
    ratings: Map<string, number>;
    completions: Map<string, number>;
  }> {
    const progress = await this.progressRepository.find({
      where: { userId },
    });

    const interactedContent = new Set<string>();
    const ratings = new Map<string, number>();
    const completions = new Map<string, number>();

    progress.forEach(p => {
      interactedContent.add(p.contentId);
      completions.set(p.contentId, p.isCompleted ? 1 : p.completionPercentage / 100);
      // In a real system, you'd have actual ratings
      ratings.set(p.contentId, p.isCompleted ? 5 : Math.max(1, Math.floor(p.completionPercentage / 20)));
    });

    return {
      interactedContent,
      ratings,
      completions,
    };
  }

  private async getUserPositiveInteractions(
    userId: string,
    organizationId: string
  ): Promise<Array<{ contentId: string; rating: number }>> {
    const progress = await this.progressRepository.find({
      where: { userId },
      relations: ['content'],
    });

    return progress
      .filter(p => p.isCompleted || p.completionPercentage > 80) // Positive interactions
      .map(p => ({
        contentId: p.contentId,
        rating: p.isCompleted ? 1 : p.completionPercentage / 100,
      }));
  }

  private async getTimeBasedRecommendations(
    userId: string,
    organizationId: string,
    timeOfDay: number
  ): Promise<SimilarityScore[]> {
    // Get content that performs well at this time of day
    // This would require historical data analysis
    return [];
  }

  private async getPlatformSpecificRecommendations(
    userId: string,
    organizationId: string,
    platform: string
  ): Promise<SimilarityScore[]> {
    // Get content optimized for specific platforms
    const contents = await this.contentRepository.find({
      where: { status: ContentStatus.PUBLISHED },
    });

    // Simple platform matching (in production, use more sophisticated logic)
    const platformOptimized = contents.filter(content => {
      if (platform === 'mobile') {
        return content.duration && content.duration <= 15; // Short content for mobile
      }
      return true;
    });

    return platformOptimized.map(content => ({
      itemId: content.id,
      score: 0.7, // Base score for platform optimization
    }));
  }
}