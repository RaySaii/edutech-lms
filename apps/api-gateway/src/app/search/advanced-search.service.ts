import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  SearchIndex,
  SearchQuery,
  SearchResultClick,
  SearchSuggestion,
  SearchFilter,
  SearchAnalytics,
  SearchPersonalization,
  SearchIndexType,
  SearchSuggestionType,
  SearchResultType,
  SearchFilterType,
  User,
  Course,
  Content,
} from '@edutech-lms/database';

export interface SearchRequest {
  query: string;
  userId?: string;
  organizationId: string;
  indices?: SearchIndexType[];
  filters?: Record<string, any>;
  facets?: string[];
  sorting?: Array<{
    field: string;
    order: 'asc' | 'desc';
  }>;
  pagination?: {
    from: number;
    size: number;
  };
  highlighting?: boolean;
  suggestions?: boolean;
  personalized?: boolean;
}

export interface SearchResponse {
  query: string;
  total: number;
  took: number;
  results: SearchResult[];
  aggregations?: Record<string, any>;
  suggestions?: string[];
  filters?: SearchFilterData[];
  pagination: {
    current: number;
    size: number;
    total: number;
    pages: number;
  };
  personalization?: {
    applied_boosts: Array<{
      field: string;
      boost: number;
      reason: string;
    }>;
    hidden_results: number;
  };
}

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  score: number;
  highlights?: Record<string, string[]>;
  metadata: {
    category?: string;
    author?: string;
    tags?: string[];
    rating?: number;
    difficulty?: string;
    duration?: number;
    price?: number;
    language?: string;
    created_at?: string;
    updated_at?: string;
  };
  personalization?: {
    boost_applied?: number;
    recommendation_reason?: string;
    user_interaction?: {
      viewed: boolean;
      completed: boolean;
      bookmarked: boolean;
      rating?: number;
    };
  };
}

export interface SearchFilterData {
  type: SearchFilterType;
  name: string;
  displayName: string;
  values: Array<{
    value: string | number;
    label: string;
    count: number;
  }>;
  configuration: any;
}

export interface IndexingRequest {
  indexType: SearchIndexType;
  organizationId: string;
  documents?: any[];
  documentIds?: string[];
  operation: 'index' | 'update' | 'delete' | 'bulk';
  settings?: any;
}

@Injectable()
export class AdvancedSearchService {
  private readonly logger = new Logger(AdvancedSearchService.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @InjectRepository(SearchIndex)
    private searchIndexRepository: Repository<SearchIndex>,
    @InjectRepository(SearchQuery)
    private searchQueryRepository: Repository<SearchQuery>,
    @InjectRepository(SearchResultClick)
    private searchClickRepository: Repository<SearchResultClick>,
    @InjectRepository(SearchSuggestion)
    private searchSuggestionRepository: Repository<SearchSuggestion>,
    @InjectRepository(SearchFilter)
    private searchFilterRepository: Repository<SearchFilter>,
    @InjectRepository(SearchAnalytics)
    private searchAnalyticsRepository: Repository<SearchAnalytics>,
    @InjectRepository(SearchPersonalization)
    private personalizationRepository: Repository<SearchPersonalization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectQueue('search-indexing') private indexingQueue: Queue,
    @InjectQueue('search-analytics') private analyticsQueue: Queue,
  ) {}

  // Main search functionality

