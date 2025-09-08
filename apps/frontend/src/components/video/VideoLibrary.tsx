'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Play, 
  Clock, 
  Star, 
  Users,
  BookOpen,
  Subtitles,
  FileText
} from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { videoLibrary, VideoSource, formatVideoDuration, getVideosByCategory } from '../../lib/videoSources';

interface VideoLibraryProps {
  onVideoSelect?: (video: VideoSource) => void;
  selectedCategory?: string;
  showFilters?: boolean;
  compact?: boolean;
}

export function VideoLibrary({ 
  onVideoSelect, 
  selectedCategory,
  showFilters = true,
  compact = false 
}: VideoLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(selectedCategory || '');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showOnlyWithSubtitles, setShowOnlyWithSubtitles] = useState(false);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(videoLibrary.map(v => v.category)));
    return cats.sort();
  }, []);

  const subcategories = useMemo(() => {
    if (!categoryFilter) return [];
    const subcats = Array.from(new Set(
      videoLibrary
        .filter(v => v.category === categoryFilter)
        .map(v => v.subcategory)
    ));
    return subcats.sort();
  }, [categoryFilter]);

  const filteredVideos = useMemo(() => {
    let filtered = videoLibrary;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(query) ||
        video.description.toLowerCase().includes(query) ||
        video.instructor.toLowerCase().includes(query) ||
        video.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(video => video.category === categoryFilter);
    }

    // Difficulty filter
    if (difficultyFilter) {
      filtered = filtered.filter(video => video.difficulty === difficultyFilter);
    }

    // Subtitles filter
    if (showOnlyWithSubtitles) {
      filtered = filtered.filter(video => video.hasSubtitles);
    }

    // Sorting
    filtered = filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'duration-short':
          return a.duration - b.duration;
        case 'duration-long':
          return b.duration - a.duration;
        case 'difficulty':
          const difficultyOrder = ['beginner', 'intermediate', 'advanced', 'expert'];
          return difficultyOrder.indexOf(a.difficulty) - difficultyOrder.indexOf(b.difficulty);
        case 'newest':
        default:
          return b.id.localeCompare(a.id); // Assuming IDs are chronological
      }
    });

    return filtered;
  }, [searchQuery, categoryFilter, difficultyFilter, sortBy, showOnlyWithSubtitles]);

  const handleVideoClick = (video: VideoSource) => {
    if (onVideoSelect) {
      onVideoSelect(video);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-blue-100 text-blue-800',
      advanced: 'bg-orange-100 text-orange-800',
      expert: 'bg-red-100 text-red-800'
    };
    return colors[difficulty as keyof typeof colors] || colors.beginner;
  };

  if (compact) {
    return (
      <div className="space-y-4">
        {filteredVideos.slice(0, 6).map((video) => (
          <div
            key={video.id}
            onClick={() => handleVideoClick(video)}
            className="flex gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
          >
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-20 h-12 object-cover rounded flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-gray-900 line-clamp-1">{video.title}</h4>
              <p className="text-xs text-gray-600 mt-1">{video.instructor}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{formatVideoDuration(video.duration)}</span>
                {video.hasSubtitles && <Subtitles className="h-3 w-3" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      {showFilters && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search videos, instructors, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="duration-short">Shortest First</SelectItem>
                <SelectItem value="duration-long">Longest First</SelectItem>
                <SelectItem value="difficulty">Difficulty Level</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showOnlyWithSubtitles ? "default" : "outline"}
              onClick={() => setShowOnlyWithSubtitles(!showOnlyWithSubtitles)}
              className="flex items-center gap-2"
            >
              <Subtitles className="h-4 w-4" />
              Subtitles
            </Button>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600">
          {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((video) => (
          <Card
            key={video.id}
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleVideoClick(video)}
          >
            <div className="relative">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                <Button
                  size="lg"
                  className="bg-white bg-opacity-90 text-black hover:bg-opacity-100 rounded-full"
                >
                  <Play className="h-6 w-6" />
                </Button>
              </div>
              
              {/* Duration Badge */}
              <div className="absolute bottom-3 right-3 bg-black bg-opacity-75 text-white px-2 py-1 text-xs font-medium rounded">
                {formatVideoDuration(video.duration)}
              </div>

              {/* Quality Badge */}
              {video.quality.includes('4K') && (
                <div className="absolute top-3 right-3 bg-purple-600 text-white px-2 py-1 text-xs font-medium rounded">
                  4K
                </div>
              )}
            </div>

            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.description}</p>
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">{video.instructor}</span>
                <Badge className={getDifficultyColor(video.difficulty)}>
                  {video.difficulty}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-3">
                  {video.hasSubtitles && (
                    <div className="flex items-center gap-1">
                      <Subtitles className="h-3 w-3" />
                      <span>CC</span>
                    </div>
                  )}
                  {video.hasTranscript && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>Transcript</span>
                    </div>
                  )}
                </div>
                <span className="bg-gray-100 px-2 py-1 rounded">{video.category}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No videos found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
        </div>
      )}
    </div>
  );
}