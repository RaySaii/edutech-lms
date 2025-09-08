'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Play, 
  Clock, 
  Star, 
  Users,
  BookOpen,
  Subtitles,
  FileText,
  Eye,
  Bookmark,
  Grid,
  List,
  Tag,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnailPath?: string;
  duration: number;
  status: string;
  viewCount: number;
  createdAt: string;
  isPublic: boolean;
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  rating?: number;
  isBookmarked?: boolean;
  progress?: {
    currentTime: number;
    completionPercentage: number;
    completed: boolean;
  };
}

interface VideoLibraryProps {
  onVideoSelect?: (video: Video) => void;
  contentId?: string;
  courseId?: string;
  userId?: string;
  selectedCategory?: string;
  showFilters?: boolean;
  compact?: boolean;
  viewMode?: 'grid' | 'list';
}

export function VideoLibrary({ 
  onVideoSelect,
  contentId,
  courseId, 
  userId,
  selectedCategory,
  showFilters = true,
  compact = false,
  viewMode: initialViewMode = 'grid'
}: VideoLibraryProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(selectedCategory || '');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadVideos();
    loadFilters();
  }, [currentPage, searchQuery, categoryFilter, difficultyFilter, selectedTags, sortBy, contentId, courseId, userId]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: compact ? '6' : '12',
        sort: sortBy,
        order: 'desc',
        status: 'ready',
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (contentId) {
        params.append('contentId', contentId);
      }

      if (courseId) {
        params.append('courseId', courseId);
      }

      if (userId) {
        params.append('userId', userId);
      }

      if (categoryFilter) {
        params.append('category', categoryFilter);
      }

      if (difficultyFilter) {
        params.append('difficulty', difficultyFilter);
      }

      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','));
      }

      const response = await fetch(`/api/videos/library?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos);
        setTotalPages(Math.ceil(data.total / (compact ? 6 : 12)));
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async () => {
    try {
      const response = await fetch('/api/videos/filters', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.tags || []);
        setAvailableCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  };

  const handleVideoClick = (video: Video) => {
    if (onVideoSelect) {
      onVideoSelect(video);
    } else {
      router.push(`/videos/${video.id}/play`);
    }
  };

  const handleBookmark = async (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/videos/${videoId}/bookmark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setVideos(prev => prev.map(video => 
          video.id === videoId 
            ? { ...video, isBookmarked: !video.isBookmarked }
            : video
        ));
      }
    } catch (error) {
      console.error('Failed to bookmark video:', error);
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
    setCurrentPage(1);
  };

  const getDifficultyColor = (difficulty?: string) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-blue-100 text-blue-800',
      advanced: 'bg-orange-100 text-orange-800',
      expert: 'bg-red-100 text-red-800'
    };
    return colors[difficulty as keyof typeof colors] || colors.beginner;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div className="space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 p-3 animate-pulse">
              <div className="w-20 h-12 bg-gray-200 rounded flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : (
          videos.map((video) => (
            <div
              key={video.id}
              onClick={() => handleVideoClick(video)}
              className="flex gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
            >
              <div className="relative w-20 h-12 bg-gray-900 rounded overflow-hidden flex-shrink-0">
                {video.thumbnailPath ? (
                  <img
                    src={`/api/videos/${video.id}/thumbnail`}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Play className="h-4 w-4 text-white opacity-60" />
                  </div>
                )}
                {video.progress && video.progress.completionPercentage > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black bg-opacity-50">
                    <div 
                      className="h-full bg-purple-600"
                      style={{ width: `${video.progress.completionPercentage}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-gray-900 line-clamp-1">{video.title}</h4>
                <p className="text-xs text-gray-600 mt-1">
                  {video.uploader.firstName} {video.uploader.lastName}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(video.duration)}</span>
                  <Eye className="h-3 w-3" />
                  <span>{video.viewCount}</span>
                  {video.isBookmarked && <Bookmark className="h-3 w-3 text-yellow-600" />}
                </div>
              </div>
            </div>
          ))
        )}
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