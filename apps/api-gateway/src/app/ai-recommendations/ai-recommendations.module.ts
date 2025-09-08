import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import {
  UserLearningProfile,
  ContentFeatures,
  RecommendationModel,
  UserRecommendation,
  RecommendationInteraction,
  ContentSimilarityMatrix,
  UserSimilarityMatrix,
  RecommendationExperiment,
  User,
  Organization,
  Course,
  Content,
  Enrollment,
  ContentProgress,
  Assessment,
  AssessmentAttempt,
} from '@edutech-lms/database';
import { SharedAuthModule } from '@edutech-lms/auth';
import { AIRecommendationsController } from './ai-recommendations.controller';
import { AIRecommendationsService } from './ai-recommendations.service';
import { RecommendationEngineService } from './recommendation-engine.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // AI Recommendation entities
      UserLearningProfile,
      ContentFeatures,
      RecommendationModel,
      UserRecommendation,
      RecommendationInteraction,
      ContentSimilarityMatrix,
      UserSimilarityMatrix,
      RecommendationExperiment,
      // Core entities needed for recommendations
      User,
      Organization,
      Course,
      Content,
      Enrollment,
      ContentProgress,
      Assessment,
      AssessmentAttempt,
    ]),
    BullModule.registerQueue(
      {
        name: 'recommendation-training',
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      },
      {
        name: 'similarity-calculation',
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          removeOnComplete: 25,
          removeOnFail: 10,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
        },
      },
      {
        name: 'profile-analysis',
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 2000,
          },
        },
      }
    ),
    ScheduleModule.forRoot(),
    SharedAuthModule,
  ],
  controllers: [AIRecommendationsController],
  providers: [
    AIRecommendationsService,
    RecommendationEngineService,
  ],
  exports: [
    AIRecommendationsService,
    RecommendationEngineService,
  ],
})
export class AIRecommendationsModule {}