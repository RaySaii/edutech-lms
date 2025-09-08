import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
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
  GamificationEvent,
  UserTitle,
  AchievementType,
  AchievementRarity,
  BadgeCategory,
  QuestStatus,
  LeaderboardType,
  User,
  Organization,
  Course,
  Content,
  Enrollment,
  ContentProgress,
  AssessmentAttempt,
} from '@edutech-lms/database';

export interface UserGameProfile {
  points: {
    current: number;
    lifetime: number;
    level: number;
    pointsToNextLevel: number;
    levelBenefits: any;
  };
  achievements: {
    total: number;
    recent: Achievement[];
    inProgress: UserAchievement[];
    completionRate: number;
  };
  badges: {
    total: number;
    displayed: Badge[];
    recent: Badge[];
    categories: Record<string, number>;
  };
  streaks: {
    daily: number;
    learning: number;
    longestEver: number;
    isActive: boolean;
  };
  quests: {
    available: number;
    inProgress: number;
    completed: number;
    currentQuests: Quest[];
  };
  leaderboards: {
    globalRank: number;
    weeklyRank: number;
    topSkills: Array<{ skill: string; rank: number }>;
  };
  titles: {
    current: string;
    available: UserTitle[];
  };
}

export interface PointsTransaction {
  userId: string;
  pointType: string;
  points: number;
  reason: string;
  source: string;
  sourceId?: string;
  multiplier?: number;
}

