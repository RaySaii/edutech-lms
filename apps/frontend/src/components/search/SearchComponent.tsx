'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Filter, X, ChevronDown, Star, Clock, DollarSign, User, Tag } from 'lucide-react';
import { useSearch, useAutocomplete } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';

interface SearchComponentProps {
  onResultSelect?: (result: any) => void;
  placeholder?: string;
  showFilters?: boolean;
  defaultQuery?: string;
  className?: string;
}

const SearchComponent: React.FC<SearchComponentProps> = ({
  onResultSelect,
  placeholder = 'Search courses, instructors, content...',
  showFilters = true,
  defaultQuery = '',
  className = '',
}) => {
  const [query, setQuery] = useState(defaultQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    category: '',
    level: '',
    minPrice: 0,
    maxPrice: 500,
    minRating: 0,
    instructor: '',
    tags: [] as string[],
    language: '',
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Search hook
  const {
    results,
    total,
    page,
    totalPages,
    facets,
    suggestions: searchSuggestions,
    isLoading,
    isError,
    error,
    search,
    nextPage,
    prevPage,
    setPage,
    clear,
    hasNextPage,
    hasPrevPage,
  } = useSearch({
    debounceMs: 300,
    limit: 12,
  });

  // Autocomplete hook
  const {
    suggestions,
    isLoading: isLoadingSuggestions,
    getSuggestions,
    clear: clearSuggestions,
  } = useAutocomplete({
    debounceMs: 150,
    minQueryLength: 2,
  });

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length >= 2) {
      getSuggestions(value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      clearSuggestions();
    }
  }, [getSuggestions, clearSuggestions]);

  // Handle search
  const handleSearch = useCallback(async (searchQuery: string = query) => {
    if (!searchQuery.trim()) {
      clear();
      return;
    }

    setShowSuggestions(false);
    
    const filters = {
      ...selectedFilters,
      tags: selectedFilters.tags.length > 0 ? selectedFilters.tags : undefined,
    };

    // Remove empty filters
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '' && value !== 0 && value !== undefined)
    );

    await search(searchQuery, cleanFilters);
  }, [query, selectedFilters, search, clear]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch(suggestion);
  }, [handleSearch]);

  // Handle filter change
  const handleFilterChange = useCallback((filterName: string, value: any) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterName]: value,
    }));
  }, []);

  // Handle tag addition/removal
  const handleTagToggle = useCallback((tag: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSelectedFilters({
      category: '',
      level: '',
      minPrice: 0,
      maxPrice: 500,
      minRating: 0,
      instructor: '',
      tags: [],
      language: '',
    });
  }, []);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-search when filters change
  useEffect(() => {
    if (query.trim()) {
      handleSearch();
    }
  }, [selectedFilters]);

  // Initialize with default query
  useEffect(() => {
    if (defaultQuery) {
      handleSearch(defaultQuery);
    }
  }, []);

  const highlightText = (text: string, highlights: string[] = []) => {
    if (!highlights.length) return text;
    
    let highlightedText = text;
    highlights.forEach(highlight => {
      const cleanHighlight = highlight.replace(/<\/?mark>/g, '');
      highlightedText = highlightedText.replace(
        new RegExp(`(${cleanHighlight})`, 'gi'),
        '<mark class="bg-yellow-200">$1</mark>'
      );
    });
    
    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  const renderResult = (result: any) => (
    <Card 
      key={result.id} 
      className="cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={() => onResultSelect?.(result)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">
              {highlightText(result.title, result.highlights?.title)}
            </h3>
            {result.description && (
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                {highlightText(result.description, result.highlights?.description)}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {result.metadata?.instructor && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{result.metadata.instructor.name || result.metadata.instructor}</span>
                </div>
              )}
              
              {result.metadata?.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{result.metadata.rating}</span>
                </div>
              )}
              
              {result.metadata?.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{Math.floor(result.metadata.duration / 60)}h</span>
                </div>
              )}
              
              {result.metadata?.price !== undefined && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>{result.metadata.price === 0 ? 'Free' : `$${result.metadata.price}`}</span>
                </div>
              )}
            </div>
            
            {result.metadata?.tags && result.metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {result.metadata.tags.slice(0, 3).map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {result.metadata.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{result.metadata.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          {result.metadata?.thumbnail && (
            <img
              src={result.metadata.thumbnail}
              alt={result.title}
              className="w-16 h-16 object-cover rounded-lg ml-4"
            />
          )}
        </div>
        
        <div className="flex justify-between items-center mt-3 pt-3 border-t">
          <Badge variant="outline" className="text-xs">
            {result.type}
          </Badge>
          <span className="text-xs text-gray-400">
            Score: {result.score.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={`w-full max-w-6xl mx-auto ${className}`}>
      {/* Search Input */}
      <div className="relative mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-12 pr-4 py-3 text-lg"
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={() => {
                setQuery('');
                clear();
                clearSuggestions();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div ref={suggestionsRef} className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 mt-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0"
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <Search className="inline w-4 h-4 mr-2 text-gray-400" />
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </Button>
            
            {Object.values(selectedFilters).some(value => 
              Array.isArray(value) ? value.length > 0 : value !== '' && value !== 0
            ) && (
              <Button variant="ghost" onClick={clearFilters} className="text-sm">
                Clear Filters
              </Button>
            )}
          </div>

          {showAdvancedFilters && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <Select value={selectedFilters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        <SelectItem value="programming">Programming</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="data-science">Data Science</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Level Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Level</label>
                    <Select value={selectedFilters.level} onValueChange={(value) => handleFilterChange('level', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Levels</SelectItem>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Language Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Language</label>
                    <Select value={selectedFilters.language} onValueChange={(value) => handleFilterChange('language', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Languages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Languages</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Minimum Rating */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Minimum Rating</label>
                    <Select value={selectedFilters.minRating.toString()} onValueChange={(value) => handleFilterChange('minRating', parseFloat(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any Rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Any Rating</SelectItem>
                        <SelectItem value="3">3+ Stars</SelectItem>
                        <SelectItem value="4">4+ Stars</SelectItem>
                        <SelectItem value="4.5">4.5+ Stars</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Price Range */}
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Price Range: ${selectedFilters.minPrice} - ${selectedFilters.maxPrice}
                  </label>
                  <div className="px-2">
                    <Slider
                      min={0}
                      max={500}
                      step={10}
                      value={[selectedFilters.minPrice, selectedFilters.maxPrice]}
                      onValueChange={(values) => {
                        handleFilterChange('minPrice', values[0]);
                        handleFilterChange('maxPrice', values[1]);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Search Results */}
      <div className="space-y-6">
        {/* Results Header */}
        {(results.length > 0 || isLoading) && (
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">
                {isLoading ? 'Searching...' : `${total.toLocaleString()} results found`}
              </h2>
              {query && (
                <p className="text-gray-600 mt-1">for &quot;{query}&quot;</p>
              )}
            </div>
            
            {results.length > 0 && (
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-600">
                Search failed: {error?.message || 'Unknown error'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded mb-4 w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results Grid */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(renderResult)}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && results.length === 0 && query && (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600 mb-4">
                We couldn&apos;t find any matches for &quot;{query}&quot;
              </p>
              {searchSuggestions && searchSuggestions.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Try searching for:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {searchSuggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {results.length > 0 && totalPages > 1 && (
          <div className="flex justify-center items-center gap-4">
            <Button
              variant="outline"
              onClick={prevPage}
              disabled={!hasPrevPage || isLoading}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i));
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    disabled={isLoading}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              onClick={nextPage}
              disabled={!hasNextPage || isLoading}
            >
              Next
            </Button>
          </div>
        )}

        {/* Facets Sidebar (if available) */}
        {facets && Object.keys(facets).length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Filter by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(facets).map(([facetName, facetValues]) => (
                  <div key={facetName}>
                    <h4 className="font-medium mb-2 capitalize">{facetName.replace('_', ' ')}</h4>
                    <div className="space-y-1">
                      {facetValues.slice(0, 5).map((facet) => (
                        <div key={facet.key} className="flex items-center justify-between text-sm">
                          <span className="truncate flex-1">{facet.key}</span>
                          <span className="text-gray-500 ml-2">({facet.count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SearchComponent;