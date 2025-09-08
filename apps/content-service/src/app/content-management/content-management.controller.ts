import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, RolesGuard, Roles } from '@edutech-lms/auth';
import { UserRole, ApprovalType, ApprovalStatus } from '@edutech-lms/database';
import { ContentManagementService, CreateContentVersionDto, ReviewContentDto } from './content-management.service';
import { multerOptions } from '../file-upload/multer.config';

@ApiTags('Content Management')
@Controller('content-management')
@UseGuards(JwtAuthGuard)
export class ContentManagementController {
  private readonly logger = new Logger(ContentManagementController.name);

  constructor(private readonly contentManagementService: ContentManagementService) {}

  // Version Management Endpoints
  @Post(':contentId/versions')
  @ApiOperation({ summary: 'Create new content version' })
  @ApiResponse({ status: 201, description: 'Content version created successfully' })
  async createVersion(
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Body() createVersionDto: CreateContentVersionDto,
    @CurrentUser() user: any
  ) {
    this.logger.log(`Creating new version for content ${contentId} by user ${user.id}`);
    
    const version = await this.contentManagementService.createContentVersion(contentId, {
      ...createVersionDto,
      authorId: user.id,
    });

    return {
      success: true,
      message: 'Content version created successfully',
      data: version,
    };
  }

  @Get(':contentId/versions')
  @ApiOperation({ summary: 'Get all versions of content' })
  @ApiResponse({ status: 200, description: 'Content versions retrieved successfully' })
  async getVersions(
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Query('includeContent') includeContent?: boolean
  ) {
    const versions = await this.contentManagementService.getContentVersions(
      contentId, 
      includeContent === true
    );

    return {
      success: true,
      data: versions,
    };
  }

  @Get('versions/:versionId')
  @ApiOperation({ summary: 'Get specific content version' })
  @ApiResponse({ status: 200, description: 'Content version retrieved successfully' })
  async getVersion(@Param('versionId', ParseUUIDPipe) versionId: string) {
    const version = await this.contentManagementService.getContentVersion(versionId);

    return {
      success: true,
      data: version,
    };
  }

  @Post('versions/compare')
  @ApiOperation({ summary: 'Compare two content versions' })
  @ApiResponse({ status: 200, description: 'Version comparison completed successfully' })
  async compareVersions(
    @Body() compareDto: { version1Id: string; version2Id: string }
  ) {
    const comparison = await this.contentManagementService.compareVersions(
      compareDto.version1Id,
      compareDto.version2Id
    );

    return {
      success: true,
      data: comparison,
    };
  }

