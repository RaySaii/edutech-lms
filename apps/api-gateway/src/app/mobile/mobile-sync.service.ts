import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  MobileDevice,
  OfflineContent,
  MobileSync,
  MobileAppConfig,
  User,
  Course,
  Content,
  Enrollment,
  ContentProgress,
  Assessment,
  AssessmentAttempt,
  SyncStatus,
  DownloadStatus,
  DevicePlatform,
} from '@edutech-lms/database';

export interface SyncRequest {
  deviceId: string;
  syncType: 'full' | 'incremental' | 'content_only' | 'progress_only';
  lastSyncTimestamp?: Date;
  requestedContent?: string[];
}

export interface SyncResponse {
  syncId: string;
  status: SyncStatus;
  data?: {
    courses?: any[];
    content?: any[];
    progress?: any[];
    assessments?: any[];
    bookmarks?: any[];
    notes?: any[];
  };
  metadata?: {
    totalItems: number;
    timestamp: Date;
    nextSyncRecommended?: Date;
  };
}

export interface OfflineDownloadRequest {
  deviceId: string;
  contentIds: string[];
  quality?: 'high' | 'medium' | 'low';
  priority?: 'high' | 'normal' | 'low';
}

@Injectable()
export class MobileSyncService {
  private readonly logger = new Logger(MobileSyncService.name);

