import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Leaderboard,
  LeaderboardEntry,
  GamificationEvent,
  UserPoints,
  UserStreak,
  Achievement,
  UserAchievement,
  User,
  AchievementType,
} from '@edutech-lms/database';

@Processor('gamification')
export class GamificationProcessor {
  private readonly logger = new Logger(GamificationProcessor.name);

  constructor(
    @InjectRepository(Leaderboard)
    private leaderboardRepository: Repository<Leaderboard>,
    @InjectRepository(LeaderboardEntry)
    private leaderboardEntryRepository: Repository<LeaderboardEntry>,
    @InjectRepository(GamificationEvent)
    private eventRepository: Repository<GamificationEvent>,
    @InjectRepository(UserPoints)
    private userPointsRepository: Repository<UserPoints>,
    @InjectRepository(UserStreak)
    private userStreakRepository: Repository<UserStreak>,
    @InjectRepository(Achievement)
    private achievementRepository: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private userAchievementRepository: Repository<UserAchievement>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Process('level-up')
  async handleLevelUp(job: Job<{
    userId: string;
    oldLevel: number;
    newLevel: number;
    pointType: string;
  }>) {
    const { userId, oldLevel, newLevel, pointType } = job.data;

    try {
      this.logger.log(`Processing level up for user ${userId}: ${oldLevel} -> ${newLevel}`);

      // Create level up event
      const event = this.eventRepository.create({
        userId,
        eventType: 'level_up',
        eventData: {
          level_reached: newLevel,
          previous_level: oldLevel,
          point_type: pointType,
        },
        isNotified: false,
      });

      await this.eventRepository.save(event);

      // Check for level-based achievements
      const levelAchievements = await this.achievementRepository.find({
        where: {
          type: AchievementType.MILESTONE,
          isActive: true,
        },
      });

      for (const achievement of levelAchievements) {
        if (achievement.criteria?.type === 'level_reached' && 
            achievement.criteria?.target <= newLevel) {
          
          // Check if user already has this achievement
          const existingAchievement = await this.userAchievementRepository.findOne({
            where: { userId, achievementId: achievement.id, isCompleted: true },
          });

          if (!existingAchievement) {
            // Award achievement
            const userAchievement = this.userAchievementRepository.create({
              userId,
              achievementId: achievement.id,
              progress: 100,
              isCompleted: true,
              earnedAt: new Date(),
              earnedRewards: {
                points_awarded: achievement.rewards.points || 0,
                badges_unlocked: achievement.rewards.badges || [],
                features_unlocked: achievement.rewards.unlocks || [],
                titles_earned: achievement.rewards.titles || [],
              },
            });

            await this.userAchievementRepository.save(userAchievement);

            // Update achievement statistics
            await this.achievementRepository.increment(
              { id: achievement.id },
              'totalEarned',
              1
            );

            this.logger.log(`Awarded level-based achievement ${achievement.name} to user ${userId}`);
          }
        }
      }

      this.logger.log(`Level up processing completed for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to process level up: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('check-achievements')
  async handleAchievementCheck(job: Job<{
    userId: string;
    achievementType: string;
    eventData: Record<string, any>;
  }>) {
    const { userId, achievementType, eventData } = job.data;

    try {
      this.logger.log(`Checking ${achievementType} achievements for user ${userId}`);

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      const availableAchievements = await this.achievementRepository.find({
        where: {
          organizationId: user.organizationId,
          type: achievementType as any,
          isActive: true,
        },
      });

      for (const achievement of availableAchievements) {
        // Check if user already has this achievement
        const existingAchievement = await this.userAchievementRepository.findOne({
          where: { userId, achievementId: achievement.id, isCompleted: true },
        });

        if (existingAchievement) continue;

        // Check if user meets criteria
        const meetsRequirements = await this.checkAchievementCriteria(
          userId,
          achievement,
          eventData
        );

        if (meetsRequirements) {
          await this.awardAchievement(userId, achievement);
        }
      }

      this.logger.log(`Achievement check completed for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to check achievements: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('update-leaderboards')
  async handleLeaderboardUpdate(job: Job<{
    userId: string;
    metric: string;
    value: number;
  }>) {
    const { userId, metric, value } = job.data;

    try {
      this.logger.log(`Updating leaderboards for user ${userId}: ${metric} = ${value}`);

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      const leaderboards = await this.leaderboardRepository.find({
        where: {
          organizationId: user.organizationId,
          metric,
          isActive: true,
        },
      });

      for (const leaderboard of leaderboards) {
        let entry = await this.leaderboardEntryRepository.findOne({
          where: {
            leaderboardId: leaderboard.id,
            userId,
          },
        });

        if (!entry) {
          entry = this.leaderboardEntryRepository.create({
            leaderboardId: leaderboard.id,
            userId,
            rank: 0,
            score: value,
            metadata: {},
          });
        } else {
          entry.previousRank = entry.rank;
          entry.previousScore = entry.score;
          entry.score = value;
        }

        await this.leaderboardEntryRepository.save(entry);
      }

      this.logger.log(`Leaderboard update completed for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to update leaderboards: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('recalculate-leaderboard')
  async handleLeaderboardRecalculation(job: Job<{ leaderboardId: string }>) {
    const { leaderboardId } = job.data;

    try {
      this.logger.log(`Recalculating leaderboard rankings: ${leaderboardId}`);

      const entries = await this.leaderboardEntryRepository.find({
        where: { leaderboardId },
        order: { score: 'DESC' },
      });

      // Update ranks
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        entry.previousRank = entry.rank;
        entry.rank = i + 1;
        await this.leaderboardEntryRepository.save(entry);

        // Check for leaderboard position achievements
        if (entry.rank <= 10 && entry.previousRank > 10) {
          // User entered top 10
          await this.checkLeaderboardAchievements(entry.userId, 'top_10', entry.rank);
        } else if (entry.rank <= 3 && entry.previousRank > 3) {
          // User entered top 3
          await this.checkLeaderboardAchievements(entry.userId, 'top_3', entry.rank);
        } else if (entry.rank === 1 && entry.previousRank > 1) {
          // User reached #1
          await this.checkLeaderboardAchievements(entry.userId, 'first_place', entry.rank);
        }
      }

      // Update leaderboard last updated timestamp
      await this.leaderboardRepository.update(
        { id: leaderboardId },
        { lastUpdatedAt: new Date() }
      );

      this.logger.log(`Leaderboard recalculation completed: ${leaderboardId}`);
    } catch (error) {
      this.logger.error(`Failed to recalculate leaderboard: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('streak-milestone')
  async handleStreakMilestone(job: Job<{
    userId: string;
    streakType: string;
    milestone: number;
    bonusPoints: number;
  }>) {
    const { userId, streakType, milestone, bonusPoints } = job.data;

    try {
      this.logger.log(`Processing streak milestone for user ${userId}: ${milestone} days`);

      // Award bonus points
      const userPoints = await this.userPointsRepository.findOne({
        where: { userId, pointType: 'streak' },
      });

      if (userPoints) {
        userPoints.currentPoints += bonusPoints;
        userPoints.lifetimePoints += bonusPoints;
        await this.userPointsRepository.save(userPoints);
      }

      // Create event
      const event = this.eventRepository.create({
        userId,
        eventType: 'streak_milestone',
        eventData: {
          streak_type: streakType,
          milestone,
          bonus_points: bonusPoints,
        },
        isNotified: false,
      });

      await this.eventRepository.save(event);

      // Check for streak achievements
      await this.checkStreakAchievements(userId, streakType, milestone);

      this.logger.log(`Streak milestone processing completed for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to process streak milestone: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('send-notifications')
  async handleNotifications(job: Job<{ eventIds: string[] }>) {
    const { eventIds } = job.data;

    try {
      this.logger.log(`Processing notifications for ${eventIds.length} events`);

      const events = await this.eventRepository.find({
        where: { id: In(eventIds) },
        relations: ['user'],
      });

      for (const event of events) {
        // Send notification based on event type
        await this.sendNotification(event);

        // Mark as notified
        event.isNotified = true;
        await this.eventRepository.save(event);
      }

      this.logger.log(`Notification processing completed for ${eventIds.length} events`);
    } catch (error) {
      this.logger.error(`Failed to process notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Helper methods

  private async checkAchievementCriteria(
    userId: string,
    achievement: Achievement,
    eventData: Record<string, any>
  ): Promise<boolean> {
    const { criteria } = achievement;

    switch (criteria.type) {
      case 'points_earned':
        return eventData.totalPoints >= criteria.target;

      case 'courses_completed':
        return eventData.coursesCompleted >= criteria.target;

      case 'streak_days':
        return eventData.streak >= criteria.target;

      case 'assessments_passed':
        return eventData.assessmentsPassed >= criteria.target;

      case 'time_spent':
        return eventData.timeSpent >= criteria.target;

      default:
        return false;
    }
  }

  private async awardAchievement(userId: string, achievement: Achievement): Promise<void> {
    const userAchievement = this.userAchievementRepository.create({
      userId,
      achievementId: achievement.id,
      progress: 100,
      isCompleted: true,
      earnedAt: new Date(),
      earnedRewards: {
        points_awarded: achievement.rewards.points || 0,
        badges_unlocked: achievement.rewards.badges || [],
        features_unlocked: achievement.rewards.unlocks || [],
        titles_earned: achievement.rewards.titles || [],
      },
    });

    await this.userAchievementRepository.save(userAchievement);

    // Update achievement statistics
    await this.achievementRepository.increment(
      { id: achievement.id },
      'totalEarned',
      1
    );

    // Create achievement earned event
    const event = this.eventRepository.create({
      userId,
      eventType: 'achievement_earned',
      eventData: {
        achievement_id: achievement.id,
        points_awarded: achievement.rewards.points || 0,
        rarity: achievement.rarity,
      },
      isNotified: false,
    });

    await this.eventRepository.save(event);

    this.logger.log(`Awarded achievement ${achievement.name} to user ${userId}`);
  }

  private async checkLeaderboardAchievements(
    userId: string,
    achievementType: string,
    rank: number
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const achievements = await this.achievementRepository.find({
      where: {
        organizationId: user.organizationId,
        type: AchievementType.SOCIAL,
        isActive: true,
      },
    });

    for (const achievement of achievements) {
      if (achievement.criteria?.type === achievementType) {
        const existingAchievement = await this.userAchievementRepository.findOne({
          where: { userId, achievementId: achievement.id, isCompleted: true },
        });

        if (!existingAchievement) {
          await this.awardAchievement(userId, achievement);
        }
      }
    }
  }

  private async checkStreakAchievements(
    userId: string,
    streakType: string,
    milestone: number
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const achievements = await this.achievementRepository.find({
      where: {
        organizationId: user.organizationId,
        type: 'streak',
        isActive: true,
      },
    });

    for (const achievement of achievements) {
      if (achievement.criteria?.type === 'streak_days' && 
          achievement.criteria?.target <= milestone) {
        
        const existingAchievement = await this.userAchievementRepository.findOne({
          where: { userId, achievementId: achievement.id, isCompleted: true },
        });

        if (!existingAchievement) {
          await this.awardAchievement(userId, achievement);
        }
      }
    }
  }

  private async sendNotification(event: GamificationEvent): Promise<void> {
    // Integration with notification service would go here
    // For now, just log
    this.logger.log(`Sending notification for event: ${event.eventType} to user: ${event.userId}`);
    
    // Example notification content based on event type
    const notificationContent = this.getNotificationContent(event);
    
    // In a real implementation, you would:
    // 1. Call the notification service
    // 2. Send push notifications
    // 3. Send emails
    // 4. Update in-app notifications
    
    this.logger.log(`Notification content: ${notificationContent.title}`);
  }

  private getNotificationContent(event: GamificationEvent): {
    title: string;
    message: string;
    type: string;
  } {
    switch (event.eventType) {
      case 'level_up':
        return {
          title: '🎉 Level Up!',
          message: `Congratulations! You've reached level ${event.eventData.level_reached}!`,
          type: 'achievement',
        };

      case 'achievement_earned':
        return {
          title: '🏆 Achievement Unlocked!',
          message: `You've earned a new achievement! Points awarded: ${event.eventData.points_awarded}`,
          type: 'achievement',
        };

      case 'badge_unlocked':
        return {
          title: '🥇 New Badge Earned!',
          message: 'You\'ve unlocked a new badge! Check your profile to see it.',
          type: 'badge',
        };

      case 'quest_completed':
        return {
          title: '⚔️ Quest Completed!',
          message: `Quest completed! You earned ${event.eventData.points_awarded} points.`,
          type: 'quest',
        };

      case 'streak_milestone':
        return {
          title: '🔥 Streak Milestone!',
          message: `Amazing! You've reached a ${event.eventData.milestone}-day streak!`,
          type: 'streak',
        };

      default:
        return {
          title: 'Gamification Update',
          message: 'You have a new gamification update!',
          type: 'general',
        };
    }
  }
}