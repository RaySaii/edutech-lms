import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

export interface SearchQuery {
  query: string;
  filters?: {
    category?: string[];
    level?: string[];
    price?: { min?: number; max?: number };
    rating?: { min?: number };
    duration?: { min?: number; max?: number };
    instructor?: string[];
    tags?: string[];
    language?: string[];
  };
  sort?: {
    field: 'relevance' | 'rating' | 'price' | 'created' | 'popularity';
    order: 'asc' | 'desc';
  };
  page?: number;
  limit?: number;
  highlight?: boolean;
  facets?: boolean;
}

export interface SearchResult {
  id: string;
  type: 'course' | 'user' | 'content' | 'discussion';
  title: string;
  description?: string;
  score: number;
  highlights?: Record<string, string[]>;
  metadata?: any;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  facets?: Record<string, Array<{ key: string; count: number }>>;
  suggestions?: string[];
  took: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private client: Client;
  private readonly indexPrefix = 'edutech-lms';

  constructor(private configService: ConfigService) {
    this.initializeElasticsearch();
  }

  private initializeElasticsearch() {
    const elasticsearchUrl = this.configService.get('ELASTICSEARCH_URL', 'http://localhost:9200');
    
    this.client = new Client({
      node: elasticsearchUrl,
      auth: this.configService.get('ELASTICSEARCH_AUTH') ? {
        username: this.configService.get('ELASTICSEARCH_USERNAME'),
        password: this.configService.get('ELASTICSEARCH_PASSWORD'),
      } : undefined,
      maxRetries: 3,
      requestTimeout: 60000,
      sniffOnStart: false,
    });

    this.logger.log(`Elasticsearch client initialized: ${elasticsearchUrl}`);
  }

  async searchCourses(searchQuery: SearchQuery): Promise<SearchResponse> {
    try {
      const indexName = `${this.indexPrefix}-courses`;
      
      // Build Elasticsearch query
      const esQuery = this.buildElasticsearchQuery(searchQuery);
      
      const startTime = Date.now();
      const response = await this.client.search({
        index: indexName,
        ...esQuery,
        from: ((searchQuery.page || 1) - 1) * (searchQuery.limit || 20),
        size: searchQuery.limit || 20,
      } as any);

      const took = Date.now() - startTime;

      // Process results
      const responseBody = (response as any).body || response;
      const results: SearchResult[] = responseBody.hits.hits.map((hit: any) => ({
        id: hit._id,
        type: 'course',
        title: hit._source.title,
        description: hit._source.description,
        score: hit._score,
        highlights: searchQuery.highlight ? hit.highlight : undefined,
        metadata: {
          instructor: hit._source.instructor,
          level: hit._source.level,
          price: hit._source.price,
          rating: hit._source.rating,
          enrollmentCount: hit._source.enrollmentCount,
          duration: hit._source.duration,
          thumbnail: hit._source.thumbnail,
          tags: hit._source.tags,
        },
      }));

      // Process facets/aggregations
      const facets = searchQuery.facets ? this.processFacets(responseBody.aggregations) : undefined;

      // Generate suggestions for empty results
      const suggestions = results.length === 0 ? await this.generateSuggestions(searchQuery.query) : undefined;

      return {
        results,
        total: responseBody.hits.total.value || responseBody.hits.total,
        page: searchQuery.page || 1,
        limit: searchQuery.limit || 20,
        facets,
        suggestions,
        took,
      };
    } catch (error) {
      this.logger.error('Search error:', error);
      
      // Fallback to basic search if Elasticsearch fails
      return this.fallbackSearch(searchQuery);
    }
  }