  @Post('versions/:versionId/restore')
  @ApiOperation({ summary: 'Restore a previous content version' })
  @ApiResponse({ status: 201, description: 'Content version restored successfully' })
  async restoreVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: any
  ) {
    this.logger.log(`Restoring version ${versionId} by user ${user.id}`);
    
    const restoredVersion = await this.contentManagementService.restoreVersion(versionId, user.id);

    return {
      success: true,
      message: 'Content version restored successfully',
      data: restoredVersion,
    };
  }

  // Approval Workflow Endpoints
  @Post(':contentId/versions/:versionId/request-approval')
  @ApiOperation({ summary: 'Request approval for content version' })
  @ApiResponse({ status: 201, description: 'Approval request created successfully' })
  async requestApproval(
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() requestDto: {
      type: ApprovalType;
      approverId?: string;
      requestNotes?: string;
      dueDate?: string;
    },
    @CurrentUser() user: any
  ) {
    this.logger.log(`Approval requested for content ${contentId}, version ${versionId}`);
    
    const approval = await this.contentManagementService.requestApproval(
      contentId,
      versionId,
      requestDto.type,
      user.id,
      requestDto.approverId,
      requestDto.requestNotes,
      requestDto.dueDate ? new Date(requestDto.dueDate) : undefined
    );

    return {
      success: true,
      message: 'Approval request created successfully',
      data: approval,
    };
  }

  @Put('approvals/:approvalId/review')
  @ApiOperation({ summary: 'Review and approve/reject content' })
  @ApiResponse({ status: 200, description: 'Content review completed successfully' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async reviewContent(
    @Param('approvalId', ParseUUIDPipe) approvalId: string,
    @Body() reviewDto: ReviewContentDto,
    @CurrentUser() user: any
  ) {
    this.logger.log(`Content being reviewed by user ${user.id}, approval ${approvalId}`);
    
    const approval = await this.contentManagementService.reviewContent(
      approvalId,
      reviewDto,
      user.id
    );

    return {
      success: true,
      message: 'Content review completed successfully',
      data: approval,
    };
  }

  @Post('versions/:versionId/publish')
  @ApiOperation({ summary: 'Publish approved content version' })
  @ApiResponse({ status: 200, description: 'Content version published successfully' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async publishVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: any
  ) {
    this.logger.log(`Publishing version ${versionId} by user ${user.id}`);
    
    const publishedVersion = await this.contentManagementService.publishVersion(versionId, user.id);

    return {
      success: true,
      message: 'Content version published successfully',
      data: publishedVersion,
    };
  }

  @Get('approvals/queue')
  @ApiOperation({ summary: 'Get approval queue for reviewer' })
  @ApiResponse({ status: 200, description: 'Approval queue retrieved successfully' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getApprovalQueue(
    @Query('approverId') approverId?: string,
    @Query('status') status?: ApprovalStatus,
    @Query('type') type?: ApprovalType,
    @CurrentUser() user: any
  ) {
    // If no specific approverId is provided, default to current user
    const targetApproverId = approverId || user.id;
    
    const approvals = await this.contentManagementService.getApprovalQueue(
      targetApproverId,
      status,
      type
    );

    return {
      success: true,
      data: approvals,
    };
  }

  // Media Asset Management Endpoints
  @Post('media/upload')
  @ApiOperation({ summary: 'Upload media asset' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Media asset uploaded successfully' })
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Body('metadata') metadata: string,
    @CurrentUser() user: any
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.logger.log(`Media upload by user ${user.id}: ${file.originalname}`);
    
    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (error) {
        this.logger.warn('Invalid metadata JSON provided');
      }
    }

    const asset = await this.contentManagementService.uploadMediaAsset(
      file,
      user.id,
      parsedMetadata
    );

    return {
      success: true,
      message: 'Media asset uploaded successfully',
      data: asset,
    };
  }

  @Get('media')
  @ApiOperation({ summary: 'Get media assets' })
  @ApiResponse({ status: 200, description: 'Media assets retrieved successfully' })
  async getMediaAssets(
    @Query('uploaderId') uploaderId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @CurrentUser() user: any
  ) {
    // If no uploaderId specified, default to current user's assets
    const targetUploaderId = uploaderId || user.id;
    
    const assets = await this.contentManagementService.getMediaAssets(
      targetUploaderId,
      type as any,
      status as any
    );

    return {
      success: true,
      data: assets,
    };
  }

  @Delete('media/:assetId')
  @ApiOperation({ summary: 'Delete media asset' })
  @ApiResponse({ status: 200, description: 'Media asset deleted successfully' })
  async deleteMediaAsset(
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @CurrentUser() user: any
  ) {
    this.logger.log(`Deleting media asset ${assetId} by user ${user.id}`);
    
    await this.contentManagementService.deleteMediaAsset(assetId, user.id);

    return {
      success: true,
      message: 'Media asset deleted successfully',
    };
  }


  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Get content management dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard overview retrieved successfully' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getDashboardOverview(@CurrentUser() user: any) {
    // Get pending approvals for this user
    const pendingApprovals = await this.contentManagementService.getApprovalQueue(
      user.id,
      ApprovalStatus.PENDING
    );

    // Get user's media assets
    const mediaAssets = await this.contentManagementService.getMediaAssets(user.id);

    const overview = {
      pendingApprovals: {
        count: pendingApprovals.length,
        urgent: pendingApprovals.filter(a => a.isUrgent).length,
        overdue: pendingApprovals.filter(a => a.isOverdue).length,
      },
      mediaAssets: {
        count: mediaAssets.length,
        totalSize: mediaAssets.reduce((sum, asset) => sum + asset.size, 0),
        byType: this.groupAssetsByType(mediaAssets),
      },
      recentActivity: [], // Could be populated with recent content activities
    };

    return {
      success: true,
      data: overview,
    };
  }

  // Helper methods
  private groupAssetsByType(assets: any[]) {
    return assets.reduce((groups, asset) => {
      const type = asset.type;
      groups[type] = (groups[type] || 0) + 1;
      return groups;
    }, {});
  }
}