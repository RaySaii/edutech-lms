import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { 
  VideoPlaylist, 
  VideoPlaylistItem, 
  VideoPlaylistProgress, 
  VideoPlaylistRating,
  Video,
  User,
  Course
} from '@edutech-lms/database';

export interface CreatePlaylistDto {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
  courseId?: string;
  tags?: string[];
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  settings?: {
    autoPlay?: boolean;
    allowSkipping?: boolean;
    enforceOrder?: boolean;
    showProgress?: boolean;
    allowDownload?: boolean;
    requireCompletion?: boolean;
  };
  metadata?: {
    objectives?: string[];
    prerequisites?: string[];
    targetAudience?: string[];
    estimatedCompletionTime?: number;
  };
}

export interface UpdatePlaylistDto extends Partial<CreatePlaylistDto> {}

export interface AddVideoToPlaylistDto {
  videoId: string;
  customTitle?: string;
  customDescription?: string;
  isRequired?: boolean;
  isVisible?: boolean;
  unlockAfterSeconds?: number;
  settings?: {
    startTime?: number;
    endTime?: number;
    skipIntro?: boolean;
    skipOutro?: boolean;
    customThumbnail?: string;
  };
}

export interface UpdatePlaylistItemDto extends Partial<AddVideoToPlaylistDto> {
  order?: number;
}

@Injectable()
export class VideoPlaylistService {
  private readonly logger = new Logger(VideoPlaylistService.name);

  constructor(
    @InjectRepository(VideoPlaylist)
    private playlistRepository: Repository<VideoPlaylist>,
    @InjectRepository(VideoPlaylistItem)
    private playlistItemRepository: Repository<VideoPlaylistItem>,
    @InjectRepository(VideoPlaylistProgress)
    private playlistProgressRepository: Repository<VideoPlaylistProgress>,
    @InjectRepository(VideoPlaylistRating)
    private playlistRatingRepository: Repository<VideoPlaylistRating>,
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    private entityManager: EntityManager,
  ) {}

  async createPlaylist(createDto: CreatePlaylistDto, creatorId: string): Promise<VideoPlaylist> {
    // Validate course if provided
    if (createDto.courseId) {
      const course = await this.courseRepository.findOne({
        where: { id: createDto.courseId }
      });
      if (!course) {
        throw new NotFoundException(`Course ${createDto.courseId} not found`);
      }
    }

    const playlist = this.playlistRepository.create({
      ...createDto,
      creatorId,
      settings: {
        autoPlay: true,
        allowSkipping: true,
        enforceOrder: false,
        showProgress: true,
        allowDownload: false,
        requireCompletion: false,
        ...createDto.settings,
      },
      metadata: {
        objectives: [],
        prerequisites: [],
        targetAudience: [],
        estimatedCompletionTime: 0,
        ...createDto.metadata,
      },
    });

    const savedPlaylist = await this.playlistRepository.save(playlist);
    this.logger.log(`Playlist created: ${savedPlaylist.id} by user ${creatorId}`);

    return savedPlaylist;
  }

