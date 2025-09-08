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
  VideoLivestreamService,
  CreateLiveStreamDto
} from './video-livestream.service';
import { Request } from 'express';

@ApiTags('Video Live Streaming')
@Controller('livestreams')
@UseGuards(JwtAuthGuard)
export class VideoLivestreamController {
  constructor(private readonly livestreamService: VideoLivestreamService) {}

  @Post()
  @ApiOperation({ summary: 'Create new live stream' })
  @ApiResponse({ status: 201, description: 'Live stream created successfully' })
  async createLiveStream(
    @Body() createDto: CreateLiveStreamDto,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.livestreamService.createLiveStream(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get live streams' })
  @ApiQuery({ name: 'status', required: false, enum: ['scheduled', 'live', 'ended'] })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'streamerId', required: false, type: String })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLiveStreams(
    @Query('status') status?: 'scheduled' | 'live' | 'ended',
    @Query('courseId') courseId?: string,
    @Query('streamerId') streamerId?: string,
    @Query('isPublic') isPublic?: boolean,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const filters = { status, courseId, streamerId, isPublic };
    return this.livestreamService.getLiveStreams(filters, page, limit);
  }

  @Get('live')
  @ApiOperation({ summary: 'Get currently live streams' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getCurrentLiveStreams(
    @Query('limit') limit: number = 10,
  ) {
    return this.livestreamService.getLiveStreams({ status: 'live' }, 1, limit);
  }

  @Get('my-streams')
  @ApiOperation({ summary: 'Get current user\'s streams' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyStreams(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const userId = req.user?.['sub'];
    return this.livestreamService.getLiveStreams({ streamerId: userId }, page, limit);
  }

  @Get(':streamId')
  @ApiOperation({ summary: 'Get live stream details' })
  async getStreamById(
    @Param('streamId') streamId: string,
  ) {
    const stream = await this.livestreamService.getStreamById(streamId);
    if (!stream) {
      throw new NotFoundException(`Stream ${streamId} not found`);
    }
    return stream;
  }

  @Post(':streamId/start')
  @ApiOperation({ summary: 'Start live stream' })
  @ApiResponse({ status: 200, description: 'Stream started successfully' })
  async startStream(
    @Param('streamId') streamId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.livestreamService.startLiveStream(streamId, userId);
  }

  @Post(':streamId/end')
  @ApiOperation({ summary: 'End live stream' })
  @ApiResponse({ status: 200, description: 'Stream ended successfully' })
  async endStream(
    @Param('streamId') streamId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.livestreamService.endLiveStream(streamId, userId);
  }

  @Put(':streamId/settings')
  @ApiOperation({ summary: 'Update stream settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateStreamSettings(
    @Param('streamId') streamId: string,
    @Body() settings: {
      allowChat?: boolean;
      allowQuestions?: boolean;
      moderationEnabled?: boolean;
      isPublic?: boolean;
      requireAuth?: boolean;
      enableScreenShare?: boolean;
      enableWhiteboard?: boolean;
    },
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    return this.livestreamService.updateStreamSettings(streamId, userId, settings);
  }

  @Get(':streamId/messages')
  @ApiOperation({ summary: 'Get stream messages' })
  @ApiQuery({ name: 'type', required: false, enum: ['chat', 'question', 'announcement'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getStreamMessages(
    @Param('streamId') streamId: string,
    @Query('type') type?: 'chat' | 'question' | 'announcement',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    return this.livestreamService.getStreamMessages(streamId, page, limit, type);
  }

  @Post(':streamId/messages/:messageId/moderate')
  @ApiOperation({ summary: 'Moderate stream message' })
  @ApiResponse({ status: 200, description: 'Message moderated successfully' })
  async moderateMessage(
    @Param('streamId') streamId: string,
    @Param('messageId') messageId: string,
    @Body() moderationData: { 
      action: 'highlight' | 'hide' | 'delete' 
    },
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    await this.livestreamService.moderateMessage(
      streamId,
      messageId,
      userId,
      moderationData.action
    );
    return { message: 'Message moderated successfully' };
  }

  @Get(':streamId/analytics')
  @ApiOperation({ summary: 'Get stream analytics' })
  async getStreamAnalytics(
    @Param('streamId') streamId: string,
    @Req() req: Request,
  ) {
    // In a real implementation, check if user has permission to view analytics
    return this.livestreamService.getStreamAnalytics(streamId);
  }

  @Post(':streamId/record')
  @ApiOperation({ summary: 'Start/stop stream recording' })
  @ApiResponse({ status: 200, description: 'Recording toggled successfully' })
  async toggleRecording(
    @Param('streamId') streamId: string,
    @Body('action') action: 'start' | 'stop',
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    
    // Simplified recording toggle - in real implementation this would
    // integrate with streaming infrastructure
    const stream = await this.livestreamService.getStreamById(streamId);
    
    if (!stream || stream.streamerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return {
      message: `Recording ${action === 'start' ? 'started' : 'stopped'} successfully`,
      isRecording: action === 'start',
    };
  }

  @Get(':streamId/join-info')
  @ApiOperation({ summary: 'Get information needed to join stream' })
  async getJoinInfo(
    @Param('streamId') streamId: string,
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    const stream = await this.livestreamService.getStreamById(streamId);
    
    if (!stream) {
      throw new NotFoundException(`Stream ${streamId} not found`);
    }

    // Check access permissions
    if (!stream.settings.isPublic && stream.settings.requireAuth) {
      // In real implementation, check course enrollment or specific permissions
    }

    return {
      streamId: stream.id,
      title: stream.title,
      description: stream.description,
      status: stream.status,
      playbackUrl: stream.playbackUrl,
      currentViewers: stream.currentViewers,
      maxViewers: stream.maxViewers,
      settings: stream.settings,
      canJoin: stream.status === 'live' && 
              (!stream.maxViewers || stream.currentViewers < stream.maxViewers),
      permissions: {
        canChat: stream.settings.allowChat,
        canAskQuestions: stream.settings.allowQuestions,
        isModerator: userId === stream.streamerId,
        canScreenShare: stream.settings.enableScreenShare && userId === stream.streamerId,
      },
    };
  }

  @Post('scheduled')
  @ApiOperation({ summary: 'Schedule live stream for future' })
  @ApiResponse({ status: 201, description: 'Stream scheduled successfully' })
  async scheduleStream(
    @Body() scheduleData: CreateLiveStreamDto & { 
      scheduledStartTime: string;
      notifySubscribers?: boolean;
    },
    @Req() req: Request,
  ) {
    const userId = req.user?.['sub'];
    
    const createDto: CreateLiveStreamDto = {
      ...scheduleData,
      scheduledStartTime: new Date(scheduleData.scheduledStartTime),
    };

    const stream = await this.livestreamService.createLiveStream(createDto, userId);

    // In a real implementation, you might:
    // 1. Send notifications to course subscribers
    // 2. Add calendar events
    // 3. Set up automated start reminders

    return {
      ...stream,
      message: 'Stream scheduled successfully',
      notificationsSent: scheduleData.notifySubscribers || false,
    };
  }

  @Get('course/:courseId/streams')
  @ApiOperation({ summary: 'Get live streams for specific course' })
  async getCourseStreams(
    @Param('courseId') courseId: string,
    @Query('status') status?: 'scheduled' | 'live' | 'ended',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.livestreamService.getLiveStreams({ 
      courseId, 
      status,
      isPublic: true 
    }, page, limit);
  }
}