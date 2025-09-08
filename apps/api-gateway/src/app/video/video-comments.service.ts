import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, EntityManager } from 'typeorm';
import { 
  VideoComment, 
  VideoCommentReaction, 
  VideoCommentReport,
  VideoDiscussionThread,
  VideoThreadComment,
  Video,
  User
} from '@edutech-lms/database';

export interface CreateCommentDto {
  content: string;
  timestamp?: number;
  parentId?: string;
  mentions?: string[];
  attachments?: Array<{
    type: 'image' | 'link' | 'file';
    url: string;
    name?: string;
  }>;
}

export interface CreateThreadDto {
  title: string;
  content: string;
  timestamp?: number;
  type?: 'question' | 'discussion' | 'announcement' | 'feedback';
  tags?: string[];
}

export interface UpdateCommentDto {
  content?: string;
  isModerated?: boolean;
  isPinned?: boolean;
  isHighlighted?: boolean;
  status?: 'active' | 'hidden' | 'deleted' | 'flagged';
}

export interface ReportCommentDto {
  reason: 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'copyright' | 'other';
  description?: string;
}

@Injectable()
export class VideoCommentsService {
  private readonly logger = new Logger(VideoCommentsService.name);

  constructor(
    @InjectRepository(VideoComment)
    private commentRepository: TreeRepository<VideoComment>,
    @InjectRepository(VideoCommentReaction)
    private reactionRepository: Repository<VideoCommentReaction>,
    @InjectRepository(VideoCommentReport)
    private reportRepository: Repository<VideoCommentReport>,
    @InjectRepository(VideoDiscussionThread)
    private threadRepository: Repository<VideoDiscussionThread>,
    @InjectRepository(VideoThreadComment)
    private threadCommentRepository: Repository<VideoThreadComment>,
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private entityManager: EntityManager,
  ) {}

  async createComment(
    videoId: string, 
    createDto: CreateCommentDto, 
    authorId: string
  ): Promise<VideoComment> {
    // Validate video exists
    const video = await this.videoRepository.findOne({ where: { id: videoId } });
    if (!video) {
      throw new NotFoundException(`Video ${videoId} not found`);
    }

    // Validate parent comment if provided
    let parentComment: VideoComment | null = null;
    if (createDto.parentId) {
      parentComment = await this.commentRepository.findOne({
        where: { id: createDto.parentId, videoId }
      });
      if (!parentComment) {
        throw new NotFoundException(`Parent comment ${createDto.parentId} not found`);
      }
    }

    // Process mentions
    let mentions: string[] = [];
    if (createDto.mentions && createDto.mentions.length > 0) {
      const users = await this.userRepository.findBy({
        id: { in: createDto.mentions } as any
      });
      mentions = users.map(u => u.id);
    }

    const comment = this.commentRepository.create({
      videoId,
      authorId,
      content: createDto.content,
      timestamp: createDto.timestamp,
      metadata: {
        mentions,
        attachments: createDto.attachments || [],
        reactionCounts: {},
      },
    });

    if (parentComment) {
      comment.parent = parentComment;
    }

    const savedComment = await this.commentRepository.save(comment);

    // Update parent reply count
    if (parentComment) {
      await this.updateReplyCount(parentComment.id);
    }

    this.logger.log(`Comment created: ${savedComment.id} on video ${videoId} by user ${authorId}`);
    return savedComment;
  }

  async getVideoComments(
    videoId: string,
    page: number = 1,
    limit: number = 20,
    sortBy: 'newest' | 'oldest' | 'popular' | 'timestamp' = 'newest'
  ): Promise<{ comments: VideoComment[]; total: number }> {
    const query = this.commentRepository.createQueryBuilder('comment')
      .leftJoinAndSelect('comment.author', 'author')
      .leftJoinAndSelect('comment.reactions', 'reactions')
      .where('comment.videoId = :videoId', { videoId })
      .andWhere('comment.status = :status', { status: 'active' })
      .andWhere('comment.parent IS NULL'); // Only top-level comments

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        query.orderBy('comment.createdAt', 'DESC');
        break;
      case 'oldest':
        query.orderBy('comment.createdAt', 'ASC');
        break;
      case 'popular':
        query.orderBy('comment.likeCount', 'DESC');
        break;
      case 'timestamp':
        query.orderBy('comment.timestamp', 'ASC');
        break;
    }

    const total = await query.getCount();
    const comments = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Load replies for each comment
    for (const comment of comments) {
      const replies = await this.commentRepository.findDescendants(comment, {
        relations: ['author']
      });
      comment.replies = replies.filter(r => r.id !== comment.id);
    }

