import { Module } from '@nestjs/common';
import { FileUploadModule as SharedFileUploadModule } from '@edutech-lms/common';
import { FileManagementController } from './file-management.controller';

@Module({
  imports: [
    SharedFileUploadModule.forFeature(),
  ],
  controllers: [FileManagementController],
})
export class FilesModule {}