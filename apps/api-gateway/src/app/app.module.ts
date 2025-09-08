import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { SharedAuthModule } from '@edutech-lms/auth';
import { SharedDatabaseModule } from '@edutech-lms/database';
import { 
  GlobalExceptionFilter, 
  LoggingInterceptor, 
  RequestIdMiddleware,
  RateLimitingModule as SharedRateLimitingModule,
  FileUploadModule as SharedFileUploadModule
} from '@edutech-lms/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CourseModule } from './course/course.module';
import { ContentModule } from './content/content.module';
import { RolesModule } from './roles/roles.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';
import { ContentManagementModule } from './content-management/content-management.module';
import { CacheModule } from './cache/cache.module';
import { RateLimitingModule } from './rate-limiting/rate-limiting.module';
import { FilesModule } from './files/files.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { MobileModule } from './mobile/mobile.module';
import { AIRecommendationsModule } from './ai-recommendations/ai-recommendations.module';
import { GamificationModule } from './gamification/gamification.module';
import { ResponseTransformInterceptor } from '../common/interceptors/response-transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    SharedRateLimitingModule.forRoot(),
    SharedFileUploadModule.forRoot(),
    SharedDatabaseModule,
    SharedAuthModule,
    AuthModule,
    CourseModule,
    ContentModule,
    RolesModule,
    DashboardModule,
    AnalyticsModule,
    PaymentModule,
    NotificationModule,
    ContentManagementModule,
    CacheModule,
    RateLimitingModule,
    FilesModule,
    AssessmentsModule,
    // SearchModule is disabled in local dev to avoid ES client typing conflicts
    // VideoModule disabled to avoid WebSocket driver requirement when not installed
    MobileModule,
    AIRecommendationsModule,
    GamificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
