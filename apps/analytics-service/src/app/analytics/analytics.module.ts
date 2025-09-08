import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import {
  UserAnalyticsEntity,
  CourseAnalyticsEntity,
  RevenueAnalyticsEntity,
  EventTrackingEntity
} from './entities';

// Services
import { UserAnalyticsService } from './services/user-analytics.service';
import { CourseAnalyticsService } from './services/course-analytics.service';
import { RevenueAnalyticsService } from './services/revenue-analytics.service';
import { EventTrackingService } from './services/event-tracking.service';
import { DashboardAnalyticsService } from './services/dashboard-analytics.service';

// Controllers
import { UserAnalyticsController } from './controllers/user-analytics.controller';
import { CourseAnalyticsController } from './controllers/course-analytics.controller';
import { RevenueAnalyticsController } from './controllers/revenue-analytics.controller';
import { EventTrackingController } from './controllers/event-tracking.controller';
import { DashboardAnalyticsController } from './controllers/dashboard-analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserAnalyticsEntity,
      CourseAnalyticsEntity,
      RevenueAnalyticsEntity,
      EventTrackingEntity
    ])
  ],
  providers: [
    UserAnalyticsService,
    CourseAnalyticsService,
    RevenueAnalyticsService,
    EventTrackingService,
    DashboardAnalyticsService
  ],
  controllers: [
    UserAnalyticsController,
    CourseAnalyticsController,
    RevenueAnalyticsController,
    EventTrackingController,
    DashboardAnalyticsController
  ],
  exports: [
    UserAnalyticsService,
    CourseAnalyticsService,
    RevenueAnalyticsService,
    EventTrackingService,
    DashboardAnalyticsService
  ]
})
export class AnalyticsModule {}