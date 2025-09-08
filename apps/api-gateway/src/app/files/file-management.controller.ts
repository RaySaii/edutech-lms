import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  UploadedFile,
  UploadedFiles,
  Logger,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@edutech-lms/auth';
import { UserRole } from '@edutech-lms/common';
import { 
  FileUploadService,
  UploadSingleFile,
  UploadMultipleFiles,
  UploadImage,
  UploadVideo,
  UploadAudio,
  UploadDocument,
  UploadProfilePicture,
  UploadCourseMaterials
} from '@edutech-lms/common';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('File Management')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FileManagementController {
  private readonly logger = new Logger(FileManagementController.name);

  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('upload/single')
  @UploadSingleFile('file')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or upload failed' })
  async uploadSingleFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Single file upload by user: ${user.id}`);
    
    const uploadedFile = await this.fileUploadService.uploadFile(file, user.id);
    
    return {
      success: true,
      message: 'File uploaded successfully',
      data: uploadedFile,
    };
  }

  @Post('upload/multiple')
  @UploadMultipleFiles('files', 10)
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid files or upload failed' })
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Multiple file upload (${files.length} files) by user: ${user.id}`);
    
    const uploadedFiles = [];
    
    for (const file of files) {
      try {
        const uploadedFile = await this.fileUploadService.uploadFile(file, user.id);
        uploadedFiles.push(uploadedFile);
      } catch (error) {
        this.logger.error(`Failed to upload file ${file.originalname}:`, error);
        uploadedFiles.push({
          filename: file.originalname,
          error: error.message,
        });
      }
    }
    
    return {
      success: true,
      message: `${uploadedFiles.filter(f => !f.error).length}/${files.length} files uploaded successfully`,
      data: uploadedFiles,
    };
  }

  @Post('upload/image')
  @UploadImage('image')
  @ApiOperation({ summary: 'Upload an image file' })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Image upload by user: ${user.id}`);
    
    const uploadedFile = await this.fileUploadService.uploadFile(file, user.id, {
      useS3: false,
    });

    // Generate thumbnail
    const thumbnailId = await this.fileUploadService.generateThumbnail(uploadedFile.id);
    
    return {
      success: true,
      message: 'Image uploaded successfully',
      data: {
        ...uploadedFile,
        thumbnailId,
      },
    };
  }

  @Post('upload/video')
  @UploadVideo('video')
  @ApiOperation({ summary: 'Upload a video file' })
  @ApiResponse({ status: 201, description: 'Video uploaded successfully' })
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Video upload by user: ${user.id}`);
    
    const uploadedFile = await this.fileUploadService.uploadFile(file, user.id, {
      useS3: true,
    });

    // Get video metadata
    const metadata = await this.fileUploadService.getFileMetadata(uploadedFile.id);
    
    return {
      success: true,
      message: 'Video uploaded successfully',
      data: {
        ...uploadedFile,
        metadata,
      },
    };
  }

  @Post('upload/audio')
  @UploadAudio('audio')
  @ApiOperation({ summary: 'Upload an audio file' })
  @ApiResponse({ status: 201, description: 'Audio uploaded successfully' })
  async uploadAudio(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Audio upload by user: ${user.id}`);
    
    const uploadedFile = await this.fileUploadService.uploadFile(file, user.id, {
      useS3: true,
    });

    // Get audio metadata
    const metadata = await this.fileUploadService.getFileMetadata(uploadedFile.id);
    
    return {
      success: true,
      message: 'Audio uploaded successfully',
      data: {
        ...uploadedFile,
        metadata,
      },
    };
  }

  @Post('upload/document')
  @UploadDocument('document')
  @ApiOperation({ summary: 'Upload a document file' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Document upload by user: ${user.id}`);
    
    const uploadedFile = await this.fileUploadService.uploadFile(file, user.id);

    // Validate file integrity
    const isValid = await this.fileUploadService.validateFileIntegrity(uploadedFile);
    
    return {
      success: true,
      message: 'Document uploaded successfully',
      data: {
        ...uploadedFile,
        integrityValid: isValid,
      },
    };
  }

  @Post('upload/profile-picture')
  @UploadProfilePicture('avatar')
  @ApiOperation({ summary: 'Upload profile picture' })
  @ApiResponse({ status: 201, description: 'Profile picture uploaded successfully' })
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Profile picture upload by user: ${user.id}`);
    
    const uploadedFile = await this.fileUploadService.uploadFile(file, user.id);

    // Generate thumbnail for profile picture
    const thumbnailId = await this.fileUploadService.generateThumbnail(uploadedFile.id, {
      width: 150,
      height: 150,
      quality: 80,
    });
    
    return {
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        ...uploadedFile,
        thumbnailId,
      },
    };
  }

  @Post('upload/course-materials')
  @UploadCourseMaterials()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Upload course materials (teachers only)' })
  @ApiResponse({ status: 201, description: 'Course materials uploaded successfully' })
  async uploadCourseMaterials(
    @UploadedFiles() files: { 
      thumbnail?: Express.Multer.File[]; 
      videos?: Express.Multer.File[]; 
      documents?: Express.Multer.File[]; 
      images?: Express.Multer.File[] 
    },
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Course materials upload by user: ${user.id}`);
    
    const results = {
      thumbnail: [],
      videos: [],
      documents: [],
      images: [],
    };

    // Process each file type
    for (const [fileType, fileArray] of Object.entries(files)) {
      if (fileArray) {
        for (const file of fileArray) {
          try {
            const uploadedFile = await this.fileUploadService.uploadFile(file, user.id, {
              useS3: fileType === 'videos' || fileType === 'documents',
            });

            // Create enhanced response object
            let enhancedFile: any = { ...uploadedFile };

            // Generate thumbnails for images and course thumbnail
            if (fileType === 'images' || fileType === 'thumbnail') {
              const thumbnailId = await this.fileUploadService.generateThumbnail(uploadedFile.id);
              enhancedFile.thumbnailId = thumbnailId;
            }

            // Get metadata for videos
            if (fileType === 'videos') {
              const metadata = await this.fileUploadService.getFileMetadata(uploadedFile.id);
              enhancedFile.metadata = metadata;
            }

            results[fileType].push(enhancedFile);
          } catch (error) {
            this.logger.error(`Failed to upload ${fileType} file ${file.originalname}:`, error);
            results[fileType].push({
              filename: file.originalname,
              error: error.message,
            });
          }
        }
      }
    }
    
    const totalUploaded = Object.values(results).flat().filter(r => !r.error).length;
    const totalFiles = Object.values(files).flat().length;
    
    return {
      success: true,
      message: `${totalUploaded}/${totalFiles} course materials uploaded successfully`,
      data: results,
    };
  }

  @Get(':fileId')
  @ApiOperation({ summary: 'Get file information' })
  @ApiResponse({ status: 200, description: 'File information retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`File info requested for ${fileId} by user: ${user.id}`);
    
    const file = await this.fileUploadService.getFile(fileId);
    
    if (!file) {
      return {
        success: false,
        message: 'File not found',
      };
    }

    // Get file metadata
    const metadata = await this.fileUploadService.getFileMetadata(fileId);
    
    return {
      success: true,
      data: {
        ...file,
        metadata,
      },
    };
  }

  @Get(':fileId/download')
  @ApiOperation({ summary: 'Download file' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`File download requested for ${fileId} by user: ${user.id}`);
    
    const file = await this.fileUploadService.getFile(fileId);
    
    if (!file) {
      return {
        success: false,
        message: 'File not found',
      };
    }

    try {
      let fileStream: fs.ReadStream;
      
      if (file.s3Key) {
        // Generate presigned URL for S3 files
        const presignedUrl = await this.fileUploadService.getPresignedUrl(fileId, 3600);
        return { presignedUrl };
      } else {
        // Stream local file
        fileStream = fs.createReadStream(file.path);
      }

      res.set({
        'Content-Type': file.mimetype,
        'Content-Disposition': `attachment; filename="${file.originalName}"`,
      });

      return new StreamableFile(fileStream);
    } catch (error) {
      this.logger.error(`Failed to download file ${fileId}:`, error);
      return {
        success: false,
        message: 'Failed to download file',
      };
    }
  }

  @Get(':fileId/stream')
  @ApiOperation({ summary: 'Stream file (for videos/audio)' })
  @ApiResponse({ status: 200, description: 'File streamed successfully' })
  async streamFile(
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`File streaming requested for ${fileId} by user: ${user.id}`);
    
    const file = await this.fileUploadService.getFile(fileId);
    
    if (!file) {
      return {
        success: false,
        message: 'File not found',
      };
    }

    if (file.s3Key) {
      // For S3 files, return presigned URL for streaming
      const presignedUrl = await this.fileUploadService.getPresignedUrl(fileId, 7200); // 2 hours for streaming
      return { streamUrl: presignedUrl };
    } else {
      // Stream local file
      const fileStream = fs.createReadStream(file.path);
      
      res.set({
        'Content-Type': file.mimetype,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      });

      return new StreamableFile(fileStream);
    }
  }

  @Delete(':fileId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`File deletion requested for ${fileId} by user: ${user.id}`);
    
    const file = await this.fileUploadService.getFile(fileId);
    
    if (!file) {
      return {
        success: false,
        message: 'File not found',
      };
    }

    // Check if user owns the file or is admin
    if (file.uploadedBy !== user.id && !user.roles.includes(UserRole.ADMIN)) {
      return {
        success: false,
        message: 'Not authorized to delete this file',
      };
    }

    const deleted = await this.fileUploadService.deleteFile(fileId);
    
    return {
      success: deleted,
      message: deleted ? 'File deleted successfully' : 'Failed to delete file',
    };
  }

  @Get()
  @ApiOperation({ summary: 'List user files' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'type', required: false, description: 'File type filter' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  async listFiles(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string,
  ) {
    this.logger.log(`File list requested by user: ${user.id}`);
    
    // This would typically query the database for user files
    // For now, return mock data
    return {
      success: true,
      data: {
        files: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          totalPages: 0,
        },
      },
    };
  }

  @Get('stats/overview')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get file system statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'File statistics retrieved successfully' })
  async getFileStats(@CurrentUser() user: any) {
    this.logger.log(`File stats requested by user: ${user.id}`);
    
    const stats = await this.fileUploadService.getFileStats();
    
    return {
      success: true,
      data: stats,
    };
  }

  @Post(':fileId/validate')
  @ApiOperation({ summary: 'Validate file integrity' })
  @ApiResponse({ status: 200, description: 'File validation completed' })
  async validateFile(
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`File validation requested for ${fileId} by user: ${user.id}`);
    
    const file = await this.fileUploadService.getFile(fileId);
    
    if (!file) {
      return {
        success: false,
        message: 'File not found',
      };
    }

    const isValid = await this.fileUploadService.validateFileIntegrity(file);
    
    return {
      success: true,
      data: {
        fileId,
        valid: isValid,
        checkedAt: new Date().toISOString(),
      },
    };
  }

  @Post(':fileId/thumbnail')
  @ApiOperation({ summary: 'Generate file thumbnail' })
  @ApiResponse({ status: 201, description: 'Thumbnail generated successfully' })
  async generateThumbnail(
    @Param('fileId') fileId: string,
    @Body() options: { width?: number; height?: number; quality?: number },
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Thumbnail generation requested for ${fileId} by user: ${user.id}`);
    
    const thumbnailId = await this.fileUploadService.generateThumbnail(fileId, options);
    
    if (!thumbnailId) {
      return {
        success: false,
        message: 'Failed to generate thumbnail (file may not be an image)',
      };
    }
    
    return {
      success: true,
      message: 'Thumbnail generated successfully',
      data: {
        thumbnailId,
        originalFileId: fileId,
      },
    };
  }
}