  async searchAll(searchQuery: SearchQuery): Promise<SearchResponse> {
    try {
      const indices = [
        `${this.indexPrefix}-courses`,
        `${this.indexPrefix}-users`,
        `${this.indexPrefix}-content`,
        `${this.indexPrefix}-discussions`,
      ];

      const esQuery = this.buildElasticsearchQuery(searchQuery);
      
      const startTime = Date.now();
      const response = await this.client.search({
        index: indices.join(','),
        ...esQuery,
        from: ((searchQuery.page || 1) - 1) * (searchQuery.limit || 20),
        size: searchQuery.limit || 20,
      } as any);

      const took = Date.now() - startTime;
      const responseBody = (response as any).body || response;

      const results: SearchResult[] = responseBody.hits.hits.map((hit: any) => ({
        id: hit._id,
        type: this.getTypeFromIndex(hit._index),
        title: hit._source.title || hit._source.name || hit._source.subject,
        description: hit._source.description || hit._source.content,
        score: hit._score,
        highlights: searchQuery.highlight ? hit.highlight : undefined,
        metadata: hit._source,
      }));

      return {
        results,
        total: responseBody.hits.total.value || responseBody.hits.total,
        page: searchQuery.page || 1,
        limit: searchQuery.limit || 20,
        took,
      };
    } catch (error) {
      this.logger.error('Multi-index search error:', error);
      return this.fallbackSearch(searchQuery);
    }
  }

  async autoComplete(query: string, type?: string): Promise<string[]> {
    try {
      const indexName = type ? `${this.indexPrefix}-${type}` : `${this.indexPrefix}-*`;
      
      const response = await this.client.search({
        index: indexName,
        suggest: {
          course_suggest: {
            prefix: query.toLowerCase(),
            completion: {
              field: 'suggest',
              size: 10,
              skip_duplicates: true,
            },
          },
        },
      } as any);

      const responseBody = (response as any).body || response;
      const suggestions = responseBody.suggest.course_suggest[0]?.options.map(
        (option: any) => option.text
      ) || [];

      return suggestions;
    } catch (error) {
      this.logger.error('Autocomplete error:', error);
      return [];
    }
  }

  async indexCourse(course: any): Promise<void> {
    try {
      const indexName = `${this.indexPrefix}-courses`;
      
      const document = {
        title: course.title,
        description: course.description,
        shortDescription: course.shortDescription,
        instructor: {
          id: course.instructor.id,
          name: `${course.instructor.firstName} ${course.instructor.lastName}`,
          firstName: course.instructor.firstName,
          lastName: course.instructor.lastName,
        },
        level: course.level,
        category: course.category,
        price: course.price,
        rating: course.rating || 0,
        reviewCount: course.reviewCount || 0,
        enrollmentCount: course.enrollmentCount || 0,
        duration: course.curriculum?.totalDuration || 0,
        totalLessons: course.curriculum?.totalLessons || 0,
        tags: course.tags || [],
        status: course.status,
        language: course.language || 'en',
        thumbnail: course.thumbnail,
        publishedAt: course.publishedAt,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        suggest: {
          input: [
            course.title,
            course.shortDescription,
            ...(course.tags || []),
            `${course.instructor.firstName} ${course.instructor.lastName}`,
          ].filter(Boolean),
          weight: course.rating * 10 + course.enrollmentCount,
        },
      };

      await this.client.index({
        index: indexName,
        id: course.id,
        document: document,
        refresh: 'wait_for',
      } as any);

      this.logger.debug(`Indexed course: ${course.title}`);
    } catch (error) {
      this.logger.error(`Failed to index course ${course.id}:`, error);
    }
  }

  async indexUser(user: any): Promise<void> {
    try {
      const indexName = `${this.indexPrefix}-users`;
      
      const document = {
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        bio: user.profile?.bio || '',
        skills: user.profile?.skills || [],
        createdAt: user.createdAt,
        isActive: user.isActive,
        suggest: {
          input: [
            `${user.firstName} ${user.lastName}`,
            user.firstName,
            user.lastName,
            ...(user.profile?.skills || []),
          ].filter(Boolean),
        },
      };

      await this.client.index({
        index: indexName,
        id: user.id,
        document: document,
        refresh: 'wait_for',
      } as any);
    } catch (error) {
      this.logger.error(`Failed to index user ${user.id}:`, error);
    }
  }

