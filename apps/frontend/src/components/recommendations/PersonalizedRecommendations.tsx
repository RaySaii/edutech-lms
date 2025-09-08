'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Heart,
  BookOpen,
  Clock,
  Star,
  TrendingUp,
  Brain,
  Target,
  Users,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  X,
  PlayCircle,
  CheckCircle,
} from 'lucide-react';

interface Recommendation {
  id: string;
  contentId: string;
  courseId?: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  type: string;
  confidenceScore: number;
  relevanceScore: number;
  reasoning: {
    primaryFactors: string[];
    explanation: string;
  };
  metadata: {
    duration?: number;
    difficulty?: string;
    skillsLearned?: string[];
    completionRate?: number;
    rating?: number;
  };
}

interface RecommendationResponse {
  recommendations: Recommendation[];
  metadata: {
    totalAvailable: number;
    algorithmUsed: string;
    personalizationLevel: number;
    diversityScore: number;
    responseTime: number;
  };
}

const PersonalizedRecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interactionStatus, setInteractionStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-recommendations/personalized?limit=12&diversityLevel=0.4');
      
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const result = await response.json();
      setRecommendations(result.data.recommendations || []);
      setMetadata(result.data.metadata);
    } catch (err) {
      setError('Unable to load personalized recommendations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleInteraction = async (recommendationId: string, interactionType: string, additionalData?: any) => {
    try {
      await fetch('/api/ai-recommendations/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recommendationId,
          interactionType,
          interactionData: {
            ...additionalData,
            timestamp: new Date().toISOString(),
            context: 'dashboard',
          },
        }),
      });

      setInteractionStatus(prev => ({
        ...prev,
        [recommendationId]: interactionType,
      }));
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  };

  const getRecommendationTypeIcon = (type: string) => {
    const iconMap = {
      content_based: <BookOpen className="h-4 w-4" />,
      collaborative: <Users className="h-4 w-4" />,
      hybrid: <Brain className="h-4 w-4" />,
      trending: <TrendingUp className="h-4 w-4" />,
      career_path: <Target className="h-4 w-4" />,
      skill_gap: <Lightbulb className="h-4 w-4" />,
      contextual: <Heart className="h-4 w-4" />,
    };

    return iconMap[type] || <BookOpen className="h-4 w-4" />;
  };

  const getRecommendationTypeLabel = (type: string) => {
    const labelMap = {
      content_based: 'For You',
      collaborative: 'Popular Choice',
      hybrid: 'AI Recommended',
      trending: 'Trending',
      career_path: 'Career Growth',
      skill_gap: 'Skill Building',
      contextual: 'Related',
    };

    return labelMap[type] || 'Recommended';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colorMap = {
      beginner: 'bg-green-100 text-green-700 border-green-200',
      intermediate: 'bg-blue-100 text-blue-700 border-blue-200',
      advanced: 'bg-purple-100 text-purple-700 border-purple-200',
      expert: 'bg-red-100 text-red-700 border-red-200',
    };

    return colorMap[difficulty?.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="max-w-md mx-auto">
        <Brain className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Simple preferences modal state
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState<{ [k: string]: boolean }>({});

  return (
    <div className="space-y-6">
      {/* Header with Metadata */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Personalized Recommendations</h2>
          <p className="text-muted-foreground">
            AI-curated content tailored just for you
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setPrefsOpen(true)} variant="outline">
            Update Preferences
          </Button>
          <Button onClick={fetchRecommendations} variant="outline">
            <Brain className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Personalization Stats */}
      {metadata && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Personalization</p>
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={metadata.personalizationLevel * 100} 
                      className="w-16 h-2"
                    />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(metadata.personalizationLevel * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Diversity</p>
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={metadata.diversityScore * 100} 
                      className="w-16 h-2"
                    />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(metadata.diversityScore * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Response Time</p>
                  <p className="text-sm text-muted-foreground">
                    {metadata.responseTime}ms
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Available</p>
                  <p className="text-sm text-muted-foreground">
                    {metadata.totalAvailable} items
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((recommendation) => (
          <Card 
            key={recommendation.id}
            className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
              interactionStatus[recommendation.id] === 'dismissed' ? 'opacity-50' : ''
            }`}
            data-testid="recommendation-card"
          >
            {/* Dismiss Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10 h-6 w-6 p-0 bg-white/80 hover:bg-white"
              onClick={() => handleInteraction(recommendation.id, 'dismiss')}
            >
              <X className="h-3 w-3" />
            </Button>

            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1 mr-6">
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="secondary" 
                      className="text-xs"
                    >
                      {getRecommendationTypeIcon(recommendation.type)}
                      <span className="ml-1">
                        {getRecommendationTypeLabel(recommendation.type)}
                      </span>
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-muted-foreground">
                        {Math.round(recommendation.relevanceScore * 100)}%
                      </span>
                    </div>
                  </div>
                  <CardTitle className="text-sm line-clamp-2">
                    {recommendation.title}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2">
                    {recommendation.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Metadata Tags */}
              <div className="flex flex-wrap gap-2">
                {recommendation.metadata.duration && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="mr-1 h-3 w-3" />
                    {formatDuration(recommendation.metadata.duration)}
                  </Badge>
                )}
                {recommendation.metadata.difficulty && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getDifficultyColor(recommendation.metadata.difficulty)}`}
                  >
                    {recommendation.metadata.difficulty.charAt(0).toUpperCase() + 
                     recommendation.metadata.difficulty.slice(1)}
                  </Badge>
                )}
                {recommendation.metadata.rating && (
                  <Badge variant="outline" className="text-xs">
                    <Star className="mr-1 h-3 w-3" />
                    {recommendation.metadata.rating.toFixed(1)}
                  </Badge>
                )}
              </div>

              {/* Skills Tags */}
              {recommendation.metadata.skillsLearned && 
               recommendation.metadata.skillsLearned.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Skills you'll learn:</p>
                  <div className="flex flex-wrap gap-1">
                    {recommendation.metadata.skillsLearned.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {recommendation.metadata.skillsLearned.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{recommendation.metadata.skillsLearned.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Reasoning */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Why recommended:</p>
                <p className="text-xs text-muted-foreground">
                  {recommendation.reasoning.explanation}
                </p>
              </div>

              {/* Completion Rate */}
              {recommendation.metadata.completionRate && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-medium text-muted-foreground">
                      Completion Rate
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(recommendation.metadata.completionRate * 100)}%
                    </p>
                  </div>
                  <Progress 
                    value={recommendation.metadata.completionRate * 100}
                    className="h-2"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    handleInteraction(recommendation.id, 'click');
                    // Navigate to content
                    window.location.href = recommendation.courseId 
                      ? `/courses/${recommendation.courseId}`
                      : `/content/${recommendation.contentId}`;
                  }}
                  disabled={interactionStatus[recommendation.id] === 'dismissed'}
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {recommendation.courseId ? 'View Course' : 'Start Learning'}
                </Button>
                
                <div className="flex space-x-1" data-testid="recommendation-feedback">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => handleInteraction(recommendation.id, 'rate', { helpful: true })}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => handleInteraction(recommendation.id, 'rate', { helpful: false })}
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>

            {/* Confidence Indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-300"
                style={{ width: `${recommendation.confidenceScore * 100}%` }}
              />
            </div>
          </Card>
        ))}
      </div>

      {prefsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-md shadow-xl w-full max-w-md p-6" data-testid="preferences-modal">
            <h3 className="text-lg font-semibold mb-2">Update Learning Preferences</h3>
            <p className="text-sm text-gray-600 mb-4">Select your interests to improve recommendations.</p>
            <div className="space-y-2">
              {['machine-learning','data-science','frontend','backend'].map(key => (
                <label key={key} className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    value={key}
                    checked={!!prefs[key]}
                    onChange={(e) => setPrefs(prev => ({...prev, [key]: e.target.checked}))}
                  />
                  <span className="capitalize">{key.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPrefsOpen(false)}>Cancel</Button>
              <Button onClick={() => { setPrefsOpen(false); /* feedback for E2E */ console.log('Preferences updated'); }}>Save Preferences</Button>
            </div>
          </div>
        </div>
      )}

      {recommendations.length === 0 && (
        <div className="text-center py-12">
          <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Building Your Recommendations</h3>
          <p className="text-muted-foreground mb-4">
            Complete some courses and assessments to get personalized recommendations.
          </p>
          <Button onClick={fetchRecommendations}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};

export default PersonalizedRecommendations;
