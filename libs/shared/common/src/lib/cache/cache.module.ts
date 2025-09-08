import { Global, Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheService } from './cache.service';
import { CacheInterceptor, HttpCacheInterceptor } from './cache.interceptor';

export interface CacheModuleOptions {
  ttl?: number;
  max?: number;
  isGlobal?: boolean;
  enableHttpCache?: boolean;
  enableMethodCache?: boolean;
}

@Global()
@Module({})
export class CacheModule {
  static forRoot(options: CacheModuleOptions = {}): DynamicModule {
    const providers = [
      CacheService,
      {
        provide: 'CACHE_OPTIONS',
        useValue: options,
      },
    ];

    // Add interceptors based on options
    if (options.enableMethodCache !== false) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useClass: CacheInterceptor,
      });
    }

    if (options.enableHttpCache) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useClass: HttpCacheInterceptor,
      });
    }

    return {
      module: CacheModule,
      imports: [ConfigModule],
      providers,
      exports: [CacheService],
      global: options.isGlobal !== false,
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: CacheModule,
      providers: [CacheService],
      exports: [CacheService],
    };
  }
}