  async deleteFromIndex(type: string, id: string): Promise<void> {
    try {
      const indexName = `${this.indexPrefix}-${type}`;
      
      await this.client.delete({
        index: indexName,
        id,
      });

      this.logger.debug(`Deleted ${type} ${id} from search index`);
    } catch (error) {
      if (error.statusCode !== 404) {
        this.logger.error(`Failed to delete ${type} ${id} from index:`, error);
      }
    }
  }

  async reindexAll(type?: string): Promise<void> {
    try {
      const indexNames = type ? [`${this.indexPrefix}-${type}`] : [
        `${this.indexPrefix}-courses`,
        `${this.indexPrefix}-users`,
        `${this.indexPrefix}-content`,
        `${this.indexPrefix}-discussions`,
      ];

      for (const indexName of indexNames) {
        // Delete existing index
        try {
          await this.client.indices.delete({ index: indexName });
        } catch (error) {
          // Index might not exist
        }

        // Create index with mappings
        await this.createIndex(indexName);
      }

      this.logger.log('Reindexing completed');
    } catch (error) {
      this.logger.error('Reindexing failed:', error);
      throw error;
    }
  }

  async getSearchAnalytics(): Promise<any> {
    try {
      const response = await this.client.search({
        index: `${this.indexPrefix}-analytics`,
        aggs: {
          popular_queries: {
            terms: {
              field: 'query.keyword',
              size: 10,
            },
          },
          search_volume: {
            date_histogram: {
              field: 'timestamp',
              interval: 'day',
            },
          },
          zero_results: {
            filter: {
              term: { results_count: 0 },
            },
          },
        },
      } as any);

      const responseBody = (response as any).body || response;
      return {
        popularQueries: responseBody.aggregations.popular_queries.buckets,
        searchVolume: responseBody.aggregations.search_volume.buckets,
        zeroResultsCount: responseBody.aggregations.zero_results.doc_count,
      };
    } catch (error) {
      this.logger.error('Failed to get search analytics:', error);
      return null;
    }
  }

