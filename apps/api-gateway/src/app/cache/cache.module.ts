import { Module } from '@nestjs/common';
import { CacheModule as SharedCacheModule } from '@edutech-lms/common';
import { CacheManagementController } from './cache-management.controller';

@Module({
  imports: [
    SharedCacheModule.forFeature(),
  ],
  controllers: [CacheManagementController],
})
export class CacheModule {}