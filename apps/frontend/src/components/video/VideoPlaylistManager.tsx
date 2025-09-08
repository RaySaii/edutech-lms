'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Lock, 
  Unlock, 
  Star, 
  Users, 
  Clock, 
  PlayCircle,
  GripVertical,
  Settings,
  BarChart3,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VideoPlaylist {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  isPublic: boolean;
  isFeatured: boolean;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tags: string[];
  totalDuration: number;
  videoCount: number;
  viewCount: number;
  rating?: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
  };
  course?: {
    id: string;
    title: string;
  };
  items?: VideoPlaylistItem[];
  videos?: Array<{
    id: string;
    video: {
      id: string;
      title: string;
      duration: number;
      thumbnailUrl: string;
      viewCount: number;
    };
    order: number;
    customTitle?: string;
    isRequired: boolean;
    isVisible: boolean;
  }>;
  userProgress?: {
    progressPercentage: number;
    completedVideos: number;
    totalWatchTime: number;
    isCompleted: boolean;
    lastWatchedAt: string;
  };
}

interface VideoPlaylistItem {
  id: string;
  videoId: string;
  order: number;
  customTitle?: string;
  customDescription?: string;
  isRequired: boolean;
  isVisible: boolean;
  unlockAfterSeconds?: number;
  settings?: {
    startTime?: number;
    endTime?: number;
    skipIntro?: boolean;
    skipOutro?: boolean;
  };
}

interface VideoPlaylistManagerProps {
  userId?: string;
  courseId?: string;
  onPlaylistSelect?: (playlist: VideoPlaylist) => void;
  onVideoSelect?: (videoId: string, playlistId: string) => void;
}

