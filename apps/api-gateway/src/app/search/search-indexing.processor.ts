import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import {
  SearchIndex,
  SearchSuggestion,
  SearchAnalytics,
  SearchQuery,
  SearchIndexType,
  SearchSuggestionType,
  Course,
  Content,
  User,
  Organization,
} from '@edutech-lms/database';

@Processor('search-indexing')
export class SearchIndexingProcessor {
  private readonly logger = new Logger(SearchIndexingProcessor.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @InjectRepository(SearchIndex)
    private searchIndexRepository: Repository<SearchIndex>,
    @InjectRepository(SearchSuggestion)
    private suggestionRepository: Repository<SearchSuggestion>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  @Process('full-sync')
  async handleFullSync(job: Job<{
    indexId: string;
    indexType: SearchIndexType;
    organizationId: string;
  }>) {
    const { indexId, indexType, organizationId } = job.data;

    try {
      this.logger.log(`Starting full sync for index: ${indexId} (${indexType})`);

      const searchIndex = await this.searchIndexRepository.findOne({
        where: { id: indexId },
      });

      if (!searchIndex) {
        throw new Error(`Search index not found: ${indexId}`);
      }

      const startTime = Date.now();
      let totalDocuments = 0;

      // Get documents based on index type
      const documents = await this.getDocumentsForIndexing(indexType, organizationId);
      
      if (documents.length === 0) {
        this.logger.warn(`No documents found for indexing: ${indexType}`);
        return;
      }

      // Process documents in batches
      const batchSize = searchIndex.configuration?.batch_size || 100;
      
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        await this.indexDocumentBatch(searchIndex, batch);
        totalDocuments += batch.length;

        // Update progress
        const progress = Math.round((totalDocuments / documents.length) * 100);
        await job.progress(progress);
      }

      // Update sync statistics
      const syncDuration = Date.now() - startTime;
      const throughput = Math.round((totalDocuments / syncDuration) * 1000); // docs per second

      searchIndex.documentCount = totalDocuments;
      searchIndex.lastSyncedAt = new Date();
      searchIndex.syncStats = {
        total_documents: totalDocuments,
        successful_syncs: (searchIndex.syncStats?.successful_syncs || 0) + 1,
        failed_syncs: searchIndex.syncStats?.failed_syncs || 0,
        last_error: null,
        sync_duration_ms: syncDuration,
        throughput_docs_per_sec: throughput,
      };

      await this.searchIndexRepository.save(searchIndex);

      this.logger.log(`Full sync completed for ${indexId}: ${totalDocuments} documents in ${syncDuration}ms`);
    } catch (error) {
      this.logger.error(`Full sync failed for ${indexId}: ${error.message}`, error.stack);

      // Update error statistics
      const searchIndex = await this.searchIndexRepository.findOne({
        where: { id: indexId },
      });

      if (searchIndex) {
        searchIndex.syncStats = {
          ...searchIndex.syncStats,
          failed_syncs: (searchIndex.syncStats?.failed_syncs || 0) + 1,
          last_error: error.message,
        } as any;
        await this.searchIndexRepository.save(searchIndex);
      }

      throw error;
    }
  }

