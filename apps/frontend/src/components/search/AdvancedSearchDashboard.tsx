'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Filter,
  Star,
  Clock,
  User,
  BookOpen,
  Video,
  FileText,
  TrendingUp,
  BarChart3,
  Settings,
  Lightbulb,
  Target,
  Zap,
  ChevronDown,
  ChevronRight,
  X,
  SlidersHorizontal,
  History,
  Bookmark,
  Share,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'course' | 'lesson' | 'video' | 'document' | 'user';
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
  };
}

interface SearchResponse {
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
}

interface SearchFilterData {
  type: string;
  name: string;
  displayName: string;
  values: Array<{
    value: string | number;
    label: string;
    count: number;
  }>;
}

export default function AdvancedSearchDashboard() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSorting, setSelectedSorting] = useState('relevance');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [savedQueries, setSavedQueries] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Load recent queries from localStorage
    const recent = JSON.parse(localStorage.getItem('recentSearchQueries') || '[]');
    setRecentQueries(recent.slice(0, 10));
    
    const saved = JSON.parse(localStorage.getItem('savedSearchQueries') || '[]');
    setSavedQueries(saved);
  }, []);

  const handleSearch = async (searchQuery?: string) => {
    const queryText = searchQuery || query;
    if (!queryText.trim()) return;

    setLoading(true);
    setShowSuggestions(false);

    try {
      const response = await fetch('/api/search/advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          query: queryText,
          filters: activeFilters,
          sorting: selectedSorting !== 'relevance' ? [{ field: selectedSorting, order: 'desc' }] : undefined,
          page: currentPage,
          size: pageSize,
          highlighting: true,
          suggestions: true,
          personalized: true,
        }),
      });

      if (response.ok) {
        const data: SearchResponse = await response.json();
        setSearchResults(data);

        // Update recent queries
        const updatedRecent = [queryText, ...recentQueries.filter(q => q !== queryText)].slice(0, 10);
        setRecentQueries(updatedRecent);
        localStorage.setItem('recentSearchQueries', JSON.stringify(updatedRecent));
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);

    // Debounced suggestions
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (value.trim().length >= 2) {
        try {
          const response = await fetch(
            `/api/search/advanced/autocomplete?q=${encodeURIComponent(value)}&limit=8`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );

          if (response.ok) {
            const suggestions = await response.json();
            setSuggestions(suggestions);
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error('Autocomplete failed:', error);
        }
      } else {
        setShowSuggestions(false);
      }
    }, 300);
  };

  const handleFilterChange = (filterName: string, value: any, checked: boolean) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      
      if (checked) {
        if (Array.isArray(newFilters[filterName])) {
          newFilters[filterName] = [...newFilters[filterName], value];
        } else {
          newFilters[filterName] = [value];
        }
      } else {
        if (Array.isArray(newFilters[filterName])) {
          newFilters[filterName] = newFilters[filterName].filter((v: any) => v !== value);
          if (newFilters[filterName].length === 0) {
            delete newFilters[filterName];
          }
        }
      }

      return newFilters;
    });

    // Auto-search when filters change
    if (query.trim()) {
      handleSearch();
    }
  };

  const handleResultClick = async (result: SearchResult) => {
    // Track click for analytics
    try {
      await fetch('/api/search/advanced/track/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          queryId: searchResults?.query, // Would need actual query ID
          resultId: result.id,
          resultType: result.type,
          position: searchResults?.results.indexOf(result) + 1,
        }),
      });
    } catch (error) {
      console.error('Click tracking failed:', error);
    }

    // Navigate to result
    if (result.url) {
      window.open(result.url, '_blank');
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'course': return <BookOpen className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const saveQuery = (queryToSave: string) => {
    const updated = [queryToSave, ...savedQueries.filter(q => q !== queryToSave)].slice(0, 20);
    setSavedQueries(updated);
    localStorage.setItem('savedSearchQueries', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search courses, content, videos, and more..."
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-4 py-3 text-lg"
              />
              
              {/* Autocomplete Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-t-0 rounded-b-lg shadow-lg z-10" data-testid="autocomplete-suggestions">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      data-testid="suggestion-item"
                      onClick={() => {
                        setQuery(suggestion);
                        setShowSuggestions(false);
                        handleSearch(suggestion);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Search className="h-3 w-3 text-gray-400" />
                        <span>{suggestion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={() => handleSearch()} disabled={loading} size="lg">
              {loading ? 'Searching...' : 'Search'}
            </Button>

            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-4 mt-3">
            {recentQueries.length > 0 && (
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">Recent:</span>
                <div className="flex gap-1">
                  {recentQueries.slice(0, 3).map((recent, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setQuery(recent);
                        handleSearch(recent);
                      }}
                    >
                      {recent}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {query.trim() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => saveQuery(query)}
                disabled={savedQueries.includes(query)}
              >
                <Bookmark className="h-4 w-4 mr-1" />
                {savedQueries.includes(query) ? 'Saved' : 'Save'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className={`lg:col-span-1 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Filters</span>
                  {Object.keys(activeFilters).length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveFilters({})}
                    >
                      Clear All
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Content Type Filter */}
                <div>
                  <h4 className="font-semibold mb-3">Content Type</h4>
                  <div className="space-y-2">
                    {[
                      { value: 'course', label: 'Courses', count: 1250 },
                      { value: 'video', label: 'Videos', count: 890 },
                      { value: 'document', label: 'Documents', count: 540 },
                      { value: 'lesson', label: 'Lessons', count: 2100 },
                    ].map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${option.value}`}
                          checked={activeFilters.type?.includes(option.value) || false}
                          onCheckedChange={(checked) =>
                            handleFilterChange('type', option.value, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={`type-${option.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                        >
                          {option.label}
                        </label>
                        <span className="text-xs text-gray-500">({option.count})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <h4 className="font-semibold mb-3">Category</h4>
                  <div className="space-y-2">
                    {[
                      { value: 'programming', label: 'Programming', count: 450 },
                      { value: 'data-science', label: 'Data Science', count: 280 },
                      { value: 'design', label: 'Design', count: 180 },
                      { value: 'business', label: 'Business', count: 220 },
                      { value: 'marketing', label: 'Marketing', count: 150 },
                    ].map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${option.value}`}
                          checked={activeFilters.category?.includes(option.value) || false}
                          onCheckedChange={(checked) =>
                            handleFilterChange('category', option.value, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={`category-${option.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                        >
                          {option.label}
                        </label>
                        <span className="text-xs text-gray-500">({option.count})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Difficulty Filter */}
                <div>
                  <h4 className="font-semibold mb-3">Difficulty</h4>
                  <div className="space-y-2">
                    {[
                      { value: 'beginner', label: 'Beginner' },
                      { value: 'intermediate', label: 'Intermediate' },
                      { value: 'advanced', label: 'Advanced' },
                    ].map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`difficulty-${option.value}`}
                          checked={activeFilters.difficulty?.includes(option.value) || false}
                          onCheckedChange={(checked) =>
                            handleFilterChange('difficulty', option.value, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={`difficulty-${option.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <h4 className="font-semibold mb-3">Minimum Rating</h4>
                  <div className="space-y-3">
                    <Slider
                      value={[activeFilters.rating || 0]}
                      onValueChange={(value) => handleFilterChange('rating', value[0], true)}
                      max={5}
                      min={0}
                      step={0.5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Any</span>
                      <span>{activeFilters.rating || 0}+ Stars</span>
                      <span>5 Stars</span>
                    </div>
                  </div>
                </div>

                {/* Duration Filter */}
                <div>
                  <h4 className="font-semibold mb-3">Duration</h4>
                  <Select value={activeFilters.duration || ''} onValueChange={(value) => handleFilterChange('duration', value, !!value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any duration</SelectItem>
                      <SelectItem value="short">Under 2 hours</SelectItem>
                      <SelectItem value="medium">2-8 hours</SelectItem>
                      <SelectItem value="long">8+ hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Results Header */}
            {searchResults && (
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold">
                    {searchResults.total.toLocaleString()} results for "{searchResults.query}"
                  </h2>
                  <span className="text-sm text-gray-500">
                    ({searchResults.took}ms)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <Select value={selectedSorting} onValueChange={setSelectedSorting}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="popularity">Popularity</SelectItem>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="price">Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <Skeleton className="h-20 w-20 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-3 w-full" />
                          <div className="flex gap-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Search Results */}
            {searchResults && searchResults.results.length > 0 && (
              <div className="space-y-4" data-testid="search-results">
                {searchResults.results.map((result) => (
                  <Card key={result.id} className="hover:shadow-md transition-shadow cursor-pointer" data-testid="search-result-item">
                    <CardContent className="p-6" onClick={() => handleResultClick(result)}>
                      <div className="flex gap-4">
                        {result.thumbnail && (
                          <img
                            src={result.thumbnail}
                            alt={result.title}
                            className="h-20 w-20 object-cover rounded"
                          />
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getResultIcon(result.type)}
                              <h3 className="text-lg font-semibold text-blue-600 hover:text-blue-800">
                                {result.highlights?.title ? (
                                  <span dangerouslySetInnerHTML={{ __html: result.highlights.title[0] }} />
                                ) : (
                                  result.title
                                )}
                              </h3>
                            </div>
                            <span className="text-xs text-gray-500 capitalize">{result.type}</span>
                          </div>

                          {result.description && (
                            <p className="text-gray-600 mb-3">
                              {result.highlights?.description ? (
                                <span dangerouslySetInnerHTML={{ __html: result.highlights.description[0] }} />
                              ) : (
                                result.description.substring(0, 200) + (result.description.length > 200 ? '...' : '')
                              )}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {result.metadata.author && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {result.metadata.author}
                              </span>
                            )}
                            
                            {result.metadata.rating && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {result.metadata.rating.toFixed(1)}
                              </span>
                            )}
                            
                            {result.metadata.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {Math.floor(result.metadata.duration / 60)}h {result.metadata.duration % 60}m
                              </span>
                            )}

                            {result.metadata.difficulty && (
                              <Badge className={getDifficultyColor(result.metadata.difficulty)}>
                                {result.metadata.difficulty}
                              </Badge>
                            )}

                            {result.metadata.price !== undefined && (
                              <span className="font-semibold">
                                {result.metadata.price === 0 ? 'Free' : `$${result.metadata.price}`}
                              </span>
                            )}
                          </div>

                          {result.metadata.tags && result.metadata.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {result.metadata.tags.slice(0, 3).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {result.metadata.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{result.metadata.tags.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Pagination */}
                {searchResults.pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-8">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Show:</span>
                      <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">per page</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      >
                        Previous
                      </Button>
                      
                      <span className="text-sm text-gray-600 px-4">
                        Page {currentPage} of {searchResults.pagination.pages}
                      </span>

                      <Button
                        variant="outline"
                        disabled={currentPage === searchResults.pagination.pages}
                        onClick={() => setCurrentPage(prev => Math.min(searchResults.pagination.pages, prev + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No Results */}
            {searchResults && searchResults.results.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your search terms or filters
                  </p>
                  
                  {searchResults.suggestions && searchResults.suggestions.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Did you mean:</p>
                      <div className="flex justify-center gap-2">
                        {searchResults.suggestions.map((suggestion, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              setQuery(suggestion);
                              handleSearch(suggestion);
                            }}
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!searchResults && !loading && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Advanced Search</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Search through courses, lessons, videos, documents, and more with powerful filters and personalization.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                    <div className="text-center">
                      <BookOpen className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                      <span className="text-sm font-medium">Courses</span>
                    </div>
                    <div className="text-center">
                      <Video className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      <span className="text-sm font-medium">Videos</span>
                    </div>
                    <div className="text-center">
                      <FileText className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                      <span className="text-sm font-medium">Documents</span>
                    </div>
                    <div className="text-center">
                      <User className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                      <span className="text-sm font-medium">Instructors</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