  async search(request: SearchRequest): Promise<SearchResponse> {
    try {
      this.logger.log(`Executing search: "${request.query}" for organization: ${request.organizationId}`);

      // Get active search indices
      const indices = await this.getActiveIndices(request.organizationId, request.indices);
      if (indices.length === 0) {
        throw new Error('No active search indices found');
      }

      // Build Elasticsearch query
      const esQuery = await this.buildElasticsearchQuery(request, indices);

      // Apply personalization if requested
      if (request.personalized && request.userId) {
        await this.applyPersonalization(esQuery, request.userId);
      }

      // Execute search
      const searchResult = await this.elasticsearchService.search({
        index: indices.map(idx => idx.aliasName),
        body: esQuery,
      });

      // Process and format results
      const formattedResponse = await this.formatSearchResponse(
        searchResult,
        request,
        indices
      );

      // Log search query for analytics
      await this.logSearchQuery(request, formattedResponse);

      // Queue suggestions update
      if (request.suggestions) {
        await this.indexingQueue.add('update-suggestions', {
          query: request.query,
          organizationId: request.organizationId,
          hasResults: formattedResponse.total > 0,
        });
      }

      return formattedResponse;
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async searchWithAutoComplete(
    query: string,
    organizationId: string,
    limit = 10
  ): Promise<string[]> {
    try {
      // Get suggestions from database
      const suggestions = await this.searchSuggestionRepository.find({
        where: {
          organizationId,
          isActive: true,
        },
        order: { popularity: 'DESC' },
        take: limit * 2,
      });

      // Filter suggestions based on query
      const filteredSuggestions = suggestions
        .filter(s => s.text.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit)
        .map(s => s.displayText || s.text);

      // Add Elasticsearch completion suggestions
      const esCompletion = await this.getElasticsearchCompletion(query, organizationId);
      
      // Combine and deduplicate
      const combined = [...new Set([...filteredSuggestions, ...esCompletion])];

      return combined.slice(0, limit);
    } catch (error) {
      this.logger.error(`Autocomplete failed: ${error.message}`);
      return [];
    }
  }

  private async getElasticsearchCompletion(
    query: string,
    organizationId: string
  ): Promise<string[]> {
    try {
      const indices = await this.getActiveIndices(organizationId);
      if (indices.length === 0) return [];

      const response = await this.elasticsearchService.search({
        index: indices.map(idx => idx.aliasName),
        body: {
          suggest: {
            text_suggest: {
              prefix: query,
              completion: {
                field: 'suggest',
                size: 5,
              },
            },
          },
          size: 0,
        },
      });

      const suggestions = response.body.suggest?.text_suggest?.[0]?.options || [];
      return suggestions.map((option: any) => option.text);
    } catch (error) {
      this.logger.error(`Elasticsearch completion failed: ${error.message}`);
      return [];
    }
  }

  // Index management

  async createSearchIndex(
    organizationId: string,
    indexType: SearchIndexType,
    configuration?: any
  ): Promise<SearchIndex> {
    try {
      const indexName = `${organizationId}-${indexType}-${Date.now()}`;
      const aliasName = `${organizationId}-${indexType}`;

      // Define default mapping based on index type
      const mapping = this.getDefaultMapping(indexType);

      // Create Elasticsearch index
      await this.elasticsearchService.indices.create({
        index: indexName,
        body: {
          mappings: mapping,
          settings: configuration?.settings || this.getDefaultSettings(),
        },
      });

      // Create or update alias
      await this.elasticsearchService.indices.putAlias({
        index: indexName,
        name: aliasName,
      });

      // Save index configuration to database
      const searchIndex = this.searchIndexRepository.create({
        organizationId,
        indexType,
        indexName,
        aliasName,
        mapping,
        configuration: configuration || {},
        isActive: true,
        isRealtimeSync: configuration?.isRealtimeSync || false,
        documentCount: 0,
      });

      const savedIndex = await this.searchIndexRepository.save(searchIndex);

      this.logger.log(`Created search index: ${indexName} for organization: ${organizationId}`);

      return savedIndex;
    } catch (error) {
      this.logger.error(`Failed to create search index: ${error.message}`, error.stack);
      throw error;
    }
  }

  async indexDocuments(request: IndexingRequest): Promise<void> {
    try {
      const searchIndex = await this.searchIndexRepository.findOne({
        where: {
          organizationId: request.organizationId,
          indexType: request.indexType,
          isActive: true,
        },
      });

      if (!searchIndex) {
        throw new Error(`No active search index found for type: ${request.indexType}`);
      }

      switch (request.operation) {
        case 'bulk':
          await this.bulkIndexDocuments(searchIndex, request.documents || []);
          break;
        case 'index':
          await this.indexSingleDocument(searchIndex, request.documents?.[0]);
          break;
        case 'update':
          await this.updateDocument(searchIndex, request.documents?.[0]);
          break;
        case 'delete':
          await this.deleteDocuments(searchIndex, request.documentIds || []);
          break;
      }

      // Update document count
      const countResponse = await this.elasticsearchService.count({
        index: searchIndex.aliasName,
      });
      
      searchIndex.documentCount = countResponse.body.count;
      searchIndex.lastSyncedAt = new Date();
      await this.searchIndexRepository.save(searchIndex);

    } catch (error) {
      this.logger.error(`Document indexing failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async bulkIndexDocuments(searchIndex: SearchIndex, documents: any[]): Promise<void> {
    if (documents.length === 0) return;

    const body: any[] = [];
    
    for (const doc of documents) {
      body.push({ index: { _index: searchIndex.aliasName, _id: doc.id } });
      body.push(this.transformDocumentForIndexing(doc, searchIndex.indexType));
    }

    const response = await this.elasticsearchService.bulk({ body });

    if (response.body.errors) {
      this.logger.error(`Bulk indexing had errors`, response.body.items);
    }

    this.logger.log(`Bulk indexed ${documents.length} documents to ${searchIndex.aliasName}`);
  }

  private async indexSingleDocument(searchIndex: SearchIndex, document: any): Promise<void> {
    if (!document) return;

    const transformedDoc = this.transformDocumentForIndexing(document, searchIndex.indexType);

    await this.elasticsearchService.index({
      index: searchIndex.aliasName,
      id: document.id,
      body: transformedDoc,
    });
  }

  private async updateDocument(searchIndex: SearchIndex, document: any): Promise<void> {
    if (!document) return;

    const transformedDoc = this.transformDocumentForIndexing(document, searchIndex.indexType);

    await this.elasticsearchService.update({
      index: searchIndex.aliasName,
      id: document.id,
      body: { doc: transformedDoc },
    });
  }

  private async deleteDocuments(searchIndex: SearchIndex, documentIds: string[]): Promise<void> {
    if (documentIds.length === 0) return;

    const body: any[] = [];
    
    for (const id of documentIds) {
      body.push({ delete: { _index: searchIndex.aliasName, _id: id } });
    }

    await this.elasticsearchService.bulk({ body });
  }

  private transformDocumentForIndexing(document: any, indexType: SearchIndexType): any {
    const baseTransform = {
      id: document.id,
      title: document.title || document.name,
      description: document.description,
      content: document.content || document.body,
      tags: document.tags || [],
      created_at: document.createdAt,
      updated_at: document.updatedAt,
      suggest: {
        input: [
          document.title || document.name,
          ...(document.tags || []),
        ].filter(Boolean),
        weight: this.calculateDocumentWeight(document, indexType),
      },
    };

    // Add type-specific fields
    switch (indexType) {
      case SearchIndexType.COURSES:
        return {
          ...baseTransform,
          instructor: document.instructor?.name,
          instructor_id: document.instructor?.id,
          category: document.category,
          difficulty: document.difficulty,
          rating: document.averageRating,
          price: document.price,
          duration: document.estimatedDuration,
          language: document.language,
          enrollment_count: document.enrollmentCount,
          completion_rate: document.completionRate,
        };

      case SearchIndexType.CONTENT:
        return {
          ...baseTransform,
          course_id: document.courseId,
          course_title: document.course?.title,
          content_type: document.contentType,
          duration: document.estimatedDuration,
          difficulty: document.difficulty,
          order: document.order,
        };

      case SearchIndexType.USERS:
        return {
          ...baseTransform,
          email: document.email,
          role: document.role,
          profile: document.profile,
          skills: document.skills || [],
          location: document.location,
        };

      default:
        return baseTransform;
    }
  }

  private calculateDocumentWeight(document: any, indexType: SearchIndexType): number {
    let weight = 1;

    // Base weight on popularity/engagement
    if (document.viewCount) weight += Math.log10(document.viewCount + 1);
    if (document.enrollmentCount) weight += Math.log10(document.enrollmentCount + 1);
    if (document.rating) weight += document.rating;

    // Boost recent content
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(document.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreation < 30) weight += 2;
    else if (daysSinceCreation < 90) weight += 1;

    return Math.min(weight, 10); // Cap at 10
  }

  // Query building

  private async buildElasticsearchQuery(
    request: SearchRequest,
    indices: SearchIndex[]
  ): Promise<any> {
    const query: any = {
      size: request.pagination?.size || 20,
      from: request.pagination?.from || 0,
      track_total_hits: true,
    };

    // Build main query
    if (request.query.trim()) {
      query.query = {
        bool: {
          must: [
            {
              multi_match: {
                query: request.query,
                fields: [
                  'title^3',
                  'description^2',
                  'content',
                  'tags^2',
                  'instructor^2',
                ],
                type: 'best_fields',
                fuzziness: 'AUTO',
                operator: 'and',
                minimum_should_match: '75%',
              },
            },
          ],
          should: [
            // Boost exact phrase matches
            {
              multi_match: {
                query: request.query,
                fields: ['title^5', 'description^3'],
                type: 'phrase',
                boost: 2,
              },
            },
            // Boost title matches
            {
              match: {
                title: {
                  query: request.query,
                  boost: 3,
                },
              },
            },
          ],
        },
      };
    } else {
      query.query = { match_all: {} };
    }

    // Apply filters
    if (request.filters && Object.keys(request.filters).length > 0) {
      query.query.bool = query.query.bool || {};
      query.query.bool.filter = [];

      for (const [field, value] of Object.entries(request.filters)) {
        if (Array.isArray(value)) {
          query.query.bool.filter.push({
            terms: { [field]: value },
          });
        } else if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
          query.query.bool.filter.push({
            range: {
              [field]: {
                gte: value.min,
                lte: value.max,
              },
            },
          });
        } else {
          query.query.bool.filter.push({
            term: { [field]: value },
          });
        }
      }
    }

    // Add sorting
    if (request.sorting && request.sorting.length > 0) {
      query.sort = request.sorting.map(sort => ({
        [sort.field]: { order: sort.order },
      }));
    } else {
      // Default sorting by relevance and popularity
      query.sort = [
        '_score',
        { 'suggest.weight': { order: 'desc' } },
        { created_at: { order: 'desc' } },
      ];
    }

    // Add aggregations for faceted search
    if (request.facets && request.facets.length > 0) {
      query.aggs = {};
      for (const facet of request.facets) {
        query.aggs[facet] = {
          terms: {
            field: facet,
            size: 50,
          },
        };
      }
    }

    // Add highlighting
    if (request.highlighting) {
      query.highlight = {
        fields: {
          title: {},
          description: {},
          content: {
            fragment_size: 150,
            number_of_fragments: 3,
          },
        },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>'],
      };
    }

    return query;
  }

  // Personalization

  private async applyPersonalization(query: any, userId: string): Promise<void> {
    try {
      const personalization = await this.personalizationRepository.findOne({
        where: { userId },
      });

      if (!personalization) return;

      const { preferences, searchBehavior, boostingRules } = personalization;

      // Apply preference-based boosting
      if (preferences.preferred_categories?.length > 0) {
        query.query.bool = query.query.bool || {};
        query.query.bool.should = query.query.bool.should || [];
        query.query.bool.should.push({
          terms: {
            category: preferences.preferred_categories,
            boost: 2,
          },
        });
      }

      // Apply custom boosting rules
      if (boostingRules?.length > 0) {
        for (const rule of boostingRules) {
          query.query.bool.should.push({
            terms: {
              [rule.field]: rule.values,
              boost: rule.boost_factor,
            },
          });
        }
      }

      // Filter out hidden results
      if (personalization.hiddenResults?.length > 0) {
        query.query.bool.must_not = query.query.bool.must_not || [];
        query.query.bool.must_not.push({
          terms: {
            id: personalization.hiddenResults.map(hr => hr.result_id),
          },
        });
      }
    } catch (error) {
      this.logger.error(`Personalization failed: ${error.message}`);
    }
  }

  // Response formatting

  private async formatSearchResponse(
    esResponse: any,
    request: SearchRequest,
    indices: SearchIndex[]
  ): Promise<SearchResponse> {
    const hits = esResponse.body.hits;
    const aggregations = esResponse.body.aggregations;

    const results: SearchResult[] = hits.hits.map((hit: any) => ({
      id: hit._source.id,
      type: this.inferResultType(hit._source, hit._index),
      title: hit._source.title,
      description: hit._source.description,
      url: this.generateResultUrl(hit._source, hit._index),
      thumbnail: hit._source.thumbnail,
      score: hit._score,
      highlights: hit.highlight,
      metadata: {
        category: hit._source.category,
        author: hit._source.instructor,
        tags: hit._source.tags,
        rating: hit._source.rating,
        difficulty: hit._source.difficulty,
        duration: hit._source.duration,
        price: hit._source.price,
        language: hit._source.language,
        created_at: hit._source.created_at,
        updated_at: hit._source.updated_at,
      },
    }));

    const response: SearchResponse = {
      query: request.query,
      total: hits.total.value,
      took: esResponse.body.took,
      results,
      pagination: {
        current: Math.floor((request.pagination?.from || 0) / (request.pagination?.size || 20)) + 1,
        size: request.pagination?.size || 20,
        total: hits.total.value,
        pages: Math.ceil(hits.total.value / (request.pagination?.size || 20)),
      },
    };

    // Add aggregations as filters
    if (aggregations) {
      response.aggregations = aggregations;
      response.filters = await this.formatAggregationsAsFilters(aggregations, request.organizationId);
    }

    // Add suggestions if requested
    if (request.suggestions) {
      response.suggestions = await this.searchWithAutoComplete(
        request.query,
        request.organizationId,
        5
      );
    }

    return response;
  }

  private inferResultType(source: any, index: string): SearchResultType {
    if (index.includes('courses')) return SearchResultType.COURSE;
    if (index.includes('content')) return SearchResultType.LESSON;
    if (index.includes('videos')) return SearchResultType.VIDEO;
    if (index.includes('documents')) return SearchResultType.DOCUMENT;
    if (index.includes('users')) return SearchResultType.USER;
    return SearchResultType.COURSE; // default
  }

  private generateResultUrl(source: any, index: string): string {
    const type = this.inferResultType(source, index);
    
    switch (type) {
      case SearchResultType.COURSE:
        return `/courses/${source.id}`;
      case SearchResultType.LESSON:
        return `/courses/${source.course_id}/lessons/${source.id}`;
      case SearchResultType.VIDEO:
        return `/videos/${source.id}`;
      case SearchResultType.DOCUMENT:
        return `/documents/${source.id}`;
      case SearchResultType.USER:
        return `/users/${source.id}`;
      default:
        return `/search/result/${source.id}`;
    }
  }

  private async formatAggregationsAsFilters(
    aggregations: any,
    organizationId: string
  ): Promise<SearchFilterData[]> {
    const filters: SearchFilterData[] = [];

    for (const [key, agg] of Object.entries(aggregations)) {
      if ((agg as any).buckets) {
        filters.push({
          type: this.mapAggregationToFilterType(key),
          name: key,
          displayName: this.humanizeFilterName(key),
          values: (agg as any).buckets.map((bucket: any) => ({
            value: bucket.key,
            label: bucket.key,
            count: bucket.doc_count,
          })),
          configuration: {},
        });
      }
    }

    return filters;
  }

  private mapAggregationToFilterType(key: string): SearchFilterType {
    const mapping: Record<string, SearchFilterType> = {
      category: SearchFilterType.CATEGORY,
      difficulty: SearchFilterType.DIFFICULTY,
      instructor: SearchFilterType.INSTRUCTOR,
      rating: SearchFilterType.RATING,
      price: SearchFilterType.PRICE,
      language: SearchFilterType.LANGUAGE,
      content_type: SearchFilterType.CONTENT_TYPE,
    };

    return mapping[key] || SearchFilterType.CATEGORY;
  }

  private humanizeFilterName(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // Analytics and logging

  private async logSearchQuery(request: SearchRequest, response: SearchResponse): Promise<void> {
    try {
      const searchQuery = this.searchQueryRepository.create({
        userId: request.userId,
        organizationId: request.organizationId,
        searchIndexId: '', // Would need to determine primary index
        queryText: request.query,
        normalizedQuery: request.query.toLowerCase().trim(),
        filters: request.filters,
        facets: request.facets?.reduce((acc, facet) => {
          acc[facet] = true;
          return acc;
        }, {} as Record<string, any>),
        sorting: request.sorting,
        resultsCount: response.total,
        hasResults: response.total > 0,
        executionTimeMs: response.took,
        resultMetrics: {
          total_hits: response.total,
          max_score: response.results[0]?.score || 0,
          took_ms: response.took,
          timed_out: false,
          shards_info: {
            total: 1,
            successful: 1,
            skipped: 0,
            failed: 0,
          },
        },
        executedAt: new Date(),
      });

      await this.searchQueryRepository.save(searchQuery);

      // Queue analytics processing
      await this.analyticsQueue.add('process-search-query', {
        queryId: searchQuery.id,
      });
    } catch (error) {
      this.logger.error(`Failed to log search query: ${error.message}`);
    }
  }

  // Utility methods

  private async getActiveIndices(
    organizationId: string,
    types?: SearchIndexType[]
  ): Promise<SearchIndex[]> {
    const where: any = {
      organizationId,
      isActive: true,
    };

    if (types && types.length > 0) {
      where.indexType = { $in: types } as any;
    }

    return this.searchIndexRepository.find({ where });
  }

  private getDefaultMapping(indexType: SearchIndexType): any {
    const baseMapping = {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'standard',
          fields: {
            keyword: { type: 'keyword' },
            suggest: { type: 'completion' },
          },
        },
        description: {
          type: 'text',
          analyzer: 'standard',
        },
        content: {
          type: 'text',
          analyzer: 'standard',
        },
        tags: {
          type: 'keyword',
        },
        created_at: {
          type: 'date',
        },
        updated_at: {
          type: 'date',
        },
        suggest: {
          type: 'completion',
          analyzer: 'simple',
          preserve_separators: true,
          preserve_position_increments: true,
          max_input_length: 50,
        },
      },
    };

    // Add type-specific mappings
    switch (indexType) {
      case SearchIndexType.COURSES:
        baseMapping.properties = {
          ...baseMapping.properties,
          instructor: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          category: { type: 'keyword' },
          difficulty: { type: 'keyword' },
          rating: { type: 'float' },
          price: { type: 'float' },
          duration: { type: 'integer' },
          language: { type: 'keyword' },
          enrollment_count: { type: 'integer' },
        };
        break;

      case SearchIndexType.CONTENT:
        baseMapping.properties = {
          ...baseMapping.properties,
          course_id: { type: 'keyword' },
          content_type: { type: 'keyword' },
          duration: { type: 'integer' },
          difficulty: { type: 'keyword' },
          order: { type: 'integer' },
        };
        break;
    }

    return baseMapping;
  }

  private getDefaultSettings(): any {
    return {
      number_of_shards: 1,
      number_of_replicas: 1,
      analysis: {
        analyzer: {
          custom_text_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'stop', 'snowball'],
          },
          autocomplete_analyzer: {
            type: 'custom',
            tokenizer: 'keyword',
            filter: ['lowercase'],
          },
        },
      },
    };
  }

  // Background jobs and maintenance

  @Cron(CronExpression.EVERY_HOUR)
  async syncIndices(): Promise<void> {
    try {
      const activeIndices = await this.searchIndexRepository.find({
        where: { isActive: true },
      });

      for (const index of activeIndices) {
        if (index.isRealtimeSync) continue; // Skip real-time synced indices

        await this.indexingQueue.add('full-sync', {
          indexId: index.id,
          indexType: index.indexType,
          organizationId: index.organizationId,
        });
      }

      this.logger.log(`Queued sync for ${activeIndices.length} search indices`);
    } catch (error) {
      this.logger.error(`Failed to queue index sync: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async optimizeIndices(): Promise<void> {
    try {
      // Force merge Elasticsearch indices
      const response = await this.elasticsearchService.indices.forcemerge({
        index: '_all',
        max_num_segments: 1,
      });

      this.logger.log('Optimized search indices', response.body);
    } catch (error) {
      this.logger.error(`Failed to optimize indices: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async generateAnalytics(): Promise<void> {
    try {
      const organizations = await this.searchIndexRepository
        .createQueryBuilder('si')
        .select('DISTINCT si.organizationId', 'organizationId')
        .getRawMany();

      for (const org of organizations) {
        await this.analyticsQueue.add('generate-daily-analytics', {
          organizationId: org.organizationId,
          date: new Date(),
        });
      }

      this.logger.log(`Queued analytics generation for ${organizations.length} organizations`);
    } catch (error) {
      this.logger.error(`Failed to queue analytics generation: ${error.message}`);
    }
  }
}