  @Process('incremental-sync')
  async handleIncrementalSync(job: Job<{
    indexId: string;
    documentIds: string[];
    operation: 'index' | 'update' | 'delete';
  }>) {
    const { indexId, documentIds, operation } = job.data;

    try {
      this.logger.log(`Starting incremental sync: ${operation} ${documentIds.length} documents`);

      const searchIndex = await this.searchIndexRepository.findOne({
        where: { id: indexId },
      });

      if (!searchIndex) {
        throw new Error(`Search index not found: ${indexId}`);
      }

      switch (operation) {
        case 'index':
        case 'update':
          const documents = await this.getDocumentsByIds(searchIndex.indexType, documentIds);
          await this.indexDocumentBatch(searchIndex, documents);
          break;

        case 'delete':
          await this.deleteDocuments(searchIndex, documentIds);
          break;
      }

      this.logger.log(`Incremental sync completed: ${operation} ${documentIds.length} documents`);
    } catch (error) {
      this.logger.error(`Incremental sync failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('update-suggestions')
  async handleUpdateSuggestions(job: Job<{
    query: string;
    organizationId: string;
    hasResults: boolean;
  }>) {
    const { query, organizationId, hasResults } = job.data;

    try {
      // Find existing suggestion or create new one
      let suggestion = await this.suggestionRepository.findOne({
        where: {
          organizationId,
          text: query.toLowerCase().trim(),
          suggestionType: SearchSuggestionType.QUERY,
        },
      });

      if (!suggestion) {
        suggestion = this.suggestionRepository.create({
          organizationId,
          suggestionType: SearchSuggestionType.QUERY,
          text: query.toLowerCase().trim(),
          displayText: query.trim(),
          popularity: 1,
          clickThroughRate: hasResults ? 1.0 : 0.0,
          isActive: true,
        });
      } else {
        suggestion.popularity += 1;
        
        // Update CTR based on results
        if (hasResults) {
          const totalQueries = suggestion.popularity;
          const successfulQueries = Math.round(suggestion.clickThroughRate * (totalQueries - 1)) + 1;
          suggestion.clickThroughRate = successfulQueries / totalQueries;
        }
      }

      await this.suggestionRepository.save(suggestion);

      // Generate related suggestions
      await this.generateRelatedSuggestions(query, organizationId);

    } catch (error) {
      this.logger.error(`Failed to update suggestions: ${error.message}`);
    }
  }

  @Process('optimize-indices')
  async handleOptimizeIndices(job: Job<{ organizationId: string }>) {
    const { organizationId } = job.data;

    try {
      this.logger.log(`Optimizing indices for organization: ${organizationId}`);

      const indices = await this.searchIndexRepository.find({
        where: { organizationId, isActive: true },
      });

      for (const index of indices) {
        // Force merge index
        await this.elasticsearchService.indices.forcemerge({
          index: index.aliasName,
          max_num_segments: 1,
        });

        // Clear cache
        await this.elasticsearchService.indices.clearCache({
          index: index.aliasName,
        });
      }

      this.logger.log(`Optimization completed for ${indices.length} indices`);
    } catch (error) {
      this.logger.error(`Index optimization failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('reindex')
  async handleReindex(job: Job<{
    oldIndexId: string;
    newIndexId: string;
  }>) {
    const { oldIndexId, newIndexId } = job.data;

    try {
      this.logger.log(`Starting reindex from ${oldIndexId} to ${newIndexId}`);

      const [oldIndex, newIndex] = await Promise.all([
        this.searchIndexRepository.findOne({ where: { id: oldIndexId } }),
        this.searchIndexRepository.findOne({ where: { id: newIndexId } }),
      ]);

      if (!oldIndex || !newIndex) {
        throw new Error('Index not found for reindexing');
      }

      // Use Elasticsearch reindex API
      const reindexResponse = await this.elasticsearchService.reindex({
        body: {
          source: {
            index: oldIndex.indexName,
          },
          dest: {
            index: newIndex.indexName,
          },
        },
        wait_for_completion: false, // Run async
      });

      // Monitor reindex progress
      const taskId = reindexResponse.body.task;
      await this.monitorReindexTask(taskId, job);

      // Switch alias to new index
      await this.switchIndexAlias(oldIndex, newIndex);

      // Delete old index
      await this.elasticsearchService.indices.delete({
        index: oldIndex.indexName,
      });

      this.logger.log(`Reindex completed successfully`);
    } catch (error) {
      this.logger.error(`Reindex failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Helper methods

  private async getDocumentsForIndexing(indexType: SearchIndexType, organizationId: string): Promise<any[]> {
    switch (indexType) {
      case SearchIndexType.COURSES:
        return await this.courseRepository.find({
          where: { organizationId },
          relations: ['instructor', 'organization'],
        });

      case SearchIndexType.CONTENT:
        return await this.contentRepository.find({
          where: { organizationId },
          relations: ['course'],
        });

      case SearchIndexType.USERS:
        return await this.userRepository.find({
          where: { organizationId },
          select: ['id', 'email', 'firstName', 'lastName', 'role', 'profile', 'createdAt'],
        });

      default:
        return [];
    }
  }

  private async getDocumentsByIds(indexType: SearchIndexType, documentIds: string[]): Promise<any[]> {
    switch (indexType) {
      case SearchIndexType.COURSES:
        return await this.courseRepository.findByIds(documentIds, {
          relations: ['instructor', 'organization'],
        });

      case SearchIndexType.CONTENT:
        return await this.contentRepository.findByIds(documentIds, {
          relations: ['course'],
        });

      case SearchIndexType.USERS:
        return await this.userRepository.findByIds(documentIds, {
          select: ['id', 'email', 'firstName', 'lastName', 'role', 'profile', 'createdAt'],
        });

      default:
        return [];
    }
  }

  private async indexDocumentBatch(searchIndex: SearchIndex, documents: any[]): Promise<void> {
    if (documents.length === 0) return;

    const body: any[] = [];

    for (const doc of documents) {
      const transformedDoc = this.transformDocumentForIndexing(doc, searchIndex.indexType);
      
      body.push({ index: { _index: searchIndex.aliasName, _id: doc.id } });
      body.push(transformedDoc);
    }

    const response = await this.elasticsearchService.bulk({
      body,
      refresh: 'wait_for',
    });

    if (response.body.errors) {
      const errors = response.body.items
        .filter((item: any) => item.index?.error)
        .map((item: any) => item.index.error);
      
      this.logger.error('Bulk indexing errors:', errors);
      throw new Error(`Bulk indexing failed: ${errors.length} errors`);
    }
  }

  private transformDocumentForIndexing(document: any, indexType: SearchIndexType): any {
    const baseTransform = {
      id: document.id,
      title: document.title || document.name || `${document.firstName} ${document.lastName}`.trim(),
      description: document.description || document.bio || document.profile?.bio,
      content: document.content || document.body || document.profile?.summary,
      tags: document.tags || document.skills || [],
      created_at: document.createdAt,
      updated_at: document.updatedAt,
      organization_id: document.organizationId,
    };

    // Add type-specific fields
    switch (indexType) {
      case SearchIndexType.COURSES:
        return {
          ...baseTransform,
          instructor: document.instructor?.firstName + ' ' + document.instructor?.lastName,
          instructor_id: document.instructorId,
          category: document.category,
          difficulty: document.difficulty,
          rating: document.averageRating || 0,
          price: document.price || 0,
          duration: document.estimatedDuration || 0,
          language: document.language || 'english',
          enrollment_count: document.enrollmentCount || 0,
          is_published: document.isPublished,
          suggest: {
            input: [
              document.title,
              document.category,
              ...(document.tags || []),
              document.instructor?.firstName + ' ' + document.instructor?.lastName,
            ].filter(Boolean),
            weight: this.calculateDocumentWeight(document),
          },
        };

      case SearchIndexType.CONTENT:
        return {
          ...baseTransform,
          course_id: document.courseId,
          course_title: document.course?.title,
          content_type: document.contentType,
          duration: document.estimatedDuration || 0,
          difficulty: document.difficulty,
          order: document.order || 0,
          is_published: document.isPublished,
          suggest: {
            input: [
              document.title,
              document.course?.title,
              document.contentType,
              ...(document.tags || []),
            ].filter(Boolean),
            weight: this.calculateDocumentWeight(document),
          },
        };

      case SearchIndexType.USERS:
        return {
          ...baseTransform,
          email: document.email,
          first_name: document.firstName,
          last_name: document.lastName,
          full_name: `${document.firstName} ${document.lastName}`.trim(),
          role: document.role,
          skills: document.profile?.skills || [],
          location: document.profile?.location,
          bio: document.profile?.bio,
          suggest: {
            input: [
              `${document.firstName} ${document.lastName}`.trim(),
              document.email,
              ...(document.profile?.skills || []),
            ].filter(Boolean),
            weight: this.calculateUserWeight(document),
          },
        };

      default:
        return baseTransform;
    }
  }

  private calculateDocumentWeight(document: any): number {
    let weight = 1;

    // Boost published content
    if (document.isPublished) weight += 2;

    // Boost by popularity metrics
    if (document.viewCount) weight += Math.log10(document.viewCount + 1) * 0.5;
    if (document.enrollmentCount) weight += Math.log10(document.enrollmentCount + 1);
    if (document.averageRating) weight += document.averageRating * 0.5;

    // Boost recent content
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(document.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreation < 7) weight += 3;
    else if (daysSinceCreation < 30) weight += 2;
    else if (daysSinceCreation < 90) weight += 1;

    return Math.min(weight, 15); // Cap at 15
  }

  private calculateUserWeight(user: any): number {
    let weight = 1;

    // Boost active users
    if (user.lastLoginAt) {
      const daysSinceLogin = Math.floor(
        (Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLogin < 7) weight += 2;
      else if (daysSinceLogin < 30) weight += 1;
    }

    // Boost by profile completeness
    if (user.profile?.bio) weight += 1;
    if (user.profile?.skills?.length > 0) weight += 1;
    if (user.profile?.location) weight += 0.5;

    // Boost instructors and admins
    if (user.role === 'instructor') weight += 2;
    if (user.role === 'admin') weight += 1;

    return Math.min(weight, 10);
  }

  private async deleteDocuments(searchIndex: SearchIndex, documentIds: string[]): Promise<void> {
    const body: any[] = [];

    for (const id of documentIds) {
      body.push({ delete: { _index: searchIndex.aliasName, _id: id } });
    }

    const response = await this.elasticsearchService.bulk({ body });

    if (response.body.errors) {
      this.logger.error('Delete operations had errors:', response.body.items);
    }
  }

  private async generateRelatedSuggestions(query: string, organizationId: string): Promise<void> {
    try {
      // Simple keyword extraction for related suggestions
      const keywords = query.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2)
        .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'].includes(word));

      for (const keyword of keywords) {
        // Check if keyword suggestion exists
        const existing = await this.suggestionRepository.findOne({
          where: {
            organizationId,
            text: keyword,
            suggestionType: SearchSuggestionType.TOPIC,
          },
        });

        if (!existing) {
          const suggestion = this.suggestionRepository.create({
            organizationId,
            suggestionType: SearchSuggestionType.TOPIC,
            text: keyword,
            displayText: keyword.charAt(0).toUpperCase() + keyword.slice(1),
            popularity: 1,
            clickThroughRate: 0.0,
            isActive: true,
            metadata: {
              derived_from: query,
              context: 'auto-generated',
            },
          });

          await this.suggestionRepository.save(suggestion);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to generate related suggestions: ${error.message}`);
    }
  }

  private async monitorReindexTask(taskId: string, job: Job): Promise<void> {
    const checkInterval = 5000; // 5 seconds
    const maxWaitTime = 30 * 60 * 1000; // 30 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const taskStatus = await this.elasticsearchService.tasks.get({
          task_id: taskId,
        });

        const task = taskStatus.body;
        
        if (task.completed) {
          if (task.response.failures && task.response.failures.length > 0) {
            throw new Error(`Reindex failed: ${JSON.stringify(task.response.failures)}`);
          }
          return; // Success
        }

        // Update progress
        if (task.task.status) {
          const progress = Math.round(
            (task.task.status.created / (task.task.status.total || 1)) * 100
          );
          await job.progress(progress);
        }

        await new Promise(resolve => setTimeout(resolve, checkInterval));
      } catch (error) {
        if (error.statusCode === 404) {
          // Task completed and removed
          return;
        }
        throw error;
      }
    }

    throw new Error('Reindex timed out');
  }

  private async switchIndexAlias(oldIndex: SearchIndex, newIndex: SearchIndex): Promise<void> {
    await this.elasticsearchService.indices.updateAliases({
      body: {
        actions: [
          {
            remove: {
              index: oldIndex.indexName,
              alias: oldIndex.aliasName,
            },
          },
          {
            add: {
              index: newIndex.indexName,
              alias: newIndex.aliasName,
            },
          },
        ],
      },
    });

    // Update database
    oldIndex.isActive = false;
    newIndex.isActive = true;
    
    await Promise.all([
      this.searchIndexRepository.save(oldIndex),
      this.searchIndexRepository.save(newIndex),
    ]);
  }
}