export interface AchievementCheck {
  userId: string;
  achievementType: AchievementType;
  context: {
    courseId?: string;
    contentId?: string;
    assessmentId?: string;
    score?: number;
    streak?: number;
    timeSpent?: number;
    socialAction?: string;
  };
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    @InjectRepository(UserPoints)
    private userPointsRepository: Repository<UserPoints>,
    @InjectRepository(Achievement)
    private achievementRepository: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private userAchievementRepository: Repository<UserAchievement>,
    @InjectRepository(Badge)
    private badgeRepository: Repository<Badge>,
    @InjectRepository(UserBadge)
    private userBadgeRepository: Repository<UserBadge>,
    @InjectRepository(Quest)
    private questRepository: Repository<Quest>,
    @InjectRepository(UserQuest)
    private userQuestRepository: Repository<UserQuest>,
    @InjectRepository(Leaderboard)
    private leaderboardRepository: Repository<Leaderboard>,
    @InjectRepository(LeaderboardEntry)
    private leaderboardEntryRepository: Repository<LeaderboardEntry>,
    @InjectRepository(UserStreak)
    private userStreakRepository: Repository<UserStreak>,
    @InjectRepository(GamificationEvent)
    private eventRepository: Repository<GamificationEvent>,
    @InjectRepository(UserTitle)
    private userTitleRepository: Repository<UserTitle>,
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
    @InjectRepository(AssessmentAttempt)
    private attemptRepository: Repository<AssessmentAttempt>,
  ) {}

  // Main user profile methods

  async getUserGameProfile(userId: string, organizationId: string): Promise<UserGameProfile> {
    try {
      const [
        userPoints,
        achievements,
        badges,
        streaks,
        quests,
        leaderboardRanks,
        titles,
      ] = await Promise.all([
        this.getUserPoints(userId, organizationId),
        this.getUserAchievements(userId),
        this.getUserBadges(userId),
        this.getUserStreaks(userId),
        this.getUserQuests(userId),
        this.getUserLeaderboardRanks(userId, organizationId),
        this.getUserTitles(userId),
      ]);

      return {
        points: {
          current: userPoints?.currentPoints || 0,
          lifetime: userPoints?.lifetimePoints || 0,
          level: userPoints?.currentLevel || 1,
          pointsToNextLevel: userPoints?.pointsToNextLevel || 100,
          levelBenefits: userPoints?.levelBenefits || {},
        },
        achievements,
        badges,
        streaks,
        quests,
        leaderboards: leaderboardRanks,
        titles,
      };
    } catch (error) {
      this.logger.error(`Failed to get user game profile: ${error.message}`);
      throw error;
    }
  }

  // Points system

  async awardPoints(transaction: PointsTransaction): Promise<UserPoints> {
    try {
      let userPoints = await this.userPointsRepository.findOne({
        where: {
          userId: transaction.userId,
          pointType: transaction.pointType,
        },
      });

      if (!userPoints) {
        const user = await this.userRepository.findOne({
          where: { id: transaction.userId },
        });

        userPoints = this.userPointsRepository.create({
          userId: transaction.userId,
          organizationId: user.organizationId,
          pointType: transaction.pointType,
          currentPoints: 0,
          lifetimePoints: 0,
          currentLevel: 1,
          pointsToNextLevel: 100,
          pointsHistory: [],
        });
      }

      // Apply multiplier if provided
      const finalPoints = Math.floor(transaction.points * (transaction.multiplier || 1));

      // Update points
      userPoints.currentPoints += finalPoints;
      userPoints.lifetimePoints += finalPoints;

      // Add to history
      userPoints.pointsHistory = userPoints.pointsHistory || [];
      userPoints.pointsHistory.push({
        date: new Date().toISOString(),
        points: finalPoints,
        reason: transaction.reason,
        source: transaction.source,
      });

      // Keep only last 100 entries
      if (userPoints.pointsHistory.length > 100) {
        userPoints.pointsHistory = userPoints.pointsHistory.slice(-100);
      }

      // Check for level up
      await this.checkLevelUp(userPoints);

      const savedPoints = await this.userPointsRepository.save(userPoints);

      // Log event
      await this.logGamificationEvent({
        userId: transaction.userId,
        eventType: 'points_awarded',
        eventData: {
          points_awarded: finalPoints,
          reason: transaction.reason,
          source: transaction.source,
        },
        sourceType: transaction.source,
        sourceId: transaction.sourceId,
      });

      this.logger.log(`Awarded ${finalPoints} points to user ${transaction.userId} for ${transaction.reason}`);

      return savedPoints;
    } catch (error) {
      this.logger.error(`Failed to award points: ${error.message}`);
      throw error;
    }
  }

  private async checkLevelUp(userPoints: UserPoints): Promise<void> {
    const pointsPerLevel = 100;
    const levelMultiplier = 1.2;

    let currentLevelThreshold = 0;
    let level = 1;

    // Calculate what level the user should be at
    while (currentLevelThreshold < userPoints.lifetimePoints) {
      const nextLevelPoints = Math.floor(pointsPerLevel * Math.pow(levelMultiplier, level - 1));
      if (currentLevelThreshold + nextLevelPoints > userPoints.lifetimePoints) {
        break;
      }
      currentLevelThreshold += nextLevelPoints;
      level++;
    }

    if (level > userPoints.currentLevel) {
      const previousLevel = userPoints.currentLevel;
      userPoints.currentLevel = level;

      // Calculate points needed for next level
      const nextLevelPoints = Math.floor(pointsPerLevel * Math.pow(levelMultiplier, level - 1));
      userPoints.pointsToNextLevel = nextLevelPoints - (userPoints.lifetimePoints - currentLevelThreshold);

      // Update level benefits
      userPoints.levelBenefits = this.calculateLevelBenefits(level);

      // Log level up event
      await this.logGamificationEvent({
        userId: userPoints.userId,
        eventType: 'level_up',
        eventData: {
          level_reached: level,
          previous_level: previousLevel,
          points_total: userPoints.lifetimePoints,
        },
      });

      this.logger.log(`User ${userPoints.userId} leveled up to level ${level}`);
    } else {
      // Calculate points to next level
      const nextLevelPoints = Math.floor(pointsPerLevel * Math.pow(levelMultiplier, level - 1));
      userPoints.pointsToNextLevel = nextLevelPoints - (userPoints.lifetimePoints - currentLevelThreshold);
    }
  }

  private calculateLevelBenefits(level: number): any {
    const benefits = {
      unlocked_features: [],
      badges: [],
      multipliers: {},
      special_access: [],
    };

    // Add benefits based on level
    if (level >= 5) benefits.unlocked_features.push('custom_avatar');
    if (level >= 10) benefits.unlocked_features.push('leaderboard_highlight');
    if (level >= 15) benefits.special_access.push('beta_features');
    if (level >= 20) benefits.multipliers.learning_points = 1.1;
    if (level >= 25) benefits.unlocked_features.push('custom_title');

    return benefits;
  }

  // Achievement system

  async checkAchievements(check: AchievementCheck): Promise<Achievement[]> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: check.userId },
      });

      const availableAchievements = await this.achievementRepository.find({
        where: {
          organizationId: user.organizationId,
          type: check.achievementType,
          isActive: true,
        },
      });

      const newAchievements = [];

      for (const achievement of availableAchievements) {
        const isEligible = await this.checkAchievementEligibility(
          check.userId,
          achievement,
          check.context
        );

        if (isEligible) {
          const earnedAchievement = await this.awardAchievement(check.userId, achievement);
          if (earnedAchievement) {
            newAchievements.push(achievement);
          }
        }
      }

      return newAchievements;
    } catch (error) {
      this.logger.error(`Failed to check achievements: ${error.message}`);
      return [];
    }
  }

  private async checkAchievementEligibility(
    userId: string,
    achievement: Achievement,
    context: any
  ): Promise<boolean> {
    // Check if user already has this achievement
    const existingAchievement = await this.userAchievementRepository.findOne({
      where: { userId, achievementId: achievement.id, isCompleted: true },
    });

    if (existingAchievement) {
      return false;
    }

    // Check prerequisites
    if (achievement.prerequisiteAchievement) {
      const prerequisite = await this.userAchievementRepository.findOne({
        where: {
          userId,
          achievementId: achievement.prerequisiteAchievement,
          isCompleted: true,
        },
      });

      if (!prerequisite) {
        return false;
      }
    }

    // Check time restrictions
    if (achievement.availableFrom && new Date() < achievement.availableFrom) {
      return false;
    }

    if (achievement.availableUntil && new Date() > achievement.availableUntil) {
      return false;
    }

    // Check specific criteria based on achievement type
    return this.evaluateAchievementCriteria(userId, achievement.criteria, context);
  }

  private async evaluateAchievementCriteria(
    userId: string,
    criteria: any,
    context: any
  ): Promise<boolean> {
    switch (criteria.type) {
      case 'course_completion':
        return this.checkCourseCompletionCriteria(userId, criteria, context);
      case 'assessment_score':
        return this.checkAssessmentScoreCriteria(userId, criteria, context);
      case 'streak_days':
        return this.checkStreakCriteria(userId, criteria);
      case 'points_earned':
        return this.checkPointsCriteria(userId, criteria);
      case 'social_action':
        return this.checkSocialCriteria(userId, criteria, context);
      case 'time_spent':
        return this.checkTimeSpentCriteria(userId, criteria);
      default:
        return false;
    }
  }

  private async checkCourseCompletionCriteria(
    userId: string,
    criteria: any,
    context: any
  ): Promise<boolean> {
    const completedCourses = await this.enrollmentRepository.count({
      where: {
        userId,
        status: 'completed',
        ...(criteria.specific_courses && { courseId: { $in: criteria.specific_courses } }),
      } as any,
    });

    return completedCourses >= criteria.target;
  }

  private async checkAssessmentScoreCriteria(
    userId: string,
    criteria: any,
    context: any
  ): Promise<boolean> {
    if (!context.score) return false;

    return context.score >= criteria.assessment_score;
  }

  private async checkStreakCriteria(userId: string, criteria: any): Promise<boolean> {
    const streak = await this.userStreakRepository.findOne({
      where: { userId, streakType: 'daily_login' },
    });

    return streak && streak.currentStreak >= criteria.target;
  }

  private async checkPointsCriteria(userId: string, criteria: any): Promise<boolean> {
    const userPoints = await this.userPointsRepository.findOne({
      where: { userId },
    });

    return userPoints && userPoints.lifetimePoints >= criteria.target;
  }

  private async checkSocialCriteria(
    userId: string,
    criteria: any,
    context: any
  ): Promise<boolean> {
    // This would integrate with social features like forums, comments, etc.
    // For now, return based on context
    return context.socialAction === criteria.conditions?.action_type;
  }

  private async checkTimeSpentCriteria(userId: string, criteria: any): Promise<boolean> {
    const progress = await this.progressRepository
      .createQueryBuilder('progress')
      .select('SUM(progress.timeSpent)', 'total')
      .where('progress.userId = :userId', { userId })
      .getRawOne();

    const totalMinutes = parseInt(progress?.total || '0');
    return totalMinutes >= criteria.target;
  }

  private async awardAchievement(
    userId: string,
    achievement: Achievement
  ): Promise<UserAchievement> {
    try {
      // Check if already awarded
      const existingAchievement = await this.userAchievementRepository.findOne({
        where: { userId, achievementId: achievement.id },
      });

      if (existingAchievement && existingAchievement.isCompleted) {
        return null;
      }

      let userAchievement = existingAchievement;
      if (!userAchievement) {
        userAchievement = this.userAchievementRepository.create({
          userId,
          achievementId: achievement.id,
          progress: 100,
          isCompleted: true,
          earnedAt: new Date(),
        });
      } else {
        userAchievement.progress = 100;
        userAchievement.isCompleted = true;
        userAchievement.earnedAt = new Date();
      }

      // Award rewards
      if (achievement.rewards.points) {
        await this.awardPoints({
          userId,
          pointType: 'achievement',
          points: achievement.rewards.points,
          reason: `Achievement: ${achievement.name}`,
          source: 'achievement',
          sourceId: achievement.id,
        });
      }

      // Award badges
      if (achievement.rewards.badges) {
        for (const badgeId of achievement.rewards.badges) {
          await this.awardBadge(userId, badgeId);
        }
      }

      // Award titles
      if (achievement.rewards.titles) {
        for (const title of achievement.rewards.titles) {
          await this.awardTitle(userId, title, achievement.id);
        }
      }

      userAchievement.earnedRewards = {
        points_awarded: achievement.rewards.points || 0,
        badges_unlocked: achievement.rewards.badges || [],
        features_unlocked: achievement.rewards.unlocks || [],
        titles_earned: achievement.rewards.titles || [],
      };

      const savedAchievement = await this.userAchievementRepository.save(userAchievement);

      // Update achievement statistics
      await this.achievementRepository.increment(
        { id: achievement.id },
        'totalEarned',
        1
      );

      // Log event
      await this.logGamificationEvent({
        userId,
        eventType: 'achievement_earned',
        eventData: {
          achievement_id: achievement.id,
          points_awarded: achievement.rewards.points || 0,
          rarity: achievement.rarity,
        },
      });

      this.logger.log(`User ${userId} earned achievement: ${achievement.name}`);

      return savedAchievement;
    } catch (error) {
      this.logger.error(`Failed to award achievement: ${error.message}`);
      throw error;
    }
  }

  // Badge system

  async awardBadge(userId: string, badgeId: string): Promise<UserBadge> {
    try {
      // Check if user already has this badge
      const existingBadge = await this.userBadgeRepository.findOne({
        where: { userId, badgeId },
      });

      if (existingBadge) {
        return existingBadge;
      }

      const badge = await this.badgeRepository.findOne({
        where: { id: badgeId },
      });

      if (!badge) {
        throw new Error(`Badge ${badgeId} not found`);
      }

      const userBadge = this.userBadgeRepository.create({
        userId,
        badgeId,
        earnedAt: new Date(),
        isDisplayed: false,
      });

      const savedBadge = await this.userBadgeRepository.save(userBadge);

      // Update badge statistics
      await this.badgeRepository.increment({ id: badgeId }, 'totalAwarded', 1);

      // Log event
      await this.logGamificationEvent({
        userId,
        eventType: 'badge_unlocked',
        eventData: {
          badge_id: badgeId,
          category: badge.category,
        },
      });

      this.logger.log(`User ${userId} earned badge: ${badge.name}`);

      return savedBadge;
    } catch (error) {
      this.logger.error(`Failed to award badge: ${error.message}`);
      throw error;
    }
  }

  async setBadgeDisplay(userId: string, badgeIds: string[]): Promise<void> {
    try {
      // Reset all badges to not displayed
      await this.userBadgeRepository.update(
        { userId },
        { isDisplayed: false, displayOrder: null }
      );

      // Set selected badges as displayed
      for (let i = 0; i < badgeIds.length; i++) {
        await this.userBadgeRepository.update(
          { userId, badgeId: badgeIds[i] },
          { isDisplayed: true, displayOrder: i + 1 }
        );
      }

      this.logger.log(`Updated badge display for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to set badge display: ${error.message}`);
      throw error;
    }
  }

  // Quest system

  async startQuest(userId: string, questId: string): Promise<UserQuest> {
    try {
      const quest = await this.questRepository.findOne({
        where: { id: questId },
      });

      if (!quest) {
        throw new Error(`Quest ${questId} not found`);
      }

      // Check if user already has this quest
      const existingQuest = await this.userQuestRepository.findOne({
        where: { userId, questId },
      });

      if (existingQuest) {
        throw new Error('User already has this quest');
      }

      // Check prerequisites
      const hasPrerequisites = await this.checkQuestPrerequisites(userId, quest.prerequisites);
      if (!hasPrerequisites) {
        throw new Error('Prerequisites not met');
      }

      const userQuest = this.userQuestRepository.create({
        userId,
        questId,
        status: QuestStatus.IN_PROGRESS,
        startedAt: new Date(),
        overallProgress: 0,
        objectiveProgress: this.initializeObjectiveProgress(quest.objectives),
      });

      const savedQuest = await this.userQuestRepository.save(userQuest);

      // Update quest participation count
      await this.questRepository.increment({ id: questId }, 'participantCount', 1);

      this.logger.log(`User ${userId} started quest: ${quest.title}`);

      return savedQuest;
    } catch (error) {
      this.logger.error(`Failed to start quest: ${error.message}`);
      throw error;
    }
  }

  private async checkQuestPrerequisites(userId: string, prerequisites: any): Promise<boolean> {
    if (prerequisites.level) {
      const userPoints = await this.userPointsRepository.findOne({
        where: { userId },
      });
      if (!userPoints || userPoints.currentLevel < prerequisites.level) {
        return false;
      }
    }

    if (prerequisites.achievements && prerequisites.achievements.length > 0) {
      const completedAchievements = await this.userAchievementRepository.count({
        where: {
          userId,
          achievementId: { $in: prerequisites.achievements } as any,
          isCompleted: true,
        },
      });
      if (completedAchievements < prerequisites.achievements.length) {
        return false;
      }
    }

    // Add more prerequisite checks as needed

    return true;
  }

  private initializeObjectiveProgress(objectives: any[]): Record<string, any> {
    const progress = {};
    objectives.forEach(objective => {
      progress[objective.id] = {
        current: 0,
        target: objective.target,
        completed: false,
      };
    });
    return progress;
  }

  async updateQuestProgress(
    userId: string,
    questId: string,
    objectiveId: string,
    progress: number
  ): Promise<UserQuest> {
    try {
      const userQuest = await this.userQuestRepository.findOne({
        where: { userId, questId },
        relations: ['quest'],
      });

      if (!userQuest || userQuest.status !== QuestStatus.IN_PROGRESS) {
        return null;
      }

      // Update objective progress
      userQuest.objectiveProgress = userQuest.objectiveProgress || {};
      if (userQuest.objectiveProgress[objectiveId]) {
        userQuest.objectiveProgress[objectiveId].current = Math.max(
          userQuest.objectiveProgress[objectiveId].current,
          progress
        );

        // Check if objective is completed
        if (progress >= userQuest.objectiveProgress[objectiveId].target) {
          userQuest.objectiveProgress[objectiveId].completed = true;
          userQuest.objectiveProgress[objectiveId].completed_at = new Date().toISOString();
        }
      }

      // Calculate overall progress
      const objectives = userQuest.quest.objectives;
      const completedObjectives = objectives.filter(obj => 
        userQuest.objectiveProgress[obj.id]?.completed
      ).length;
      
      userQuest.overallProgress = (completedObjectives / objectives.length) * 100;

      // Check if quest is completed
      if (userQuest.overallProgress >= 100) {
        await this.completeQuest(userQuest);
      }

      return this.userQuestRepository.save(userQuest);
    } catch (error) {
      this.logger.error(`Failed to update quest progress: ${error.message}`);
      throw error;
    }
  }

  private async completeQuest(userQuest: UserQuest): Promise<void> {
    userQuest.status = QuestStatus.COMPLETED;
    userQuest.completedAt = new Date();

    // Award quest rewards
    const quest = userQuest.quest;
    const rewards = quest.rewards;

    if (rewards.points) {
      await this.awardPoints({
        userId: userQuest.userId,
        pointType: 'quest',
        points: rewards.points,
        reason: `Quest completed: ${quest.title}`,
        source: 'quest',
        sourceId: quest.id,
      });
    }

    if (rewards.badges) {
      for (const badgeId of rewards.badges) {
        await this.awardBadge(userQuest.userId, badgeId);
      }
    }

    if (rewards.title) {
      await this.awardTitle(userQuest.userId, rewards.title, quest.id);
    }

    userQuest.earnedRewards = {
      points: rewards.points || 0,
      experience: rewards.experience || 0,
      badges: rewards.badges || [],
      achievements: rewards.achievements || [],
      unlocks: rewards.unlocks || [],
    };

    // Update quest completion count
    await this.questRepository.increment({ id: quest.id }, 'completionCount', 1);

    // Log event
    await this.logGamificationEvent({
      userId: userQuest.userId,
      eventType: 'quest_completed',
      eventData: {
        quest_id: quest.id,
        points_awarded: rewards.points || 0,
        duration_days: Math.ceil(
          (userQuest.completedAt.getTime() - userQuest.startedAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
    });

    this.logger.log(`User ${userQuest.userId} completed quest: ${quest.title}`);
  }

  // Streak system

  async updateStreak(userId: string, streakType: string): Promise<UserStreak> {
    try {
      let userStreak = await this.userStreakRepository.findOne({
        where: { userId, streakType },
      });

      if (!userStreak) {
        userStreak = this.userStreakRepository.create({
          userId,
          streakType,
          currentStreak: 0,
          longestStreak: 0,
          isActive: true,
          activityDates: [],
        });
      }

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Check if already recorded today
      if (userStreak.activityDates && userStreak.activityDates.includes(today)) {
        return userStreak; // Already recorded today
      }

      // Check if streak continues from yesterday or starts new
      const lastActivity = userStreak.lastActivityDate?.toISOString().split('T')[0];
      
      if (lastActivity === yesterday) {
        // Continue streak
        userStreak.currentStreak += 1;
      } else if (lastActivity === today) {
        // Already updated today
        return userStreak;
      } else {
        // New streak
        userStreak.currentStreak = 1;
      }

      // Update longest streak if needed
      if (userStreak.currentStreak > userStreak.longestStreak) {
        userStreak.longestStreak = userStreak.currentStreak;
      }

      userStreak.lastActivityDate = new Date();
      userStreak.isActive = true;

      // Update activity dates (keep last 30 days)
      userStreak.activityDates = userStreak.activityDates || [];
      userStreak.activityDates.push(today);
      if (userStreak.activityDates.length > 30) {
        userStreak.activityDates = userStreak.activityDates.slice(-30);
      }

      // Check for streak milestones and award achievements
      await this.checkStreakMilestones(userId, userStreak);

      return this.userStreakRepository.save(userStreak);
    } catch (error) {
      this.logger.error(`Failed to update streak: ${error.message}`);
      throw error;
    }
  }

  private async checkStreakMilestones(userId: string, streak: UserStreak): Promise<void> {
    const milestones = [7, 14, 30, 50, 100];
    
    for (const milestone of milestones) {
      if (streak.currentStreak === milestone) {
        // Award achievement for streak milestone
        await this.checkAchievements({
          userId,
          achievementType: AchievementType.STREAK,
          context: { streak: milestone },
        });

        // Award bonus points
        await this.awardPoints({
          userId,
          pointType: 'streak_bonus',
          points: milestone * 5, // 5 points per day
          reason: `${milestone}-day streak bonus`,
          source: 'streak',
        });

        break;
      }
    }
  }

  // Leaderboard system

  async updateLeaderboards(userId: string, organizationId: string): Promise<void> {
    try {
      const activeLeaderboards = await this.leaderboardRepository.find({
        where: { organizationId, isActive: true },
      });

      for (const leaderboard of activeLeaderboards) {
        await this.updateUserLeaderboardEntry(userId, leaderboard);
      }
    } catch (error) {
      this.logger.error(`Failed to update leaderboards: ${error.message}`);
    }
  }

  private async updateUserLeaderboardEntry(
    userId: string,
    leaderboard: Leaderboard
  ): Promise<void> {
    try {
      const score = await this.calculateLeaderboardScore(userId, leaderboard);

      let entry = await this.leaderboardEntryRepository.findOne({
        where: { leaderboardId: leaderboard.id, userId },
      });

      if (!entry) {
        entry = this.leaderboardEntryRepository.create({
          leaderboardId: leaderboard.id,
          userId,
          score: 0,
          rank: 0,
        });
      }

      entry.previousScore = entry.score;
      entry.score = score;

      await this.leaderboardEntryRepository.save(entry);

      // Recalculate ranks for this leaderboard
      await this.recalculateLeaderboardRanks(leaderboard.id);
    } catch (error) {
      this.logger.error(`Failed to update leaderboard entry: ${error.message}`);
    }
  }

  private async calculateLeaderboardScore(
    userId: string,
    leaderboard: Leaderboard
  ): Promise<number> {
    const timeframe = this.getTimeframeFilter(leaderboard.timeframe);

    switch (leaderboard.metric) {
      case 'points':
        const userPoints = await this.userPointsRepository.findOne({
          where: { userId },
        });
        return userPoints?.currentPoints || 0;

      case 'courses_completed':
        return this.enrollmentRepository.count({
          where: {
            userId,
            status: 'completed',
            ...(timeframe && { completedAt: MoreThan(timeframe) }),
          },
        });

      case 'streak_days':
        const streak = await this.userStreakRepository.findOne({
          where: { userId, streakType: 'daily_login' },
        });
        return streak?.currentStreak || 0;

      case 'assessment_score':
        const attempts = await this.attemptRepository.find({
          where: {
            userId,
            passed: true,
            ...(timeframe && { completedAt: MoreThan(timeframe) }),
          },
        });
        return attempts.length > 0 
          ? attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length 
          : 0;

      default:
        return 0;
    }
  }

  private getTimeframeFilter(timeframe: string): Date | null {
    const now = new Date();
    switch (timeframe) {
      case 'daily':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }

  private async recalculateLeaderboardRanks(leaderboardId: string): Promise<void> {
    const entries = await this.leaderboardEntryRepository.find({
      where: { leaderboardId },
      order: { score: 'DESC' },
    });

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      entry.previousRank = entry.rank;
      entry.rank = i + 1;
      await this.leaderboardEntryRepository.save(entry);
    }
  }

  // Title system

  async awardTitle(userId: string, title: string, source: string): Promise<UserTitle> {
    try {
      // Check if user already has this title
      const existingTitle = await this.userTitleRepository.findOne({
        where: { userId, title },
      });

      if (existingTitle) {
        return existingTitle;
      }

      const userTitle = this.userTitleRepository.create({
        userId,
        title,
        earnedAt: new Date(),
        earnedFrom: source,
        isActive: false, // User must manually activate
      });

      const savedTitle = await this.userTitleRepository.save(userTitle);

      this.logger.log(`User ${userId} earned title: ${title}`);

      return savedTitle;
    } catch (error) {
      this.logger.error(`Failed to award title: ${error.message}`);
      throw error;
    }
  }

  async setActiveTitle(userId: string, titleId: string): Promise<void> {
    try {
      // Deactivate all current titles
      await this.userTitleRepository.update(
        { userId },
        { isActive: false }
      );

      // Activate selected title
      await this.userTitleRepository.update(
        { id: titleId, userId },
        { isActive: true }
      );

      this.logger.log(`User ${userId} activated title: ${titleId}`);
    } catch (error) {
      this.logger.error(`Failed to set active title: ${error.message}`);
      throw error;
    }
  }

  // Event logging

  private async logGamificationEvent(eventData: {
    userId: string;
    eventType: string;
    eventData: any;
    sourceType?: string;
    sourceId?: string;
  }): Promise<void> {
    try {
      const event = this.eventRepository.create({
        userId: eventData.userId,
        eventType: eventData.eventType,
        eventData: eventData.eventData,
        sourceType: eventData.sourceType,
        sourceId: eventData.sourceId,
        isNotified: false,
      });

      await this.eventRepository.save(event);
    } catch (error) {
      this.logger.error(`Failed to log gamification event: ${error.message}`);
    }
  }

  // Background processes

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processStreakResets(): Promise<void> {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const streaksToReset = await this.userStreakRepository.find({
        where: {
          lastActivityDate: { $lt: yesterday } as any,
          isActive: true,
        },
      });

      for (const streak of streaksToReset) {
        streak.currentStreak = 0;
        streak.isActive = false;
        await this.userStreakRepository.save(streak);
      }

      this.logger.log(`Reset ${streaksToReset.length} inactive streaks`);
    } catch (error) {
      this.logger.error(`Failed to process streak resets: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateLeaderboardRankings(): Promise<void> {
    try {
      const activeLeaderboards = await this.leaderboardRepository.find({
        where: { isActive: true },
      });

      for (const leaderboard of activeLeaderboards) {
        await this.recalculateLeaderboardRanks(leaderboard.id);
        leaderboard.lastUpdatedAt = new Date();
        await this.leaderboardRepository.save(leaderboard);
      }

      this.logger.log(`Updated ${activeLeaderboards.length} leaderboards`);
    } catch (error) {
      this.logger.error(`Failed to update leaderboard rankings: ${error.message}`);
    }
  }

  // Helper methods for getting user data

  private async getUserPoints(userId: string, organizationId: string): Promise<UserPoints> {
    return this.userPointsRepository.findOne({
      where: { userId, organizationId, pointType: 'learning' },
    });
  }

  private async getUserAchievements(userId: string): Promise<any> {
    const [total, recent, inProgress] = await Promise.all([
      this.userAchievementRepository.count({
        where: { userId, isCompleted: true },
      }),
      this.userAchievementRepository.find({
        where: { userId, isCompleted: true },
        relations: ['achievement'],
        order: { earnedAt: 'DESC' },
        take: 5,
      }),
      this.userAchievementRepository.find({
        where: { userId, isCompleted: false },
        relations: ['achievement'],
        take: 10,
      }),
    ]);

    const completionRate = total > 0 ? (total / (total + inProgress.length)) * 100 : 0;

    return {
      total,
      recent: recent.map(ua => ua.achievement),
      inProgress,
      completionRate,
    };
  }

  private async getUserBadges(userId: string): Promise<any> {
    const [total, displayed, recent] = await Promise.all([
      this.userBadgeRepository.count({ where: { userId } }),
      this.userBadgeRepository.find({
        where: { userId, isDisplayed: true },
        relations: ['badge'],
        order: { displayOrder: 'ASC' },
      }),
      this.userBadgeRepository.find({
        where: { userId },
        relations: ['badge'],
        order: { earnedAt: 'DESC' },
        take: 5,
      }),
    ]);

    const categoryCount = await this.userBadgeRepository
      .createQueryBuilder('ub')
      .leftJoin('ub.badge', 'badge')
      .select('badge.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('ub.userId = :userId', { userId })
      .groupBy('badge.category')
      .getRawMany();

    const categories = {};
    categoryCount.forEach(cc => {
      categories[cc.category] = parseInt(cc.count);
    });

    return {
      total,
      displayed: displayed.map(ub => ub.badge),
      recent: recent.map(ub => ub.badge),
      categories,
    };
  }

  private async getUserStreaks(userId: string): Promise<any> {
    const streaks = await this.userStreakRepository.find({
      where: { userId },
    });

    const dailyStreak = streaks.find(s => s.streakType === 'daily_login');
    const learningStreak = streaks.find(s => s.streakType === 'learning_session');
    const longestEver = Math.max(...streaks.map(s => s.longestStreak));

    return {
      daily: dailyStreak?.currentStreak || 0,
      learning: learningStreak?.currentStreak || 0,
      longestEver,
      isActive: dailyStreak?.isActive || false,
    };
  }

  private async getUserQuests(userId: string): Promise<any> {
    const [available, inProgress, completed, current] = await Promise.all([
      this.questRepository.count({
        where: { status: QuestStatus.AVAILABLE },
      }),
      this.userQuestRepository.count({
        where: { userId, status: QuestStatus.IN_PROGRESS },
      }),
      this.userQuestRepository.count({
        where: { userId, status: QuestStatus.COMPLETED },
      }),
      this.userQuestRepository.find({
        where: { userId, status: QuestStatus.IN_PROGRESS },
        relations: ['quest'],
        take: 5,
      }),
    ]);

    return {
      available,
      inProgress,
      completed,
      currentQuests: current.map(uq => uq.quest),
    };
  }

  private async getUserLeaderboardRanks(userId: string, organizationId: string): Promise<any> {
    const globalEntry = await this.leaderboardEntryRepository.findOne({
      where: {
        userId,
        leaderboard: { organizationId, type: LeaderboardType.GLOBAL },
      },
      relations: ['leaderboard'],
    });

    const weeklyEntry = await this.leaderboardEntryRepository.findOne({
      where: {
        userId,
        leaderboard: { organizationId, type: LeaderboardType.WEEKLY },
      },
      relations: ['leaderboard'],
    });

    return {
      globalRank: globalEntry?.rank || 0,
      weeklyRank: weeklyEntry?.rank || 0,
      topSkills: [], // Would need to implement skill-specific leaderboards
    };
  }

  private async getUserTitles(userId: string): Promise<any> {
    const [current, available] = await Promise.all([
      this.userTitleRepository.findOne({
        where: { userId, isActive: true },
      }),
      this.userTitleRepository.find({
        where: { userId },
        order: { earnedAt: 'DESC' },
      }),
    ]);

    return {
      current: current?.title || null,
      available,
    };
  }
}