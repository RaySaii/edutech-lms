import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
  Content,
  ContentVersion,
  ContentApproval,
  MediaAsset,
  ContentStatus,
  VersionStatus,
  ApprovalStatus,
  ApprovalType,
  AssetType,
  AssetStatus,
  ChangeType,
} from '@edutech-lms/database';

export interface CreateContentVersionDto {
  title: string;
  description?: string;
  content: Record<string, any>;
  metadata?: Record<string, any>;
  changeDescription?: string;
  authorId: string;
}

export interface ReviewContentDto {
  status: ApprovalStatus;
  approverNotes?: string;
  checklist?: Array<{
    item: string;
    checked: boolean;
    notes?: string;
    requiredForApproval: boolean;
  }>;
  reviewCriteria?: Record<string, any>;
}

@Injectable()
export class ContentManagementService {
  private readonly logger = new Logger(ContentManagementService.name);

  constructor(
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(ContentVersion)
    private versionRepository: Repository<ContentVersion>,
    @InjectRepository(ContentApproval)
    private approvalRepository: Repository<ContentApproval>,
    @InjectRepository(MediaAsset)
    private mediaRepository: Repository<MediaAsset>,
    private dataSource: DataSource,
  ) {}

  // Version Management
  async createContentVersion(
    contentId: string,
    versionDto: CreateContentVersionDto
  ): Promise<ContentVersion> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const content = await this.contentRepository.findOne({ where: { id: contentId } });
      if (!content) {
        throw new NotFoundException(`Content with ID ${contentId} not found`);
      }

      // Get the next version number
      const lastVersion = await this.versionRepository.findOne({
        where: { contentId },
        order: { version: 'DESC' },
      });
      const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

      // Calculate content checksum for integrity
      const contentString = JSON.stringify(versionDto.content);
      const checksum = this.calculateChecksum(contentString);

      const version = this.versionRepository.create({
        contentId,
        version: nextVersion,
        title: versionDto.title,
        description: versionDto.description,
        content: versionDto.content,
        metadata: versionDto.metadata,
        status: VersionStatus.DRAFT,
        changeType: nextVersion === 1 ? ChangeType.CREATED : ChangeType.MODIFIED,
        changeDescription: versionDto.changeDescription,
        authorId: versionDto.authorId,
        size: Buffer.byteLength(contentString, 'utf8'),
        checksum,
      });

      const savedVersion = await queryRunner.manager.save(version);

