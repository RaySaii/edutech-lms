'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  Subtitles,
  SkipBack,
  SkipForward,
  Bookmark,
  FileText,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { VideoSource } from '../../lib/videoSources';

interface VideoPlayerProps {
  video?: VideoSource;
  videoId?: string;
  src?: string;
  title?: string;
  thumbnail?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  className?: string;
  onProgress?: (progress: { currentTime: number; duration: number; percentage: number }) => void;
  onComplete?: () => void;
}

interface VideoBookmark {
  id: string;
  timestamp: number;
  title?: string;
  notes?: string;
}

interface VideoNote {
  id: string;
  timestamp: number;
  content: string;
  isPublic: boolean;
}

interface VideoProgress {
  currentTime: number;
  duration: number;
  watchTime: number;
  completed: boolean;
  completionPercentage: number;
}

export function VideoPlayer({ 
  video,
  videoId,
  src,
  title,
  thumbnail,
  autoPlay = false, 
  showControls = true,
  className = '',
  onProgress,
  onComplete
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video?.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(video?.quality?.[video.quality.length - 1] || '720p');
  const [showCaptions, setShowCaptions] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [bookmarks, setBookmarks] = useState<VideoBookmark[]>([]);
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [newBookmark, setNewBookmark] = useState({ title: '', notes: '' });
  const [newNote, setNewNote] = useState({ content: '', isPublic: false });
  const [buffered, setBuffered] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get the actual video source (either from video prop or direct src)
  const actualSrc = src || video?.url;
  const actualTitle = title || video?.title;
  const actualThumbnail = thumbnail || video?.thumbnail;
  const actualVideoId = videoId || video?.id;

  const formatTime = (timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      updateProgress();
    }
  };

  const updateBuffered = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      const bufferedPercent = (bufferedEnd / duration) * 100;
      setBuffered(bufferedPercent);
    }
  };

  const updateProgress = useCallback(async (completed = false) => {
    const video = videoRef.current;
    if (!video || !actualVideoId) return;

    const progressData = {
      currentTime: video.currentTime,
      watchTime: video.currentTime,
      completed: completed || video.currentTime >= video.duration * 0.9,
    };

    try {
      const response = await fetch(`/api/videos/${actualVideoId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(progressData),
      });

      if (response.ok) {
        onProgress?.({
          currentTime: video.currentTime,
          duration: video.duration,
          percentage: (video.currentTime / video.duration) * 100,
        });
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }, [actualVideoId, onProgress]);

  const loadBookmarks = async () => {
    if (!actualVideoId) return;
    
    try {
      const response = await fetch(`/api/videos/${actualVideoId}/bookmarks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBookmarks(data);
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  };

  const loadNotes = async () => {
    if (!actualVideoId) return;
    
    try {
      const response = await fetch(`/api/videos/${actualVideoId}/notes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const loadProgress = async () => {
    if (!actualVideoId) return;
    
    try {
      const response = await fetch(`/api/videos/${actualVideoId}/progress`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const progress: VideoProgress = await response.json();
        if (progress && videoRef.current) {
          videoRef.current.currentTime = progress.currentTime;
          setCurrentTime(progress.currentTime);
        }
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const createBookmark = async () => {
    if (!actualVideoId) return;
    
    try {
      const response = await fetch(`/api/videos/${actualVideoId}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          timestamp: currentTime,
          title: newBookmark.title || `Bookmark at ${formatTime(currentTime)}`,
          notes: newBookmark.notes,
        }),
      });

      if (response.ok) {
        loadBookmarks();
        setNewBookmark({ title: '', notes: '' });
        setShowBookmarkDialog(false);
      }
    } catch (error) {
      console.error('Failed to create bookmark:', error);
    }
  };

  const createNote = async () => {
    if (!actualVideoId) return;
    
    try {
      const response = await fetch(`/api/videos/${actualVideoId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          timestamp: currentTime,
          content: newNote.content,
          isPublic: newNote.isPublic,
        }),
      });

      if (response.ok) {
        loadNotes();
        setNewNote({ content: '', isPublic: false });
        setShowNoteDialog(false);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const jumpToBookmark = (timestamp: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = timestamp;
    setCurrentTime(timestamp);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = parseFloat(e.target.value);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (actualVideoId) {
      loadBookmarks();
      loadNotes();
      loadProgress();
    }
  }, [actualVideoId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      setIsPlaying(false);
      updateProgress(true);
      onComplete?.();
    };

    const handleProgress = () => {
      updateBuffered();
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('progress', handleProgress);

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('progress', handleProgress);
    };
  }, [updateProgress, onComplete]);

  return (
    <Card className={`relative bg-black overflow-hidden ${className}`} ref={containerRef}>
      <div className="relative aspect-video">
        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          poster={actualThumbnail}
          src={actualSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          autoPlay={autoPlay}
          preload="metadata"
        >
          {video?.hasSubtitles && showCaptions && (
            <track
              kind="subtitles"
              src={`/api/subtitles/${actualVideoId}`}
              srcLang={video.language?.toLowerCase() || 'en'}
              label={video.language || 'English'}
              default
            />
          )}
        </video>

        {/* Loading/Thumbnail Overlay */}
        {!isPlaying && currentTime === 0 && actualThumbnail && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <img 
              src={actualThumbnail} 
              alt={actualTitle}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <Button
              size="lg"
              className="relative z-10 bg-white bg-opacity-90 text-black hover:bg-opacity-100 rounded-full p-4"
              onClick={togglePlayPause}
            >
              <Play className="h-8 w-8 ml-1" />
            </Button>
          </div>
        )}

        {/* Controls Overlay */}
        {showControls && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-4">
            {/* Progress Bar */}
            <div className="mb-4 relative">
              <div className="relative h-1 bg-gray-600 rounded-lg overflow-hidden">
                {/* Buffered progress */}
                <div 
                  className="absolute h-full bg-gray-400 rounded-lg transition-all duration-300"
                  style={{ width: `${buffered}%` }}
                />
                {/* Current progress */}
                <div 
                  className="absolute h-full bg-purple-600 rounded-lg transition-all duration-150"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
              
              {/* Bookmarks on progress bar */}
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="absolute top-0 w-2 h-2 bg-yellow-400 rounded-full cursor-pointer transform -translate-y-0.5 hover:scale-125 transition-transform"
                  style={{ left: `${(bookmark.timestamp / duration) * 100}%` }}
                  onClick={() => jumpToBookmark(bookmark.timestamp)}
                  title={bookmark.title || `Bookmark at ${formatTime(bookmark.timestamp)}`}
                />
              ))}
              
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer"
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlayPause}
                  className="text-white hover:text-gray-300 p-2"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipBackward}
                  className="text-white hover:text-gray-300 p-2"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipForward}
                  className="text-white hover:text-gray-300 p-2"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleMute}
                    className="text-white hover:text-gray-300 p-2"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <span className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBookmarkDialog(true)}
                  className="text-white hover:text-gray-300 p-2"
                  title="Add Bookmark"
                >
                  <Bookmark className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNoteDialog(true)}
                  className="text-white hover:text-gray-300 p-2"
                  title="Add Note"
                >
                  <FileText className="h-4 w-4" />
                </Button>

                {video?.hasSubtitles && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCaptions(!showCaptions)}
                    className={`text-white hover:text-gray-300 p-2 ${showCaptions ? 'bg-purple-600' : ''}`}
                  >
                    <Subtitles className="h-4 w-4" />
                  </Button>
                )}

                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-white hover:text-gray-300 p-2"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>

                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-2 bg-black bg-opacity-90 rounded-lg p-4 min-w-48">
                      <div className="space-y-3 text-white text-sm">
                        <div>
                          <label className="block mb-2">Quality</label>
                          <select
                            value={selectedQuality}
                            onChange={(e) => setSelectedQuality(e.target.value)}
                            className="w-full bg-gray-700 text-white rounded px-2 py-1"
                          >
                            {video?.quality?.map(quality => (
                              <option key={quality} value={quality}>{quality}</option>
                            )) || (
                              <>
                                <option value="480p">480p</option>
                                <option value="720p">720p</option>
                                <option value="1080p">1080p</option>
                              </>
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block mb-2">Speed</label>
                          <select
                            value={playbackRate}
                            onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                            className="w-full bg-gray-700 text-white rounded px-2 py-1"
                          >
                            <option value={0.5}>0.5x</option>
                            <option value={0.75}>0.75x</option>
                            <option value={1}>Normal</option>
                            <option value={1.25}>1.25x</option>
                            <option value={1.5}>1.5x</option>
                            <option value={2}>2x</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-white hover:text-gray-300 p-2"
                >
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Info */}
      {(actualTitle || video) && (
        <div className="p-4 bg-white">
          <h3 className="font-semibold text-gray-900 mb-2">{actualTitle}</h3>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              {video?.instructor && (
                <>
                  <span>{video.instructor}</span>
                  <span>•</span>
                </>
              )}
              {video?.difficulty && (
                <>
                  <span>{video.difficulty}</span>
                  <span>•</span>
                </>
              )}
              <span>{formatTime(duration)}</span>
            </div>
            <div className="flex items-center space-x-2">
              {video?.hasSubtitles && (
                <span className="bg-gray-100 px-2 py-1 rounded text-xs">CC</span>
              )}
              {video?.hasTranscript && (
                <span className="bg-gray-100 px-2 py-1 rounded text-xs">Transcript</span>
              )}
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                {selectedQuality}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bookmark Dialog */}
      {showBookmarkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Add Bookmark</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={newBookmark.title}
                    onChange={(e) => setNewBookmark({ ...newBookmark, title: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={`Bookmark at ${formatTime(currentTime)}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                  <textarea
                    value={newBookmark.notes}
                    onChange={(e) => setNewBookmark({ ...newBookmark, notes: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md h-24 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Add your notes..."
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowBookmarkDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={createBookmark}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Add Bookmark
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Note Dialog */}
      {showNoteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Add Note</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Note at {formatTime(currentTime)}
                  </label>
                  <textarea
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md h-32 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Add your note..."
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="public-note"
                    checked={newNote.isPublic}
                    onChange={(e) => setNewNote({ ...newNote, isPublic: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="public-note" className="text-sm text-gray-700">
                    Make this note public (visible to other learners)
                  </label>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowNoteDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={createNote}
                    disabled={!newNote.content.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                  >
                    Add Note
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}