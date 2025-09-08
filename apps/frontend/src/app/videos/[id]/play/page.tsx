'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Eye, Calendar, User, Bookmark, FileText } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnailPath?: string;
  duration: number;
  status: string;
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
}

interface VideoBookmark {
  id: string;
  timestamp: number;
  title?: string;
  notes?: string;
  createdAt: string;
}

interface VideoNote {
  id: string;
  timestamp: number;
  content: string;
  isPublic: boolean;
  createdAt: string;
}

export default function VideoPlayPage() {
  const [video, setVideo] = useState<Video | null>(null);
  const [bookmarks, setBookmarks] = useState<VideoBookmark[]>([]);
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const videoId = params.id as string;

  useEffect(() => {
    if (videoId) {
      loadVideo();
      loadBookmarks();
      loadNotes();
    }
  }, [videoId]);

  const loadVideo = async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVideo(data);
      } else if (response.status === 404) {
        setError('Video not found');
      } else {
        setError('Failed to load video');
      }
    } catch (error) {
      console.error('Error loading video:', error);
      setError('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}/bookmarks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBookmarks(data);
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  const loadNotes = async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}/notes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const handleProgress = (progress: { currentTime: number; duration: number; percentage: number }) => {
    // Handle progress updates if needed
    console.log('Video progress:', progress);
  };

  const handleComplete = () => {
    console.log('Video completed');
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const jumpToTimestamp = (timestamp: number) => {
    // This would ideally communicate with the video player to seek to the timestamp
    console.log('Jump to timestamp:', timestamp);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="aspect-video bg-gray-200 rounded-lg mb-6"></div>
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <ArrowLeft className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Video not available'}
          </h3>
          <Button onClick={() => router.push('/videos')} className="mt-4">
            Back to Videos
          </Button>
        </div>
      </div>
    );
  }

  if (video.status !== 'ready') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Video is {video.status}
          </h3>
          <p className="text-gray-600 mb-6">
            Please wait while the video is being processed. This may take a few minutes.
          </p>
          <Button onClick={() => router.push('/videos')} variant="outline">
            Back to Videos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/videos')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Videos
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          {/* Video Player */}
          <div className="mb-6">
            <VideoPlayer
              videoId={videoId}
              src={`/api/videos/${videoId}/stream/720p`}
              title={video.title}
              thumbnail={video.thumbnailPath ? `/api/videos/${videoId}/thumbnail` : undefined}
              onProgress={handleProgress}
              onComplete={handleComplete}
              autoPlay={false}
              controls={true}
              className="w-full"
            />
          </div>

          {/* Video Info */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{video.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                {video.viewCount} views
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {formatTime(video.duration)}
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(video.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {video.uploader.firstName} {video.uploader.lastName}
              </div>
              <Badge variant={video.isPublic ? "default" : "secondary"}>
                {video.isPublic ? "Public" : "Private"}
              </Badge>
            </div>

            {video.description && (
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{video.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Bookmarks */}
          {bookmarks.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Bookmark className="h-5 w-5 mr-2 text-yellow-600" />
                  Bookmarks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-64 overflow-y-auto">
                  {bookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className="p-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => jumpToTimestamp(bookmark.timestamp)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-purple-600">
                          {formatTime(bookmark.timestamp)}
                        </span>
                      </div>
                      {bookmark.title && (
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {bookmark.title}
                        </p>
                      )}
                      {bookmark.notes && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {bookmark.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {notes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 mr-2 text-blue-600" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  {notes.map((note) => (
                    <div key={note.id} className="p-4 border-b last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-600">
                          {formatTime(note.timestamp)}
                        </span>
                        {note.isPublic && (
                          <Badge variant="outline" className="text-xs">
                            Public
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video Details */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Video Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">File Size:</span>
                  <span>{formatFileSize(video.fileSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span>{formatTime(video.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Views:</span>
                  <span>{video.viewCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Uploaded:</span>
                  <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="default">{video.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}