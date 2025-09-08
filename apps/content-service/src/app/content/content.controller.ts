import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ContentService } from './content.service';
import { CreateContentDto, UpdateContentDto, ContentQueryDto } from './dto';

@Controller()
export class ContentController {
  private readonly logger = new Logger(ContentController.name);

  constructor(private readonly contentService: ContentService) {}

  @MessagePattern({ cmd: 'create_content' })
  async create(@Payload() createContentDto: CreateContentDto) {
    this.logger.log('Creating content via microservice');
    return this.contentService.create(createContentDto);
  }

  @MessagePattern({ cmd: 'find_all_content' })
  async findAll(@Payload() query: ContentQueryDto) {
    this.logger.log('Finding all content via microservice');
    return this.contentService.findAll(query);
  }

  @MessagePattern({ cmd: 'find_content_by_id' })
  async findOne(@Payload() { id }: { id: string }) {
    this.logger.log(`Finding content by ID: ${id}`);
    return this.contentService.findOne(id);
  }

  @MessagePattern({ cmd: 'find_content_by_ids' })
  async findByIds(@Payload() { ids }: { ids: string[] }) {
    this.logger.log(`Finding content by IDs: ${ids.join(', ')}`);
    return this.contentService.findByIds(ids);
  }

  @MessagePattern({ cmd: 'update_content' })
  async update(@Payload() { id, updateContentDto }: { id: string; updateContentDto: UpdateContentDto }) {
    this.logger.log(`Updating content: ${id}`);
    return this.contentService.update(id, updateContentDto);
  }

  @MessagePattern({ cmd: 'delete_content' })
  async remove(@Payload() { id }: { id: string }) {
    this.logger.log(`Deleting content: ${id}`);
    await this.contentService.remove(id);
    return { success: true, message: 'Content deleted successfully' };
  }

  @MessagePattern({ cmd: 'publish_content' })
  async publish(@Payload() { id }: { id: string }) {
    this.logger.log(`Publishing content: ${id}`);
    return this.contentService.publish(id);
  }

  @MessagePattern({ cmd: 'archive_content' })
  async archive(@Payload() { id }: { id: string }) {
    this.logger.log(`Archiving content: ${id}`);
    return this.contentService.archive(id);
  }

  @MessagePattern({ cmd: 'increment_view_count' })
  async incrementViewCount(@Payload() { id }: { id: string }) {
    this.logger.log(`Incrementing view count for content: ${id}`);
    await this.contentService.incrementViewCount(id);
    return { success: true };
  }

  @MessagePattern({ cmd: 'increment_download_count' })
  async incrementDownloadCount(@Payload() { id }: { id: string }) {
    this.logger.log(`Incrementing download count for content: ${id}`);
    await this.contentService.incrementDownloadCount(id);
    return { success: true };
  }

  // Progress tracking endpoints
  @MessagePattern({ cmd: 'get_content_progress' })
  async getContentProgress(@Payload() { contentId, userId }: { contentId: string; userId: string }) {
    this.logger.log(`Getting progress for content: ${contentId}, user: ${userId}`);
    return this.contentService.getContentProgress(contentId, userId);
  }

  @MessagePattern({ cmd: 'update_content_progress' })
  async updateProgress(
    @Payload() { 
      contentId, 
      userId, 
      progressData 
    }: { 
      contentId: string; 
      userId: string; 
      progressData: {
        completionPercentage?: number;
        currentPosition?: number;
        timeSpent?: number;
        status?: any;
        notes?: Record<string, any>;
      }
    }
  ) {
    this.logger.log(`Updating progress for content: ${contentId}, user: ${userId}`);
    return this.contentService.updateProgress(contentId, userId, progressData);
  }

  @MessagePattern({ cmd: 'get_user_progress' })
  async getUserProgress(@Payload() { userId, courseId }: { userId: string; courseId?: string }) {
    this.logger.log(`Getting user progress for user: ${userId}, course: ${courseId || 'all'}`);
    return this.contentService.getUserProgress(userId, courseId);
  }

  @MessagePattern({ cmd: 'toggle_content_bookmark' })
  async toggleBookmark(@Payload() { contentId, userId }: { contentId: string; userId: string }) {
    this.logger.log(`Toggling bookmark for content: ${contentId}, user: ${userId}`);
    return this.contentService.toggleBookmark(contentId, userId);
  }

  @MessagePattern({ cmd: 'get_user_bookmarks' })
  async getUserBookmarks(@Payload() { userId }: { userId: string }) {
    this.logger.log(`Getting bookmarks for user: ${userId}`);
    return this.contentService.getUserBookmarks(userId);
  }

}