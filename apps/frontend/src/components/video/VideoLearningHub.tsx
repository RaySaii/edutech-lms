'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Search, 
  Filter, 
  Grid,
  List,
  BookOpen,
  TrendingUp,
  Clock,
  Star,
  User,
  Tag,
  Eye,
  Plus,
  Settings,
  BarChart3,
  Sparkles,
  Video as VideoIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VideoPlayer } from './VideoPlayer';
import { VideoRecommendations } from './VideoRecommendations';
import { VideoAnalytics } from './VideoAnalytics';
import { CaptionManager } from './CaptionManager';
import { VideoQualityManager } from './VideoQualityManager';

interface Video {
  id: string;
  title: string;
  description: string;
  duration: number;
  viewCount: number;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tags: string[];
  thumbnailUrl: string;
  videoUrl: string;
  videoStreams?: Array<{
    quality: string;
    resolution: string;
    bitrate: number;
    url: string;
  }>;
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: string;
  rating?: number;
  progress?: {
    currentTime: number;
    completed: boolean;
    watchTime: number;
  };
  subtitles?: Array<{
    id: string;
    language: string;
    label: string;
    isDefault: boolean;
    format: string;
    url: string;
  }>;
}

interface VideoLearningHubProps {
  userId?: string;
  initialView?: 'browse' | 'player' | 'analytics' | 'recommendations';
  onVideoComplete?: (videoId: string) => void;
}

