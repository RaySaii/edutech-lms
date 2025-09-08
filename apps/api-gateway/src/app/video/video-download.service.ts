import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Video, User, Course, Enrollment } from '@edutech-lms/database';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface VideoDownload {
  id: string;
  videoId: string;
  userId: string;
  quality: string;
  format: string;
  fileSize: number;
  downloadUrl: string;
  expiresAt: Date;
  downloadCount: number;
  maxDownloads: number;
  status: 'preparing' | 'ready' | 'expired' | 'revoked';
  createdAt: Date;
}

export interface CreateDownloadDto {
  quality?: '480p' | '720p' | '1080p' | 'original';
  format?: 'mp4' | 'webm';
  includeSubtitles?: boolean;
  validityDays?: number;
  maxDownloads?: number;
}

export interface OfflinePackage {
  id: string;
  userId: string;
  courseId?: string;
  playlistId?: string;
  videos: Array<{
    videoId: string;
    title: string;
    downloadUrl: string;
    subtitles?: Array<{
      language: string;
      url: string;
    }>;
  }>;
  metadata: {
    totalSize: number;
    videoCount: number;
    includesSubtitles: boolean;
    quality: string;
  };
  expiresAt: Date;
  downloadCount: number;
  status: 'preparing' | 'ready' | 'expired';
  createdAt: Date;
}