  constructor(
    @InjectRepository(MobileDevice)
    private deviceRepository: Repository<MobileDevice>,
    @InjectRepository(OfflineContent)
    private offlineContentRepository: Repository<OfflineContent>,
    @InjectRepository(MobileSync)
    private syncRepository: Repository<MobileSync>,
    @InjectRepository(MobileAppConfig)
    private appConfigRepository: Repository<MobileAppConfig>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(ContentProgress)
    private progressRepository: Repository<ContentProgress>,
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentAttempt)
    private attemptRepository: Repository<AssessmentAttempt>,
    @InjectQueue('mobile-sync')
    private syncQueue: Queue,
    @InjectQueue('content-download')
    private downloadQueue: Queue,
  ) {}

  async registerDevice(
    userId: string,
    organizationId: string,
    deviceData: {
      deviceToken: string;
      platform: DevicePlatform;
      deviceId: string;
      deviceName?: string;
      model?: string;
      osVersion?: string;
      appVersion?: string;
    }
  ): Promise<MobileDevice> {
    try {
      // Check if device already exists
      let device = await this.deviceRepository.findOne({
        where: {
          userId,
          deviceId: deviceData.deviceId,
        },
      });

      if (device) {
        // Update existing device
        device.deviceToken = deviceData.deviceToken;
        device.platform = deviceData.platform;
        device.deviceName = deviceData.deviceName;
        device.model = deviceData.model;
        device.osVersion = deviceData.osVersion;
        device.appVersion = deviceData.appVersion;
        device.isActive = true;
        device.lastActiveAt = new Date();
      } else {
        // Create new device
        device = this.deviceRepository.create({
          userId,
          organizationId,
          ...deviceData,
          isActive: true,
          lastActiveAt: new Date(),
          settings: this.getDefaultSettings(),
          capabilities: await this.detectDeviceCapabilities(deviceData.platform),
        });
      }

      const savedDevice = await this.deviceRepository.save(device);

      this.logger.log(`Device registered: ${savedDevice.id} for user ${userId}`);
      return savedDevice;
    } catch (error) {
      this.logger.error(`Failed to register device: ${error.message}`);
      throw error;
    }
  }

  async initiateSync(syncRequest: SyncRequest): Promise<SyncResponse> {
    const device = await this.deviceRepository.findOne({
      where: { id: syncRequest.deviceId },
      relations: ['user'],
    });

    if (!device) {
      throw new NotFoundException(`Device ${syncRequest.deviceId} not found`);
    }

    try {
      // Create sync record
      const sync = this.syncRepository.create({
        deviceId: syncRequest.deviceId,
        syncType: syncRequest.syncType,
        status: SyncStatus.PENDING,
        metadata: {
          triggered_by: 'user',
          network_type: 'unknown',
        },
      });

      const savedSync = await this.syncRepository.save(sync);

      // Queue sync processing
      await this.syncQueue.add('process-sync', {
        syncId: savedSync.id,
        syncRequest,
      }, {
        priority: this.getSyncPriority(syncRequest.syncType),
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      this.logger.log(`Sync initiated: ${savedSync.id} for device ${syncRequest.deviceId}`);

      return {
        syncId: savedSync.id,
        status: SyncStatus.PENDING,
        metadata: {
          totalItems: 0,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to initiate sync: ${error.message}`);
      throw error;
    }
  }

  async processSync(syncId: string, syncRequest: SyncRequest): Promise<void> {
    const sync = await this.syncRepository.findOne({
      where: { id: syncId },
      relations: ['device', 'device.user'],
    });

    if (!sync) {
      throw new NotFoundException(`Sync ${syncId} not found`);
    }

    try {
      sync.status = SyncStatus.IN_PROGRESS;
      sync.startedAt = new Date();
      await this.syncRepository.save(sync);

      const device = sync.device;
      const user = device.user;

      let syncData: any = {};
      let itemCount = 0;

      // Process different sync types
      switch (syncRequest.syncType) {
        case 'full':
          syncData = await this.performFullSync(user.id, syncRequest.lastSyncTimestamp);
          break;
        case 'incremental':
          syncData = await this.performIncrementalSync(user.id, syncRequest.lastSyncTimestamp);
          break;
        case 'content_only':
          syncData.content = await this.syncContentData(user.id, syncRequest.requestedContent);
          break;
        case 'progress_only':
          syncData.progress = await this.syncProgressData(user.id, syncRequest.lastSyncTimestamp);
          break;
      }

      // Count total items
      itemCount = Object.values(syncData).reduce((total: number, items: any) => {
        return total + (Array.isArray(items) ? items.length : 0);
      }, 0);

      // Update sync record
      sync.syncData = syncData;
      sync.itemsToSync = itemCount;
      sync.itemsSynced = itemCount;
      sync.itemsFailed = 0;
      sync.progress = 100;
      sync.status = SyncStatus.COMPLETED;
      sync.completedAt = new Date();
      sync.duration = Math.floor((sync.completedAt.getTime() - sync.startedAt.getTime()) / 1000);

      await this.syncRepository.save(sync);

      // Update device last sync time
      device.lastSyncAt = new Date();
      await this.deviceRepository.save(device);

      this.logger.log(`Sync completed: ${syncId} - ${itemCount} items synced`);
    } catch (error) {
      sync.status = SyncStatus.FAILED;
      sync.errorMessage = error.message;
      sync.completedAt = new Date();
      await this.syncRepository.save(sync);

      this.logger.error(`Sync failed: ${syncId} - ${error.message}`);
      throw error;
    }
  }

  async downloadContentForOffline(request: OfflineDownloadRequest): Promise<{
    downloads: OfflineContent[];
    totalSize: number;
  }> {
    const device = await this.deviceRepository.findOne({
      where: { id: request.deviceId },
    });

    if (!device) {
      throw new NotFoundException(`Device ${request.deviceId} not found`);
    }

    try {
      const contents = await this.contentRepository.find({
        where: { id: In(request.contentIds) },
        relations: ['course'],
      });

      const downloads: OfflineContent[] = [];
      let totalSize = 0;

      for (const content of contents) {
        // Check if already downloaded
        let offlineContent = await this.offlineContentRepository.findOne({
          where: {
            deviceId: request.deviceId,
            contentId: content.id,
          },
        });

        if (!offlineContent) {
          offlineContent = this.offlineContentRepository.create({
            deviceId: request.deviceId,
            contentId: content.id,
            courseId: content.courseId,
            status: DownloadStatus.NOT_DOWNLOADED,
          });
        }

        // Calculate content size based on quality
        const contentSize = await this.calculateContentSize(content, request.quality);
        offlineContent.totalSize = contentSize;
        totalSize += contentSize;

        // Set expiry date based on device settings
        const expiryDays = device.settings?.sync_frequency || 30;
        offlineContent.expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

        const savedOfflineContent = await this.offlineContentRepository.save(offlineContent);
        downloads.push(savedOfflineContent);

        // Queue download
        await this.downloadQueue.add('download-content', {
          offlineContentId: savedOfflineContent.id,
          quality: request.quality || 'medium',
          priority: request.priority || 'normal',
        }, {
          priority: this.getDownloadPriority(request.priority),
          attempts: 3,
        });
      }

      this.logger.log(`Queued ${downloads.length} content items for offline download`);

      return { downloads, totalSize };
    } catch (error) {
      this.logger.error(`Failed to queue offline downloads: ${error.message}`);
      throw error;
    }
  }

  async processContentDownload(offlineContentId: string, quality: string): Promise<void> {
    const offlineContent = await this.offlineContentRepository.findOne({
      where: { id: offlineContentId },
      relations: ['content', 'device'],
    });

    if (!offlineContent) {
      throw new NotFoundException(`Offline content ${offlineContentId} not found`);
    }

    try {
      offlineContent.status = DownloadStatus.DOWNLOADING;
      offlineContent.downloadStartedAt = new Date();
      await this.offlineContentRepository.save(offlineContent);

      const content = offlineContent.content;

      // Generate download URL with appropriate quality
      const downloadUrl = await this.generateContentDownloadUrl(content, quality);
      
      // Download and encrypt content
      const { filePath, actualSize } = await this.downloadAndEncryptContent(
        downloadUrl,
        content,
        quality
      );

      // Update offline content record
      offlineContent.status = DownloadStatus.DOWNLOADED;
      offlineContent.localFilePath = filePath;
      offlineContent.downloadedSize = actualSize;
      offlineContent.downloadCompletedAt = new Date();
      offlineContent.encryption = this.generateEncryptionKey();
      offlineContent.metadata = {
        quality,
        format: this.getContentFormat(content),
        checksum: await this.calculateChecksum(filePath),
        mime_type: content.mimeType,
      };

      await this.offlineContentRepository.save(offlineContent);

      this.logger.log(`Content downloaded for offline: ${offlineContentId}`);
    } catch (error) {
      offlineContent.status = DownloadStatus.FAILED;
      offlineContent.errorMessage = error.message;
      offlineContent.retryCount++;
      await this.offlineContentRepository.save(offlineContent);

      this.logger.error(`Content download failed: ${offlineContentId} - ${error.message}`);
      throw error;
    }
  }

  async getOfflineContent(deviceId: string, contentId: string): Promise<{
    content: OfflineContent;
    accessUrl: string;
  }> {
    const offlineContent = await this.offlineContentRepository.findOne({
      where: {
        deviceId,
        contentId,
        status: DownloadStatus.DOWNLOADED,
      },
      relations: ['content'],
    });

    if (!offlineContent) {
      throw new NotFoundException(`Offline content not found or not downloaded`);
    }

    // Check expiry
    if (offlineContent.expiresAt && offlineContent.expiresAt < new Date()) {
      offlineContent.status = DownloadStatus.EXPIRED;
      await this.offlineContentRepository.save(offlineContent);
      throw new BadRequestException('Offline content has expired');
    }

    // Update last accessed time
    offlineContent.lastAccessedAt = new Date();
    await this.offlineContentRepository.save(offlineContent);

    // Generate secure access URL
    const accessUrl = await this.generateOfflineAccessUrl(offlineContent);

    return {
      content: offlineContent,
      accessUrl,
    };
  }

  async getSyncStatus(syncId: string): Promise<MobileSync> {
    const sync = await this.syncRepository.findOne({
      where: { id: syncId },
      relations: ['device'],
    });

    if (!sync) {
      throw new NotFoundException(`Sync ${syncId} not found`);
    }

    return sync;
  }

  async getDeviceInfo(deviceId: string): Promise<MobileDevice> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ['offlineContent', 'syncHistory'],
    });

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    return device;
  }

  async updateDeviceSettings(
    deviceId: string,
    settings: Partial<MobileDevice['settings']>
  ): Promise<MobileDevice> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    device.settings = { ...device.settings, ...settings };
    const updatedDevice = await this.deviceRepository.save(device);

    this.logger.log(`Device settings updated: ${deviceId}`);
    return updatedDevice;
  }

  async cleanupExpiredContent(): Promise<number> {
    const expiredContent = await this.offlineContentRepository.find({
      where: {
        expiresAt: MoreThan(new Date()),
        status: DownloadStatus.DOWNLOADED,
      },
    });

    let cleanedCount = 0;

    for (const content of expiredContent) {
      try {
        // Delete local file
        if (content.localFilePath) {
          await this.deleteLocalFile(content.localFilePath);
        }

        // Update status
        content.status = DownloadStatus.EXPIRED;
        content.localFilePath = null;
        await this.offlineContentRepository.save(content);

        cleanedCount++;
      } catch (error) {
        this.logger.error(`Failed to cleanup expired content ${content.id}: ${error.message}`);
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired offline content items`);
    }

    return cleanedCount;
  }

  // Private helper methods

  private async performFullSync(userId: string, lastSyncTimestamp?: Date): Promise<any> {
    const [courses, content, progress, assessments] = await Promise.all([
      this.syncCourseData(userId, lastSyncTimestamp),
      this.syncContentData(userId),
      this.syncProgressData(userId, lastSyncTimestamp),
      this.syncAssessmentData(userId, lastSyncTimestamp),
    ]);

    return {
      courses,
      content,
      progress,
      assessments,
    };
  }

  private async performIncrementalSync(userId: string, lastSyncTimestamp?: Date): Promise<any> {
    if (!lastSyncTimestamp) {
      return this.performFullSync(userId);
    }

    const [courses, progress, assessments] = await Promise.all([
      this.syncCourseData(userId, lastSyncTimestamp),
      this.syncProgressData(userId, lastSyncTimestamp),
      this.syncAssessmentData(userId, lastSyncTimestamp),
    ]);

    return {
      courses,
      progress,
      assessments,
    };
  }

  private async syncCourseData(userId: string, since?: Date): Promise<any[]> {
    const enrollments = await this.enrollmentRepository.find({
      where: {
        userId,
        ...(since && { updatedAt: MoreThan(since) }),
      },
      relations: ['course'],
    });

    return enrollments.map(enrollment => ({
      id: enrollment.course.id,
      title: enrollment.course.title,
      description: enrollment.course.description,
      thumbnailUrl: enrollment.course.thumbnailUrl,
      progress: enrollment.progress,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      lastAccessedAt: enrollment.lastAccessedAt,
    }));
  }

  private async syncContentData(userId: string, contentIds?: string[]): Promise<any[]> {
    // Get user's enrolled courses
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
      relations: ['course'],
    });

    const courseIds = enrollments.map(e => e.course.id);

    let query = this.contentRepository.createQueryBuilder('content')
      .where('content.courseId IN (:...courseIds)', { courseIds });

    if (contentIds && contentIds.length > 0) {
      query = query.andWhere('content.id IN (:...contentIds)', { contentIds });
    }

    const contents = await query.getMany();

    return contents.map(content => ({
      id: content.id,
      title: content.title,
      type: content.type,
      mimeType: content.mimeType,
      duration: content.duration,
      fileSize: content.fileSize,
      courseId: content.courseId,
      isOfflineCapable: this.isContentOfflineCapable(content),
    }));
  }

  private async syncProgressData(userId: string, since?: Date): Promise<any[]> {
    const progress = await this.progressRepository.find({
      where: {
        userId,
        ...(since && { updatedAt: MoreThan(since) }),
      },
    });

    return progress.map(p => ({
      contentId: p.contentId,
      progress: p.progress,
      timeSpent: p.timeSpent,
      completed: p.completed,
      lastAccessedAt: p.lastAccessedAt,
    }));
  }

  private async syncAssessmentData(userId: string, since?: Date): Promise<any[]> {
    const attempts = await this.attemptRepository.find({
      where: {
        userId,
        ...(since && { createdAt: MoreThan(since) }),
      },
      relations: ['assessment'],
    });

    return attempts.map(attempt => ({
      assessmentId: attempt.assessment.id,
      score: attempt.score,
      passed: attempt.passed,
      completedAt: attempt.completedAt,
      timeSpent: attempt.timeSpent,
    }));
  }

  private getDefaultSettings(): any {
    return {
      offline_mode: true,
      auto_download: false,
      video_quality: 'medium',
      cellular_data_usage: false,
      dark_mode: false,
      font_size: 'medium',
      language: 'en',
      sync_frequency: 60, // minutes
    };
  }

  private async detectDeviceCapabilities(platform: DevicePlatform): Promise<any> {
    // Default capabilities based on platform
    const baseCapabilities = {
      offline_support: true,
      video_download: true,
      biometric_auth: platform === DevicePlatform.IOS || platform === DevicePlatform.ANDROID,
      camera_access: platform === DevicePlatform.IOS || platform === DevicePlatform.ANDROID,
      microphone_access: platform === DevicePlatform.IOS || platform === DevicePlatform.ANDROID,
      location_access: platform === DevicePlatform.IOS || platform === DevicePlatform.ANDROID,
      background_sync: platform !== DevicePlatform.WEB,
    };

    return baseCapabilities;
  }

  private getSyncPriority(syncType: string): number {
    switch (syncType) {
      case 'progress_only': return 1; // High priority
      case 'incremental': return 2;
      case 'content_only': return 3;
      case 'full': return 4; // Low priority
      default: return 3;
    }
  }

  private getDownloadPriority(priority?: string): number {
    switch (priority) {
      case 'high': return 1;
      case 'normal': return 2;
      case 'low': return 3;
      default: return 2;
    }
  }

  private async calculateContentSize(content: Content, quality?: string): Promise<number> {
    // Base file size
    let size = content.fileSize || 0;

    // Adjust for video quality
    if (content.type === 'video' && quality) {
      switch (quality) {
        case 'high': size = size * 1.5; break;
        case 'medium': size = size * 1.0; break;
        case 'low': size = size * 0.6; break;
      }
    }

    return Math.floor(size);
  }

  private async generateContentDownloadUrl(content: Content, quality: string): Promise<string> {
    // In a real implementation, this would generate a signed URL
    // for downloading content from CDN with appropriate quality
    return `https://cdn.example.com/content/${content.id}?quality=${quality}`;
  }

  private async downloadAndEncryptContent(
    downloadUrl: string,
    content: Content,
    quality: string
  ): Promise<{ filePath: string; actualSize: number }> {
    // In a real implementation, this would:
    // 1. Download the content from the URL
    // 2. Encrypt it for offline storage
    // 3. Store it in device-specific directory
    // 4. Return the local file path and actual size
    
    const filePath = `/offline/${content.id}_${quality}.encrypted`;
    const actualSize = await this.calculateContentSize(content, quality);

    return { filePath, actualSize };
  }

  private generateEncryptionKey(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private getContentFormat(content: Content): string {
    return content.mimeType?.split('/')[1] || 'unknown';
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    // In a real implementation, calculate MD5/SHA256 checksum
    return 'checksum_placeholder';
  }

  private isContentOfflineCapable(content: Content): boolean {
    // Check if content type supports offline viewing
    const offlineCapableTypes = ['video', 'audio', 'document', 'image'];
    return offlineCapableTypes.includes(content.type);
  }

  private async generateOfflineAccessUrl(offlineContent: OfflineContent): Promise<string> {
    // Generate secure, time-limited URL for accessing offline content
    const token = Buffer.from(`${offlineContent.id}:${Date.now()}`).toString('base64');
    return `/api/mobile/offline/content/${offlineContent.id}?token=${token}`;
  }

  private async deleteLocalFile(filePath: string): Promise<void> {
    // In a real implementation, delete the file from local storage
    this.logger.debug(`Deleting local file: ${filePath}`);
  }
}