import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as path from 'path';
import * as fs from 'fs/promises';
import { 
  Video, 
  VideoProgress, 
  VideoBookmark, 
  VideoNote,
  VideoStatus,
  VideoQuality 
} from '@edutech-lms/database';

export interface CreateVideoDto {
  title: string;
  description?: string;
  contentId?: string;
  isPublic?: boolean;
  allowDownload?: boolean;
  requiresAuthentication?: boolean;
}

export interface UploadVideoDto extends CreateVideoDto {
  file: Express.Multer.File;
}

export interface VideoProgressDto {
  currentTime: number;
  watchTime: number;
  completed: boolean;
}

export interface VideoBookmarkDto {
  timestamp: number;
  title?: string;
  notes?: string;
}

export interface VideoNoteDto {
  timestamp: number;
  content: string;
  isPublic?: boolean;
}

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  private readonly uploadPath = 'uploads/videos';
  private readonly thumbnailPath = 'uploads/thumbnails';
  private readonly streamPath = 'uploads/streams';

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(VideoProgress)
    private progressRepository: Repository<VideoProgress>,
    @InjectRepository(VideoBookmark)
    private bookmarkRepository: Repository<VideoBookmark>,
    @InjectRepository(VideoNote)
    private noteRepository: Repository<VideoNote>,
    @InjectQueue('video-processing')
    private videoProcessingQueue: Queue,
  ) {
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
      await fs.mkdir(this.thumbnailPath, { recursive: true });
      await fs.mkdir(this.streamPath, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create upload directories:', error);
    }
  }

  async uploadVideo(uploadDto: UploadVideoDto, uploaderId: string): Promise<Video> {
    const { file, ...videoData } = uploadDto;
    
    // Validate file
    if (!this.isValidVideoFile(file)) {
      throw new BadRequestException('Invalid video file format');
    }

    const fileName = this.generateFileName(file.originalname);
    const filePath = path.join(this.uploadPath, fileName);

    try {
      // Save file to disk
      await fs.writeFile(filePath, file.buffer);

      // Create video record
      const video = this.videoRepository.create({
        ...videoData,
        originalFileName: file.originalname,
        fileName,
        filePath,
        fileSize: file.size,
        uploaderId,
        status: VideoStatus.UPLOADING,
      });

      const savedVideo = await this.videoRepository.save(video);

      // Queue for processing
      await this.videoProcessingQueue.add('process-video', {
        videoId: savedVideo.id,
        filePath,
      }, {
        attempts: 3,
        backoff: 'exponential',
        delay: 5000,
      });

      this.logger.log(`Video uploaded and queued for processing: ${savedVideo.id}`);
      return savedVideo;
    } catch (error) {
      this.logger.error('Failed to upload video:', error);
      // Clean up file if exists
      try {
        await fs.unlink(filePath);
      } catch {}
      throw new BadRequestException('Failed to upload video');
    }
  }

  async findVideoById(id: string, userId?: string): Promise<Video> {
    const video = await this.videoRepository.findOne({
      where: { id },
      relations: ['uploader', 'content'],
    });

    if (!video) {
      throw new NotFoundException(`Video with ID ${id} not found`);
    }

    // Check access permissions
    if (!video.isPublic && video.uploaderId !== userId) {
      throw new NotFoundException('Video not found');
    }

    // Increment view count
    if (userId && video.uploaderId !== userId) {
      await this.incrementViewCount(id);
    }

    return video;
  }

  async findVideosByContent(contentId: string, userId?: string): Promise<Video[]> {
    const query = this.videoRepository.createQueryBuilder('video')
      .leftJoinAndSelect('video.uploader', 'uploader')
      .where('video.contentId = :contentId', { contentId })
      .andWhere('video.status = :status', { status: VideoStatus.READY });

    if (userId) {
      query.andWhere('(video.isPublic = true OR video.uploaderId = :userId)', { userId });
    } else {
      query.andWhere('video.isPublic = true');
    }

    return query.getMany();
  }

  async findUserVideos(uploaderId: string, page = 1, limit = 20): Promise<{ videos: Video[]; total: number }> {
    const [videos, total] = await this.videoRepository.findAndCount({
      where: { uploaderId },
      relations: ['content'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { videos, total };
  }

  async updateVideo(id: string, updateData: Partial<CreateVideoDto>, userId: string): Promise<Video> {
    const video = await this.findVideoById(id);

    if (video.uploaderId !== userId) {
      throw new BadRequestException('You can only update your own videos');
    }

    Object.assign(video, updateData);
    return this.videoRepository.save(video);
  }

  async deleteVideo(id: string, userId: string): Promise<void> {
    const video = await this.findVideoById(id);

    if (video.uploaderId !== userId) {
      throw new BadRequestException('You can only delete your own videos');
    }

    // Delete files
    try {
      if (video.filePath) {
        await fs.unlink(video.filePath);
      }
      if (video.thumbnailPath) {
        await fs.unlink(video.thumbnailPath);
      }
      if (video.hlsPlaylistPath) {
        await fs.unlink(video.hlsPlaylistPath);
      }
      if (video.videoStreams) {
        for (const stream of video.videoStreams) {
          await fs.unlink(stream.filePath).catch(() => {});
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to delete video files for ${id}:`, error);
    }

    await this.videoRepository.remove(video);
    this.logger.log(`Video deleted: ${id}`);
  }

  // Progress tracking
  async updateProgress(videoId: string, userId: string, progressDto: VideoProgressDto): Promise<VideoProgress> {
    let progress = await this.progressRepository.findOne({
      where: { videoId, userId },
    });

    if (progress) {
      progress.currentTime = progressDto.currentTime;
      progress.watchTime = Math.max(progress.watchTime, progressDto.watchTime);
      progress.completed = progressDto.completed;
      progress.completionPercentage = progressDto.completed ? 100 : 
        (progressDto.currentTime / (await this.getVideoDuration(videoId))) * 100;
      progress.lastWatchedAt = new Date();
    } else {
      const video = await this.findVideoById(videoId);
      progress = this.progressRepository.create({
        videoId,
        userId,
        currentTime: progressDto.currentTime,
        watchTime: progressDto.watchTime,
        completed: progressDto.completed,
        completionPercentage: progressDto.completed ? 100 : 
          (progressDto.currentTime / video.duration) * 100,
        lastWatchedAt: new Date(),
      });
    }

    return this.progressRepository.save(progress);
  }

  async getProgress(videoId: string, userId: string): Promise<VideoProgress | null> {
    return this.progressRepository.findOne({
      where: { videoId, userId },
    });
  }

  // Bookmarks
  async createBookmark(videoId: string, userId: string, bookmarkDto: VideoBookmarkDto): Promise<VideoBookmark> {
    await this.findVideoById(videoId, userId); // Check access

    const bookmark = this.bookmarkRepository.create({
      videoId,
      userId,
      ...bookmarkDto,
    });

    return this.bookmarkRepository.save(bookmark);
  }

  async getBookmarks(videoId: string, userId: string): Promise<VideoBookmark[]> {
    await this.findVideoById(videoId, userId); // Check access

    return this.bookmarkRepository.find({
      where: { videoId, userId },
      order: { timestamp: 'ASC' },
    });
  }

  async deleteBookmark(bookmarkId: string, userId: string): Promise<void> {
    const bookmark = await this.bookmarkRepository.findOne({
      where: { id: bookmarkId, userId },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    await this.bookmarkRepository.remove(bookmark);
  }

  // Notes
  async createNote(videoId: string, userId: string, noteDto: VideoNoteDto): Promise<VideoNote> {
    await this.findVideoById(videoId, userId); // Check access

    const note = this.noteRepository.create({
      videoId,
      userId,
      ...noteDto,
    });

    return this.noteRepository.save(note);
  }

  async getNotes(videoId: string, userId: string): Promise<VideoNote[]> {
    await this.findVideoById(videoId, userId); // Check access

    return this.noteRepository.find({
      where: { videoId, userId },
      order: { timestamp: 'ASC' },
    });
  }

  async updateNote(noteId: string, userId: string, updateData: Partial<VideoNoteDto>): Promise<VideoNote> {
    const note = await this.noteRepository.findOne({
      where: { id: noteId, userId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    Object.assign(note, updateData);
    return this.noteRepository.save(note);
  }

  async deleteNote(noteId: string, userId: string): Promise<void> {
    const note = await this.noteRepository.findOne({
      where: { id: noteId, userId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    await this.noteRepository.remove(note);
  }

  // Streaming
  async getVideoStream(id: string, quality: VideoQuality, userId?: string): Promise<string> {
    const video = await this.findVideoById(id, userId);

    if (!video.videoStreams) {
      throw new NotFoundException('Video streams not available');
    }

    const stream = video.videoStreams.find(s => s.quality === quality);
    if (!stream) {
      throw new NotFoundException(`Stream quality ${quality} not available`);
    }

    return stream.filePath;
  }

  async getThumbnail(id: string, userId?: string): Promise<string> {
    const video = await this.findVideoById(id, userId);
    
    if (!video.thumbnailPath) {
      throw new NotFoundException('Thumbnail not available');
    }

    return video.thumbnailPath;
  }

  // Analytics
  async getVideoAnalytics(id: string, uploaderId: string): Promise<any> {
    const video = await this.findVideoById(id);
    
    if (video.uploaderId !== uploaderId) {
      throw new BadRequestException('Access denied');
    }

    const [totalProgress, averageProgress] = await Promise.all([
      this.progressRepository.count({ where: { videoId: id } }),
      this.progressRepository
        .createQueryBuilder('progress')
        .select('AVG(progress.completionPercentage)', 'avg')
        .where('progress.videoId = :videoId', { videoId: id })
        .getRawOne(),
    ]);

    return {
      video,
      totalViews: totalProgress,
      averageCompletionRate: averageProgress?.avg || 0,
      analytics: video.analytics,
    };
  }

  // Helper methods
  private isValidVideoFile(file: Express.Multer.File): boolean {
    const allowedMimeTypes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'video/ogg',
    ];
    
    return allowedMimeTypes.includes(file.mimetype);
  }

  private generateFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}${ext}`;
  }

  private async incrementViewCount(videoId: string): Promise<void> {
    await this.videoRepository.increment(
      { id: videoId },
      'viewCount',
      1
    );
  }

  private async getVideoDuration(videoId: string): Promise<number> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      select: ['duration'],
    });
    return video?.duration || 0;
  }
}