@Injectable()
export class VideoDownloadService {
  private readonly logger = new Logger(VideoDownloadService.name);
  private readonly downloadPath = process.env.DOWNLOAD_PATH || './downloads';
  private readonly maxFileSize = 2 * 1024 * 1024 * 1024; // 2GB limit
  private readonly defaultValidityDays = 7;
  private readonly defaultMaxDownloads = 3;

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectQueue('video-download')
    private downloadQueue: Queue,
  ) {
    this.ensureDownloadDirectory();
  }

  async createVideoDownload(
    videoId: string,
    userId: string,
    createDto: CreateDownloadDto = {}
  ): Promise<VideoDownload> {
    // Validate video exists and user has access
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['content', 'content.course']
    });

    if (!video) {
      throw new NotFoundException(`Video ${videoId} not found`);
    }

    // Check if user has access to this video
    await this.validateUserAccess(video, userId);

    // Check download permissions
    if (!this.isDownloadAllowed(video, userId)) {
      throw new ForbiddenException('Download not allowed for this video');
    }

    // Check if user already has an active download for this video
    const existingDownload = await this.getActiveDownload(videoId, userId);
    if (existingDownload) {
      return existingDownload;
    }

    const quality = createDto.quality || '720p';
    const format = createDto.format || 'mp4';
    const validityDays = createDto.validityDays || this.defaultValidityDays;
    const maxDownloads = createDto.maxDownloads || this.defaultMaxDownloads;

    // Find the appropriate video stream
    const videoStream = video.videoStreams?.find(stream => 
      stream.quality === quality && stream.filePath.endsWith(`.${format}`)
    );

    if (!videoStream) {
      throw new BadRequestException(`Video quality ${quality} in ${format} format not available`);
    }

    // Generate secure download
    const downloadId = crypto.randomUUID();
    const downloadToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
    
    const download: VideoDownload = {
      id: downloadId,
      videoId,
      userId,
      quality,
      format,
      fileSize: videoStream.fileSize || 0,
      downloadUrl: `/api/videos/download/${downloadToken}`,
      expiresAt,
      downloadCount: 0,
      maxDownloads,
      status: 'preparing',
      createdAt: new Date(),
    };

    // Store download info (in a real app, this would be in a database table)
    await this.storeDownloadInfo(downloadToken, download, videoStream.filePath);

    // Queue download preparation
    await this.downloadQueue.add('prepare-download', {
      downloadId,
      downloadToken,
      videoPath: videoStream.filePath,
      includeSubtitles: createDto.includeSubtitles,
      quality,
      format,
    });

    this.logger.log(`Download created for video ${videoId} by user ${userId}: ${downloadId}`);
    return download;
  }

  async createOfflinePackage(
    userId: string,
    packageData: {
      courseId?: string;
      playlistId?: string;
      videoIds?: string[];
      quality?: string;
      includeSubtitles?: boolean;
      validityDays?: number;
    }
  ): Promise<OfflinePackage> {
    let videos: Video[] = [];

    if (packageData.courseId) {
      // Get all videos from course
      const course = await this.courseRepository.findOne({
        where: { id: packageData.courseId },
        relations: ['content', 'content.videos']
      });

      if (!course) {
        throw new NotFoundException(`Course ${packageData.courseId} not found`);
      }

      // Check enrollment
      const enrollment = await this.enrollmentRepository.findOne({
        where: { courseId: packageData.courseId, userId }
      });

      if (!enrollment) {
        throw new ForbiddenException('Not enrolled in this course');
      }

      videos = course.content?.flatMap(content => content.videos || []) || [];
    } else if (packageData.videoIds) {
      videos = await this.videoRepository.findBy({
        id: { in: packageData.videoIds } as any
      });

      // Validate access to each video
      for (const video of videos) {
        await this.validateUserAccess(video, userId);
      }
    }

    if (videos.length === 0) {
      throw new BadRequestException('No videos found for offline package');
    }

    // Calculate total size
    const totalSize = videos.reduce((sum, video) => {
      const stream = video.videoStreams?.find(s => s.quality === (packageData.quality || '720p'));
      return sum + (stream?.fileSize || 0);
    }, 0);

    if (totalSize > this.maxFileSize) {
      throw new BadRequestException('Package size exceeds maximum limit (2GB)');
    }

    const packageId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + (packageData.validityDays || 7) * 24 * 60 * 60 * 1000);

    const offlinePackage: OfflinePackage = {
      id: packageId,
      userId,
      courseId: packageData.courseId,
      playlistId: packageData.playlistId,
      videos: videos.map(video => ({
        videoId: video.id,
        title: video.title,
        downloadUrl: '', // Will be populated after processing
        subtitles: packageData.includeSubtitles ? [] : undefined, // Will be populated
      })),
      metadata: {
        totalSize,
        videoCount: videos.length,
        includesSubtitles: packageData.includeSubtitles || false,
        quality: packageData.quality || '720p',
      },
      expiresAt,
      downloadCount: 0,
      status: 'preparing',
      createdAt: new Date(),
    };

    // Queue package creation
    await this.downloadQueue.add('create-offline-package', {
      packageId,
      userId,
      videos: videos.map(v => ({
        id: v.id,
        title: v.title,
        streams: v.videoStreams,
      })),
      quality: packageData.quality || '720p',
      includeSubtitles: packageData.includeSubtitles || false,
    });

    this.logger.log(`Offline package created: ${packageId} for user ${userId} with ${videos.length} videos`);
    return offlinePackage;
  }

  async getDownloadStatus(downloadToken: string): Promise<VideoDownload | null> {
    // In a real implementation, this would query a database
    return this.getStoredDownloadInfo(downloadToken);
  }

  async trackDownload(downloadToken: string): Promise<void> {
    const downloadInfo = await this.getStoredDownloadInfo(downloadToken);
    
    if (!downloadInfo) {
      throw new NotFoundException('Download not found');
    }

    if (downloadInfo.status !== 'ready') {
      throw new BadRequestException('Download not ready');
    }

    if (new Date() > downloadInfo.expiresAt) {
      throw new BadRequestException('Download has expired');
    }

    if (downloadInfo.downloadCount >= downloadInfo.maxDownloads) {
      throw new BadRequestException('Download limit exceeded');
    }

    // Increment download count
    downloadInfo.downloadCount++;
    await this.storeDownloadInfo(downloadToken, downloadInfo, '');

    this.logger.log(`Download tracked: ${downloadToken} - Count: ${downloadInfo.downloadCount}`);
  }

  async getUserDownloads(userId: string): Promise<VideoDownload[]> {
    // In a real implementation, this would query a database
    // For now, return mock data
    return [];
  }

  async getUserOfflinePackages(userId: string): Promise<OfflinePackage[]> {
    // In a real implementation, this would query a database
    return [];
  }

  async revokeDownload(downloadId: string, userId: string): Promise<void> {
    // In a real implementation, this would update the database
    this.logger.log(`Download revoked: ${downloadId} by user ${userId}`);
  }

  async cleanupExpiredDownloads(): Promise<{ cleaned: number; errors: string[] }> {
    const errors: string[] = [];
    let cleaned = 0;

    try {
      // In a real implementation, this would:
      // 1. Find all expired downloads from database
      // 2. Delete the physical files
      // 3. Update database status
      // 4. Clean up temporary files

      this.logger.log(`Cleanup completed: ${cleaned} expired downloads removed`);
    } catch (error) {
      errors.push(error.message);
      this.logger.error(`Cleanup error: ${error.message}`);
    }

    return { cleaned, errors };
  }

  async getDownloadAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalDownloads: number;
    uniqueUsers: number;
    popularVideos: Array<{
      videoId: string;
      title: string;
      downloadCount: number;
    }>;
    qualityDistribution: { [quality: string]: number };
    formatDistribution: { [format: string]: number };
    bandwidthUsage: number;
  }> {
    // Mock analytics data - in real implementation, query from database
    return {
      totalDownloads: 1250,
      uniqueUsers: 340,
      popularVideos: [
        { videoId: '1', title: 'Intro to React', downloadCount: 125 },
        { videoId: '2', title: 'Advanced TypeScript', downloadCount: 98 },
        { videoId: '3', title: 'Node.js Fundamentals', downloadCount: 87 },
      ],
      qualityDistribution: {
        '480p': 285,
        '720p': 650,
        '1080p': 315,
      },
      formatDistribution: {
        'mp4': 950,
        'webm': 300,
      },
      bandwidthUsage: 125.5, // GB
    };
  }

  private async validateUserAccess(video: Video, userId: string): Promise<void> {
    // Check if video is part of a course
    if (video.content?.course) {
      const enrollment = await this.enrollmentRepository.findOne({
        where: { 
          courseId: video.content.course.id, 
          userId,
          status: 'active'
        }
      });

      if (!enrollment) {
        throw new ForbiddenException('Not enrolled in the course containing this video');
      }
    } else {
      // Check if video is publicly accessible or user is the creator
      if (video.uploaderId !== userId && !video.isPublic) {
        throw new ForbiddenException('Access denied to this video');
      }
    }
  }

  private isDownloadAllowed(video: Video, userId: string): boolean {
    // Check video-level download permissions
    if (video.allowDownload === false) {
      return false;
    }

    // Check course-level download permissions
    if (video.content?.course?.allowDownload === false) {
      return false;
    }

    // Check user subscription level or permissions
    // In a real implementation, you might check subscription tiers
    return true;
  }

  private async getActiveDownload(videoId: string, userId: string): Promise<VideoDownload | null> {
    // In a real implementation, query database for active downloads
    return null;
  }

  private async storeDownloadInfo(
    token: string, 
    downloadInfo: VideoDownload, 
    filePath: string
  ): Promise<void> {
    // In a real implementation, this would store in database
    // For now, we'll use a simple file-based approach
    const infoPath = path.join(this.downloadPath, 'info', `${token}.json`);
    await fs.writeFile(infoPath, JSON.stringify({
      ...downloadInfo,
      originalFilePath: filePath,
    }), 'utf-8');
  }

  private async getStoredDownloadInfo(token: string): Promise<VideoDownload | null> {
    try {
      const infoPath = path.join(this.downloadPath, 'info', `${token}.json`);
      const data = await fs.readFile(infoPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  private async ensureDownloadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.downloadPath, { recursive: true });
      await fs.mkdir(path.join(this.downloadPath, 'info'), { recursive: true });
      await fs.mkdir(path.join(this.downloadPath, 'packages'), { recursive: true });
      await fs.mkdir(path.join(this.downloadPath, 'temp'), { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create download directories: ${error.message}`);
    }
  }

  async generateSecureDownloadUrl(
    videoId: string,
    userId: string,
    expirationMinutes: number = 60
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
    
    // Store temporary download token
    const tokenData = {
      videoId,
      userId,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    const tokenPath = path.join(this.downloadPath, 'tokens', `${token}.json`);
    await fs.writeFile(tokenPath, JSON.stringify(tokenData), 'utf-8');

    return `/api/videos/secure-download/${token}`;
  }

  async validateDownloadToken(token: string): Promise<{
    videoId: string;
    userId: string;
    isValid: boolean;
  }> {
    try {
      const tokenPath = path.join(this.downloadPath, 'tokens', `${token}.json`);
      const data = await fs.readFile(tokenPath, 'utf-8');
      const tokenData = JSON.parse(data);

      const isValid = new Date(tokenData.expiresAt) > new Date();
      
      if (!isValid) {
        // Clean up expired token
        await fs.unlink(tokenPath).catch(() => {});
      }

      return {
        videoId: tokenData.videoId,
        userId: tokenData.userId,
        isValid,
      };
    } catch (error) {
      return {
        videoId: '',
        userId: '',
        isValid: false,
      };
    }
  }

  async getDownloadHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    downloads: Array<{
      id: string;
      video: {
        id: string;
        title: string;
        thumbnailUrl: string;
        duration: number;
      };
      quality: string;
      format: string;
      fileSize: number;
      downloadCount: number;
      createdAt: string;
      expiresAt: string;
      status: string;
    }>;
    total: number;
  }> {
    // Mock data - in real implementation, query from database
    return {
      downloads: [],
      total: 0,
    };
  }

  async getVideoDownloadStats(videoId: string): Promise<{
    totalDownloads: number;
    uniqueDownloaders: number;
    qualityBreakdown: { [quality: string]: number };
    formatBreakdown: { [format: string]: number };
    bandwidthUsed: number;
    peakDownloadTimes: Array<{
      hour: number;
      downloadCount: number;
    }>;
  }> {
    // Mock statistics - in real implementation, aggregate from database
    return {
      totalDownloads: 245,
      uniqueDownloaders: 189,
      qualityBreakdown: {
        '480p': 45,
        '720p': 145,
        '1080p': 55,
      },
      formatBreakdown: {
        'mp4': 195,
        'webm': 50,
      },
      bandwidthUsed: 15.7, // GB
      peakDownloadTimes: [
        { hour: 9, downloadCount: 25 },
        { hour: 13, downloadCount: 32 },
        { hour: 19, downloadCount: 28 },
        { hour: 21, downloadCount: 35 },
      ],
    };
  }

  async estimatePackageSize(
    videoIds: string[],
    quality: string = '720p'
  ): Promise<{
    totalSize: number;
    videoCount: number;
    estimatedDownloadTime: number; // in minutes
    breakdown: Array<{
      videoId: string;
      title: string;
      size: number;
      duration: number;
    }>;
  }> {
    const videos = await this.videoRepository.findBy({
      id: { in: videoIds } as any
    });

    let totalSize = 0;
    const breakdown = videos.map(video => {
      const stream = video.videoStreams?.find(s => s.quality === quality);
      const size = stream?.fileSize || 0;
      totalSize += size;

      return {
        videoId: video.id,
        title: video.title,
        size,
        duration: video.duration || 0,
      };
    });

    // Estimate download time based on average connection speed (5 Mbps)
    const estimatedDownloadTime = Math.ceil(totalSize / (5 * 1024 * 1024 / 8) / 60);

    return {
      totalSize,
      videoCount: videos.length,
      estimatedDownloadTime,
      breakdown,
    };
  }
}