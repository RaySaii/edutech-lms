import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { Content, ContentProgress, ContentType, ContentStatus, ProgressStatus } from '@edutech-lms/database';
import { CreateContentDto, UpdateContentDto, ContentQueryDto } from './dto';
import {
  ResponseUtil,
  ErrorUtil,
  LoggerUtil,
  ValidationUtil,
  DatabaseUtil
} from '@edutech-lms/common';

@Injectable()
export class ContentService {
  private readonly logger = LoggerUtil.createLogger(ContentService.name);

  constructor(
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(ContentProgress)
    private progressRepository: Repository<ContentProgress>,
  ) {}

  async create(createContentDto: CreateContentDto): Promise<Content> {
    ValidationUtil.validateRequired(createContentDto, ['title', 'type', 'uploaderId']);
    ValidationUtil.validateStringLength(createContentDto.title, 'Content title', 3, 200);
    ValidationUtil.validateUUID(createContentDto.uploaderId, 'Uploader ID');
    
    if (createContentDto.courseId) {
      ValidationUtil.validateUUID(createContentDto.courseId, 'Course ID');
    }

    LoggerUtil.logWithData(this.logger, 'log', 'Creating content', { title: createContentDto.title, type: createContentDto.type });

    try {
      const content = this.contentRepository.create({
        ...createContentDto,
        status: ContentStatus.DRAFT,
      });

      const savedContent = await this.contentRepository.save(content);
      LoggerUtil.logWithData(this.logger, 'log', 'Content created successfully', { contentId: savedContent.id });
      return savedContent;
    } catch (error) {
      ErrorUtil.handleRepositoryError(error, 'Content', this.logger);
    }
  }

  async findAll(query: ContentQueryDto) {
    const { 
      page = 1, 
      limit = 10, 
      courseId, 
      type, 
      status = ContentStatus.PUBLISHED,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = query;

    const { page: validPage, limit: validLimit } = ValidationUtil.validatePagination(page, limit);
    
    if (courseId) {
      ValidationUtil.validateUUID(courseId, 'Course ID');
    }

    let queryBuilder = this.contentRepository.createQueryBuilder('content')
      .leftJoinAndSelect('content.uploader', 'uploader')
      .leftJoinAndSelect('content.course', 'course');

    // Apply status filter
    queryBuilder = DatabaseUtil.applyStatusFilter(queryBuilder, 'status', status);
    
    if (courseId) {
      queryBuilder.andWhere('content.courseId = :courseId', { courseId });
    }
    
    if (type) {
      queryBuilder = DatabaseUtil.applyStatusFilter(queryBuilder, 'type', type);
    }

    // Apply search
    if (search) {
      queryBuilder = DatabaseUtil.applySearch(queryBuilder, search, ['title', 'description']);
    }

    // Apply sorting
    const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'viewCount', 'order'];
    queryBuilder = DatabaseUtil.applySorting(queryBuilder, sortBy, sortOrder as 'ASC' | 'DESC', allowedSortFields);
    
    // Add secondary sort by order for course content
    if (courseId) {
      queryBuilder.addOrderBy('content.order', 'ASC');
    }

    const result = await DatabaseUtil.getPaginatedResults(queryBuilder, validPage, validLimit);
    
    return {
      ...result,
      data: result.data,
    };
  }

  async findOne(id: string): Promise<Content> {
    ValidationUtil.validateUUID(id, 'Content ID');

    const content = await DatabaseUtil.findWithRelations(
      this.contentRepository,
      id,
      ['uploader', 'course']
    );

    ErrorUtil.checkExists(content, 'Content', id);
    return content;
  }

  async findByIds(ids: string[]): Promise<Content[]> {
    return this.contentRepository.find({
      where: { id: In(ids) },
      relations: ['uploader', 'course'],
    });
  }

  async update(id: string, updateContentDto: UpdateContentDto): Promise<Content> {
    ValidationUtil.validateUUID(id, 'Content ID');
    
    if (updateContentDto.title) {
      ValidationUtil.validateStringLength(updateContentDto.title, 'Content title', 3, 200);
    }

    const content = await this.findOne(id);
    
    try {
      Object.assign(content, updateContentDto);
      const updatedContent = await this.contentRepository.save(content);
      LoggerUtil.logWithData(this.logger, 'log', 'Content updated', { contentId: id });
      return updatedContent;
    } catch (error) {
      ErrorUtil.handleRepositoryError(error, 'Content', this.logger);
    }
  }

