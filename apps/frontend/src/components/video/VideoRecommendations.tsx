'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Compass, 
  BookOpen,
  Play,
  Clock,
  Eye,
  Star,
  ChevronRight,
  RotateCcw,
  Filter,
  Info,
  Users,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface Video {
  id: string;
  title: string;
  description: string;
  duration: number;
  viewCount: number;
  category: string;
  difficulty: string;
  tags: string[];
  thumbnailUrl: string;
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: string;
  rating?: number;
}

interface RecommendationMetadata {
  totalCandidates: number;
  algorithms: {
    contentBased: number;
    collaborative: number;
    trending: number;
    similarUsers: number;
    learningPath: number;
  };
  userProfile: {
    completionRate: number;
    avgWatchTime: number;
    topCategories: string[];
    topTags: string[];
  };
  explanations: Array<{
    videoId: string;
    score: number;
    reasons: string[];
    type: string;
  }>;
}

interface VideoRecommendationsProps {
  userId?: string;
  currentVideoId?: string;
  showExplanations?: boolean;
  onVideoSelect?: (video: Video) => void;
}

export function VideoRecommendations({ 
  userId, 
  currentVideoId, 
  showExplanations = false,
  onVideoSelect 
}: VideoRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Video[]>([]);
  const [similarVideos, setSimilarVideos] = useState<Video[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [discoveryVideos, setDiscoveryVideos] = useState<Video[]>([]);
  const [metadata, setMetadata] = useState<RecommendationMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recommendations');
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    loadRecommendations();
    if (currentVideoId) {
      loadSimilarVideos();
    }
    loadTrendingVideos();
    loadDiscoveryVideos();
  }, [userId, currentVideoId]);

  const loadRecommendations = async () => {
    try {
      const response = await fetch('/api/videos/recommendations?limit=12', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations);
        setMetadata(data.metadata);
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const loadSimilarVideos = async () => {
    if (!currentVideoId) return;

    try {
      const response = await fetch(`/api/videos/${currentVideoId}/similar?limit=6`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSimilarVideos(data);
      }
    } catch (error) {
      console.error('Failed to load similar videos:', error);
    }
  };

  const loadTrendingVideos = async () => {
    try {
      const response = await fetch('/api/videos/trending?limit=8', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTrendingVideos(data);
      }
    } catch (error) {
      console.error('Failed to load trending videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDiscoveryVideos = async () => {
    try {
      const response = await fetch('/api/videos/discover?limit=10', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDiscoveryVideos(data.videos);
      }
    } catch (error) {
      console.error('Failed to load discovery videos:', error);
    }
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecommendationReason = (videoId: string) => {
    if (!metadata?.explanations) return null;
    const explanation = metadata.explanations.find(e => e.videoId === videoId);
    return explanation?.reasons[0] || null;
  };

  const VideoCard = ({ video, showReason = false }: { video: Video; showReason?: boolean }) => (
    <Card 
      className="group cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
      onClick={() => onVideoSelect?.(video)}
    >
      <div className="relative">
        <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
          {video.thumbnailUrl ? (
            <img 
              src={video.thumbnailUrl} 
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
              <Play className="h-12 w-12 text-white" />
            </div>
          )}
        </div>
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          {formatDuration(video.duration)}
        </div>
        {video.rating && (
          <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {video.rating.toFixed(1)}
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
          {video.title}
        </h3>
        
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
          <span>{video.uploader.firstName} {video.uploader.lastName}</span>
          <span>•</span>
          <span>{formatViewCount(video.viewCount)}</span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            {video.category}
          </Badge>
          <Badge className={`text-xs ${getDifficultyColor(video.difficulty)}`}>
            {video.difficulty}
          </Badge>
        </div>

        {showReason && showExplanations && (
          <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded mt-2">
            <Info className="h-3 w-3 inline mr-1" />
            {getRecommendationReason(video.id) || 'Recommended for you'}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-video bg-gray-200 rounded"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-600" />
          Recommended for You
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-2"
          >
            <Info className="h-4 w-4" />
            {showStats ? 'Hide' : 'Show'} Insights
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadRecommendations}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* User Profile Insights */}
      {showStats && metadata && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Your Learning Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Completion Rate</div>
                <div className="flex items-center gap-3">
                  <Progress value={metadata.userProfile.completionRate * 100} className="flex-1" />
                  <span className="text-sm font-semibold">
                    {(metadata.userProfile.completionRate * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Avg. Watch Time</div>
                <div className="text-lg font-semibold">
                  {formatDuration(metadata.userProfile.avgWatchTime)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Top Interests</div>
                <div className="flex flex-wrap gap-1">
                  {metadata.userProfile.topCategories.map(category => (
                    <Badge key={category} variant="outline" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for different recommendation types */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            For You
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="discover" className="flex items-center gap-2">
            <Compass className="h-4 w-4" />
            Discover
          </TabsTrigger>
          {currentVideoId && (
            <TabsTrigger value="similar" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Similar
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              Personalized recommendations based on your learning preferences and history
            </p>
            {metadata && (
              <Badge variant="outline" className="text-xs">
                {recommendations.length} of {metadata.totalCandidates} videos
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recommendations.map(video => (
              <VideoCard 
                key={video.id} 
                video={video} 
                showReason={true}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          <p className="text-gray-600">
            Most popular videos this week across all learners
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {trendingVideos.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="discover" className="space-y-4">
          <p className="text-gray-600">
            Explore diverse content outside your usual interests
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {discoveryVideos.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </TabsContent>

        {currentVideoId && (
          <TabsContent value="similar" className="space-y-4">
            <p className="text-gray-600">
              Videos similar to the one you're currently watching
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {similarVideos.map(video => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Algorithm Performance (for admins or power users) */}
      {showStats && metadata && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recommendation Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {metadata.algorithms.contentBased}
                </div>
                <div className="text-xs text-gray-600">Content Based</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {metadata.algorithms.collaborative}
                </div>
                <div className="text-xs text-gray-600">Collaborative</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {metadata.algorithms.trending}
                </div>
                <div className="text-xs text-gray-600">Trending</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {metadata.algorithms.similarUsers}
                </div>
                <div className="text-xs text-gray-600">Similar Users</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {metadata.algorithms.learningPath}
                </div>
                <div className="text-xs text-gray-600">Learning Path</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}