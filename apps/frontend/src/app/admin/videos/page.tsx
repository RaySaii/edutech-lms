'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  BarChart3,
  Search,
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnailPath?: string;
  duration: number;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  viewCount: number;
  fileSize: number;
  createdAt: string;
  isPublic: boolean;
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  processingStatus?: {
    progress: number;
    currentStep: string;
    error?: string;
  };
  analytics: {
    totalViews: number;
    uniqueViewers: number;
    averageWatchTime: number;
    completionRate: number;
  };
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVideos, setTotalVideos] = useState(0);
  const [stats, setStats] = useState({
    totalVideos: 0,
    readyVideos: 0,
    processingVideos: 0,
    failedVideos: 0,
    totalViews: 0,
    totalWatchTime: 0
  });

  useEffect(() => {
    loadVideos();
    loadStats();
  }, [currentPage, statusFilter, sortBy, sortOrder]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sort: sortBy,
        order: sortOrder,
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/admin/videos?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos);
        setTotalPages(Math.ceil(data.total / 20));
        setTotalVideos(data.total);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/videos/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    // Debounce search
    setTimeout(() => {
      if (term === searchTerm) {
        loadVideos();
      }
    }, 500);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedVideos.size === 0) return;

    const confirmMessage = {
      'delete': 'Are you sure you want to delete the selected videos?',
      'make-public': 'Make selected videos public?',
      'make-private': 'Make selected videos private?',
      'reprocess': 'Reprocess selected failed videos?'
    }[action];

    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch('/api/admin/videos/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          action,
          videoIds: Array.from(selectedVideos),
        }),
      });

      if (response.ok) {
        await loadVideos();
        await loadStats();
        setSelectedVideos(new Set());
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const response = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        await loadVideos();
        await loadStats();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const toggleVideoVisibility = async (videoId: string, isPublic: boolean) => {
    try {
      const response = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ isPublic: !isPublic }),
      });

      if (response.ok) {
        await loadVideos();
      }
    } catch (error) {
      console.error('Toggle visibility failed:', error);
    }
  };

  const reprocessVideo = async (videoId: string) => {
    try {
      const response = await fetch(`/api/admin/videos/${videoId}/reprocess`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        await loadVideos();
      }
    } catch (error) {
      console.error('Reprocess failed:', error);
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch('/api/admin/videos/export', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `videos-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'uploading': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle className="h-4 w-4" />;
      case 'processing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'uploading': return <Upload className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    const newSelection = new Set(selectedVideos);
    if (newSelection.has(videoId)) {
      newSelection.delete(videoId);
    } else {
      newSelection.add(videoId);
    }
    setSelectedVideos(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedVideos.size === videos.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(videos.map(v => v.id)));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Video Administration</h1>
        <p className="text-gray-600">Manage all videos across the platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Videos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalVideos}</p>
              </div>
              <Play className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ready</p>
                <p className="text-2xl font-bold text-green-600">{stats.readyVideos}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.processingVideos}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failedVideos}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.totalViews.toLocaleString()}
                </p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Watch Time</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatDuration(stats.totalWatchTime)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="uploading">Uploading</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order as 'asc' | 'desc');
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="viewCount-desc">Most Viewed</option>
            <option value="fileSize-desc">Largest Files</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={exportData}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>

          <Button
            onClick={loadVideos}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedVideos.size > 0 && (
        <Card className="mb-6 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {selectedVideos.size} video(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('make-public')}
                >
                  Make Public
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('make-private')}
                >
                  Make Private
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('reprocess')}
                >
                  Reprocess
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkAction('delete')}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Videos Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Loading videos...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="p-8 text-center">
              <Play className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No videos found</h3>
              <p className="text-gray-600">No videos match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="p-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedVideos.size === videos.length}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-gray-900">Video</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-900">Uploader</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-900">Status</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-900">Visibility</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-900">Analytics</th>
                    <th className="p-4 text-left text-sm font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {videos.map((video) => (
                    <tr key={video.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedVideos.has(video.id)}
                          onChange={() => toggleVideoSelection(video.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-16 h-12 bg-gray-900 rounded overflow-hidden flex-shrink-0">
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
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{video.title}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>{formatDuration(video.duration)}</span>
                              <span>•</span>
                              <span>{formatFileSize(video.fileSize)}</span>
                            </div>
                            {video.status === 'processing' && video.processingStatus && (
                              <div className="mt-1">
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <span>{video.processingStatus.currentStep}</span>
                                  <span>{video.processingStatus.progress}%</span>
                                </div>
                                <Progress value={video.processingStatus.progress} className="h-1 mt-1" />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            {video.uploader.firstName} {video.uploader.lastName}
                          </p>
                          <p className="text-gray-500">{video.uploader.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(video.status)}
                          <Badge className={getStatusColor(video.status)}>
                            {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleVideoVisibility(video.id, video.isPublic)}
                          className={video.isPublic ? 'text-green-600' : 'text-gray-600'}
                        >
                          {video.isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Eye className="h-3 w-3" />
                            <span>{video.analytics.totalViews}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Users className="h-3 w-3" />
                            <span>{video.analytics.uniqueViewers}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {video.analytics.completionRate.toFixed(1)}% completion
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {video.status === 'ready' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`/videos/${video.id}/play`, '_blank')}
                              className="p-2"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/videos/${video.id}/analytics`, '_blank')}
                            className="p-2"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          {video.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => reprocessVideo(video.id)}
                              className="p-2 text-yellow-600"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteVideo(video.id)}
                            className="p-2 text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>
            
            <span className="text-sm text-gray-600 mx-4">
              Page {currentPage} of {totalPages} ({totalVideos} total)
            </span>
            
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}