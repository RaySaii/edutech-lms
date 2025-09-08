'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Volume2, 
  VolumeX,
  Maximize,
  Settings,
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
  PenTool,
  Download,
  Star,
  PlayCircle,
  Lock,
  Home
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useToast } from '../ui/toast';
import { courseAPI, Course } from '../../lib/api/courses';
import Link from 'next/link';

interface CoursePlayerProps {
  courseId: string;
  lessonId: string;
}

// Sample course data structure with lessons
const sampleCourseData = {
  course: {
    id: '1',
    title: 'Complete JavaScript Course - From Zero to Hero',
    description: 'Master JavaScript from basics to advanced concepts',
    instructor: { firstName: 'John', lastName: 'Doe', profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=entropy&auto=format' }
  },
  sections: [
    {
      id: '1',
      title: 'Getting Started',
      lessons: [
        { 
          id: '1-1', 
          title: 'Course Introduction', 
          duration: 300, 
          completed: true,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          description: 'Welcome to the course! Learn what we\'ll cover and how to get the most out of this learning experience.'
        },
        { 
          id: '1-2', 
          title: 'Setting Up Your Environment', 
          duration: 420, 
          completed: false,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          description: 'Install and configure all the tools you\'ll need for JavaScript development.'
        },
        { 
          id: '1-3', 
          title: 'Your First JavaScript Program', 
          duration: 600, 
          completed: false,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          description: 'Write and run your very first JavaScript program and understand the basics.'
        },
      ]
    },
    {
      id: '2',
      title: 'JavaScript Fundamentals',
      lessons: [
        { 
          id: '2-1', 
          title: 'Variables and Data Types', 
          duration: 900, 
          completed: false,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
          description: 'Learn about different data types in JavaScript and how to work with variables.'
        },
        { 
          id: '2-2', 
          title: 'Functions and Scope', 
          duration: 1200, 
          completed: false,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
          description: 'Master JavaScript functions, scope, and how to structure your code effectively.'
        },
        { 
          id: '2-3', 
          title: 'Control Structures', 
          duration: 800, 
          completed: false,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
          description: 'Understand if statements, loops, and other control flow mechanisms.'
        },
      ]
    },
    {
      id: '3',
      title: 'Advanced Concepts',
      lessons: [
        { 
          id: '3-1', 
          title: 'Asynchronous JavaScript', 
          duration: 1500, 
          completed: false,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
          description: 'Learn about promises, async/await, and handling asynchronous operations.'
        },
        { 
          id: '3-2', 
          title: 'ES6+ Features', 
          duration: 1100, 
          completed: false,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
          description: 'Explore modern JavaScript features like arrow functions, destructuring, and modules.'
        }
      ]
    }
  ]
};

interface Lesson {
  id: string;
  title: string;
  duration: number;
  completed: boolean;
  videoUrl: string;
  description: string;
}

interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

export function CoursePlayer({ courseId, lessonId }: CoursePlayerProps) {
  const { showSuccess, showError } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // State management
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>(sampleCourseData.sections);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [lessonNotes, setLessonNotes] = useState<Record<string, string>>({});
  
  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  useEffect(() => {
    // Find and set current lesson
    const lesson = sections.flatMap(section => section.lessons).find(l => l.id === lessonId);
    if (lesson) {
      setCurrentLesson(lesson);
      setNotes(lessonNotes[lesson.id] || '');
    }
  }, [lessonId, sections, lessonNotes]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const response = await courseAPI.getCourse(courseId);
      if (response.success) {
        setCourse(response.data);
      }
    } catch (error) {
      console.error('Error loading course:', error);
      showError('Failed to load course', 'Please try again later');
    } finally {
      setLoading(false);
    }
  };

  // Video player functions
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentLesson) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));
    video.addEventListener('ended', handleLessonComplete);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', () => setIsPlaying(true));
      video.removeEventListener('pause', () => setIsPlaying(false));
      video.removeEventListener('ended', handleLessonComplete);
    };
  }, [currentLesson]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) {
      const seekTime = (parseFloat(e.target.value) / 100) * duration;
      video.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100;
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Learning functions
  const handleLessonComplete = () => {
    if (!currentLesson) return;
    
    // Mark lesson as completed
    setSections(prev => prev.map(section => ({
      ...section,
      lessons: section.lessons.map(lesson => 
        lesson.id === currentLesson.id ? { ...lesson, completed: true } : lesson
      )
    })));
    
    showSuccess('Lesson completed!', 'Great job! Ready for the next lesson?');
    
    // Auto-navigate to next lesson after 3 seconds
    setTimeout(() => {
      const nextLesson = getNextLesson();
      if (nextLesson) {
        window.history.pushState({}, '', `/courses/${courseId}/learn/${nextLesson.id}`);
        setCurrentLesson(nextLesson);
      }
    }, 3000);
  };

  const markLessonComplete = () => {
    handleLessonComplete();
  };

  const getNextLesson = (): Lesson | null => {
    const allLessons = sections.flatMap(section => section.lessons);
    const currentIndex = allLessons.findIndex(lesson => lesson.id === lessonId);
    return currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  };

  const getPrevLesson = (): Lesson | null => {
    const allLessons = sections.flatMap(section => section.lessons);
    const currentIndex = allLessons.findIndex(lesson => lesson.id === lessonId);
    return currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  };

  const navigateToLesson = (lesson: Lesson) => {
    window.history.pushState({}, '', `/courses/${courseId}/learn/${lesson.id}`);
    setCurrentLesson(lesson);
  };

  const saveNotes = () => {
    if (currentLesson) {
      setLessonNotes(prev => ({ ...prev, [currentLesson.id]: notes }));
      showSuccess('Notes saved!', 'Your notes have been saved for this lesson');
    }
  };

  // Calculate course progress
  const allLessons = sections.flatMap(section => section.lessons);
  const completedLessons = allLessons.filter(lesson => lesson.completed).length;
  const progressPercentage = (completedLessons / allLessons.length) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading course...</p>
        </div>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Lesson not found</h1>
          <Link href={`/courses/${courseId}`}>
            <Button variant="outline">Back to Course</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                <Home className="h-4 w-4 mr-1" />
                Dashboard
              </Button>
            </Link>
            <Link href={`/courses/${courseId}`}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Course
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-gray-700 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{course?.title || sampleCourseData.course.title}</h1>
              <p className="text-sm text-gray-300">{currentLesson.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-gray-300">Progress: </span>
              <span className="text-white font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="w-32" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotesOpen(!notesOpen)}
              className="text-white hover:bg-gray-700"
            >
              <PenTool className="h-4 w-4" />
              Notes
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden bg-gray-800 border-r border-gray-700`}>
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Course Content</h2>
            <div className="space-y-4">
              {sections.map((section) => (
                <div key={section.id}>
                  <h3 className="font-medium text-gray-200 mb-2">{section.title}</h3>
                  <div className="space-y-1">
                    {section.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className={`p-3 rounded cursor-pointer transition-colors ${
                          lesson.id === lessonId 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                        }`}
                        onClick={() => navigateToLesson(lesson)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {lesson.completed ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <PlayCircle className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium">{lesson.title}</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatTime(lesson.duration)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Video Player */}
          <div className="relative bg-black">
            <video
              ref={videoRef}
              className="w-full aspect-video"
              src={currentLesson.videoUrl}
              poster="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=675&fit=crop&crop=entropy&auto=format"
              onClick={togglePlay}
              data-testid="video-player"
            />

            {/* Video Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={duration ? (currentTime / duration) * 100 : 0}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => skipTime(-10)}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20"
                    data-testid={isPlaying ? 'pause-button' : 'play-button'}
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => skipTime(10)}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume * 100}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="text-white text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={playbackSpeed}
                    onChange={(e) => changePlaybackSpeed(parseFloat(e.target.value))}
                    className="bg-gray-700 text-white text-sm rounded px-2 py-1"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                    data-testid="fullscreen-button"
                  >
                    <Maximize className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Lesson Content */}
          <div className="p-6 bg-gray-900">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold mb-2">{currentLesson.title}</h1>
                  <p className="text-gray-300">{currentLesson.description}</p>
                </div>
                <Button
                  onClick={markLessonComplete}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={currentLesson.completed}
                >
                  {currentLesson.completed ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Completed
                    </>
                  ) : (
                    <>
                      Mark Complete
                    </>
                  )}
                </Button>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <div>
                  {getPrevLesson() && (
                    <Button
                      variant="outline"
                      onClick={() => navigateToLesson(getPrevLesson()!)}
                      className="border-gray-600 text-white hover:bg-gray-700"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous Lesson
                    </Button>
                  )}
                </div>
                <div>
                  {getNextLesson() && (
                    <Button
                      onClick={() => navigateToLesson(getNextLesson()!)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Next Lesson
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Sidebar */}
        {notesOpen && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Lesson Notes</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNotesOpen(false)}
                className="text-white hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Take notes for this lesson..."
              className="w-full h-64 p-3 bg-gray-700 border border-gray-600 rounded text-white resize-none"
            />
            <Button
              onClick={saveNotes}
              className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
            >
              Save Notes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