export function VideoPlaylistManager({
  userId,
  courseId,
  onPlaylistSelect,
  onVideoSelect
}: VideoPlaylistManagerProps) {
  const [playlists, setPlaylists] = useState<VideoPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<VideoPlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('my-playlists');
  
  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'beginner' as const,
    isPublic: false,
    tags: [] as string[],
  });

  useEffect(() => {
    loadPlaylists();
  }, [activeTab, courseId]);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      let url = '/api/video-playlists';
      
      if (activeTab === 'my-playlists') {
        url = '/api/video-playlists/my-playlists';
      } else if (activeTab === 'featured') {
        url = '/api/video-playlists/featured';
      } else if (courseId) {
        url = `/api/video-playlists/course/${courseId}/playlists`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlaylists(data.playlists || data);
      }
    } catch (error) {
      console.error('Failed to load playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylistDetails = async (playlistId: string) => {
    try {
      const response = await fetch(`/api/video-playlists/${playlistId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const playlist = await response.json();
        setSelectedPlaylist(playlist);
        return playlist;
      }
    } catch (error) {
      console.error('Failed to load playlist details:', error);
    }
  };

  const createPlaylist = async () => {
    try {
      const response = await fetch('/api/video-playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...formData,
          courseId,
        }),
      });

      if (response.ok) {
        const newPlaylist = await response.json();
        setPlaylists(prev => [newPlaylist, ...prev]);
        setShowCreateForm(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create playlist');
      }
    } catch (error) {
      console.error('Failed to create playlist:', error);
      alert('Failed to create playlist');
    }
  };

  const updatePlaylist = async () => {
    if (!selectedPlaylist) return;

    try {
      const response = await fetch(`/api/video-playlists/${selectedPlaylist.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedPlaylist = await response.json();
        setPlaylists(prev => prev.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p));
        setSelectedPlaylist(updatedPlaylist);
        setShowEditForm(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update playlist');
      }
    } catch (error) {
      console.error('Failed to update playlist:', error);
      alert('Failed to update playlist');
    }
  };

  const deletePlaylist = async (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;

    try {
      const response = await fetch(`/api/video-playlists/${playlistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setPlaylists(prev => prev.filter(p => p.id !== playlistId));
        if (selectedPlaylist?.id === playlistId) {
          setSelectedPlaylist(null);
        }
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete playlist');
      }
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      alert('Failed to delete playlist');
    }
  };

  const duplicatePlaylist = async (playlistId: string) => {
    try {
      const response = await fetch(`/api/video-playlists/${playlistId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title: `Copy of ${playlists.find(p => p.id === playlistId)?.title}`,
          isPublic: false,
        }),
      });

      if (response.ok) {
        const duplicatedPlaylist = await response.json();
        setPlaylists(prev => [duplicatedPlaylist, ...prev]);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to duplicate playlist');
      }
    } catch (error) {
      console.error('Failed to duplicate playlist:', error);
      alert('Failed to duplicate playlist');
    }
  };

  const togglePlaylistExpansion = async (playlistId: string) => {
    if (expandedPlaylists.has(playlistId)) {
      setExpandedPlaylists(prev => {
        const newSet = new Set(prev);
        newSet.delete(playlistId);
        return newSet;
      });
    } else {
      await loadPlaylistDetails(playlistId);
      setExpandedPlaylists(prev => new Set(prev).add(playlistId));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      difficulty: 'beginner',
      isPublic: false,
      tags: [],
    });
  };

  const prepareEditForm = (playlist: VideoPlaylist) => {
    setFormData({
      title: playlist.title,
      description: playlist.description || '',
      category: playlist.category,
      difficulty: playlist.difficulty,
      isPublic: playlist.isPublic,
      tags: playlist.tags || [],
    });
    setSelectedPlaylist(playlist);
    setShowEditForm(true);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      case 'expert': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const PlaylistCard = ({ playlist }: { playlist: VideoPlaylist }) => {
    const isExpanded = expandedPlaylists.has(playlist.id);
    
    return (
      <Card key={playlist.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePlaylistExpansion(playlist.id)}
                  className="p-1 h-6 w-6"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                <CardTitle className="text-lg flex items-center gap-2">
                  {playlist.title}
                  {!playlist.isPublic && <Lock className="h-4 w-4 text-gray-500" />}
                  {playlist.isFeatured && <Star className="h-4 w-4 text-yellow-500" />}
                </CardTitle>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <PlayCircle className="h-4 w-4" />
                  <span>{playlist.videoCount} videos</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(playlist.totalDuration)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{playlist.viewCount} views</span>
                </div>
                {playlist.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{playlist.rating.toFixed(1)} ({playlist.ratingCount})</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <Badge className={getDifficultyColor(playlist.difficulty)}>
                  {playlist.difficulty}
                </Badge>
                <Badge variant="outline">{playlist.category}</Badge>
                {playlist.tags?.map(tag => (
                  <Badge key={tag} variant="outline" className="bg-gray-50">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPlaylistSelect?.(playlist)}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Play
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => prepareEditForm(playlist)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => duplicatePlaylist(playlist.id)}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deletePlaylist(playlist.id)}
                className="flex items-center gap-2 text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {playlist.userProgress && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Progress: {playlist.userProgress.completedVideos}/{playlist.videoCount} videos</span>
                <span>{playlist.userProgress.progressPercentage.toFixed(0)}%</span>
              </div>
              <Progress value={playlist.userProgress.progressPercentage} className="h-2" />
            </div>
          )}
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            {playlist.description && (
              <p className="text-gray-600 mb-4">{playlist.description}</p>
            )}

            {selectedPlaylist?.id === playlist.id && selectedPlaylist.videos && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700 mb-2">Videos in this playlist:</h4>
                {selectedPlaylist.videos.map((item, index) => (
                  <div 
                    key={item.id}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                    onClick={() => onVideoSelect?.(item.video.id, playlist.id)}
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{index + 1}</span>
                      <GripVertical className="h-4 w-4" />
                    </div>
                    
                    <div className="w-16 h-10 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                      {item.video.thumbnailUrl ? (
                        <img 
                          src={item.video.thumbnailUrl} 
                          alt={item.customTitle || item.video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                          <Play className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-sm truncate">
                        {item.customTitle || item.video.title}
                      </h5>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{formatDuration(item.video.duration)}</span>
                        <span>{item.video.viewCount} views</span>
                        {item.isRequired && (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {item.isVisible ? (
                        <Eye className="h-4 w-4 text-gray-400" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-6 w-6"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <div className="text-sm text-gray-500">
                Created {new Date(playlist.createdAt).toLocaleDateString()} by {playlist.creator.firstName} {playlist.creator.lastName}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="flex gap-2">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Video Playlists
        </h2>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Playlist
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-playlists">My Playlists</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="all">All Public</TabsTrigger>
          {courseId && (
            <TabsTrigger value="course">Course Playlists</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {playlists.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No playlists found</h3>
              <p className="text-gray-600 mb-4">
                {activeTab === 'my-playlists' 
                  ? "You haven't created any playlists yet"
                  : "No playlists available in this category"
                }
              </p>
              {activeTab === 'my-playlists' && (
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Playlist
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {playlists.map(playlist => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || showEditForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {showCreateForm ? 'Create New Playlist' : 'Edit Playlist'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter playlist title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your playlist"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., Programming"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Difficulty</label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isPublic" className="text-sm">
                  Make this playlist public
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setShowEditForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={showCreateForm ? createPlaylist : updatePlaylist}
                  disabled={!formData.title.trim()}
                >
                  {showCreateForm ? 'Create' : 'Update'} Playlist
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}