      // Update content's current version if this is the first version or if published
      if (nextVersion === 1) {
        content.currentVersion = nextVersion;
        await queryRunner.manager.save(content);
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Created version ${nextVersion} for content ${contentId}`);
      
      return savedVersion;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create content version:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getContentVersions(contentId: string, includeContent = false): Promise<ContentVersion[]> {
    const queryBuilder = this.versionRepository.createQueryBuilder('version')
      .where('version.contentId = :contentId', { contentId })
      .leftJoinAndSelect('version.author', 'author')
      .leftJoinAndSelect('version.reviewer', 'reviewer')
      .orderBy('version.version', 'DESC');

    if (!includeContent) {
      queryBuilder.select([
        'version.id',
        'version.version',
        'version.title',
        'version.description',
        'version.status',
        'version.changeType',
        'version.changeDescription',
        'version.size',
        'version.createdAt',
        'version.updatedAt',
        'version.publishedAt',
        'author.id',
        'author.firstName',
        'author.lastName',
        'reviewer.id',
        'reviewer.firstName',
        'reviewer.lastName',
      ]);
    }

    return queryBuilder.getMany();
  }

  async getContentVersion(versionId: string): Promise<ContentVersion> {
    const version = await this.versionRepository.findOne({
      where: { id: versionId },
      relations: ['content', 'author', 'reviewer'],
    });

    if (!version) {
      throw new NotFoundException(`Content version with ID ${versionId} not found`);
    }

    return version;
  }

  async compareVersions(version1Id: string, version2Id: string): Promise<{
    version1: ContentVersion;
    version2: ContentVersion;
    differences: any;
  }> {
    const [version1, version2] = await Promise.all([
      this.getContentVersion(version1Id),
      this.getContentVersion(version2Id),
    ]);

    // Simple content comparison - in production, you'd use a more sophisticated diff algorithm
    const differences = this.generateContentDiff(version1.content, version2.content);

    return {
      version1,
      version2,
      differences,
    };
  }

  async restoreVersion(versionId: string, authorId: string): Promise<ContentVersion> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sourceVersion = await this.getContentVersion(versionId);
      
      // Create a new version based on the source version
      const newVersion = await this.createContentVersion(
        sourceVersion.contentId,
        {
          title: sourceVersion.title,
          description: sourceVersion.description,
          content: sourceVersion.content,
          metadata: sourceVersion.metadata,
          changeDescription: `Restored from version ${sourceVersion.version}`,
          authorId,
        }
      );

      newVersion.changeType = ChangeType.RESTORED;
      await queryRunner.manager.save(newVersion);

      await queryRunner.commitTransaction();
      this.logger.log(`Restored version ${sourceVersion.version} as new version for content ${sourceVersion.contentId}`);
      
      return newVersion;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Approval Workflow Management
  async requestApproval(
    contentId: string,
    versionId: string,
    approvalType: ApprovalType,
    requesterId: string,
    approverId?: string,
    requestNotes?: string,
    dueDate?: Date
  ): Promise<ContentApproval> {
    const approval = this.approvalRepository.create({
      contentId,
      versionId,
      type: approvalType,
      requesterId,
      approverId,
      requestNotes,
      dueDate,
      status: ApprovalStatus.PENDING,
    });

    const savedApproval = await this.approvalRepository.save(approval);
    this.logger.log(`Approval request created for content ${contentId}, version ${versionId}`);
    
    return savedApproval;
  }

  async reviewContent(
    approvalId: string,
    reviewDto: ReviewContentDto,
    reviewerId: string
  ): Promise<ContentApproval> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const approval = await this.approvalRepository.findOne({
        where: { id: approvalId },
        relations: ['content', 'version'],
      });

      if (!approval) {
        throw new NotFoundException(`Approval with ID ${approvalId} not found`);
      }

      if (approval.approverId !== reviewerId) {
        throw new ForbiddenException('You are not authorized to review this content');
      }

      // Update approval
      approval.status = reviewDto.status;
      approval.approverId = reviewerId;
      approval.approverNotes = reviewDto.approverNotes;
      approval.checklist = reviewDto.checklist;
      approval.reviewCriteria = reviewDto.reviewCriteria;
      approval.reviewCompletedAt = new Date();
      
      if (!approval.reviewStartedAt) {
        approval.reviewStartedAt = new Date();
      }
      
      approval.reviewTimeMinutes = approval.timeToReview;

      await queryRunner.manager.save(approval);

      // Update version status based on approval
      if (approval.version) {
        if (reviewDto.status === ApprovalStatus.APPROVED) {
          approval.version.status = VersionStatus.APPROVED;
          approval.version.reviewerId = reviewerId;
          approval.version.reviewedAt = new Date();
        } else if (reviewDto.status === ApprovalStatus.REJECTED) {
          approval.version.status = VersionStatus.REJECTED;
          approval.version.reviewerId = reviewerId;
          approval.version.reviewedAt = new Date();
        }
        
        await queryRunner.manager.save(approval.version);
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Content approval ${approvalId} reviewed with status: ${reviewDto.status}`);
      
      return approval;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async publishVersion(versionId: string, publisherId: string): Promise<ContentVersion> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const version = await this.versionRepository.findOne({
        where: { id: versionId },
        relations: ['content'],
      });

      if (!version) {
        throw new NotFoundException(`Version with ID ${versionId} not found`);
      }

      if (version.status !== VersionStatus.APPROVED) {
        throw new BadRequestException('Only approved versions can be published');
      }

      // Update version status
      version.status = VersionStatus.PUBLISHED;
      version.publishedAt = new Date();
      await queryRunner.manager.save(version);

      // Update content to use this version
      const content = version.content;
      content.currentVersion = version.version;
      content.status = ContentStatus.PUBLISHED;
      content.publishedAt = new Date();
      await queryRunner.manager.save(content);

      // Mark other versions as non-current
      await queryRunner.manager.update(
        ContentVersion,
        { contentId: content.id, status: VersionStatus.PUBLISHED },
        { status: VersionStatus.APPROVED }
      );

      await queryRunner.commitTransaction();
      this.logger.log(`Published version ${version.version} for content ${content.id}`);
      
