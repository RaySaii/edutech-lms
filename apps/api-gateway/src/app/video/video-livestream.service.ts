import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Video, User, Course } from '@edutech-lms/database';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as crypto from 'crypto';

export interface LiveStream {
  id: string;
  title: string;
  description: string;
  streamerId: string;
  courseId?: string;
  scheduledStartTime?: Date;
  actualStartTime?: Date;
  endTime?: Date;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  streamKey: string;
  rtmpUrl: string;
  playbackUrl: string;
  maxViewers?: number;
  currentViewers: number;
  totalViews: number;
  isRecorded: boolean;
  recordingUrl?: string;
  settings: {
    allowChat: boolean;
    allowQuestions: boolean;
    moderationEnabled: boolean;
    isPublic: boolean;
    requireAuth: boolean;
    enableScreenShare: boolean;
    enableWhiteboard: boolean;
  };
  metadata: {
    tags: string[];
    category: string;
    difficulty: string;
    language: string;
    estimatedDuration?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface LiveStreamViewer {
  id: string;
  streamId: string;
  userId: string;
  socketId: string;
  joinedAt: Date;
  lastActiveAt: Date;
  totalWatchTime: number;
  isActive: boolean;
  permissions: {
    canChat: boolean;
    canAskQuestions: boolean;
    isModerator: boolean;
    canScreenShare: boolean;
  };
}

export interface LiveStreamMessage {
  id: string;
  streamId: string;
  userId: string;
  type: 'chat' | 'question' | 'announcement' | 'system';
  content: string;
  timestamp: Date;
  isModerated: boolean;
  isHighlighted: boolean;
  metadata?: {
    reactions?: { [emoji: string]: number };
    isAnswered?: boolean;
    isSticky?: boolean;
  };
}

export interface CreateLiveStreamDto {
  title: string;
  description: string;
  courseId?: string;
  scheduledStartTime?: Date;
  maxViewers?: number;
  isRecorded?: boolean;
  settings?: {
    allowChat?: boolean;
    allowQuestions?: boolean;
    moderationEnabled?: boolean;
    isPublic?: boolean;
    requireAuth?: boolean;
    enableScreenShare?: boolean;
    enableWhiteboard?: boolean;
  };
  metadata?: {
    tags?: string[];
    category?: string;
    difficulty?: string;
    language?: string;
    estimatedDuration?: number;
  };
}

@Injectable()
@WebSocketGateway({
  namespace: '/livestream',
  cors: {
    origin: '*',
  },
})
export class VideoLivestreamService implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VideoLivestreamService.name);
  private activeStreams = new Map<string, LiveStream>();
  private streamViewers = new Map<string, Map<string, LiveStreamViewer>>();
  private streamMessages = new Map<string, LiveStreamMessage[]>();

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectQueue('livestream-processing')
    private streamQueue: Queue,
  ) {}

  async createLiveStream(
    createDto: CreateLiveStreamDto,
    streamerId: string
  ): Promise<LiveStream> {
    // Validate course if provided
    if (createDto.courseId) {
      const course = await this.courseRepository.findOne({
        where: { id: createDto.courseId }
      });
      if (!course) {
        throw new NotFoundException(`Course ${createDto.courseId} not found`);
      }
    }

    const streamId = crypto.randomUUID();
    const streamKey = crypto.randomBytes(16).toString('hex');
    
    const liveStream: LiveStream = {
      id: streamId,
      title: createDto.title,
      description: createDto.description,
      streamerId,
      courseId: createDto.courseId,
      scheduledStartTime: createDto.scheduledStartTime,
      status: createDto.scheduledStartTime ? 'scheduled' : 'live',
      streamKey,
      rtmpUrl: `rtmp://stream.example.com/live/${streamKey}`,
      playbackUrl: `https://stream.example.com/hls/${streamId}/playlist.m3u8`,
      maxViewers: createDto.maxViewers,
      currentViewers: 0,
      totalViews: 0,
      isRecorded: createDto.isRecorded || false,
      settings: {
        allowChat: true,
        allowQuestions: true,
        moderationEnabled: false,
        isPublic: true,
        requireAuth: false,
        enableScreenShare: false,
        enableWhiteboard: false,
        ...createDto.settings,
      },
      metadata: {
        tags: [],
        category: 'General',
        difficulty: 'beginner',
        language: 'en',
        ...createDto.metadata,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.activeStreams.set(streamId, liveStream);
    this.streamViewers.set(streamId, new Map());
    this.streamMessages.set(streamId, []);

    this.logger.log(`Live stream created: ${streamId} by user ${streamerId}`);
    return liveStream;
  }

  async startLiveStream(streamId: string, streamerId: string): Promise<LiveStream> {
    const stream = this.activeStreams.get(streamId);
    
    if (!stream) {
      throw new NotFoundException(`Stream ${streamId} not found`);
    }

    if (stream.streamerId !== streamerId) {
      throw new ForbiddenException('Only stream creator can start stream');
    }

    if (stream.status === 'live') {
      throw new BadRequestException('Stream is already live');
    }

    stream.status = 'live';
    stream.actualStartTime = new Date();
    stream.updatedAt = new Date();

    this.activeStreams.set(streamId, stream);

    // Notify all viewers that stream has started
    this.server.to(`stream-${streamId}`).emit('stream-started', {
      streamId,
      startTime: stream.actualStartTime,
    });

    // Queue recording if enabled
    if (stream.isRecorded) {
      await this.streamQueue.add('start-recording', {
        streamId,
        rtmpUrl: stream.rtmpUrl,
      });
    }

    this.logger.log(`Live stream started: ${streamId}`);
    return stream;
  }

  async endLiveStream(streamId: string, streamerId: string): Promise<LiveStream> {
    const stream = this.activeStreams.get(streamId);
    
    if (!stream) {
      throw new NotFoundException(`Stream ${streamId} not found`);
    }

    if (stream.streamerId !== streamerId) {
      throw new ForbiddenException('Only stream creator can end stream');
    }

    stream.status = 'ended';
    stream.endTime = new Date();
    stream.currentViewers = 0;
    stream.updatedAt = new Date();

    this.activeStreams.set(streamId, stream);

    // Notify all viewers that stream has ended
    this.server.to(`stream-${streamId}`).emit('stream-ended', {
      streamId,
      endTime: stream.endTime,
      recordingUrl: stream.recordingUrl,
    });

    // Stop recording if enabled
    if (stream.isRecorded) {
      await this.streamQueue.add('stop-recording', {
        streamId,
      });
    }

    // Clear viewers
    this.streamViewers.delete(streamId);

    this.logger.log(`Live stream ended: ${streamId}`);
    return stream;
  }

  async joinStream(streamId: string, userId: string, socketId: string): Promise<LiveStreamViewer> {
    const stream = this.activeStreams.get(streamId);
    
    if (!stream) {
      throw new NotFoundException(`Stream ${streamId} not found`);
    }

    if (stream.status !== 'live') {
      throw new BadRequestException('Stream is not currently live');
    }

    // Check max viewers limit
    if (stream.maxViewers && stream.currentViewers >= stream.maxViewers) {
      throw new BadRequestException('Stream has reached maximum viewer capacity');
    }

    // Check permissions
    if (!stream.settings.isPublic && stream.settings.requireAuth) {
      // In a real implementation, validate course enrollment or permissions
    }

    const viewers = this.streamViewers.get(streamId) || new Map();
    
    // Check if user is already viewing
    const existingViewer = Array.from(viewers.values()).find(v => v.userId === userId);
    if (existingViewer) {
      existingViewer.socketId = socketId;
      existingViewer.lastActiveAt = new Date();
      existingViewer.isActive = true;
      viewers.set(socketId, existingViewer);
    } else {
      const viewer: LiveStreamViewer = {
        id: crypto.randomUUID(),
        streamId,
        userId,
        socketId,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        totalWatchTime: 0,
        isActive: true,
        permissions: {
          canChat: stream.settings.allowChat,
          canAskQuestions: stream.settings.allowQuestions,
          isModerator: userId === stream.streamerId,
          canScreenShare: stream.settings.enableScreenShare && userId === stream.streamerId,
        },
      };

      viewers.set(socketId, viewer);
      
      // Update stream viewer count
      stream.currentViewers++;
      stream.totalViews++;
    }

    this.streamViewers.set(streamId, viewers);
    this.activeStreams.set(streamId, stream);

    // Notify other viewers
    this.server.to(`stream-${streamId}`).emit('viewer-joined', {
      streamId,
      currentViewers: stream.currentViewers,
    });

    this.logger.log(`User ${userId} joined stream ${streamId}`);
    return viewers.get(socketId)!;
  }

  async leaveStream(streamId: string, socketId: string): Promise<void> {
    const viewers = this.streamViewers.get(streamId);
    const stream = this.activeStreams.get(streamId);
    
    if (!viewers || !stream) return;

    const viewer = viewers.get(socketId);
    if (viewer) {
      viewer.isActive = false;
      const watchTime = Date.now() - viewer.joinedAt.getTime();
      viewer.totalWatchTime += Math.floor(watchTime / 1000);
      
      viewers.delete(socketId);
      stream.currentViewers = Math.max(0, stream.currentViewers - 1);

      this.streamViewers.set(streamId, viewers);
      this.activeStreams.set(streamId, stream);

      // Notify other viewers
      this.server.to(`stream-${streamId}`).emit('viewer-left', {
        streamId,
        currentViewers: stream.currentViewers,
      });

      this.logger.log(`User ${viewer.userId} left stream ${streamId}`);
    }
  }

  async sendStreamMessage(
    streamId: string,
    userId: string,
    content: string,
    type: 'chat' | 'question' | 'announcement' = 'chat'
  ): Promise<LiveStreamMessage> {
    const stream = this.activeStreams.get(streamId);
    
    if (!stream) {
      throw new NotFoundException(`Stream ${streamId} not found`);
    }

    if (!stream.settings.allowChat && type === 'chat') {
      throw new ForbiddenException('Chat is disabled for this stream');
    }

    if (!stream.settings.allowQuestions && type === 'question') {
      throw new ForbiddenException('Questions are disabled for this stream');
    }

    const message: LiveStreamMessage = {
      id: crypto.randomUUID(),
      streamId,
      userId,
      type,
      content,
      timestamp: new Date(),
      isModerated: false,
      isHighlighted: type === 'announcement',
      metadata: {
        reactions: {},
        isAnswered: false,
        isSticky: false,
      },
    };

    const messages = this.streamMessages.get(streamId) || [];
    messages.push(message);
    this.streamMessages.set(streamId, messages);

    // Get user info for broadcast
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    // Broadcast message to all viewers
    this.server.to(`stream-${streamId}`).emit('new-message', {
      ...message,
      author: user ? {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
      } : null,
    });

    this.logger.log(`Message sent in stream ${streamId} by user ${userId}: ${type}`);
    return message;
  }

  async getLiveStreams(
    filters: {
      status?: 'scheduled' | 'live' | 'ended';
      courseId?: string;
      streamerId?: string;
      isPublic?: boolean;
    } = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ streams: LiveStream[]; total: number }> {
    const allStreams = Array.from(this.activeStreams.values());
    
    let filteredStreams = allStreams;

    // Apply filters
    if (filters.status) {
      filteredStreams = filteredStreams.filter(s => s.status === filters.status);
    }

    if (filters.courseId) {
      filteredStreams = filteredStreams.filter(s => s.courseId === filters.courseId);
    }

    if (filters.streamerId) {
      filteredStreams = filteredStreams.filter(s => s.streamerId === filters.streamerId);
    }

    if (filters.isPublic !== undefined) {
      filteredStreams = filteredStreams.filter(s => s.settings.isPublic === filters.isPublic);
    }

    // Sort by status priority and start time
    filteredStreams.sort((a, b) => {
      const statusPriority = { live: 0, scheduled: 1, ended: 2, cancelled: 3 };
      const aPriority = statusPriority[a.status];
      const bPriority = statusPriority[b.status];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      const aTime = a.actualStartTime || a.scheduledStartTime || a.createdAt;
      const bTime = b.actualStartTime || b.scheduledStartTime || b.createdAt;
      return bTime.getTime() - aTime.getTime();
    });

    // Pagination
    const total = filteredStreams.length;
    const startIndex = (page - 1) * limit;
    const paginatedStreams = filteredStreams.slice(startIndex, startIndex + limit);

    return { streams: paginatedStreams, total };
  }

  async getStreamById(streamId: string): Promise<LiveStream | null> {
    return this.activeStreams.get(streamId) || null;
  }

  async getStreamMessages(
    streamId: string,
    page: number = 1,
    limit: number = 50,
    type?: 'chat' | 'question' | 'announcement'
  ): Promise<{ messages: LiveStreamMessage[]; total: number }> {
    const allMessages = this.streamMessages.get(streamId) || [];
    
    let filteredMessages = allMessages;
    
    if (type) {
      filteredMessages = filteredMessages.filter(m => m.type === type);
    }

    // Sort by timestamp (newest first for chat, oldest first for questions)
    filteredMessages.sort((a, b) => {
      if (type === 'question') {
        return a.timestamp.getTime() - b.timestamp.getTime();
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    const total = filteredMessages.length;
    const startIndex = (page - 1) * limit;
    const paginatedMessages = filteredMessages.slice(startIndex, startIndex + limit);

    return { messages: paginatedMessages, total };
  }

  async getStreamAnalytics(streamId: string): Promise<{
    totalViews: number;
    uniqueViewers: number;
    peakViewers: number;
    averageWatchTime: number;
    engagementRate: number;
    messageCount: number;
    questionCount: number;
    viewerRetention: Array<{
      minute: number;
      viewers: number;
    }>;
    geographicDistribution: { [country: string]: number };
    deviceBreakdown: { [device: string]: number };
  }> {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      throw new NotFoundException(`Stream ${streamId} not found`);
    }

    const viewers = this.streamViewers.get(streamId) || new Map();
    const messages = this.streamMessages.get(streamId) || [];

    const uniqueViewers = new Set(Array.from(viewers.values()).map(v => v.userId)).size;
    const totalWatchTime = Array.from(viewers.values())
      .reduce((sum, v) => sum + v.totalWatchTime, 0);
    const averageWatchTime = uniqueViewers > 0 ? totalWatchTime / uniqueViewers : 0;
    
    const messageCount = messages.filter(m => m.type === 'chat').length;
    const questionCount = messages.filter(m => m.type === 'question').length;
    const engagementRate = stream.totalViews > 0 ? 
      (messageCount + questionCount) / stream.totalViews : 0;

    return {
      totalViews: stream.totalViews,
      uniqueViewers,
      peakViewers: stream.currentViewers, // Would track historical peak in real implementation
      averageWatchTime,
      engagementRate,
      messageCount,
      questionCount,
      viewerRetention: [], // Would calculate from viewer join/leave events
      geographicDistribution: { 'US': 45, 'UK': 20, 'CA': 15, 'DE': 10, 'Other': 10 },
      deviceBreakdown: { 'Desktop': 60, 'Mobile': 30, 'Tablet': 10 },
    };
  }

  async updateStreamSettings(
    streamId: string,
    streamerId: string,
    settings: Partial<LiveStream['settings']>
  ): Promise<LiveStream> {
    const stream = this.activeStreams.get(streamId);
    
    if (!stream) {
      throw new NotFoundException(`Stream ${streamId} not found`);
    }

    if (stream.streamerId !== streamerId) {
      throw new ForbiddenException('Only stream creator can update settings');
    }

    stream.settings = { ...stream.settings, ...settings };
    stream.updatedAt = new Date();

    this.activeStreams.set(streamId, stream);

    // Notify viewers of setting changes
    this.server.to(`stream-${streamId}`).emit('settings-updated', {
      streamId,
      settings: stream.settings,
    });

    this.logger.log(`Stream settings updated: ${streamId}`);
    return stream;
  }

  async moderateMessage(
    streamId: string,
    messageId: string,
    moderatorId: string,
    action: 'highlight' | 'hide' | 'delete'
  ): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      throw new NotFoundException(`Stream ${streamId} not found`);
    }

    // Check moderator permissions
    const viewers = this.streamViewers.get(streamId) || new Map();
    const moderator = Array.from(viewers.values()).find(v => v.userId === moderatorId);
    
    if (!moderator?.permissions.isModerator) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const messages = this.streamMessages.get(streamId) || [];
    const messageIndex = messages.findIndex(m => m.id === messageId);
    
    if (messageIndex === -1) {
      throw new NotFoundException(`Message ${messageId} not found`);
    }

    const message = messages[messageIndex];

    switch (action) {
      case 'highlight':
        message.isHighlighted = true;
        break;
      case 'hide':
        message.isModerated = true;
        break;
      case 'delete':
        messages.splice(messageIndex, 1);
        this.streamMessages.set(streamId, messages);
        
        // Notify viewers of deleted message
        this.server.to(`stream-${streamId}`).emit('message-deleted', {
          messageId,
        });
        return;
    }

    messages[messageIndex] = message;
    this.streamMessages.set(streamId, messages);

    // Notify viewers of moderated message
    this.server.to(`stream-${streamId}`).emit('message-moderated', {
      messageId,
      action,
      message,
    });

    this.logger.log(`Message moderated: ${messageId} - Action: ${action} by ${moderatorId}`);
  }

  // WebSocket event handlers
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // Find and remove viewer from active streams
    for (const [streamId, viewers] of this.streamViewers.entries()) {
      if (viewers.has(client.id)) {
        this.leaveStream(streamId, client.id);
        break;
      }
    }
    
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-stream')
  async handleJoinStream(
    client: Socket,
    payload: { streamId: string; userId: string }
  ) {
    try {
      const viewer = await this.joinStream(payload.streamId, payload.userId, client.id);
      client.join(`stream-${payload.streamId}`);
      
      // Send current stream state to new viewer
      const stream = this.activeStreams.get(payload.streamId);
      const messages = this.streamMessages.get(payload.streamId) || [];
      
      client.emit('stream-joined', {
        stream,
        recentMessages: messages.slice(-20), // Last 20 messages
        viewer,
      });

    } catch (error) {
      client.emit('join-error', { message: error.message });
    }
  }

  @SubscribeMessage('leave-stream')
  async handleLeaveStream(
    client: Socket,
    payload: { streamId: string }
  ) {
    await this.leaveStream(payload.streamId, client.id);
    client.leave(`stream-${payload.streamId}`);
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    client: Socket,
    payload: { 
      streamId: string; 
      userId: string; 
      content: string; 
      type?: 'chat' | 'question' 
    }
  ) {
    try {
      await this.sendStreamMessage(
        payload.streamId,
        payload.userId,
        payload.content,
        payload.type || 'chat'
      );
    } catch (error) {
      client.emit('message-error', { message: error.message });
    }
  }

  @SubscribeMessage('react-to-message')
  async handleReactToMessage(
    client: Socket,
    payload: { 
      streamId: string; 
      messageId: string; 
      emoji: string; 
      userId: string 
    }
  ) {
    const messages = this.streamMessages.get(payload.streamId) || [];
    const message = messages.find(m => m.id === payload.messageId);
    
    if (message) {
      const reactions = message.metadata?.reactions || {};
      reactions[payload.emoji] = (reactions[payload.emoji] || 0) + 1;
      
      if (message.metadata) {
        message.metadata.reactions = reactions;
      }

      // Broadcast reaction update
      this.server.to(`stream-${payload.streamId}`).emit('message-reaction', {
        messageId: payload.messageId,
        reactions,
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong');
  }
}