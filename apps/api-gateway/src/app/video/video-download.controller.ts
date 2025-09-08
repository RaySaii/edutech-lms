import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@edutech-lms/auth';
import { 
  VideoDownloadService,
  CreateDownloadDto
} from './video-download.service';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Video Downloads')
@Controller('videos')
@UseGuards(JwtAuthGuard)
export class VideoDownloadController {
  constructor(private readonly downloadService: VideoDownloadService) {}

  @Post(':videoId/download')
  @ApiOperation({ summary: 'Create video download link' })
  @ApiResponse({ status: 201, description: 'Download link created successfully' })
  async createDownload(
    @Param('videoId') videoId: string,
    @Body() createDto: CreateDownloadDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.downloadService.createVideoDownload(videoId, userId, createDto);
  }

  @Get('download/:token')
  @ApiOperation({ summary: 'Download video file using secure token' })
  async downloadVideo(
    @Param('token') token: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const downloadInfo = await this.downloadService.getDownloadStatus(token);
    
    if (!downloadInfo) {
      res.status(404).json({ message: 'Download not found' });
      return;
    }

    if (downloadInfo.status !== 'ready') {
      res.status(400).json({ message: 'Download not ready' });
      return;
    }

    if (new Date() > downloadInfo.expiresAt) {
      res.status(400).json({ message: 'Download has expired' });
      return;
    }

    if (downloadInfo.downloadCount >= downloadInfo.maxDownloads) {
      res.status(400).json({ message: 'Download limit exceeded' });
      return;
    }

    try {
      // Track download
      await this.downloadService.trackDownload(token);

      // Get file path (in real implementation, this would be stored with download info)
      const filePath = `/path/to/video/files/${downloadInfo.videoId}.${downloadInfo.format}`;
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ message: 'Video file not found' });
        return;
      }

      const file = fs.createReadStream(filePath);
      const stat = fs.statSync(filePath);

      // Set appropriate headers
      res.set({
        'Content-Type': downloadInfo.format === 'mp4' ? 'video/mp4' : 'video/webm',
        'Content-Length': stat.size.toString(),
        'Content-Disposition': `attachment; filename="video-${downloadInfo.videoId}.${downloadInfo.format}"`,
        'Cache-Control': 'no-cache',
      });

      return new StreamableFile(file);
    } catch (error) {
      res.status(500).json({ message: 'Download failed' });
    }
  }

  @Get('secure-download/:token')
  @ApiOperation({ summary: 'Secure video download with range support' })
  async secureDownload(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const validation = await this.downloadService.validateDownloadToken(token);
    
    if (!validation.isValid) {
      return res.status(403).json({ message: 'Invalid or expired download token' });
    }

    // In a real implementation, get the actual file path
    const filePath = `/path/to/video/files/${validation.videoId}.mp4`;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Video file not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Handle range requests for progressive download
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });
      
      file.pipe(res);
    } else {
      // Full file download
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="video-${validation.videoId}.mp4"`,
      });
      
      fs.createReadStream(filePath).pipe(res);
    }
  }

  @Post('offline-packages')
  @ApiOperation({ summary: 'Create offline package for multiple videos' })
  @ApiResponse({ status: 201, description: 'Offline package created successfully' })
  async createOfflinePackage(
    @Body() packageData: {
      courseId?: string;
      playlistId?: string;
      videoIds?: string[];
      quality?: string;
      includeSubtitles?: boolean;
      validityDays?: number;
    },
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.downloadService.createOfflinePackage(userId, packageData);
  }

  @Get('downloads')
  @ApiOperation({ summary: 'Get user download history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserDownloads(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = req.user?.['sub'];
    return this.downloadService.getUserDownloads(userId);
  }

  @Get('offline-packages')
  @ApiOperation({ summary: 'Get user offline packages' })
  async getUserOfflinePackages(@Req() req: Request) {
    const userId = req.user?.['sub'];
    return this.downloadService.getUserOfflinePackages(userId);
  }

  @Delete('downloads/:downloadId')
  @ApiOperation({ summary: 'Revoke download access' })
  @ApiResponse({ status: 200, description: 'Download revoked successfully' })
  async revokeDownload(
    @Param('downloadId') downloadId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    await this.downloadService.revokeDownload(downloadId, userId);
    return { message: 'Download revoked successfully' };
  }

  @Post('estimate-package-size')
  @ApiOperation({ summary: 'Estimate offline package size before creation' })
  @ApiResponse({ status: 200, description: 'Package size estimated successfully' })
  async estimatePackageSize(
    @Body() estimateData: {
      videoIds: string[];
      quality?: string;
    },
  ) {
    return this.downloadService.estimatePackageSize(
      estimateData.videoIds,
      estimateData.quality
    );
  }

  @Get(':videoId/download-stats')
  @ApiOperation({ summary: 'Get download statistics for video (admin/creator only)' })
  async getVideoDownloadStats(
    @Param('videoId') videoId: string,
  ) {
    return this.downloadService.getVideoDownloadStats(videoId);
  }

  @Get('download-analytics')
  @ApiOperation({ summary: 'Get download analytics (admin only)' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getDownloadAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    return this.downloadService.getDownloadAnalytics(start, end);
  }

  @Post('cleanup-expired')
  @ApiOperation({ summary: 'Clean up expired downloads (admin only)' })
  @ApiResponse({ status: 200, description: 'Cleanup completed successfully' })
  async cleanupExpiredDownloads() {
    return this.downloadService.cleanupExpiredDownloads();
  }

  @Get(':videoId/download-permissions')
  @ApiOperation({ summary: 'Check if user can download video' })
  async checkDownloadPermissions(
    @Param('videoId') videoId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    
    try {
      // This would validate access and permissions
      const download = await this.downloadService.createVideoDownload(videoId, userId, {});
      
      return {
        canDownload: true,
        availableQualities: ['480p', '720p', '1080p'],
        availableFormats: ['mp4', 'webm'],
        maxFileSize: '2GB',
        validityDays: 7,
        maxDownloads: 3,
      };
    } catch (error) {
      return {
        canDownload: false,
        reason: error.message,
      };
    }
  }
}