import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { FileUploadService } from './file-upload.service';
import { FileUploadInterceptor } from './file-upload.interceptor';
import { CacheModule } from '../cache/cache.module';

@Global()
@Module({})
export class FileUploadModule {
  static forRoot(): DynamicModule {
    return {
      module: FileUploadModule,
      imports: [
        ConfigModule,
        CacheModule.forFeature(),
        MulterModule.registerAsync({
          useFactory: () => ({
            limits: {
              fileSize: 500 * 1024 * 1024, // 500MB default
            },
          }),
        }),
      ],
      providers: [
        FileUploadService,
        {
          provide: APP_INTERCEPTOR,
          useClass: FileUploadInterceptor,
        },
      ],
      exports: [FileUploadService],
      global: true,
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: FileUploadModule,
      imports: [
        ConfigModule,
        CacheModule.forFeature(),
      ],
      providers: [FileUploadService],
      exports: [FileUploadService],
    };
  }
}