      return version;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getApprovalQueue(
    approverId?: string,
    status?: ApprovalStatus,
    type?: ApprovalType
  ): Promise<ContentApproval[]> {
    const queryBuilder = this.approvalRepository.createQueryBuilder('approval')
      .leftJoinAndSelect('approval.content', 'content')
      .leftJoinAndSelect('approval.version', 'version')
      .leftJoinAndSelect('approval.requester', 'requester')
      .leftJoinAndSelect('approval.approver', 'approver')
      .orderBy('approval.priority', 'ASC')
      .addOrderBy('approval.createdAt', 'ASC');

    if (approverId) {
      queryBuilder.andWhere('approval.approverId = :approverId', { approverId });
    }

    if (status) {
      queryBuilder.andWhere('approval.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('approval.type = :type', { type });
    }

    return queryBuilder.getMany();
  }

  // Media Asset Management
  async uploadMediaAsset(
    file: Express.Multer.File,
    uploaderId: string,
    metadata?: Record<string, any>
  ): Promise<MediaAsset> {
    const assetType = this.determineAssetType(file.mimetype);
    
    const asset = this.mediaRepository.create({
      filename: file.filename,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      type: assetType,
      url: `/uploads/${file.filename}`, // This would be a CDN URL in production
      uploaderId,
      checksum: this.calculateFileChecksum(file.buffer),
      metadata,
      storageProvider: 'local', // Would be AWS S3, etc. in production
      storageKey: file.filename,
      status: AssetStatus.READY,
    });

    const savedAsset = await this.mediaRepository.save(asset);
    this.logger.log(`Media asset uploaded: ${file.originalname} (${savedAsset.id})`);
    
    return savedAsset;
  }

  async getMediaAssets(
    uploaderId?: string,
    type?: AssetType,
    status?: AssetStatus
  ): Promise<MediaAsset[]> {
    const where: any = {};
    
    if (uploaderId) where.uploaderId = uploaderId;
    if (type) where.type = type;
    if (status) where.status = status;

    return this.mediaRepository.find({
      where,
      relations: ['uploader'],
      order: { createdAt: 'DESC' },
    });
  }

  async deleteMediaAsset(assetId: string, userId: string): Promise<void> {
    const asset = await this.mediaRepository.findOne({ where: { id: assetId } });
    
    if (!asset) {
      throw new NotFoundException(`Media asset with ID ${assetId} not found`);
    }

    if (asset.uploaderId !== userId) {
      throw new ForbiddenException('You can only delete your own media assets');
    }

    await this.mediaRepository.remove(asset);
    this.logger.log(`Media asset deleted: ${assetId}`);
  }


  // Helper methods
  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private calculateFileChecksum(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private determineAssetType(mimeType: string): AssetType {
    if (mimeType.startsWith('image/')) return AssetType.IMAGE;
    if (mimeType.startsWith('video/')) return AssetType.VIDEO;
    if (mimeType.startsWith('audio/')) return AssetType.AUDIO;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return AssetType.DOCUMENT;
    }
    if (mimeType.includes('zip') || mimeType.includes('archive')) return AssetType.ARCHIVE;
    return AssetType.OTHER;
  }

  private generateContentDiff(content1: any, content2: any): any {
    // Simple diff implementation - in production, use a proper diff library
    const changes: any = {};
    
    for (const key in content2) {
      if (content1[key] !== content2[key]) {
        changes[key] = {
          old: content1[key],
          new: content2[key],
        };
      }
    }

    return changes;
  }

  private calculateAverageReviewTime(approvals: ContentApproval[]): number {
    const completedApprovals = approvals.filter(a => a.reviewCompletedAt && a.reviewStartedAt);
    if (completedApprovals.length === 0) return 0;

    const totalTime = completedApprovals.reduce((sum, approval) => sum + approval.timeToReview, 0);
    return Math.round(totalTime / completedApprovals.length);
  }

  private buildContentTimeline(versions: ContentVersion[], approvals: ContentApproval[]): any[] {
    const events = [];

    versions.forEach(version => {
      events.push({
        type: 'version',
        date: version.createdAt,
        version: version.version,
        action: version.changeType,
        description: version.changeDescription || `Version ${version.version} ${version.changeType}`,
        author: version.author,
      });

      if (version.publishedAt) {
        events.push({
          type: 'publish',
          date: version.publishedAt,
          version: version.version,
          action: 'published',
          description: `Version ${version.version} published`,
        });
      }
    });

    approvals.forEach(approval => {
      events.push({
        type: 'approval',
        date: approval.createdAt,
        action: 'approval_requested',
        description: `${approval.type} approval requested`,
        requester: approval.requester,
      });

      if (approval.reviewCompletedAt) {
        events.push({
          type: 'review',
          date: approval.reviewCompletedAt,
          action: approval.status,
          description: `Content ${approval.status}`,
          approver: approval.approver,
        });
      }
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}