export function VideoLearningHub({ 
  userId, 
  initialView = 'browse',
  onVideoComplete 
}: VideoLearningHubProps) {
  const [currentView, setCurrentView] = useState(initialView);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadVideos();
    loadCategories();
  }, []);

  useEffect(() => {
    filterAndSortVideos();
  }, [videos, searchTerm, selectedCategory, selectedDifficulty, sortBy]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/videos?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    // Extract unique categories from videos
    const uniqueCategories = [...new Set(videos.map(v => v.category))].filter(Boolean);
    setCategories(uniqueCategories);
  };

  const filterAndSortVideos = () => {
    let filtered = [...videos];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(searchLower) ||
        video.description.toLowerCase().includes(searchLower) ||
        video.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        `${video.uploader.firstName} ${video.uploader.lastName}`.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(video => video.category === selectedCategory);
    }

    // Apply difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(video => video.difficulty === selectedDifficulty);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'popular':
          return b.viewCount - a.viewCount;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'duration':
          return a.duration - b.duration;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredVideos(filtered);
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
    setCurrentView('player');
  };

  const handleVideoComplete = (videoId: string) => {
    onVideoComplete?.(videoId);
    // Update video progress locally
    setVideos(prev => prev.map(video => 
      video.id === videoId 
        ? { ...video, progress: { ...video.progress, completed: true } as any }
        : video
    ));
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      case 'expert':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const VideoCard = ({ video, compact = false }: { video: Video; compact?: boolean }) => (
    <Card 
      className={`group cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 ${
        compact ? 'flex' : ''
      }`}
      onClick={() => handleVideoSelect(video)}
    >
      <div className={`relative ${compact ? 'w-48 flex-shrink-0' : ''}`}>
        <div className={`${compact ? 'aspect-video' : 'aspect-video'} bg-gray-200 ${compact ? '' : 'rounded-t-lg'} overflow-hidden`}>
          {video.thumbnailUrl ? (
            <img 
              src={video.thumbnailUrl} 
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
              <VideoIcon className="h-12 w-12 text-white" />
            </div>
          )}
        </div>
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          {formatDuration(video.duration)}
        </div>
        {video.progress && video.progress.completed && (
          <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            Completed
          </div>
        )}
        {video.rating && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {video.rating.toFixed(1)}
          </div>
        )}
        {video.progress && !video.progress.completed && video.progress.currentTime > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-purple-600 h-1">
            <div 
              className="bg-purple-400 h-full transition-all duration-300"
              style={{ width: `${(video.progress.currentTime / video.duration) * 100}%` }}
            />
          </div>
        )}
      </div>

      <CardContent className={`${compact ? 'flex-1' : ''} p-4`}>
        <h3 className={`font-semibold ${compact ? 'text-sm' : 'text-sm'} mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors`}>
          {video.title}
        </h3>
        
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
          <User className="h-3 w-3" />
          <span>{video.uploader.firstName} {video.uploader.lastName}</span>
          <span>•</span>
          <Eye className="h-3 w-3" />
          <span>{formatViewCount(video.viewCount)}</span>
        </div>

        <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            {video.category}
          </Badge>
          <Badge className={`text-xs ${getDifficultyColor(video.difficulty)}`}>
            {video.difficulty}
          </Badge>
        </div>

        {!compact && (
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {video.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs bg-gray-50">
                  <Tag className="h-2 w-2 mr-1" />
                  {tag}
                </Badge>
              ))}
              {video.tags.length > 2 && (
                <Badge variant="outline" className="text-xs bg-gray-50">
                  +{video.tags.length - 2}
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(video.createdAt).toLocaleDateString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (currentView === 'player' && selectedVideo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentView('browse')}
            className="flex items-center gap-2"
          >
            ← Back to Browse
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('analytics')}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <VideoPlayer
              ref={videoRef}
              videoId={selectedVideo.id}
              videoUrl={selectedVideo.videoUrl}
              videoTitle={selectedVideo.title}
              availableQualities={selectedVideo.videoStreams || []}
              subtitles={selectedVideo.subtitles || []}
              onComplete={() => handleVideoComplete(selectedVideo.id)}
              autoPlay={true}
            />
            
            <Card>
              <CardContent className="p-6">
                <h1 className="text-2xl font-bold mb-4">{selectedVideo.title}</h1>
                <p className="text-gray-600 mb-4">{selectedVideo.description}</p>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        {selectedVideo.uploader.firstName} {selectedVideo.uploader.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>{formatViewCount(selectedVideo.viewCount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatDuration(selectedVideo.duration)}</span>
                    </div>
                  </div>
                  
                  {selectedVideo.rating && (
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{selectedVideo.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={getDifficultyColor(selectedVideo.difficulty)}>
                    {selectedVideo.difficulty}
                  </Badge>
                  <Badge variant="outline">{selectedVideo.category}</Badge>
                  {selectedVideo.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="bg-gray-50">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <CaptionManager 
              videoId={selectedVideo.id}
              onCaptionChange={(captions) => {
                setSelectedVideo(prev => prev ? {
                  ...prev,
                  subtitles: captions.map(c => ({
                    id: c.id,
                    language: c.language,
                    label: c.label,
                    isDefault: c.isDefault,
                    format: c.format,
                    url: `/api/videos/${selectedVideo.id}/captions/${c.id}/content`
                  }))
                } : null);
              }}
            />
          </div>

          <div className="space-y-4">
            <VideoRecommendations
              userId={userId}
              currentVideoId={selectedVideo.id}
              onVideoSelect={handleVideoSelect}
              showExplanations={true}
            />
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'analytics') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Video Analytics
          </h1>
          <Button
            variant="outline"
            onClick={() => setCurrentView('browse')}
          >
            ← Back to Browse
          </Button>
        </div>
        
        <VideoAnalytics videoId={selectedVideo?.id} />
      </div>
    );
  }

  if (currentView === 'recommendations') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Personalized Recommendations
          </h1>
          <Button
            variant="outline"
            onClick={() => setCurrentView('browse')}
          >
            ← Back to Browse
          </Button>
        </div>
        
        <VideoRecommendations
          userId={userId}
          onVideoSelect={handleVideoSelect}
          showExplanations={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <VideoIcon className="h-6 w-6" />
          Video Learning Hub
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentView('recommendations')}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Recommendations
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentView('analytics')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search videos, topics, instructors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="duration">Shortest First</SelectItem>
                <SelectItem value="title">Alphabetical</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-2"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Showing {filteredVideos.length} of {videos.length} videos
        </p>
      </div>

      {/* Video Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse space-y-3">
              <div className="aspect-video bg-gray-200 rounded"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-4'
        }>
          {filteredVideos.map(video => (
            <VideoCard 
              key={video.id} 
              video={video} 
              compact={viewMode === 'list'} 
            />
          ))}
        </div>
      )}

      {filteredVideos.length === 0 && !loading && (
        <div className="text-center py-12">
          <VideoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No videos found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search terms or filters
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedDifficulty('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}