import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@edutech-lms/auth';
import { 
  VideoPlaylistService,
  CreatePlaylistDto,
  UpdatePlaylistDto,
  AddVideoToPlaylistDto,
  UpdatePlaylistItemDto
} from './video-playlist.service';
import { Request } from 'express';

@ApiTags('Video Playlists')
@Controller('video-playlists')
@UseGuards(JwtAuthGuard)
export class VideoPlaylistController {
  constructor(private readonly playlistService: VideoPlaylistService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new video playlist' })
  @ApiResponse({ status: 201, description: 'Playlist created successfully' })
  async createPlaylist(
    @Body() createDto: CreatePlaylistDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.playlistService.createPlaylist(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get playlists with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'creatorId', required: false, type: String })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'difficulty', required: false, type: String })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getPlaylists(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('creatorId') creatorId?: string,
    @Query('courseId') courseId?: string,
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('isPublic') isPublic?: boolean,
    @Query('isFeatured') isFeatured?: boolean,
    @Query('search') search?: string,
  ) {
    const filters = {
      creatorId,
      courseId,
      category,
      difficulty,
      isPublic,
      isFeatured,
      search,
    };

    return this.playlistService.getPlaylists(page, limit, filters);
  }

  @Get('my-playlists')
  @ApiOperation({ summary: 'Get current user\'s playlists' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyPlaylists(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = req.user?.['sub'];
    return this.playlistService.getPlaylists(page, limit, { creatorId: userId });
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured playlists' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFeaturedPlaylists(@Query('limit') limit: number = 10) {
    return this.playlistService.getPlaylists(1, limit, { 
      isFeatured: true, 
      isPublic: true 
    });
  }

  @Get(':playlistId')
  @ApiOperation({ summary: 'Get playlist by ID' })
  async getPlaylistById(
    @Param('playlistId') playlistId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.playlistService.getPlaylistById(playlistId, userId);
  }

  @Put(':playlistId')
  @ApiOperation({ summary: 'Update playlist' })
  @ApiResponse({ status: 200, description: 'Playlist updated successfully' })
  async updatePlaylist(
    @Param('playlistId') playlistId: string,
    @Body() updateDto: UpdatePlaylistDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.playlistService.updatePlaylist(playlistId, updateDto, userId);
  }

  @Delete(':playlistId')
  @ApiOperation({ summary: 'Delete playlist' })
  @ApiResponse({ status: 200, description: 'Playlist deleted successfully' })
  async deletePlaylist(
    @Param('playlistId') playlistId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    await this.playlistService.deletePlaylist(playlistId, userId);
    return { message: 'Playlist deleted successfully' };
  }

  @Post(':playlistId/videos')
  @ApiOperation({ summary: 'Add video to playlist' })
  @ApiResponse({ status: 201, description: 'Video added to playlist successfully' })
  async addVideoToPlaylist(
    @Param('playlistId') playlistId: string,
    @Body() addVideoDto: AddVideoToPlaylistDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.playlistService.addVideoToPlaylist(playlistId, addVideoDto, userId);
  }

  @Delete(':playlistId/items/:itemId')
  @ApiOperation({ summary: 'Remove video from playlist' })
  @ApiResponse({ status: 200, description: 'Video removed from playlist successfully' })
  async removeVideoFromPlaylist(
    @Param('playlistId') playlistId: string,
    @Param('itemId') itemId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    await this.playlistService.removeVideoFromPlaylist(playlistId, itemId, userId);
    return { message: 'Video removed from playlist successfully' };
  }

  @Put(':playlistId/items/:itemId/order')
  @ApiOperation({ summary: 'Update playlist item order' })
  @ApiResponse({ status: 200, description: 'Item order updated successfully' })
  async updateItemOrder(
    @Param('playlistId') playlistId: string,
    @Param('itemId') itemId: string,
    @Body('newOrder') newOrder: number,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    await this.playlistService.updatePlaylistItemOrder(playlistId, itemId, newOrder, userId);
    return { message: 'Item order updated successfully' };
  }

  @Get(':playlistId/progress')
  @ApiOperation({ summary: 'Get user progress for playlist' })
  async getPlaylistProgress(
    @Param('playlistId') playlistId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.playlistService.getUserProgress(playlistId, userId);
  }

  @Post(':playlistId/progress/:videoId')
  @ApiOperation({ summary: 'Update user progress for a video in playlist' })
  async updateVideoProgress(
    @Param('playlistId') playlistId: string,
    @Param('videoId') videoId: string,
    @Body() progressData: { completed: boolean; watchTime: number },
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.playlistService.updateUserProgress(
      playlistId,
      userId,
      videoId,
      progressData.completed,
      progressData.watchTime
    );
  }

  @Post(':playlistId/rating')
  @ApiOperation({ summary: 'Rate and review playlist' })
  @ApiResponse({ status: 201, description: 'Rating submitted successfully' })
  async ratePlaylist(
    @Param('playlistId') playlistId: string,
    @Body() ratingData: { rating: number; review?: string },
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.playlistService.ratePlaylist(
      playlistId,
      userId,
      ratingData.rating,
      ratingData.review
    );
  }

  @Get(':playlistId/statistics')
  @ApiOperation({ summary: 'Get playlist analytics and statistics' })
  async getPlaylistStatistics(
    @Param('playlistId') playlistId: string,
    @Req() req: Request,
  ) {
    // In a real implementation, you'd check if the user has permission to view statistics
    // For now, we'll allow playlist creators and admins
    return this.playlistService.getPlaylistStatistics(playlistId);
  }

  @Post(':playlistId/duplicate')
  @ApiOperation({ summary: 'Duplicate playlist' })
  @ApiResponse({ status: 201, description: 'Playlist duplicated successfully' })
  async duplicatePlaylist(
    @Param('playlistId') playlistId: string,
    @Body() duplicateData: { title?: string; isPublic?: boolean },
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    
    // Get original playlist
    const originalPlaylist = await this.playlistService.getPlaylistById(playlistId, userId);
    
    // Create new playlist with similar data
    const createDto: CreatePlaylistDto = {
      title: duplicateData.title || `Copy of ${originalPlaylist.title}`,
      description: originalPlaylist.description,
      category: originalPlaylist.category,
      difficulty: originalPlaylist.difficulty as any,
      tags: originalPlaylist.tags,
      isPublic: duplicateData.isPublic || false,
      settings: originalPlaylist.settings,
      metadata: originalPlaylist.metadata,
    };

    const newPlaylist = await this.playlistService.createPlaylist(createDto, userId);

    // Add all videos from original playlist
    if (originalPlaylist.items) {
      for (const item of originalPlaylist.items) {
        await this.playlistService.addVideoToPlaylist(
          newPlaylist.id,
          {
            videoId: item.videoId,
            customTitle: item.customTitle,
            customDescription: item.customDescription,
            isRequired: item.isRequired,
            isVisible: item.isVisible,
            unlockAfterSeconds: item.unlockAfterSeconds,
            settings: item.settings,
          },
          userId
        );
      }
    }

    return newPlaylist;
  }

  @Get('course/:courseId/playlists')
  @ApiOperation({ summary: 'Get playlists for a specific course' })
  async getCoursePlaylist(
    @Param('courseId') courseId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.playlistService.getPlaylists(page, limit, { 
      courseId,
      isPublic: true 
    });
  }

  @Post('batch-create')
  @ApiOperation({ summary: 'Create multiple playlists from course structure' })
  @ApiResponse({ status: 201, description: 'Playlists created successfully' })
  async batchCreatePlaylists(
    @Body() batchData: {
      courseId: string;
      playlists: Array<{
        title: string;
        description?: string;
        videoIds: string[];
        category?: string;
        difficulty?: string;
      }>;
    },
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    const results = [];

    for (const playlistData of batchData.playlists) {
      try {
        // Create playlist
        const playlist = await this.playlistService.createPlaylist({
          title: playlistData.title,
          description: playlistData.description,
          courseId: batchData.courseId,
          category: playlistData.category,
          difficulty: playlistData.difficulty as any,
          isPublic: false,
        }, userId);

        // Add videos to playlist
        for (const videoId of playlistData.videoIds) {
          await this.playlistService.addVideoToPlaylist(
            playlist.id,
            { videoId },
            userId
          );
        }

        results.push({ success: true, playlist });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message,
          title: playlistData.title 
        });
      }
    }

    return {
      totalPlaylists: batchData.playlists.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }
}