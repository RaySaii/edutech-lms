import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@edutech-lms/auth';
import { VideoRecommendationsService } from './video-recommendations.service';
import { Request } from 'express';

@ApiTags('Video Recommendations')
@Controller('videos')
@UseGuards(JwtAuthGuard)
export class VideoRecommendationsController {
  constructor(
    private readonly recommendationsService: VideoRecommendationsService
  ) {}

  @Get('recommendations')
  @ApiOperation({ summary: 'Get personalized video recommendations for user' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recommendations to return (default: 10)' })
  @ApiQuery({ name: 'excludeWatched', required: false, type: Boolean, description: 'Exclude already watched videos (default: true)' })
  async getRecommendationsForUser(
    @Req() req: Request,
    @Query('limit') limit: number = 10,
    @Query('excludeWatched') excludeWatched: boolean = true,
  ) {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    return this.recommendationsService.getRecommendationsForUser(
      userId,
      limit,
      excludeWatched
    );
  }

  @Get(':videoId/similar')
  @ApiOperation({ summary: 'Get videos similar to the specified video' })
  @ApiResponse({ status: 200, description: 'Similar videos retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of similar videos to return (default: 5)' })
  async getSimilarVideos(
    @Param('videoId') videoId: string,
    @Query('limit') limit: number = 5,
  ) {
    return this.recommendationsService.getSimilarVideos(videoId, limit);
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get videos by category with personalization' })
  @ApiResponse({ status: 200, description: 'Category videos retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of videos to return (default: 10)' })
  async getVideosByCategory(
    @Param('category') category: string,
    @Req() req: Request,
    @Query('limit') limit: number = 10,
  ) {
    const userId = req.user?.['sub'];
    
    return this.recommendationsService.getVideosByCategory(
      category,
      userId,
      limit
    );
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending videos' })
  @ApiResponse({ status: 200, description: 'Trending videos retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of trending videos to return (default: 10)' })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['day', 'week', 'month'], description: 'Trending timeframe (default: week)' })
  async getTrendingVideos(
    @Query('limit') limit: number = 10,
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' = 'week',
  ) {
    // For now, we'll use the existing trending logic from recommendations service
    // In a full implementation, you might want a separate trending service
    const mockCandidates = await this.recommendationsService['getAllAvailableVideos']();
    const now = new Date();
    let timeframeDays = 7;
    
    switch (timeframe) {
      case 'day':
        timeframeDays = 1;
        break;
      case 'month':
        timeframeDays = 30;
        break;
      default:
        timeframeDays = 7;
    }

    const cutoffDate = new Date(now.getTime() - timeframeDays * 24 * 60 * 60 * 1000);
    const trendingCandidates = mockCandidates.filter(
      video => new Date(video.createdAt) > cutoffDate
    );

    return trendingCandidates
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit);
  }

  @Get('discover')
  @ApiOperation({ summary: 'Discover new videos based on user preferences' })
  @ApiResponse({ status: 200, description: 'Discovery videos retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of videos to discover (default: 15)' })
  async discoverVideos(
    @Req() req: Request,
    @Query('limit') limit: number = 15,
  ) {
    const userId = req.user?.['sub'];
    
    // Get a mix of recommendations with more diverse content
    const recommendations = await this.recommendationsService.getRecommendationsForUser(
      userId,
      limit * 2, // Get more to ensure diversity
      true
    );

    // Shuffle and diversify the recommendations
    const shuffled = recommendations.recommendations.sort(() => Math.random() - 0.5);
    const diversified = [];
    const usedCategories = new Set();
    const usedInstructors = new Set();

    // First pass: ensure category diversity
    for (const video of shuffled) {
      if (!usedCategories.has(video.category) && diversified.length < limit / 2) {
        diversified.push(video);
        usedCategories.add(video.category);
        if (video.uploader) {
          usedInstructors.add(video.uploader.id);
        }
      }
    }

    // Second pass: fill remaining slots with instructor diversity
    for (const video of shuffled) {
      if (diversified.length >= limit) break;
      if (!diversified.includes(video)) {
        if (!video.uploader || !usedInstructors.has(video.uploader.id)) {
          diversified.push(video);
          if (video.uploader) {
            usedInstructors.add(video.uploader.id);
          }
        }
      }
    }

    // Third pass: fill any remaining slots
    for (const video of shuffled) {
      if (diversified.length >= limit) break;
      if (!diversified.includes(video)) {
        diversified.push(video);
      }
    }

    return {
      videos: diversified.slice(0, limit),
      metadata: {
        ...recommendations.metadata,
        discoveryAlgorithm: 'diversified_recommendations',
        categoryDiversity: usedCategories.size,
        instructorDiversity: usedInstructors.size
      }
    };
  }

  @Get('learning-path/:userId')
  @ApiOperation({ summary: 'Get personalized learning path recommendations' })
  @ApiResponse({ status: 200, description: 'Learning path retrieved successfully' })
  @ApiQuery({ name: 'subject', required: false, type: String, description: 'Focus on specific subject/category' })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['beginner', 'intermediate', 'advanced'], description: 'Target difficulty level' })
  async getLearningPath(
    @Param('userId') targetUserId: string,
    @Req() req: Request,
    @Query('subject') subject?: string,
    @Query('difficulty') difficulty?: 'beginner' | 'intermediate' | 'advanced',
  ) {
    const requestingUserId = req.user?.['sub'];
    
    // Only allow users to get their own learning path or admin access
    if (requestingUserId !== targetUserId) {
      // In a real app, you'd check admin permissions here
      throw new Error('Access denied');
    }

    const allVideos = await this.recommendationsService['getAllAvailableVideos']();
    let candidateVideos = allVideos;

    // Filter by subject if specified
    if (subject) {
      candidateVideos = candidateVideos.filter(video => 
        video.category?.toLowerCase().includes(subject.toLowerCase()) ||
        video.tags?.some(tag => tag.toLowerCase().includes(subject.toLowerCase()))
      );
    }

    // Filter by difficulty if specified
    if (difficulty) {
      candidateVideos = candidateVideos.filter(video => 
        video.difficulty === difficulty
      );
    }

    // Get learning path recommendations
    const pathRecommendations = await this.recommendationsService['getLearningPathRecommendations'](
      targetUserId,
      candidateVideos
    );

    // Sort by learning progression logic
    const sortedPath = pathRecommendations
      .sort((a, b) => b.score - a.score)
      .map(rec => candidateVideos.find(v => v.id === rec.videoId))
      .filter(Boolean);

    return {
      learningPath: sortedPath,
      metadata: {
        totalVideos: sortedPath.length,
        subject,
        difficulty,
        estimatedDuration: sortedPath.reduce((total, video) => total + (video.duration || 0), 0),
        pathType: 'adaptive_learning'
      }
    };
  }

  @Get('stats/recommendations')
  @ApiOperation({ summary: 'Get recommendation system statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Recommendation stats retrieved successfully' })
  async getRecommendationStats(@Req() req: Request) {
    // In a real implementation, you'd check admin permissions
    
    const stats = {
      totalUsers: 1250, // Mock data - would come from actual user count
      activeRecommendations: 15680,
      averageClickThroughRate: 0.184,
      topPerformingAlgorithms: [
        { algorithm: 'collaborative_filtering', ctr: 0.201, usage: 35 },
        { algorithm: 'content_based', ctr: 0.189, usage: 28 },
        { algorithm: 'learning_path', ctr: 0.176, usage: 22 },
        { algorithm: 'trending', ctr: 0.165, usage: 15 }
      ],
      categoryPerformance: [
        { category: 'Programming', recommendations: 3420, ctr: 0.195 },
        { category: 'Design', recommendations: 2180, ctr: 0.178 },
        { category: 'Business', recommendations: 1890, ctr: 0.171 },
        { category: 'Data Science', recommendations: 1650, ctr: 0.201 }
      ],
      recentActivity: {
        recommendationsGenerated: 1240,
        uniqueUsersServed: 890,
        totalClicks: 228,
        period: 'last_24_hours'
      }
    };

    return stats;
  }
}