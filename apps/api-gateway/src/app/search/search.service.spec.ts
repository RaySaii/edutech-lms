import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { SearchService } from './search.service';

// Mock Elasticsearch client
const mockElasticsearchClient = {
  search: jest.fn(),
  index: jest.fn(),
  delete: jest.fn(),
  indices: {
    create: jest.fn(),
    delete: jest.fn(),
  },
};

// Mock @elastic/elasticsearch module
jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn(() => mockElasticsearchClient),
}));

describe('SearchService', () => {
  let service: SearchService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              switch (key) {
                case 'ELASTICSEARCH_URL':
                  return 'http://localhost:9200';
                case 'ELASTICSEARCH_AUTH':
                  return false;
                default:
                  return defaultValue;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    configService = module.get<ConfigService>(ConfigService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchCourses', () => {
    it('should return formatted search results', async () => {
      const mockElasticsearchResponse = {
        body: {
          hits: {
            hits: [
              {
                _id: 'course-1',
                _source: {
                  title: 'React Development',
                  description: 'Learn React from scratch',
                  instructor: {
                    id: 'instructor-1',
                    name: 'John Doe',
                  },
                  level: 'beginner',
                  price: 99.99,
                  rating: 4.5,
                  enrollmentCount: 1250,
                  duration: 3600,
                  thumbnail: 'https://example.com/thumbnail.jpg',
                  tags: ['react', 'javascript', 'frontend'],
                },
                _score: 2.5,
                highlight: {
                  title: ['<mark>React</mark> Development'],
                },
              },
            ],
            total: { value: 1 },
          },
          aggregations: {},
        },
      };

      mockElasticsearchClient.search.mockResolvedValue(mockElasticsearchResponse);

      const searchQuery = {
        query: 'React',
        page: 1,
        limit: 20,
        highlight: true,
        facets: false,
      };

      const result = await service.searchCourses(searchQuery);

      expect(result).toBeDefined();
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        id: 'course-1',
        type: 'course',
        title: 'React Development',
        description: 'Learn React from scratch',
        score: 2.5,
        highlights: {
          title: ['<mark>React</mark> Development'],
        },
        metadata: {
          instructor: {
            id: 'instructor-1',
            name: 'John Doe',
          },
          level: 'beginner',
          price: 99.99,
          rating: 4.5,
          enrollmentCount: 1250,
          duration: 3600,
          thumbnail: 'https://example.com/thumbnail.jpg',
          tags: ['react', 'javascript', 'frontend'],
        },
      });
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should handle empty results', async () => {
      mockElasticsearchClient.search.mockResolvedValue({
        body: {
          hits: {
            hits: [],
            total: { value: 0 },
          },
        },
      });

      const result = await service.searchCourses({ query: 'nonexistent' });

      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should fall back to basic search on elasticsearch error', async () => {
      mockElasticsearchClient.search.mockRejectedValue(new Error('Connection failed'));

      const result = await service.searchCourses({ query: 'test' });

      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.took).toBe(0);
    });

    it('should build correct elasticsearch query with filters', async () => {
      mockElasticsearchClient.search.mockResolvedValue({
        body: {
          hits: { hits: [], total: { value: 0 } },
        },
      });

      const searchQuery = {
        query: 'javascript',
        filters: {
          category: ['programming'],
          level: ['beginner'],
          price: { min: 0, max: 100 },
          rating: { min: 4 },
          tags: ['react', 'javascript'],
        },
        sort: {
          field: 'rating' as const,
          order: 'desc' as const,
        },
        page: 1,
        limit: 10,
        highlight: true,
        facets: true,
      };

      await service.searchCourses(searchQuery);

      expect(mockElasticsearchClient.search).toHaveBeenCalledWith({
        index: 'edutech-lms-courses',
        body: expect.objectContaining({
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query: 'javascript',
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
                },
              ],
              filter: expect.arrayContaining([
                { terms: { 'category.keyword': ['programming'] } },
                { terms: { 'level.keyword': ['beginner'] } },
                { range: { price: { gte: 0, lte: 100 } } },
                { range: { rating: { gte: 4 } } },
                { terms: { 'tags.keyword': ['react', 'javascript'] } },
              ]),
            },
          },
          sort: [{ rating: { order: 'desc' } }],
          highlight: expect.any(Object),
          aggs: expect.any(Object),
        }),
        from: 0,
        size: 10,
      });
    });
  });

  describe('searchAll', () => {
    it('should search across multiple indices', async () => {
      mockElasticsearchClient.search.mockResolvedValue({
        body: {
          hits: {
            hits: [
              {
                _id: 'course-1',
                _index: 'edutech-lms-courses',
                _source: { title: 'Test Course' },
                _score: 1.5,
              },
              {
                _id: 'user-1',
                _index: 'edutech-lms-users',
                _source: { name: 'Test User' },
                _score: 1.2,
              },
            ],
            total: { value: 2 },
          },
        },
      });

      const result = await service.searchAll({ query: 'test' });

      expect(mockElasticsearchClient.search).toHaveBeenCalledWith({
        index: 'edutech-lms-courses,edutech-lms-users,edutech-lms-content,edutech-lms-discussions',
        body: expect.any(Object),
        from: 0,
        size: 20,
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0].type).toBe('course');
      expect(result.results[1].type).toBe('user');
    });
  });

  describe('autoComplete', () => {
    it('should return autocomplete suggestions', async () => {
      mockElasticsearchClient.search.mockResolvedValue({
        body: {
          suggest: {
            course_suggest: [
              {
                options: [
                  { text: 'javascript fundamentals' },
                  { text: 'javascript advanced' },
                  { text: 'javascript react' },
                ],
              },
            ],
          },
        },
      });

      const suggestions = await service.autoComplete('java');

      expect(suggestions).toEqual([
        'javascript fundamentals',
        'javascript advanced',
        'javascript react',
      ]);

      expect(mockElasticsearchClient.search).toHaveBeenCalledWith({
        index: 'edutech-lms-*',
        body: {
          suggest: {
            course_suggest: {
              prefix: 'java',
              completion: {
                field: 'suggest',
                size: 10,
                skip_duplicates: true,
              },
            },
          },
        },
      });
    });

    it('should handle autocomplete errors gracefully', async () => {
      mockElasticsearchClient.search.mockRejectedValue(new Error('Network error'));

      const suggestions = await service.autoComplete('test');

      expect(suggestions).toEqual([]);
    });
  });

  describe('indexCourse', () => {
    it('should index a course document', async () => {
      const course = {
        id: 'course-1',
        title: 'Test Course',
        description: 'A test course',
        instructor: {
          id: 'instructor-1',
          firstName: 'John',
          lastName: 'Doe',
        },
        level: 'beginner',
        category: 'programming',
        price: 99.99,
        tags: ['javascript', 'react'],
      };

      mockElasticsearchClient.index.mockResolvedValue({ body: {} });

      await service.indexCourse(course);

      expect(mockElasticsearchClient.index).toHaveBeenCalledWith({
        index: 'edutech-lms-courses',
        id: 'course-1',
        body: expect.objectContaining({
          title: 'Test Course',
          description: 'A test course',
          instructor: {
            id: 'instructor-1',
            name: 'John Doe',
            firstName: 'John',
            lastName: 'Doe',
          },
          level: 'beginner',
          category: 'programming',
          price: 99.99,
          tags: ['javascript', 'react'],
          suggest: expect.objectContaining({
            input: expect.arrayContaining(['Test Course', 'John Doe']),
          }),
        }),
        refresh: 'wait_for',
      });
    });

    it('should handle indexing errors gracefully', async () => {
      mockElasticsearchClient.index.mockRejectedValue(new Error('Index error'));

      const course = {
        id: 'course-1',
        title: 'Test Course',
        instructor: { firstName: 'John', lastName: 'Doe' },
      };

      // Should not throw
      await expect(service.indexCourse(course)).resolves.toBeUndefined();
    });
  });

  describe('deleteFromIndex', () => {
    it('should delete document from index', async () => {
      mockElasticsearchClient.delete.mockResolvedValue({ body: {} });

      await service.deleteFromIndex('courses', 'course-1');

      expect(mockElasticsearchClient.delete).toHaveBeenCalledWith({
        index: 'edutech-lms-courses',
        id: 'course-1',
      });
    });

    it('should handle 404 errors silently', async () => {
      const error = new Error('Not found');
      (error as any).statusCode = 404;
      mockElasticsearchClient.delete.mockRejectedValue(error);

      // Should not throw
      await expect(service.deleteFromIndex('courses', 'course-1')).resolves.toBeUndefined();
    });
  });

  describe('reindexAll', () => {
    it('should recreate indices', async () => {
      mockElasticsearchClient.indices.delete.mockResolvedValue({ body: {} });
      mockElasticsearchClient.indices.create.mockResolvedValue({ body: {} });

      await service.reindexAll('courses');

      expect(mockElasticsearchClient.indices.delete).toHaveBeenCalledWith({
        index: 'edutech-lms-courses',
      });
      expect(mockElasticsearchClient.indices.create).toHaveBeenCalledWith({
        index: 'edutech-lms-courses',
        body: expect.objectContaining({
          mappings: expect.any(Object),
          settings: expect.any(Object),
        }),
      });
    });

    it('should handle deletion errors gracefully (index might not exist)', async () => {
      mockElasticsearchClient.indices.delete.mockRejectedValue(new Error('Index not found'));
      mockElasticsearchClient.indices.create.mockResolvedValue({ body: {} });

      await expect(service.reindexAll('courses')).resolves.toBeUndefined();
    });
  });

  describe('getSearchAnalytics', () => {
    it('should return search analytics data', async () => {
      const mockAnalyticsResponse = {
        body: {
          aggregations: {
            popular_queries: {
              buckets: [
                { key: 'javascript', doc_count: 150 },
                { key: 'react', doc_count: 120 },
              ],
            },
            search_volume: {
              buckets: [
                { key_as_string: '2024-01-01', doc_count: 50 },
                { key_as_string: '2024-01-02', doc_count: 75 },
              ],
            },
            zero_results: {
              doc_count: 25,
            },
          },
        },
      };

      mockElasticsearchClient.search.mockResolvedValue(mockAnalyticsResponse);

      const analytics = await service.getSearchAnalytics();

      expect(analytics).toEqual({
        popularQueries: [
          { key: 'javascript', doc_count: 150 },
          { key: 'react', doc_count: 120 },
        ],
        searchVolume: [
          { key_as_string: '2024-01-01', doc_count: 50 },
          { key_as_string: '2024-01-02', doc_count: 75 },
        ],
        zeroResultsCount: 25,
      });
    });

    it('should handle analytics errors gracefully', async () => {
      mockElasticsearchClient.search.mockRejectedValue(new Error('Analytics error'));

      const analytics = await service.getSearchAnalytics();

      expect(analytics).toBeNull();
    });
  });
});