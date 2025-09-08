import { Module, DynamicModule, Global } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RateLimitingService } from './rate-limiting.service';
import { RateLimitGuard } from './rate-limiting.guard';
import { RateLimitInterceptor } from './rate-limiting.interceptor';
import { CacheModule } from '../cache/cache.module';

@Global()
@Module({})
export class RateLimitingModule {
  static forRoot(): DynamicModule {
    return {
      module: RateLimitingModule,
      imports: [CacheModule.forRoot()],
      providers: [
        RateLimitingService,
        {
          provide: APP_GUARD,
          useClass: RateLimitGuard,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: RateLimitInterceptor,
        },
      ],
      exports: [RateLimitingService],
      global: true,
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: RateLimitingModule,
      imports: [CacheModule.forFeature()],
      providers: [RateLimitingService],
      exports: [RateLimitingService],
    };
  }
}