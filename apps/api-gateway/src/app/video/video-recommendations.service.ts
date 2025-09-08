import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, VideoProgress, User } from '@edutech-lms/database';

interface UserPreference {
  userId: string;
  categories: { [key: string]: number };
  tags: { [key: string]: number };
  difficulties: { [key: string]: number };
  instructors: { [key: string]: number };
  avgWatchTime: number;
  completionRate: number;
  preferredDuration: number;
  lastActivity: Date;
}

interface VideoFeatures {
  id: string;
  categoryVector: number[];
  tagVector: number[];
  difficultyScore: number;
  popularityScore: number;
  qualityScore: number;
  engagementScore: number;
  freshnessScore: number;
}

interface RecommendationResult {
  videoId: string;
  score: number;
  reasons: string[];
  type: 'collaborative' | 'content_based' | 'trending' | 'similar_users' | 'learning_path';
}

@Injectable()
export class VideoRecommendationsService {
  private readonly logger = new Logger(VideoRecommendationsService.name);
  
  // Cache for computed features and preferences
  private userPreferencesCache = new Map<string, UserPreference>();
  private videoFeaturesCache = new Map<string, VideoFeatures>();
  private lastCacheUpdate = 0;
  private readonly CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(VideoProgress)
    private progressRepository: Repository<VideoProgress>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.initializeRecommendationEngine();
  }

  async getRecommendationsForUser(
    userId: string, 
    limit: number = 10,
    excludeWatched: boolean = true
  ): Promise<{ recommendations: Video[], metadata: any }> {
    await this.ensureCacheUpdated();

    const userPreferences = await this.getUserPreferences(userId);
    const allVideos = await this.getAllAvailableVideos();
    
    // Get watched videos to exclude
    const watchedVideoIds = excludeWatched 
      ? await this.getWatchedVideoIds(userId)
      : [];

    // Filter out watched videos
    const candidateVideos = allVideos.filter(video => 
      !watchedVideoIds.includes(video.id)
    );

    // Generate recommendations using multiple algorithms
    const [
      contentBasedRecs,
      collaborativeRecs,
      trendingRecs,
      similarUsersRecs,
      learningPathRecs
    ] = await Promise.all([
      this.getContentBasedRecommendations(userId, candidateVideos, userPreferences),
      this.getCollaborativeRecommendations(userId, candidateVideos),
      this.getTrendingRecommendations(candidateVideos),
      this.getSimilarUsersRecommendations(userId, candidateVideos),
      this.getLearningPathRecommendations(userId, candidateVideos)
    ]);

    // Combine and rank recommendations
    const combinedRecommendations = this.combineRecommendations([
      ...contentBasedRecs,
      ...collaborativeRecs,
      ...trendingRecs,
      ...similarUsersRecs,
      ...learningPathRecs
    ]);

    // Get top recommendations
    const topRecommendations = combinedRecommendations
      .slice(0, limit)
      .map(rec => candidateVideos.find(v => v.id === rec.videoId))
      .filter(Boolean) as Video[];

    // Generate explanation metadata
    const metadata = {
      totalCandidates: candidateVideos.length,
      algorithms: {
        contentBased: contentBasedRecs.length,
        collaborative: collaborativeRecs.length,
        trending: trendingRecs.length,
        similarUsers: similarUsersRecs.length,
        learningPath: learningPathRecs.length
      },
      userProfile: {
        completionRate: userPreferences.completionRate,
        avgWatchTime: userPreferences.avgWatchTime,
        topCategories: Object.entries(userPreferences.categories)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([cat]) => cat),
        topTags: Object.entries(userPreferences.tags)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([tag]) => tag)
      },
      explanations: combinedRecommendations.slice(0, limit).map(rec => ({
        videoId: rec.videoId,
        score: rec.score,
        reasons: rec.reasons,
        type: rec.type
      }))
    };

    return {
      recommendations: topRecommendations,
      metadata
    };
  }

  async getSimilarVideos(videoId: string, limit: number = 5): Promise<Video[]> {
    const targetVideo = await this.videoRepository.findOne({
      where: { id: videoId },
    });

    if (!targetVideo) return [];

    const allVideos = await this.getAllAvailableVideos();
    const candidateVideos = allVideos.filter(v => v.id !== videoId);

    // Calculate similarity scores
    const similarities = candidateVideos.map(video => ({
      video,
      similarity: this.calculateVideoSimilarity(targetVideo, video)
    }));

    // Sort by similarity and return top results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.video);
  }

  async getVideosByCategory(
    category: string, 
    userId?: string, 
    limit: number = 10
  ): Promise<Video[]> {
    const videos = await this.videoRepository.find({
      where: { 
        category,
        status: 'ready',
        isPublic: true 
      },
      order: { viewCount: 'DESC', createdAt: 'DESC' },
      take: limit * 2, // Get more to allow for filtering
    });

    if (!userId) {
      return videos.slice(0, limit);
    }

    // Personalize the category results
    const userPreferences = await this.getUserPreferences(userId);
    const watchedVideoIds = await this.getWatchedVideoIds(userId);

    return videos
      .filter(video => !watchedVideoIds.includes(video.id))
      .map(video => ({
        video,
        score: this.calculatePersonalizationScore(video, userPreferences)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.video);
  }

  private async ensureCacheUpdated(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.CACHE_DURATION) {
      await this.updateCaches();
      this.lastCacheUpdate = now;
    }
  }

  private async updateCaches(): Promise<void> {
    this.logger.log('Updating recommendation caches...');
    
    // Update video features cache
    const videos = await this.getAllAvailableVideos();
    for (const video of videos) {
      this.videoFeaturesCache.set(video.id, await this.extractVideoFeatures(video));
    }

    // Clear user preferences cache to force refresh
    this.userPreferencesCache.clear();
    
    this.logger.log(`Updated caches for ${videos.length} videos`);
  }

  private async getUserPreferences(userId: string): Promise<UserPreference> {
    if (this.userPreferencesCache.has(userId)) {
      return this.userPreferencesCache.get(userId)!;
    }

    const preferences = await this.computeUserPreferences(userId);
    this.userPreferencesCache.set(userId, preferences);
    return preferences;
  }

  private async computeUserPreferences(userId: string): Promise<UserPreference> {
    const userProgress = await this.progressRepository.find({
      where: { userId },
      relations: ['video'],
    });

    const categories: { [key: string]: number } = {};
    const tags: { [key: string]: number } = {};
    const difficulties: { [key: string]: number } = {};
    const instructors: { [key: string]: number } = {};
    
    let totalWatchTime = 0;
    let totalVideos = 0;
    let completedVideos = 0;
    let totalDuration = 0;

    for (const progress of userProgress) {
      if (!progress.video) continue;

      const video = progress.video as any;
      totalVideos++;
      totalWatchTime += progress.watchTime;
      totalDuration += video.duration || 0;

      if (progress.completed) {
        completedVideos++;
      }

      // Track categories
      if (video.category) {
        categories[video.category] = (categories[video.category] || 0) + 1;
      }

      // Track tags
      if (video.tags) {
        for (const tag of video.tags) {
          tags[tag] = (tags[tag] || 0) + 1;
        }
      }

      // Track difficulty
      if (video.difficulty) {
        difficulties[video.difficulty] = (difficulties[video.difficulty] || 0) + 1;
      }

      // Track instructors
      if (video.uploader) {
        const instructorName = `${video.uploader.firstName} ${video.uploader.lastName}`;
        instructors[instructorName] = (instructors[instructorName] || 0) + 1;
      }
    }

    return {
      userId,
      categories,
      tags,
      difficulties,
      instructors,
      avgWatchTime: totalVideos > 0 ? totalWatchTime / totalVideos : 0,
      completionRate: totalVideos > 0 ? completedVideos / totalVideos : 0,
      preferredDuration: totalVideos > 0 ? totalDuration / totalVideos : 0,
      lastActivity: new Date()
    };
  }

  private async extractVideoFeatures(video: Video): Promise<VideoFeatures> {
    const allCategories = await this.getAllCategories();
    const allTags = await this.getAllTags();

    // Create category vector (one-hot encoding)
    const categoryVector = allCategories.map(cat => 
      video.category === cat ? 1 : 0
    );

    // Create tag vector
    const tagVector = allTags.map(tag => 
      video.tags?.includes(tag) ? 1 : 0
    );

    // Calculate various scores
    const difficultyScore = this.getDifficultyScore(video.difficulty);
    const popularityScore = this.calculatePopularityScore(video);
    const qualityScore = this.calculateQualityScore(video);
    const engagementScore = this.calculateEngagementScore(video);
    const freshnessScore = this.calculateFreshnessScore(video);

    return {
      id: video.id,
      categoryVector,
      tagVector,
      difficultyScore,
      popularityScore,
      qualityScore,
      engagementScore,
      freshnessScore
    };
  }

  private async getContentBasedRecommendations(
    userId: string,
    candidateVideos: Video[],
    userPreferences: UserPreference
  ): Promise<RecommendationResult[]> {
    return candidateVideos.map(video => {
      const score = this.calculatePersonalizationScore(video, userPreferences);
      const reasons = this.generateContentBasedReasons(video, userPreferences);
      
      return {
        videoId: video.id,
        score: score * 0.8, // Weight for content-based
        reasons,
        type: 'content_based' as const
      };
    });
  }

  private async getCollaborativeRecommendations(
    userId: string,
    candidateVideos: Video[]
  ): Promise<RecommendationResult[]> {
    // Find users with similar viewing patterns
    const similarUsers = await this.findSimilarUsers(userId);
    const recommendations: RecommendationResult[] = [];

    for (const video of candidateVideos) {
      const score = await this.calculateCollaborativeScore(video.id, similarUsers);
      if (score > 0.3) { // Threshold for relevance
        recommendations.push({
          videoId: video.id,
          score: score * 0.9, // Weight for collaborative filtering
          reasons: [`Recommended by users with similar interests`],
          type: 'collaborative'
        });
      }
    }

    return recommendations;
  }

  private async getTrendingRecommendations(candidateVideos: Video[]): Promise<RecommendationResult[]> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return candidateVideos
      .filter(video => new Date(video.createdAt) > weekAgo)
      .map(video => ({
        videoId: video.id,
        score: this.calculateTrendingScore(video) * 0.6, // Weight for trending
        reasons: ['Trending this week', `${video.viewCount} views`],
        type: 'trending' as const
      }))
      .filter(rec => rec.score > 0.2);
  }

  private async getSimilarUsersRecommendations(
    userId: string,
    candidateVideos: Video[]
  ): Promise<RecommendationResult[]> {
    // Simplified implementation - find users who watched similar videos
    const userWatchedVideos = await this.getWatchedVideoIds(userId);
    const recommendations: RecommendationResult[] = [];

    for (const video of candidateVideos.slice(0, 20)) { // Limit for performance
      const score = await this.calculateSimilarUsersScore(video.id, userWatchedVideos);
      if (score > 0.2) {
        recommendations.push({
          videoId: video.id,
          score: score * 0.7, // Weight for similar users
          reasons: ['Popular among similar learners'],
          type: 'similar_users'
        });
      }
    }

    return recommendations;
  }

  private async getLearningPathRecommendations(
    userId: string,
    candidateVideos: Video[]
  ): Promise<RecommendationResult[]> {
    // Recommend videos that form a logical learning progression
    const userPreferences = await this.getUserPreferences(userId);
    const recommendations: RecommendationResult[] = [];

    // Find videos that match user's skill level and progression
    for (const video of candidateVideos) {
      const pathScore = this.calculateLearningPathScore(video, userPreferences);
      if (pathScore > 0.3) {
        recommendations.push({
          videoId: video.id,
          score: pathScore * 0.85, // Weight for learning path
          reasons: this.generateLearningPathReasons(video, userPreferences),
          type: 'learning_path'
        });
      }
    }

    return recommendations;
  }

  private combineRecommendations(recommendations: RecommendationResult[]): RecommendationResult[] {
    // Group by video ID and combine scores
    const videoMap = new Map<string, RecommendationResult>();

    for (const rec of recommendations) {
      if (videoMap.has(rec.videoId)) {
        const existing = videoMap.get(rec.videoId)!;
        existing.score += rec.score;
        existing.reasons.push(...rec.reasons);
      } else {
        videoMap.set(rec.videoId, { ...rec });
      }
    }

    // Sort by combined score
    return Array.from(videoMap.values())
      .sort((a, b) => b.score - a.score);
  }

  private calculatePersonalizationScore(video: Video, preferences: UserPreference): number {
    let score = 0;

    // Category preference
    if (video.category && preferences.categories[video.category]) {
      score += preferences.categories[video.category] * 0.3;
    }

    // Tag preferences
    if (video.tags) {
      for (const tag of video.tags) {
        if (preferences.tags[tag]) {
          score += preferences.tags[tag] * 0.2;
        }
      }
    }

    // Difficulty preference
    if (video.difficulty && preferences.difficulties[video.difficulty]) {
      score += preferences.difficulties[video.difficulty] * 0.25;
    }

    // Duration preference
    const durationDiff = Math.abs(video.duration - preferences.preferredDuration);
    const durationScore = Math.max(0, 1 - durationDiff / preferences.preferredDuration);
    score += durationScore * 0.15;

    // Instructor preference
    if (video.uploader) {
      const instructorName = `${video.uploader.firstName} ${video.uploader.lastName}`;
      if (preferences.instructors[instructorName]) {
        score += preferences.instructors[instructorName] * 0.1;
      }
    }

    return Math.min(score, 1); // Normalize to [0, 1]
  }

  private calculateVideoSimilarity(video1: Video, video2: Video): number {
    let similarity = 0;

    // Category similarity
    if (video1.category === video2.category) {
      similarity += 0.3;
    }

    // Tag similarity
    if (video1.tags && video2.tags) {
      const commonTags = video1.tags.filter(tag => video2.tags!.includes(tag));
      const totalTags = new Set([...video1.tags, ...video2.tags]).size;
      similarity += (commonTags.length / totalTags) * 0.4;
    }

    // Difficulty similarity
    if (video1.difficulty === video2.difficulty) {
      similarity += 0.2;
    }

    // Duration similarity
    const durationDiff = Math.abs(video1.duration - video2.duration);
    const maxDuration = Math.max(video1.duration, video2.duration);
    const durationSimilarity = 1 - (durationDiff / maxDuration);
    similarity += durationSimilarity * 0.1;

    return similarity;
  }

  private getDifficultyScore(difficulty?: string): number {
    const scores = {
      'beginner': 1,
      'intermediate': 2,
      'advanced': 3,
      'expert': 4
    };
    return scores[difficulty as keyof typeof scores] || 1;
  }

  private calculatePopularityScore(video: Video): number {
    return Math.min(video.viewCount / 1000, 1); // Normalize to [0, 1]
  }

  private calculateQualityScore(video: Video): number {
    // Based on video resolution, bitrate, etc.
    const hasHD = video.videoStreams?.some(stream => 
      stream.resolution.includes('720') || stream.resolution.includes('1080')
    );
    return hasHD ? 1 : 0.7;
  }

  private calculateEngagementScore(video: Video): number {
    // Mock engagement score - in reality, you'd calculate this from actual engagement data
    return 0.5 + Math.random() * 0.5;
  }

  private calculateFreshnessScore(video: Video): number {
    const now = Date.now();
    const videoDate = new Date(video.createdAt).getTime();
    const daysDiff = (now - videoDate) / (1000 * 60 * 60 * 24);
    return Math.max(0, 1 - daysDiff / 365); // Fresh within a year
  }

  private generateContentBasedReasons(video: Video, preferences: UserPreference): string[] {
    const reasons: string[] = [];
    
    if (video.category && preferences.categories[video.category]) {
      reasons.push(`Matches your interest in ${video.category}`);
    }
    
    if (video.difficulty && preferences.difficulties[video.difficulty]) {
      reasons.push(`${video.difficulty} level matches your progress`);
    }

    return reasons;
  }

  private generateLearningPathReasons(video: Video, preferences: UserPreference): string[] {
    const reasons: string[] = [];
    
    reasons.push('Next step in your learning journey');
    
    if (video.difficulty) {
      reasons.push(`${video.difficulty} level content`);
    }

    return reasons;
  }

  private calculateLearningPathScore(video: Video, preferences: UserPreference): number {
    // Simplified learning path algorithm
    const userLevel = this.estimateUserLevel(preferences);
    const videoLevel = this.getDifficultyScore(video.difficulty);
    
    // Prefer videos slightly above current level
    const levelDiff = videoLevel - userLevel;
    if (levelDiff >= 0 && levelDiff <= 1) {
      return 0.8;
    } else if (levelDiff < 0 && levelDiff >= -0.5) {
      return 0.6; // Review material
    }
    
    return 0.2;
  }

  private estimateUserLevel(preferences: UserPreference): number {
    // Estimate user level based on their completion patterns
    let level = 1; // Start with beginner
    
    if (preferences.completionRate > 0.7) {
      level += 1;
    }
    
    if (preferences.avgWatchTime > 600) { // 10+ minutes avg
      level += 0.5;
    }

    return Math.min(level, 4);
  }

  private async getAllCategories(): Promise<string[]> {
    const result = await this.videoRepository
      .createQueryBuilder('video')
      .select('DISTINCT video.category', 'category')
      .where('video.category IS NOT NULL')
      .getRawMany();
    
    return result.map(r => r.category).filter(Boolean);
  }

  private async getAllTags(): Promise<string[]> {
    // Simplified - in reality, you'd extract all unique tags
    return ['javascript', 'react', 'nodejs', 'python', 'database', 'api', 'frontend', 'backend'];
  }

  private async getAllAvailableVideos(): Promise<Video[]> {
    return this.videoRepository.find({
      where: {
        status: 'ready',
        isPublic: true
      },
      relations: ['uploader'],
      order: { createdAt: 'DESC' }
    });
  }

  private async getWatchedVideoIds(userId: string): Promise<string[]> {
    const progress = await this.progressRepository.find({
      where: { userId },
      select: ['videoId']
    });
    
    return progress.map(p => p.videoId);
  }

  private async findSimilarUsers(userId: string, limit = 10): Promise<string[]> {
    // Simplified similar user finding
    const userWatchedVideos = await this.getWatchedVideoIds(userId);
    
    const allProgress = await this.progressRepository.find({
      select: ['userId', 'videoId']
    });

    const userSimilarities = new Map<string, number>();
    
    for (const progress of allProgress) {
      if (progress.userId === userId) continue;
      
      if (userWatchedVideos.includes(progress.videoId)) {
        userSimilarities.set(
          progress.userId, 
          (userSimilarities.get(progress.userId) || 0) + 1
        );
      }
    }

    return Array.from(userSimilarities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId]) => userId);
  }

  private async calculateCollaborativeScore(videoId: string, similarUsers: string[]): Promise<number> {
    if (similarUsers.length === 0) return 0;

    const watchCount = await this.progressRepository.count({
      where: {
        videoId,
        userId: { in: similarUsers } as any
      }
    });

    return watchCount / similarUsers.length;
  }

  private calculateTrendingScore(video: Video): number {
    const now = Date.now();
    const videoDate = new Date(video.createdAt).getTime();
    const daysSinceUpload = (now - videoDate) / (1000 * 60 * 60 * 24);
    
    // Recent videos with high view count
    const recencyScore = Math.max(0, 1 - daysSinceUpload / 30); // Fresh within 30 days
    const popularityScore = Math.min(video.viewCount / 100, 1);
    
    return (recencyScore * 0.6) + (popularityScore * 0.4);
  }

  private async calculateSimilarUsersScore(videoId: string, userWatchedVideos: string[]): Promise<number> {
    // Count how many users who watched similar videos also watched this video
    const similarViewers = await this.progressRepository
      .createQueryBuilder('progress')
      .select('progress.userId')
      .where('progress.videoId IN (:...watchedVideos)', { watchedVideos: userWatchedVideos })
      .groupBy('progress.userId')
      .having('COUNT(progress.videoId) >= :threshold', { threshold: Math.max(1, userWatchedVideos.length * 0.2) })
      .getMany();

    if (similarViewers.length === 0) return 0;

    const viewersWhoWatchedTarget = await this.progressRepository.count({
      where: {
        videoId,
        userId: { in: similarViewers.map(v => v.userId) } as any
      }
    });

    return viewersWhoWatchedTarget / similarViewers.length;
  }

  private async initializeRecommendationEngine(): Promise<void> {
    this.logger.log('Initializing video recommendation engine...');
    await this.updateCaches();
  }
}