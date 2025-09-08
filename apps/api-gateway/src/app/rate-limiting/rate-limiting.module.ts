import { Module } from '@nestjs/common';
import { RateLimitingModule as SharedRateLimitingModule } from '@edutech-lms/common';
import { RateLimitingManagementController } from './rate-limiting-management.controller';

@Module({
  imports: [
    SharedRateLimitingModule.forFeature(),
  ],
  controllers: [RateLimitingManagementController],
})
export class RateLimitingModule {}