  async remove(id: string): Promise<void> {
    ValidationUtil.validateUUID(id, 'Content ID');
    
    const content = await this.findOne(id);
    await this.contentRepository.remove(content);
    LoggerUtil.logWithData(this.logger, 'log', 'Content deleted', { contentId: id, title: content.title });
  }

  async publish(id: string): Promise<Content> {
    ValidationUtil.validateUUID(id, 'Content ID');
    
    const content = await this.findOne(id);
    
    if (content.status === ContentStatus.PUBLISHED) {
      ErrorUtil.throwBadRequest('Content is already published');
    }

    try {
      content.status = ContentStatus.PUBLISHED;
      const publishedContent = await this.contentRepository.save(content);
      LoggerUtil.logWithData(this.logger, 'log', 'Content published', { contentId: id });
      return publishedContent;
    } catch (error) {
      ErrorUtil.handleRepositoryError(error, 'Content', this.logger);
    }
  }

  async archive(id: string): Promise<Content> {
    const content = await this.findOne(id);
    content.status = ContentStatus.ARCHIVED;
    return this.contentRepository.save(content);
  }

  // Content interaction methods
  async incrementViewCount(id: string): Promise<void> {
    await this.contentRepository.increment({ id }, 'viewCount', 1);
  }

  async incrementDownloadCount(id: string): Promise<void> {
    await this.contentRepository.increment({ id }, 'downloadCount', 1);
  }

  // Progress tracking methods
  async getContentProgress(contentId: string, userId: string): Promise<ContentProgress> {
    let progress = await this.progressRepository.findOne({
      where: { contentId, userId },
      relations: ['content', 'user'],
    });

    if (!progress) {
      // Create initial progress record
      progress = this.progressRepository.create({
        contentId,
        userId,
        status: ProgressStatus.NOT_STARTED,
        completionPercentage: 0,
      });
      await this.progressRepository.save(progress);
    }

    return progress;
  }

  async updateProgress(
    contentId: string, 
    userId: string, 
    progressData: {
      completionPercentage?: number;
      currentPosition?: number;
      timeSpent?: number;
      status?: ProgressStatus;
      notes?: Record<string, any>;
    }
  ): Promise<ContentProgress> {
    let progress = await this.progressRepository.findOne({
      where: { contentId, userId },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        contentId,
        userId,
        status: ProgressStatus.NOT_STARTED,
        completionPercentage: 0,
      });
    }

    // Update progress data
    Object.assign(progress, progressData);
    progress.lastAccessedAt = new Date();
    progress.viewCount += 1;

    // Auto-update status based on completion percentage
    if (progressData.completionPercentage !== undefined) {
      if (progressData.completionPercentage >= 100) {
        progress.status = ProgressStatus.COMPLETED;
      } else if (progressData.completionPercentage > 0) {
        progress.status = ProgressStatus.IN_PROGRESS;
      }
    }

    return this.progressRepository.save(progress);
  }

  async getUserProgress(userId: string, courseId?: string) {
    const queryBuilder = this.progressRepository.createQueryBuilder('progress')
      .leftJoinAndSelect('progress.content', 'content')
      .leftJoinAndSelect('content.course', 'course')
      .where('progress.userId = :userId', { userId });

    if (courseId) {
      queryBuilder.andWhere('content.courseId = :courseId', { courseId });
    }

    const progressRecords = await queryBuilder.getMany();

    return {
      totalContent: progressRecords.length,
      completed: progressRecords.filter(p => p.isCompleted).length,
      inProgress: progressRecords.filter(p => p.isInProgress).length,
      notStarted: progressRecords.filter(p => p.status === ProgressStatus.NOT_STARTED).length,
      progress: progressRecords,
    };
  }

  async toggleBookmark(contentId: string, userId: string): Promise<ContentProgress> {
    const progress = await this.getContentProgress(contentId, userId);
    progress.isBookmarked = !progress.isBookmarked;
    return this.progressRepository.save(progress);
  }

  async getUserBookmarks(userId: string) {
    const bookmarks = await this.progressRepository.find({
      where: { userId, isBookmarked: true },
      relations: ['content', 'content.course'],
      order: { updatedAt: 'DESC' },
    });

    return bookmarks.map(bookmark => bookmark.content);
  }

}