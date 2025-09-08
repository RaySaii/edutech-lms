import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
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
  User,
  Organization,
  Course,
  Content,
  Enrollment,
  ContentProgress,
  AssessmentAttempt,
} from '@edutech-lms/database';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { GamificationProcessor } from './gamification.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
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
      User,
      Organization,
      Course,
      Content,
      Enrollment,
      ContentProgress,
      AssessmentAttempt,
    ]),
    BullModule.registerQueue({
      name: 'gamification',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [GamificationController],
  providers: [GamificationService, GamificationProcessor],
  exports: [GamificationService],
})
export class GamificationModule {}