    return { comments, total };
  }

  async getCommentReplies(commentId: string): Promise<VideoComment[]> {
    const parentComment = await this.commentRepository.findOne({
      where: { id: commentId }
    });

    if (!parentComment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    const replies = await this.commentRepository.findDescendants(parentComment, {
      relations: ['author', 'reactions']
    });

    return replies.filter(r => r.id !== commentId);
  }

  async updateComment(
    commentId: string, 
    updateDto: UpdateCommentDto, 
    userId: string
  ): Promise<VideoComment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['author']
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    // Only author can edit content, moderators can edit status/moderation flags
    if (updateDto.content && comment.authorId !== userId) {
      throw new ForbiddenException('Only comment author can edit content');
    }

    // Store edit history if content is being changed
    if (updateDto.content && updateDto.content !== comment.content) {
      const editHistory = comment.metadata?.editHistory || [];
      editHistory.push({
        timestamp: new Date(),
        previousContent: comment.content,
      });

      comment.metadata = {
        ...comment.metadata,
        editHistory,
      };
      comment.isEdited = true;
    }

    Object.assign(comment, updateDto);
    const updatedComment = await this.commentRepository.save(comment);

    this.logger.log(`Comment updated: ${commentId} by user ${userId}`);
    return updatedComment;
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId }
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    // Only author or moderator can delete
    if (comment.authorId !== userId) {
      // In a real implementation, check for moderator permissions
      throw new ForbiddenException('Only comment author can delete comment');
    }

    // Soft delete - change status instead of removing
    comment.status = 'deleted';
    comment.content = '[Comment deleted]';
    await this.commentRepository.save(comment);

    // Update parent reply count if this was a reply
    if (comment.parent) {
      await this.updateReplyCount(comment.parent.id);
    }

    this.logger.log(`Comment deleted: ${commentId} by user ${userId}`);
  }

  async reactToComment(
    commentId: string,
    userId: string,
    reactionType: 'like' | 'dislike' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
  ): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId }
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    // Check if user already reacted
    const existingReaction = await this.reactionRepository.findOne({
      where: { commentId, userId }
    });

    if (existingReaction) {
      if (existingReaction.type === reactionType) {
        // Remove reaction
        await this.reactionRepository.remove(existingReaction);
      } else {
        // Update reaction type
        existingReaction.type = reactionType;
        await this.reactionRepository.save(existingReaction);
      }
    } else {
      // Create new reaction
      const reaction = this.reactionRepository.create({
        commentId,
        userId,
        type: reactionType,
      });
      await this.reactionRepository.save(reaction);
    }

    // Update comment reaction counts
    await this.updateCommentReactionCounts(commentId);

    this.logger.log(`User ${userId} reacted to comment ${commentId} with ${reactionType}`);
  }

  async reportComment(
    commentId: string,
    reporterId: string,
    reportDto: ReportCommentDto
  ): Promise<VideoCommentReport> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId }
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    // Check if user already reported this comment
    const existingReport = await this.reportRepository.findOne({
      where: { commentId, reporterId }
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this comment');
    }

    const report = this.reportRepository.create({
      commentId,
      reporterId,
      reason: reportDto.reason,
      description: reportDto.description,
    });

    const savedReport = await this.reportRepository.save(report);

    // Flag comment if it gets multiple reports
    const reportCount = await this.reportRepository.count({
      where: { commentId }
    });

    if (reportCount >= 3) {
      comment.status = 'flagged';
      await this.commentRepository.save(comment);
    }

    this.logger.log(`Comment reported: ${commentId} by user ${reporterId} for ${reportDto.reason}`);
    return savedReport;
  }

  async createDiscussionThread(
    videoId: string,
    createDto: CreateThreadDto,
    creatorId: string
  ): Promise<VideoDiscussionThread> {
    const video = await this.videoRepository.findOne({ where: { id: videoId } });
    if (!video) {
      throw new NotFoundException(`Video ${videoId} not found`);
    }

    const thread = this.threadRepository.create({
      videoId,
      creatorId,
      title: createDto.title,
      content: createDto.content,
      timestamp: createDto.timestamp,
      type: createDto.type || 'discussion',
      tags: createDto.tags || [],
    });

    const savedThread = await this.threadRepository.save(thread);
    this.logger.log(`Discussion thread created: ${savedThread.id} for video ${videoId}`);

    return savedThread;
  }

  async getVideoThreads(
    videoId: string,
    page: number = 1,
    limit: number = 20,
    sortBy: 'newest' | 'oldest' | 'popular' | 'timestamp' = 'newest'
  ): Promise<{ threads: VideoDiscussionThread[]; total: number }> {
    const query = this.threadRepository.createQueryBuilder('thread')
      .leftJoinAndSelect('thread.creator', 'creator')
      .where('thread.videoId = :videoId', { videoId });

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        query.orderBy('thread.createdAt', 'DESC');
        break;
      case 'oldest':
        query.orderBy('thread.createdAt', 'ASC');
        break;
      case 'popular':
        query.orderBy('thread.likeCount', 'DESC');
        break;
      case 'timestamp':
        query.orderBy('thread.timestamp', 'ASC');
        break;
    }

    // Pin important threads first
    query.addOrderBy('thread.isPinned', 'DESC');

    const total = await query.getCount();
    const threads = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { threads, total };
  }

  async addThreadComment(
    threadId: string,
    content: string,
    authorId: string
  ): Promise<VideoThreadComment> {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId }
    });

    if (!thread) {
      throw new NotFoundException(`Thread ${threadId} not found`);
    }

    if (thread.isLocked) {
      throw new BadRequestException('Cannot comment on locked thread');
    }

    const comment = this.threadCommentRepository.create({
      threadId,
      authorId,
      content,
    });

    const savedComment = await this.threadCommentRepository.save(comment);

    // Update thread comment count
    await this.threadRepository.increment(
      { id: threadId },
      'commentCount',
      1
    );

    this.logger.log(`Thread comment added: ${savedComment.id} to thread ${threadId}`);
    return savedComment;
  }

  async getThreadComments(
    threadId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ comments: VideoThreadComment[]; total: number }> {
    const [comments, total] = await this.threadCommentRepository.findAndCount({
      where: { threadId, status: 'active' },
      relations: ['author'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { comments, total };
  }

  async getCommentsByTimestamp(
    videoId: string,
    startTime: number,
    endTime: number
  ): Promise<VideoComment[]> {
    return this.commentRepository.find({
      where: {
        videoId,
        timestamp: { gte: startTime, lte: endTime } as any,
        status: 'active',
      },
      relations: ['author', 'reactions'],
      order: { timestamp: 'ASC' },
    });
  }

  async searchComments(
    videoId: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ comments: VideoComment[]; total: number }> {
    const query = this.commentRepository.createQueryBuilder('comment')
      .leftJoinAndSelect('comment.author', 'author')
      .where('comment.videoId = :videoId', { videoId })
      .andWhere('comment.status = :status', { status: 'active' })
      .andWhere('comment.content ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` });

    const total = await query.getCount();
    const comments = await query
      .orderBy('comment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { comments, total };
  }

  async getModerationQueue(
    page: number = 1,
    limit: number = 50
  ): Promise<{
    flaggedComments: VideoComment[];
    pendingReports: VideoCommentReport[];
    total: number;
  }> {
    // Get flagged comments
    const flaggedComments = await this.commentRepository.find({
      where: { status: 'flagged' },
      relations: ['author', 'video'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get pending reports
    const pendingReports = await this.reportRepository.find({
      where: { status: 'pending' },
      relations: ['comment', 'comment.author', 'comment.video', 'reporter'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    const total = flaggedComments.length + pendingReports.length;

    return {
      flaggedComments,
      pendingReports,
      total,
    };
  }

  async moderateComment(
    commentId: string,
    action: 'approve' | 'hide' | 'delete',
    moderatorId: string,
    reason?: string
  ): Promise<VideoComment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId }
    });

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    switch (action) {
      case 'approve':
        comment.status = 'active';
        comment.isModerated = false;
        break;
      case 'hide':
        comment.status = 'hidden';
        comment.isModerated = true;
        break;
      case 'delete':
        comment.status = 'deleted';
        comment.content = '[Comment removed by moderator]';
        comment.isModerated = true;
        break;
    }

    const updatedComment = await this.commentRepository.save(comment);

    // Update related reports as resolved
    await this.reportRepository.update(
      { commentId },
      { 
        status: 'resolved',
        reviewedBy: moderatorId,
        reviewedAt: new Date(),
        reviewNotes: reason,
      }
    );

    this.logger.log(`Comment moderated: ${commentId} - Action: ${action} by ${moderatorId}`);
    return updatedComment;
  }

  async getCommentStatistics(videoId: string): Promise<{
    totalComments: number;
    totalReplies: number;
    uniqueCommenters: number;
    averageCommentsPerUser: number;
    topCommenters: Array<{
      userId: string;
      userName: string;
      commentCount: number;
      likeCount: number;
    }>;
    engagementByTimestamp: Array<{
      timestamp: number;
      commentCount: number;
    }>;
    moderationStats: {
      flaggedComments: number;
      hiddenComments: number;
      deletedComments: number;
      pendingReports: number;
    };
  }> {
    const totalComments = await this.commentRepository.count({
      where: { videoId, status: 'active' }
    });

    const totalReplies = await this.commentRepository.count({
      where: { videoId, status: 'active', parent: { not: null } as any }
    });

    const uniqueCommenters = await this.commentRepository
      .createQueryBuilder('comment')
      .select('COUNT(DISTINCT comment.authorId)', 'count')
      .where('comment.videoId = :videoId', { videoId })
      .andWhere('comment.status = :status', { status: 'active' })
      .getRawOne();

    const averageCommentsPerUser = uniqueCommenters.count > 0 ? 
      totalComments / uniqueCommenters.count : 0;

    // Get top commenters
    const topCommenters = await this.entityManager.query(`
      SELECT 
        u.id as "userId",
        CONCAT(u."firstName", ' ', u."lastName") as "userName",
        COUNT(c.id) as "commentCount",
        SUM(c."likeCount") as "likeCount"
      FROM video_comments c
      JOIN users u ON c."authorId" = u.id
      WHERE c."videoId" = $1 AND c.status = 'active'
      GROUP BY u.id, u."firstName", u."lastName"
      ORDER BY "commentCount" DESC, "likeCount" DESC
      LIMIT 10
    `, [videoId]);

    // Get engagement by timestamp (rounded to minutes)
    const engagementByTimestamp = await this.entityManager.query(`
      SELECT 
        FLOOR(timestamp / 60) * 60 as timestamp,
        COUNT(*) as "commentCount"
      FROM video_comments
      WHERE "videoId" = $1 AND status = 'active' AND timestamp IS NOT NULL
      GROUP BY FLOOR(timestamp / 60)
      ORDER BY timestamp ASC
    `, [videoId]);

    // Get moderation stats
    const moderationStats = await this.entityManager.query(`
      SELECT 
        SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) as "flaggedComments",
        SUM(CASE WHEN status = 'hidden' THEN 1 ELSE 0 END) as "hiddenComments",
        SUM(CASE WHEN status = 'deleted' THEN 1 ELSE 0 END) as "deletedComments"
      FROM video_comments
      WHERE "videoId" = $1
    `, [videoId]);

    const pendingReports = await this.reportRepository.count({
      where: { 
        comment: { videoId },
        status: 'pending'
      }
    });

    return {
      totalComments,
      totalReplies,
      uniqueCommenters: parseInt(uniqueCommenters.count),
      averageCommentsPerUser,
      topCommenters,
      engagementByTimestamp,
      moderationStats: {
        ...moderationStats[0],
        pendingReports,
      },
    };
  }

  private async updateReplyCount(commentId: string): Promise<void> {
    const replyCount = await this.commentRepository.count({
      where: { parent: { id: commentId }, status: 'active' }
    });

    await this.commentRepository.update(commentId, { replyCount });
  }

  private async updateCommentReactionCounts(commentId: string): Promise<void> {
    const reactions = await this.reactionRepository.find({
      where: { commentId }
    });

    const reactionCounts: { [key: string]: number } = {};
    let likeCount = 0;
    let dislikeCount = 0;

    reactions.forEach(reaction => {
      reactionCounts[reaction.type] = (reactionCounts[reaction.type] || 0) + 1;
      if (reaction.type === 'like') likeCount++;
      if (reaction.type === 'dislike') dislikeCount++;
    });

    await this.commentRepository.update(commentId, {
      likeCount,
      dislikeCount,
      metadata: {
        reactionCounts,
      } as any,
    });
  }

  async getCommentsAtTimestamp(
    videoId: string,
    timestamp: number,
    tolerance: number = 5
  ): Promise<VideoComment[]> {
    return this.commentRepository.find({
      where: {
        videoId,
        timestamp: { 
          gte: timestamp - tolerance, 
          lte: timestamp + tolerance 
        } as any,
        status: 'active',
      },
      relations: ['author', 'reactions'],
      order: { createdAt: 'ASC' },
      take: 10,
    });
  }
}