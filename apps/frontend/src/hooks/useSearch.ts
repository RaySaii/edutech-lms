import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api/base';

export interface SearchFilters {
  category?: string;
  level?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  instructor?: string;
  tags?: string[];
  language?: string;
}

export interface SearchOptions {
  sortBy?: 'relevance' | 'rating' | 'price' | 'created' | 'popularity';
  sortOrder?: 'asc' | 'desc';
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

export interface UseSearchOptions extends SearchOptions {
  enabled?: boolean;
  debounceMs?: number;
}

export interface UseSearchReturn {
  // Data
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  facets?: Record<string, Array<{ key: string; count: number }>>;
  suggestions?: string[];
  took: number;

  // State
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  // Actions
  search: (query: string, filters?: SearchFilters, options?: SearchOptions) => Promise<void>;
  searchAll: (query: string, options?: SearchOptions) => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
  setPage: (page: number) => Promise<void>;
  clear: () => void;

  // Pagination helpers
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalPages: number;

  // Current search state
  currentQuery: string;
  currentFilters: SearchFilters;
  currentOptions: SearchOptions;
}

export const useSearch = (initialOptions: UseSearchOptions = {}): UseSearchReturn => {
  const {
    enabled = true,
    debounceMs = 300,
    sortBy = 'relevance',
    sortOrder = 'desc',
    page: initialPage = 1,
    limit = 20,
    highlight = true,
    facets = true,
  } = initialOptions;

  // State
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(initialPage);
  const [currentLimit, setLimit] = useState(limit);
  const [searchFacets, setFacets] = useState<Record<string, Array<{ key: string; count: number }>>>();
  const [suggestions, setSuggestions] = useState<string[]>();
  const [took, setTook] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [currentQuery, setCurrentQuery] = useState('');
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({});
  const [currentOptions, setCurrentOptions] = useState<SearchOptions>({
    sortBy,
    sortOrder,
    page,
    limit,
    highlight,
    facets,
  });

  // Debounced search function
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ) => {
    if (!enabled) return;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      
      if (query) searchParams.append('query', query);
      if (filters.category) searchParams.append('category', filters.category);
      if (filters.level) searchParams.append('level', filters.level);
      if (filters.minPrice !== undefined) searchParams.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice !== undefined) searchParams.append('maxPrice', filters.maxPrice.toString());
      if (filters.minRating) searchParams.append('minRating', filters.minRating.toString());
      if (filters.instructor) searchParams.append('instructor', filters.instructor);
      if (filters.tags && filters.tags.length > 0) searchParams.append('tags', filters.tags.join(','));
      if (filters.language) searchParams.append('language', filters.language);

      if (options.sortBy) searchParams.append('sortBy', options.sortBy);
      if (options.sortOrder) searchParams.append('sortOrder', options.sortOrder);
      if (options.page) searchParams.append('page', options.page.toString());
      if (options.limit) searchParams.append('limit', options.limit.toString());
      if (options.highlight !== undefined) searchParams.append('highlight', options.highlight.toString());
      if (options.facets !== undefined) searchParams.append('facets', options.facets.toString());

      const response = await api.get<{ data: SearchResponse }>(`/search/courses?${searchParams.toString()}`);
      const data = response.data.data;

      setResults(data.results);
      setTotal(data.total);
      setPageState(data.page);
      setLimit(data.limit);
      setFacets(data.facets);
      setSuggestions(data.suggestions);
      setTook(data.took);

      // Update current state
      setCurrentQuery(query);
      setCurrentFilters(filters);
      setCurrentOptions({ ...currentOptions, ...options });
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Search failed'));
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, currentOptions]);

  const search = useCallback((
    query: string,
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): Promise<void> => {
    return new Promise((resolve) => {
      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set new timer
      const timer = setTimeout(async () => {
        await performSearch(query, filters, { ...options, page: 1 });
        resolve();
      }, debounceMs);

      setDebounceTimer(timer);
    });
  }, [debounceTimer, debounceMs, performSearch]);

  const searchAll = useCallback(async (
    query: string,
    options: SearchOptions = {}
  ): Promise<void> => {
    if (!enabled) return;

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      
      if (query) searchParams.append('query', query);
      if (options.page) searchParams.append('page', options.page.toString());
      if (options.limit) searchParams.append('limit', options.limit.toString());
      if (options.highlight !== undefined) searchParams.append('highlight', options.highlight.toString());

      const response = await api.get<{ data: SearchResponse }>(`/search/all?${searchParams.toString()}`);
      const data = response.data.data;

      setResults(data.results);
      setTotal(data.total);
      setPageState(data.page);
      setLimit(data.limit);
      setTook(data.took);

      setCurrentQuery(query);
      setCurrentOptions({ ...currentOptions, ...options });
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Multi-search failed'));
      console.error('Multi-search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, currentOptions]);

  const nextPage = useCallback(async (): Promise<void> => {
    if (hasNextPage) {
      await performSearch(currentQuery, currentFilters, { ...currentOptions, page: page + 1 });
    }
  }, [currentQuery, currentFilters, currentOptions, page, performSearch]);

  const prevPage = useCallback(async (): Promise<void> => {
    if (hasPrevPage) {
      await performSearch(currentQuery, currentFilters, { ...currentOptions, page: page - 1 });
    }
  }, [currentQuery, currentFilters, currentOptions, page, performSearch]);

  const setPage = useCallback(async (newPage: number): Promise<void> => {
    if (newPage >= 1 && newPage <= totalPages) {
      await performSearch(currentQuery, currentFilters, { ...currentOptions, page: newPage });
    }
  }, [currentQuery, currentFilters, currentOptions, totalPages, performSearch]);

  const clear = useCallback(() => {
    setResults([]);
    setTotal(0);
    setPageState(1);
    setFacets(undefined);
    setSuggestions(undefined);
    setTook(0);
    setCurrentQuery('');
    setCurrentFilters({});
    setCurrentOptions({
      sortBy,
      sortOrder,
      page: 1,
      limit,
      highlight,
      facets,
    });
    setIsError(false);
    setError(null);
  }, [sortBy, sortOrder, limit, highlight, facets]);

  // Computed values
  const totalPages = useMemo(() => Math.ceil(total / currentLimit), [total, currentLimit]);
  const hasNextPage = useMemo(() => page < totalPages, [page, totalPages]);
  const hasPrevPage = useMemo(() => page > 1, [page]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    // Data
    results,
    total,
    page,
    limit: currentLimit,
    facets: searchFacets,
    suggestions,
    took,

    // State
    isLoading,
    isError,
    error,

    // Actions
    search,
    searchAll,
    nextPage,
    prevPage,
    setPage,
    clear,

    // Pagination helpers
    hasNextPage,
    hasPrevPage,
    totalPages,

    // Current search state
    currentQuery,
    currentFilters,
    currentOptions,
  };
};

export default useSearch;