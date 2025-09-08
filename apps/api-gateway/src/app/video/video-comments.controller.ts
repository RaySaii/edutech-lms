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
  VideoCommentsService,
  CreateCommentDto,
  CreateThreadDto,
  UpdateCommentDto,
  ReportCommentDto
} from './video-comments.service';
import { Request } from 'express';

@ApiTags('Video Comments')
@Controller('videos/:videoId/comments')
@UseGuards(JwtAuthGuard)
export class VideoCommentsController {
  constructor(private readonly commentsService: VideoCommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create comment on video' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  async createComment(
    @Param('videoId') videoId: string,
    @Body() createDto: CreateCommentDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.commentsService.createComment(videoId, createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get comments for video' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['newest', 'oldest', 'popular', 'timestamp'] })
  async getComments(
    @Param('videoId') videoId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('sortBy') sortBy: 'newest' | 'oldest' | 'popular' | 'timestamp' = 'newest',
  ) {
    return this.commentsService.getVideoComments(videoId, page, limit, sortBy);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search comments in video' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchComments(
    @Param('videoId') videoId: string,
    @Query('q') searchTerm: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.commentsService.searchComments(videoId, searchTerm, page, limit);
  }

  @Get('timestamp/:timestamp')
  @ApiOperation({ summary: 'Get comments at specific video timestamp' })
  @ApiQuery({ name: 'tolerance', required: false, type: Number, description: 'Time tolerance in seconds (default: 5)' })
  async getCommentsAtTimestamp(
    @Param('videoId') videoId: string,
    @Param('timestamp') timestamp: number,
    @Query('tolerance') tolerance: number = 5,
  ) {
    return this.commentsService.getCommentsAtTimestamp(videoId, timestamp, tolerance);
  }

  @Get(':commentId/replies')
  @ApiOperation({ summary: 'Get replies to comment' })
  async getCommentReplies(
    @Param('commentId') commentId: string,
  ) {
    return this.commentsService.getCommentReplies(commentId);
  }

  @Put(':commentId')
  @ApiOperation({ summary: 'Update comment' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() updateDto: UpdateCommentDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.commentsService.updateComment(commentId, updateDto, userId);
  }

  @Delete(':commentId')
  @ApiOperation({ summary: 'Delete comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  async deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    await this.commentsService.deleteComment(commentId, userId);
    return { message: 'Comment deleted successfully' };
  }

  @Post(':commentId/reactions')
  @ApiOperation({ summary: 'React to comment' })
  @ApiResponse({ status: 201, description: 'Reaction added successfully' })
  async reactToComment(
    @Param('commentId') commentId: string,
    @Body('type') reactionType: 'like' | 'dislike' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry',
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    await this.commentsService.reactToComment(commentId, userId, reactionType);
    return { message: 'Reaction updated successfully' };
  }

  @Post(':commentId/report')
  @ApiOperation({ summary: 'Report comment' })
  @ApiResponse({ status: 201, description: 'Comment reported successfully' })
  async reportComment(
    @Param('commentId') commentId: string,
    @Body() reportDto: ReportCommentDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.commentsService.reportComment(commentId, userId, reportDto);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get comment statistics for video' })
  async getCommentStatistics(
    @Param('videoId') videoId: string,
  ) {
    return this.commentsService.getCommentStatistics(videoId);
  }

  // Discussion Threads
  @Post('threads')
  @ApiOperation({ summary: 'Create discussion thread' })
  @ApiResponse({ status: 201, description: 'Thread created successfully' })
  async createThread(
    @Param('videoId') videoId: string,
    @Body() createDto: CreateThreadDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.commentsService.createDiscussionThread(videoId, createDto, userId);
  }

  @Get('threads')
  @ApiOperation({ summary: 'Get discussion threads for video' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['newest', 'oldest', 'popular', 'timestamp'] })
  async getThreads(
    @Param('videoId') videoId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('sortBy') sortBy: 'newest' | 'oldest' | 'popular' | 'timestamp' = 'newest',
  ) {
    return this.commentsService.getVideoThreads(videoId, page, limit, sortBy);
  }

  @Post('threads/:threadId/comments')
  @ApiOperation({ summary: 'Add comment to discussion thread' })
  @ApiResponse({ status: 201, description: 'Thread comment added successfully' })
  async addThreadComment(
    @Param('threadId') threadId: string,
    @Body('content') content: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.commentsService.addThreadComment(threadId, content, userId);
  }

  @Get('threads/:threadId/comments')
  @ApiOperation({ summary: 'Get comments in discussion thread' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getThreadComments(
    @Param('threadId') threadId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.commentsService.getThreadComments(threadId, page, limit);
  }

  @Get('moderation/queue')
  @ApiOperation({ summary: 'Get moderation queue (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getModerationQueue(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    // In a real implementation, check admin permissions
    return this.commentsService.getModerationQueue(page, limit);
  }

  @Post(':commentId/moderate')
  @ApiOperation({ summary: 'Moderate comment (admin only)' })
  @ApiResponse({ status: 200, description: 'Comment moderated successfully' })
  async moderateComment(
    @Param('commentId') commentId: string,
    @Body() moderationData: { 
      action: 'approve' | 'hide' | 'delete';
      reason?: string;
    },
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    // In a real implementation, check admin/moderator permissions
    return this.commentsService.moderateComment(
      commentId,
      moderationData.action,
      userId,
      moderationData.reason
    );
  }

  @Post('batch-moderate')
  @ApiOperation({ summary: 'Batch moderate multiple comments (admin only)' })
  @ApiResponse({ status: 200, description: 'Comments moderated successfully' })
  async batchModerateComments(
    @Body() batchData: {
      commentIds: string[];
      action: 'approve' | 'hide' | 'delete';
      reason?: string;
    },
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    const results = [];

    for (const commentId of batchData.commentIds) {
      try {
        const result = await this.commentsService.moderateComment(
          commentId,
          batchData.action,
          userId,
          batchData.reason
        );
        results.push({ success: true, commentId, result });
      } catch (error) {
        results.push({ 
          success: false, 
          commentId,
          error: error.message 
        });
      }
    }

    return {
      totalComments: batchData.commentIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }
}