  private buildElasticsearchQuery(searchQuery: SearchQuery): any {
    const query: any = {
      bool: {
        must: [],
        filter: [],
      },
    };

    // Text search
    if (searchQuery.query) {
      query.bool.must.push({
        multi_match: {
          query: searchQuery.query,
          fields: [
            'title^3',
            'shortDescription^2',
            'description',
            'instructor.name^2',
            'tags^2',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
          operator: 'or',
        },
      });
    } else {
      query.bool.must.push({ match_all: {} });
    }

    // Filters
    if (searchQuery.filters) {
      const { filters } = searchQuery;

      if (filters.category?.length) {
        query.bool.filter.push({
          terms: { 'category.keyword': filters.category },
        });
      }

      if (filters.level?.length) {
        query.bool.filter.push({
          terms: { 'level.keyword': filters.level },
        });
      }

      if (filters.price) {
        const priceRange: any = {};
        if (filters.price.min !== undefined) priceRange.gte = filters.price.min;
        if (filters.price.max !== undefined) priceRange.lte = filters.price.max;
        query.bool.filter.push({ range: { price: priceRange } });
      }

      if (filters.rating?.min) {
        query.bool.filter.push({
          range: { rating: { gte: filters.rating.min } },
        });
      }

      if (filters.tags?.length) {
        query.bool.filter.push({
          terms: { 'tags.keyword': filters.tags },
        });
      }
    }

    const esQuery: any = { query };

    // Sorting
    if (searchQuery.sort) {
      const sortField = searchQuery.sort.field === 'relevance' ? '_score' : searchQuery.sort.field;
      esQuery.sort = [{ [sortField]: { order: searchQuery.sort.order || 'desc' } }];
    }

    // Highlighting
    if (searchQuery.highlight) {
      esQuery.highlight = {
        fields: {
          title: {},
          description: {},
          'instructor.name': {},
        },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>'],
      };
    }

    // Facets/Aggregations
    if (searchQuery.facets) {
      esQuery.aggs = {
        categories: {
          terms: { field: 'category.keyword', size: 10 },
        },
        levels: {
          terms: { field: 'level.keyword', size: 10 },
        },
        price_ranges: {
          histogram: { field: 'price', interval: 50 },
        },
        rating_ranges: {
          histogram: { field: 'rating', interval: 1 },
        },
      };
    }

    return esQuery;
  }

  private processFacets(aggregations: any): Record<string, Array<{ key: string; count: number }>> {
    if (!aggregations) return {};

    const facets: Record<string, Array<{ key: string; count: number }>> = {};

    Object.keys(aggregations).forEach((key) => {
      const agg = aggregations[key];
      if (agg.buckets) {
        facets[key] = agg.buckets.map((bucket: any) => ({
          key: bucket.key,
          count: bucket.doc_count,
        }));
      }
    });

    return facets;
  }

  private async generateSuggestions(query: string): Promise<string[]> {
    // Implement spell correction and query suggestions
    // This is a simplified version - in production, you'd use more sophisticated algorithms
    const suggestions = [
      query.toLowerCase().replace(/[aeiou]/g, 'a'),
      query.toLowerCase().replace(/[bcdfg]/g, 'b'),
      // Add more suggestion logic based on your domain
    ].filter(s => s !== query.toLowerCase()).slice(0, 3);

    return suggestions;
  }

  private async fallbackSearch(searchQuery: SearchQuery): Promise<SearchResponse> {
    // Basic fallback search without Elasticsearch
    // This would typically query your main database
    this.logger.warn('Using fallback search due to Elasticsearch unavailability');
    
    return {
      results: [],
      total: 0,
      page: searchQuery.page || 1,
      limit: searchQuery.limit || 20,
      took: 0,
    };
  }

  private getTypeFromIndex(indexName: string): 'course' | 'user' | 'content' | 'discussion' {
    if (indexName.includes('-courses')) return 'course';
    if (indexName.includes('-users')) return 'user';
    if (indexName.includes('-content')) return 'content';
    if (indexName.includes('-discussions')) return 'discussion';
    return 'course';
  }

  private async createIndex(indexName: string): Promise<void> {
    const mappings = this.getIndexMappings(indexName);
    
    await this.client.indices.create({
      index: indexName,
      mappings,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
        analysis: {
          analyzer: {
            custom_search_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'stop', 'stemmer'],
            },
          },
        },
      },
    } as any);
  }

  private getIndexMappings(indexName: string): any {
    if (indexName.includes('-courses')) {
      return {
        properties: {
          title: { type: 'text', analyzer: 'custom_search_analyzer' },
          description: { type: 'text', analyzer: 'custom_search_analyzer' },
          shortDescription: { type: 'text' },
          category: { type: 'keyword' },
          level: { type: 'keyword' },
          price: { type: 'float' },
          rating: { type: 'float' },
          enrollmentCount: { type: 'integer' },
          duration: { type: 'integer' },
          tags: { type: 'keyword' },
          language: { type: 'keyword' },
          status: { type: 'keyword' },
          instructor: {
            properties: {
              id: { type: 'keyword' },
              name: { type: 'text' },
              firstName: { type: 'keyword' },
              lastName: { type: 'keyword' },
            },
          },
          suggest: {
            type: 'completion',
            analyzer: 'simple',
            preserve_separators: true,
            preserve_position_increments: true,
            max_input_length: 50,
          },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
          publishedAt: { type: 'date' },
        },
      };
    }

    // Default mapping for other types
    return {
      properties: {
        title: { type: 'text', analyzer: 'custom_search_analyzer' },
        content: { type: 'text', analyzer: 'custom_search_analyzer' },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
      },
    };
  }
}