  async getPlaylistById(playlistId: string, userId?: string): Promise<VideoPlaylist> {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId },
      relations: ['creator', 'course', 'items'],
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist ${playlistId} not found`);
    }

    // Check visibility permissions
    if (!playlist.isPublic && playlist.creatorId !== userId) {
      throw new ForbiddenException('Access denied to private playlist');
    }

    // Load videos for playlist items
    if (playlist.items && playlist.items.length > 0) {
      const videoIds = playlist.items.map(item => item.videoId);
      const videos = await this.videoRepository.findBy({ 
        id: { in: videoIds } as any 
      });

      // Sort items by order and attach video data
      playlist.items.sort((a, b) => a.order - b.order);
      (playlist as any).videos = playlist.items.map(item => ({
        ...item,
        video: videos.find(v => v.id === item.videoId),
      }));
    }

    // Load user progress if userId provided
    if (userId) {
      const progress = await this.getUserProgress(playlistId, userId);
      (playlist as any).userProgress = progress;
    }

    return playlist;
  }

  async getPlaylists(
    page: number = 1,
    limit: number = 20,
    filters: {
      creatorId?: string;
      courseId?: string;
      category?: string;
      difficulty?: string;
      isPublic?: boolean;
      isFeatured?: boolean;
      search?: string;
    } = {}
  ): Promise<{ playlists: VideoPlaylist[]; total: number }> {
    const query = this.playlistRepository.createQueryBuilder('playlist')
      .leftJoinAndSelect('playlist.creator', 'creator')
      .leftJoinAndSelect('playlist.course', 'course');

    // Apply filters
    if (filters.creatorId) {
      query.andWhere('playlist.creatorId = :creatorId', { creatorId: filters.creatorId });
    }

    if (filters.courseId) {
      query.andWhere('playlist.courseId = :courseId', { courseId: filters.courseId });
    }

    if (filters.category) {
      query.andWhere('playlist.category = :category', { category: filters.category });
    }

    if (filters.difficulty) {
      query.andWhere('playlist.difficulty = :difficulty', { difficulty: filters.difficulty });
    }

    if (filters.isPublic !== undefined) {
      query.andWhere('playlist.isPublic = :isPublic', { isPublic: filters.isPublic });
    }

    if (filters.isFeatured !== undefined) {
      query.andWhere('playlist.isFeatured = :isFeatured', { isFeatured: filters.isFeatured });
    }

    if (filters.search) {
      query.andWhere(
        '(playlist.title ILIKE :search OR playlist.description ILIKE :search OR playlist.tags::text ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // Pagination
    const total = await query.getCount();
    const playlists = await query
      .orderBy('playlist.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { playlists, total };
  }

  async updatePlaylist(
    playlistId: string, 
    updateDto: UpdatePlaylistDto, 
    userId: string
  ): Promise<VideoPlaylist> {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId }
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist ${playlistId} not found`);
    }

    if (playlist.creatorId !== userId) {
      throw new ForbiddenException('Only playlist creator can update playlist');
    }

    // Validate course if being updated
    if (updateDto.courseId) {
      const course = await this.courseRepository.findOne({
        where: { id: updateDto.courseId }
      });
      if (!course) {
        throw new NotFoundException(`Course ${updateDto.courseId} not found`);
      }
    }

    Object.assign(playlist, updateDto);
    
    if (updateDto.settings) {
      playlist.settings = { ...playlist.settings, ...updateDto.settings };
    }

    if (updateDto.metadata) {
      playlist.metadata = { ...playlist.metadata, ...updateDto.metadata };
    }

    const updatedPlaylist = await this.playlistRepository.save(playlist);
    this.logger.log(`Playlist updated: ${playlistId} by user ${userId}`);

    return updatedPlaylist;
  }

  async deletePlaylist(playlistId: string, userId: string): Promise<void> {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId }
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist ${playlistId} not found`);
    }

    if (playlist.creatorId !== userId) {
      throw new ForbiddenException('Only playlist creator can delete playlist');
    }

    await this.playlistRepository.remove(playlist);
    this.logger.log(`Playlist deleted: ${playlistId} by user ${userId}`);
  }

  async addVideoToPlaylist(
    playlistId: string, 
    addVideoDto: AddVideoToPlaylistDto, 
    userId: string
  ): Promise<VideoPlaylistItem> {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId }
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist ${playlistId} not found`);
    }

    if (playlist.creatorId !== userId) {
      throw new ForbiddenException('Only playlist creator can add videos');
    }

    // Validate video exists
    const video = await this.videoRepository.findOne({
      where: { id: addVideoDto.videoId }
    });

    if (!video) {
      throw new NotFoundException(`Video ${addVideoDto.videoId} not found`);
    }

    // Check if video is already in playlist
    const existingItem = await this.playlistItemRepository.findOne({
      where: { playlistId, videoId: addVideoDto.videoId }
    });

    if (existingItem) {
      throw new BadRequestException('Video is already in playlist');
    }

    // Get next order number
    const maxOrder = await this.playlistItemRepository
      .createQueryBuilder('item')
      .select('MAX(item.order)', 'maxOrder')
      .where('item.playlistId = :playlistId', { playlistId })
      .getRawOne();

    const nextOrder = (maxOrder?.maxOrder || 0) + 1;

    const playlistItem = this.playlistItemRepository.create({
      playlistId,
      videoId: addVideoDto.videoId,
      order: nextOrder,
      customTitle: addVideoDto.customTitle,
      customDescription: addVideoDto.customDescription,
      isRequired: addVideoDto.isRequired || false,
      isVisible: addVideoDto.isVisible !== false,
      unlockAfterSeconds: addVideoDto.unlockAfterSeconds,
      settings: addVideoDto.settings || {},
    });

    const savedItem = await this.playlistItemRepository.save(playlistItem);

    // Update playlist statistics
    await this.updatePlaylistStatistics(playlistId);

    this.logger.log(`Video ${addVideoDto.videoId} added to playlist ${playlistId}`);
    return savedItem;
  }

  async removeVideoFromPlaylist(
    playlistId: string, 
    itemId: string, 
    userId: string
  ): Promise<void> {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId }
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist ${playlistId} not found`);
    }

    if (playlist.creatorId !== userId) {
      throw new ForbiddenException('Only playlist creator can remove videos');
    }

    const item = await this.playlistItemRepository.findOne({
      where: { id: itemId, playlistId }
    });

    if (!item) {
      throw new NotFoundException(`Playlist item ${itemId} not found`);
    }

    await this.playlistItemRepository.remove(item);

    // Reorder remaining items
    await this.reorderPlaylistItems(playlistId, item.order);

    // Update playlist statistics
    await this.updatePlaylistStatistics(playlistId);

    this.logger.log(`Video removed from playlist ${playlistId}: item ${itemId}`);
  }

  async reorderPlaylistItems(playlistId: string, removedOrder?: number): Promise<void> {
    const items = await this.playlistItemRepository.find({
      where: { playlistId },
      order: { order: 'ASC' }
    });

    // If we're reordering after removal, shift items down
    if (removedOrder !== undefined) {
      for (const item of items) {
        if (item.order > removedOrder) {
          item.order -= 1;
          await this.playlistItemRepository.save(item);
        }
      }
    } else {
      // Full reorder
      for (let i = 0; i < items.length; i++) {
        if (items[i].order !== i + 1) {
          items[i].order = i + 1;
          await this.playlistItemRepository.save(items[i]);
        }
      }
    }
  }

  async updatePlaylistItemOrder(
    playlistId: string,
    itemId: string,
    newOrder: number,
    userId: string
  ): Promise<void> {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId }
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist ${playlistId} not found`);
    }

    if (playlist.creatorId !== userId) {
      throw new ForbiddenException('Only playlist creator can reorder items');
    }

    const item = await this.playlistItemRepository.findOne({
      where: { id: itemId, playlistId }
    });

    if (!item) {
      throw new NotFoundException(`Playlist item ${itemId} not found`);
    }

    const oldOrder = item.order;
    
    // Update orders of affected items
    if (newOrder > oldOrder) {
      // Moving down: shift items up
      await this.playlistItemRepository
        .createQueryBuilder()
        .update()
        .set({ order: () => 'order - 1' })
        .where('playlistId = :playlistId AND order > :oldOrder AND order <= :newOrder', {
          playlistId,
          oldOrder,
          newOrder
        })
        .execute();
    } else {
      // Moving up: shift items down
      await this.playlistItemRepository
        .createQueryBuilder()
        .update()
        .set({ order: () => 'order + 1' })
        .where('playlistId = :playlistId AND order >= :newOrder AND order < :oldOrder', {
          playlistId,
          oldOrder,
          newOrder
        })
        .execute();
    }

    // Update the moved item
    item.order = newOrder;
    await this.playlistItemRepository.save(item);

    this.logger.log(`Playlist item ${itemId} moved from position ${oldOrder} to ${newOrder}`);
  }

  async getUserProgress(playlistId: string, userId: string): Promise<VideoPlaylistProgress | null> {
    return this.playlistProgressRepository.findOne({
      where: { playlistId, userId },
      relations: ['playlist']
    });
  }

  async updateUserProgress(
    playlistId: string,
    userId: string,
    videoId: string,
    completed: boolean,
    watchTime: number
  ): Promise<VideoPlaylistProgress> {
    let progress = await this.getUserProgress(playlistId, userId);

    if (!progress) {
      progress = this.playlistProgressRepository.create({
        playlistId,
        userId,
        currentVideoId: videoId,
        videoProgress: []
      });
    }

    // Update video progress
    const videoProgress = progress.videoProgress || [];
    const existingVideoProgress = videoProgress.find(vp => vp.videoId === videoId);

    if (existingVideoProgress) {
      existingVideoProgress.completed = completed;
      existingVideoProgress.watchTime = Math.max(existingVideoProgress.watchTime, watchTime);
      if (completed && !existingVideoProgress.completedAt) {
        existingVideoProgress.completedAt = new Date();
      }
    } else {
      videoProgress.push({
        videoId,
        completed,
        watchTime,
        completedAt: completed ? new Date() : undefined
      });
    }

    progress.videoProgress = videoProgress;
    progress.lastWatchedAt = new Date();
    progress.currentVideoId = videoId;

    // Calculate overall progress
    const completedVideos = videoProgress.filter(vp => vp.completed).length;
    const totalVideos = await this.playlistItemRepository.count({
      where: { playlistId }
    });

    progress.completedVideos = completedVideos;
    progress.totalWatchTime = videoProgress.reduce((total, vp) => total + vp.watchTime, 0);
    progress.progressPercentage = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;

    // Check if playlist is completed
    if (!progress.isCompleted && completedVideos === totalVideos && totalVideos > 0) {
      progress.isCompleted = true;
      progress.completedAt = new Date();
    }

    const savedProgress = await this.playlistProgressRepository.save(progress);
    this.logger.log(`Progress updated for user ${userId} in playlist ${playlistId}: ${progress.progressPercentage}%`);

    return savedProgress;
  }

  async ratePlaylist(
    playlistId: string,
    userId: string,
    rating: number,
    review?: string
  ): Promise<VideoPlaylistRating> {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId }
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist ${playlistId} not found`);
    }

    // Check if user already rated this playlist
    let existingRating = await this.playlistRatingRepository.findOne({
      where: { playlistId, userId }
    });

    if (existingRating) {
      existingRating.rating = rating;
      existingRating.review = review;
      const updatedRating = await this.playlistRatingRepository.save(existingRating);
      
      // Update playlist rating statistics
      await this.updatePlaylistRating(playlistId);
      
      return updatedRating;
    } else {
      const newRating = this.playlistRatingRepository.create({
        playlistId,
        userId,
        rating,
        review
      });
      
      const savedRating = await this.playlistRatingRepository.save(newRating);
      
      // Update playlist rating statistics
      await this.updatePlaylistRating(playlistId);
      
      return savedRating;
    }
  }

  private async updatePlaylistStatistics(playlistId: string): Promise<void> {
    const items = await this.playlistItemRepository.find({
      where: { playlistId }
    });

    const videoIds = items.map(item => item.videoId);
    let totalDuration = 0;

    if (videoIds.length > 0) {
      const videos = await this.videoRepository.findBy({ 
        id: { in: videoIds } as any 
      });
      totalDuration = videos.reduce((sum, video) => sum + (video.duration || 0), 0);
    }

    await this.playlistRepository.update(playlistId, {
      videoCount: items.length,
      totalDuration
    });
  }

  private async updatePlaylistRating(playlistId: string): Promise<void> {
    const ratings = await this.playlistRatingRepository.find({
      where: { playlistId }
    });

    if (ratings.length === 0) {
      await this.playlistRepository.update(playlistId, {
        rating: null,
        ratingCount: 0
      });
      return;
    }

    const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    const averageRating = totalRating / ratings.length;

    await this.playlistRepository.update(playlistId, {
      rating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
      ratingCount: ratings.length
    });
  }

  async getPlaylistStatistics(playlistId: string): Promise<{
    totalViews: number;
    uniqueViewers: number;
    completionRate: number;
    averageWatchTime: number;
    dropOffPoints: Array<{ videoIndex: number; dropOffRate: number }>;
  }> {
    const progressRecords = await this.playlistProgressRepository.find({
      where: { playlistId }
    });

    const totalViews = progressRecords.length;
    const uniqueViewers = new Set(progressRecords.map(p => p.userId)).size;
    const completedCount = progressRecords.filter(p => p.isCompleted).length;
    const completionRate = totalViews > 0 ? (completedCount / totalViews) * 100 : 0;
    const averageWatchTime = progressRecords.reduce((sum, p) => sum + p.totalWatchTime, 0) / totalViews || 0;

    // Calculate drop-off points
    const items = await this.playlistItemRepository.find({
      where: { playlistId },
      order: { order: 'ASC' }
    });

    const dropOffPoints = items.map((item, index) => {
      const completedAtThisVideo = progressRecords.filter(p => 
        p.videoProgress?.some(vp => vp.videoId === item.videoId && vp.completed)
      ).length;
      
      const dropOffRate = totalViews > 0 ? ((totalViews - completedAtThisVideo) / totalViews) * 100 : 0;
      
      return {
        videoIndex: index,
        dropOffRate
      };
    });

    return {
      totalViews,
      uniqueViewers,
      completionRate,
      averageWatchTime,
      dropOffPoints
    };
  }
}