import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { 
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth 
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@edutech-lms/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GamificationService, PointsTransaction, AchievementCheck } from './gamification.service';
import {
  UserPoints,
  Achievement,
  UserAchievement,
  Badge,
  UserBadge,
  Quest,
  UserQuest,
  Leaderboard,
  LeaderboardEntry,
  UserStreak,
  UserTitle,
  AchievementType,
  QuestStatus,
  LeaderboardType,
} from '@edutech-lms/database';

@ApiTags('Gamification')
@ApiBearerAuth()
@Controller('gamification')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  // User profile and overview
  
  @Get('profile')
  @ApiOperation({ summary: 'Get user gamification profile' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User gamification profile retrieved successfully' })
  async getUserProfile(@CurrentUser() user: any) {
    return await this.gamificationService.getUserGameProfile(user.id, user.organizationId);
  }

  @Get('profile/summary')
  @ApiOperation({ summary: 'Get gamification summary for current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Gamification summary retrieved successfully' })
  async getGamificationSummary(@CurrentUser() user: any) {
    const profile = await this.gamificationService.getUserGameProfile(user.id, user.organizationId);
    
    return {
      totalPoints: profile.points.lifetime,
      currentLevel: profile.points.level,
      achievements: profile.achievements.total,
      badges: profile.badges.total,
      activeStreaks: profile.streaks.daily,
      globalRank: profile.leaderboards.globalRank,
      weeklyRank: profile.leaderboards.weeklyRank,
    };
  }

  // Points system

  @Post('points/award')
  @ApiOperation({ summary: 'Award points to user (admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Points awarded successfully' })
  async awardPoints(
    @Body() pointsTransaction: PointsTransaction,
    @CurrentUser() user: any
  ) {
    // In a real app, you'd check admin permissions here
    return await this.gamificationService.awardPoints(pointsTransaction);
  }

  @Get('points/history')
  @ApiOperation({ summary: 'Get user points history' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Points history retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of entries to return' })
  async getPointsHistory(
    @CurrentUser() user: any,
    @Query('limit') limit = 50
  ) {
    const userPoints = await this.gamificationService.getUserGameProfile(user.id, user.organizationId);
    const history = userPoints.points.levelBenefits?.pointsHistory || [];
    
    return {
      history: history.slice(0, limit),
      currentPoints: userPoints.points.current,
      lifetimePoints: userPoints.points.lifetime,
      currentLevel: userPoints.points.level,
      pointsToNextLevel: userPoints.points.pointsToNextLevel,
    };
  }

  // Achievement system

  @Get('achievements')
  @ApiOperation({ summary: 'Get user achievements' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User achievements retrieved successfully' })
  @ApiQuery({ name: 'completed', required: false, type: Boolean, description: 'Filter by completion status' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by category' })
  async getUserAchievements(
    @CurrentUser() user: any,
    @Query('completed') completed?: boolean,
    @Query('category') category?: string
  ) {
    const profile = await this.gamificationService.getUserGameProfile(user.id, user.organizationId);
    
    return {
      total: profile.achievements.total,
      recent: profile.achievements.recent,
      inProgress: profile.achievements.inProgress,
      completionRate: profile.achievements.completionRate,
    };
  }

  @Post('achievements/check')
  @ApiOperation({ summary: 'Trigger achievement check for user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Achievement check completed' })
  async checkAchievements(
    @Body() achievementCheck: AchievementCheck,
    @CurrentUser() user: any
  ) {
    achievementCheck.userId = user.id; // Ensure user can only check their own achievements
    return await this.gamificationService.checkAchievements(achievementCheck);
  }

  // Badge system

  @Get('badges')
  @ApiOperation({ summary: 'Get user badges' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User badges retrieved successfully' })
  async getUserBadges(@CurrentUser() user: any) {
    const profile = await this.gamificationService.getUserGameProfile(user.id, user.organizationId);
    return profile.badges;
  }

  @Put('badges/display')
  @ApiOperation({ summary: 'Update displayed badges' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Badge display updated successfully' })
  async updateDisplayedBadges(
    @Body('badgeIds') badgeIds: string[],
    @CurrentUser() user: any
  ) {
    if (badgeIds.length > 5) {
      throw new BadRequestException('Cannot display more than 5 badges');
    }
    
    await this.gamificationService.setBadgeDisplay(user.id, badgeIds);
    
    return {
      message: 'Badge display updated successfully',
      displayedBadges: badgeIds.length,
    };
  }

  // Quest system

  @Get('quests')
  @ApiOperation({ summary: 'Get available and user quests' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Quests retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, enum: QuestStatus, description: 'Filter by quest status' })
  async getQuests(
    @CurrentUser() user: any,
    @Query('status') status?: QuestStatus
  ) {
    const profile = await this.gamificationService.getUserGameProfile(user.id, user.organizationId);
    return profile.quests;
  }

  @Post('quests/:questId/start')
  @ApiOperation({ summary: 'Start a quest' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Quest started successfully' })
  @ApiParam({ name: 'questId', description: 'Quest ID' })
  async startQuest(
    @Param('questId') questId: string,
    @CurrentUser() user: any
  ) {
    return await this.gamificationService.startQuest(user.id, questId);
  }

  @Patch('quests/:questId/progress')
  @ApiOperation({ summary: 'Update quest progress' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Quest progress updated successfully' })
  @ApiParam({ name: 'questId', description: 'Quest ID' })
  async updateQuestProgress(
    @Param('questId') questId: string,
    @Body() body: { objectiveId: string; progress: number },
    @CurrentUser() user: any
  ) {
    return await this.gamificationService.updateQuestProgress(
      user.id,
      questId,
      body.objectiveId,
      body.progress
    );
  }

  @Get('quests/:questId/progress')
  @ApiOperation({ summary: 'Get quest progress' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Quest progress retrieved successfully' })
  @ApiParam({ name: 'questId', description: 'Quest ID' })
  async getQuestProgress(
    @Param('questId') questId: string,
    @CurrentUser() user: any
  ) {
    // Implementation would query user quest progress
    return {
      message: 'Quest progress endpoint - implementation needed',
      questId,
      userId: user.id,
    };
  }

  // Streak system

  @Get('streaks')
  @ApiOperation({ summary: 'Get user streaks' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User streaks retrieved successfully' })
  async getUserStreaks(@CurrentUser() user: any) {
    const profile = await this.gamificationService.getUserGameProfile(user.id, user.organizationId);
    return profile.streaks;
  }

  @Post('streaks/:streakType/update')
  @ApiOperation({ summary: 'Update user streak' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Streak updated successfully' })
  @ApiParam({ name: 'streakType', description: 'Type of streak (daily_login, learning_session, etc.)' })
  async updateStreak(
    @Param('streakType') streakType: string,
    @CurrentUser() user: any
  ) {
    return await this.gamificationService.updateStreak(user.id, streakType);
  }

  // Leaderboard system

  @Get('leaderboards')
  @ApiOperation({ summary: 'Get leaderboards' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Leaderboards retrieved successfully' })
  @ApiQuery({ name: 'type', required: false, enum: LeaderboardType, description: 'Leaderboard type' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of entries to return' })
  async getLeaderboards(
    @CurrentUser() user: any,
    @Query('type') type?: LeaderboardType,
    @Query('limit') limit = 50
  ) {
    // Implementation would get leaderboard data
    return {
      message: 'Leaderboards endpoint - implementation needed',
      type,
      limit,
      organizationId: user.organizationId,
    };
  }

  @Get('leaderboards/:leaderboardId')
  @ApiOperation({ summary: 'Get specific leaderboard' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Leaderboard retrieved successfully' })
  @ApiParam({ name: 'leaderboardId', description: 'Leaderboard ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of entries to return' })
  async getLeaderboard(
    @Param('leaderboardId') leaderboardId: string,
    @Query('limit') limit = 50,
    @CurrentUser() user: any
  ) {
    // Implementation would get specific leaderboard
    return {
      message: 'Specific leaderboard endpoint - implementation needed',
      leaderboardId,
      limit,
      userId: user.id,
    };
  }

  @Get('leaderboards/:leaderboardId/my-rank')
  @ApiOperation({ summary: 'Get user rank in leaderboard' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User rank retrieved successfully' })
  @ApiParam({ name: 'leaderboardId', description: 'Leaderboard ID' })
  async getMyRank(
    @Param('leaderboardId') leaderboardId: string,
    @CurrentUser() user: any
  ) {
    // Implementation would get user's rank
    return {
      message: 'My rank endpoint - implementation needed',
      leaderboardId,
      userId: user.id,
    };
  }

  // Title system

  @Get('titles')
  @ApiOperation({ summary: 'Get user titles' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User titles retrieved successfully' })
  async getUserTitles(@CurrentUser() user: any) {
    const profile = await this.gamificationService.getUserGameProfile(user.id, user.organizationId);
    return profile.titles;
  }

  @Put('titles/:titleId/activate')
  @ApiOperation({ summary: 'Activate a title' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Title activated successfully' })
  @ApiParam({ name: 'titleId', description: 'Title ID' })
  async activateTitle(
    @Param('titleId') titleId: string,
    @CurrentUser() user: any
  ) {
    await this.gamificationService.setActiveTitle(user.id, titleId);
    
    return {
      message: 'Title activated successfully',
      titleId,
    };
  }

  // Analytics and insights

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get gamification analytics overview' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Analytics overview retrieved successfully' })
  @ApiQuery({ name: 'timeframe', required: false, type: String, description: 'Time period for analytics' })
  async getAnalyticsOverview(
    @CurrentUser() user: any,
    @Query('timeframe') timeframe = '30d'
  ) {
    const profile = await this.gamificationService.getUserGameProfile(user.id, user.organizationId);
    
    // Return analytics data
    return {
      timeframe,
      summary: {
        totalPoints: profile.points.lifetime,
        currentLevel: profile.points.level,
        achievementsUnlocked: profile.achievements.total,
        badgesEarned: profile.badges.total,
        questsCompleted: profile.quests.completed,
        longestStreak: profile.streaks.longestEver,
        currentStreak: profile.streaks.daily,
      },
      trends: {
        pointsEarned: [], // Would contain daily/weekly point earnings
        activitiesCompleted: [], // Would contain activity counts
        streakPerformance: [], // Would contain streak data over time
      },
      predictions: {
        nextLevelEta: Math.ceil(profile.points.pointsToNextLevel / 10), // Rough estimate
        achievementProgress: profile.achievements.completionRate,
        streakForecast: profile.streaks.isActive ? 'increasing' : 'stable',
      },
    };
  }

  @Get('analytics/detailed')
  @ApiOperation({ summary: 'Get detailed gamification analytics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Detailed analytics retrieved successfully' })
  async getDetailedAnalytics(@CurrentUser() user: any) {
    const profile = await this.gamificationService.getUserGameProfile(user.id, user.organizationId);
    
    return {
      engagement: {
        dailyActivity: profile.streaks.daily > 0,
        weeklyActivity: profile.streaks.learning > 0,
        monthlyGrowth: 'positive', // Would calculate from historical data
        consistencyScore: Math.min(100, profile.streaks.daily * 10),
      },
      achievements: {
        byCategory: profile.badges.categories,
        rarityDistribution: {
          common: 0, // Would calculate from user's achievements
          uncommon: 0,
          rare: 0,
          epic: 0,
          legendary: 0,
        },
        completionVelocity: 0, // Achievements per week
      },
      social: {
        globalRank: profile.leaderboards.globalRank,
        weeklyRank: profile.leaderboards.weeklyRank,
        rankChange: 0, // Would calculate rank change
        competitiveScore: Math.max(0, 100 - (profile.leaderboards.globalRank || 100)),
      },
      goals: {
        nextMilestone: {
          type: 'level',
          target: profile.points.level + 1,
          progress: ((profile.points.current / (profile.points.current + profile.points.pointsToNextLevel)) * 100),
          eta: Math.ceil(profile.points.pointsToNextLevel / 20), // Days estimate
        },
        recommendations: [
          'Complete daily learning streak',
          'Start a new quest',
          'Engage with community features',
        ],
      },
    };
  }

  // Event tracking (for analytics and debugging)

  @Get('events')
  @ApiOperation({ summary: 'Get user gamification events' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User events retrieved successfully' })
  @ApiQuery({ name: 'eventType', required: false, type: String, description: 'Filter by event type' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of events to return' })
  async getUserEvents(
    @CurrentUser() user: any,
    @Query('eventType') eventType?: string,
    @Query('limit') limit = 50
  ) {
    // Implementation would query gamification events
    return {
      message: 'User events endpoint - implementation needed',
      userId: user.id,
      eventType,
      limit,
    };
  }

  // Admin endpoints (would need admin guards in production)

  @Get('admin/statistics')
  @ApiOperation({ summary: 'Get system-wide gamification statistics (admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'System statistics retrieved successfully' })
  async getSystemStatistics(@CurrentUser() user: any) {
    // Implementation would get system-wide stats
    return {
      message: 'System statistics endpoint - admin only, implementation needed',
      organizationId: user.organizationId,
    };
  }

  @Post('admin/achievements')
  @ApiOperation({ summary: 'Create new achievement (admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Achievement created successfully' })
  async createAchievement(@Body() achievementData: any, @CurrentUser() user: any) {
    // Implementation would create achievement
    return {
      message: 'Create achievement endpoint - admin only, implementation needed',
      organizationId: user.organizationId,
      data: achievementData,
    };
  }

  @Post('admin/badges')
  @ApiOperation({ summary: 'Create new badge (admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Badge created successfully' })
  async createBadge(@Body() badgeData: any, @CurrentUser() user: any) {
    // Implementation would create badge
    return {
      message: 'Create badge endpoint - admin only, implementation needed',
      organizationId: user.organizationId,
      data: badgeData,
    };
  }

  @Post('admin/quests')
  @ApiOperation({ summary: 'Create new quest (admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Quest created successfully' })
  async createQuest(@Body() questData: any, @CurrentUser() user: any) {
    // Implementation would create quest
    return {
      message: 'Create quest endpoint - admin only, implementation needed',
      organizationId: user.organizationId,
      data: questData,
    };
  }

  @Post('admin/leaderboards')
  @ApiOperation({ summary: 'Create new leaderboard (admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Leaderboard created successfully' })
  async createLeaderboard(@Body() leaderboardData: any, @CurrentUser() user: any) {
    // Implementation would create leaderboard
    return {
      message: 'Create leaderboard endpoint - admin only, implementation needed',
      organizationId: user.organizationId,
      data: leaderboardData,
    };
  }
}