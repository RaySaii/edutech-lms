'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Star, 
  Users, 
  Clock, 
  Calendar, 
  Award, 
  BookOpen, 
  Download, 
  Share2, 
  Heart,
  ChevronRight,
  Globe,
  Smartphone,
  Monitor,
  CheckCircle,
  PlayCircle,
  Lock,
  MessageSquare,
  ThumbsUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { useToast } from '../ui/toast';
import { courseAPI, Course } from '../../lib/api/courses';
import Link from 'next/link';
import { VideoPlayerModal } from '../video/VideoPlayerModal';

interface CourseDetailViewProps {
  courseId: string;
}

// Sample course curriculum data
const sampleCurriculum = [
  {
    id: '1',
    title: 'Getting Started',
    lessons: [
      { id: '1-1', title: 'Course Introduction', duration: 180, isPreview: true, completed: false },
      { id: '1-2', title: 'Setting Up Your Environment', duration: 420, isPreview: false, completed: false },
      { id: '1-3', title: 'Course Resources & Downloads', duration: 120, isPreview: true, completed: false },
    ]
  },
  {
    id: '2',
    title: 'Fundamentals',
    lessons: [
      { id: '2-1', title: 'Core Concepts Overview', duration: 900, isPreview: false, completed: false },
      { id: '2-2', title: 'Your First Project', duration: 1200, isPreview: false, completed: false },
      { id: '2-3', title: 'Best Practices', duration: 720, isPreview: false, completed: false },
      { id: '2-4', title: 'Common Mistakes to Avoid', duration: 480, isPreview: false, completed: false },
    ]
  },
  {
    id: '3',
    title: 'Advanced Topics',
    lessons: [
      { id: '3-1', title: 'Advanced Techniques', duration: 1800, isPreview: false, completed: false },
      { id: '3-2', title: 'Real-World Applications', duration: 2100, isPreview: false, completed: false },
      { id: '3-3', title: 'Performance Optimization', duration: 1500, isPreview: false, completed: false },
    ]
  },
  {
    id: '4',
    title: 'Final Project',
    lessons: [
      { id: '4-1', title: 'Project Planning', duration: 600, isPreview: false, completed: false },
      { id: '4-2', title: 'Implementation Guide', duration: 3600, isPreview: false, completed: false },
      { id: '4-3', title: 'Testing & Deployment', duration: 1800, isPreview: false, completed: false },
      { id: '4-4', title: 'Course Wrap-up', duration: 300, isPreview: true, completed: false },
    ]
  }
];

// Sample reviews data
const sampleReviews = [
  {
    id: '1',
    user: { name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=100&h=100&fit=crop&crop=face&auto=format&q=80' },
    rating: 5,
    comment: 'Excellent course! The instructor explains everything clearly and the hands-on projects really helped me understand the concepts.',
    date: '2024-01-15',
    helpful: 24
  },
  {
    id: '2',
    user: { name: 'Michael Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=entropy&auto=format' },
    rating: 4,
    comment: 'Great content and well-structured. Could use a few more advanced examples, but overall very satisfied.',
    date: '2024-01-10',
    helpful: 18
  },
  {
    id: '3',
    user: { name: 'Emily Rodriguez', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=entropy&auto=format' },
    rating: 5,
    comment: 'This course exceeded my expectations. The practical approach and real-world examples made it easy to follow.',
    date: '2024-01-08',
    helpful: 31
  }
];

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Helper function to get appropriate thumbnails for courses (same as CourseDashboard)
const getCourseThumbnail = (title: string): string => {
  const thumbnails: Record<string, string> = {
    // Programming & Development
    'javascript': 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'react': 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'python': 'https://images.unsplash.com/photo-1526379879527-8559ecfcaec0?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'node': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'vue': 'https://images.unsplash.com/photo-1594904351111-a072f80b1a71?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'angular': 'https://images.unsplash.com/photo-1572177812156-58036aae439c?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'typescript': 'https://images.unsplash.com/photo-1599837565318-67429bde7162?w=400&h=200&fit=crop&crop=entropy&auto=format',
    
    // Mobile Development
    'mobile': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'android': 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'ios': 'https://images.unsplash.com/photo-1621839673705-6617adf9e890?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'flutter': 'https://images.unsplash.com/photo-1563813251-90a84b1d8550?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'react native': 'https://images.unsplash.com/photo-1574169208507-84376144848b?w=400&h=200&fit=crop&crop=entropy&auto=format',
    
    // DevOps & Cloud
    'devops': 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'docker': 'https://images.unsplash.com/photo-1605745341112-85968b19335a?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'kubernetes': 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'aws': 'https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?w=400&h=200&fit=crop&crop=entropy&auto=format',
    
    // Data & AI
    'data': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'machine learning': 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'ai': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=200&fit=crop&crop=entropy&auto=format',
    
    // Web Development
    'web development': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=200&fit=crop&crop=entropy&auto=format',
    
    // Design
    'design': 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'ui': 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'ux': 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=200&fit=crop&crop=entropy&auto=format',
    
    // Business & Marketing
    'marketing': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'digital marketing': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop&crop=entropy&auto=format'
  };

  // Find matching thumbnail based on course title keywords
  const titleLower = title.toLowerCase();
  for (const [keyword, thumbnail] of Object.entries(thumbnails)) {
    if (titleLower.includes(keyword)) {
      return thumbnail;
    }
  }
  
  // Default programming thumbnail
  return 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=200&fit=crop&crop=entropy&auto=format';
};

export function CourseDetailView({ courseId }: CourseDetailViewProps) {
  const { showSuccess, showError } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['1', '2']));
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    // Scroll to top instantly when course detail page loads
    window.scrollTo(0, 0);
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const response = await courseAPI.getCourse(courseId);
      if (response.success) {
        setCourse(response.data);
      } else {
        showError('Course not found', 'Please check the course ID and try again');
      }
    } catch (error) {
      console.error('Error loading course:', error);
      showError('Failed to load course', 'Please try again later');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleEnroll = async () => {
    try {
      const response = await courseAPI.enrollInCourse(courseId);
      if (response.success) {
        setIsEnrolled(true);
        showSuccess('Enrolled successfully!', 'You can now access all course content');
      }
    } catch (error) {
      console.error('Error enrolling:', error);
      showError('Enrollment failed', 'Please try again later');
    }
  };

  const handleWishlist = async () => {
    try {
      setWishlistLoading(true);
      if (isInWishlist) {
        const response = await courseAPI.removeFromWishlist(courseId);
        if (response.success) {
          setIsInWishlist(false);
          showSuccess('Removed from wishlist', 'Course removed from your wishlist');
        }
      } else {
        const response = await courseAPI.addToWishlist(courseId);
        if (response.success) {
          setIsInWishlist(true);
          showSuccess('Added to wishlist', 'Course saved to your wishlist');
        }
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      showError('Wishlist update failed', 'Please try again later');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: course?.title || 'Check out this course',
      text: course?.description || 'Learn something new today!',
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        showSuccess('Shared successfully!', 'Course link shared');
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        showSuccess('Link copied!', 'Course link copied to clipboard');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        showSuccess('Link copied!', 'Course link copied to clipboard');
      } catch (clipboardError) {
        showError('Share failed', 'Unable to share or copy link');
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              </div>
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Course not found</h1>
        <p className="text-gray-600 mb-8">The course you're looking for doesn't exist or has been removed.</p>
        <Link href="/courses">
          <Button>Browse All Courses</Button>
        </Link>
      </div>
    );
  }

  const totalDuration = sampleCurriculum.reduce((acc, section) => 
    acc + section.lessons.reduce((sectionAcc, lesson) => sectionAcc + lesson.duration, 0), 0
  );

  const totalLessons = sampleCurriculum.reduce((acc, section) => acc + section.lessons.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
        <Link href="/dashboard" className="hover:text-purple-600">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/courses" className="hover:text-purple-600">Courses</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/courses" className="hover:text-purple-600">{course.category || 'Category'}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">{course.title}</span>
      </nav>

      {/* Course Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{course.title}</h1>
            <p className="text-xl text-gray-600 mb-6">{course.description}</p>
            
            {/* Course Stats */}
            <div className="flex flex-wrap items-center gap-6 mb-6">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-orange-500 fill-current" />
                  <span className="text-lg font-semibold text-gray-900 ml-1">
                    {(Number(course.rating) || 4.5).toFixed(1)}
                  </span>
                </div>
                <span className="text-gray-600">({Math.max(course.reviewCount || 0, 1250).toLocaleString()} reviews)</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-5 w-5" />
                <span>{Math.max(course.enrollmentCount || 0, 12450).toLocaleString()} students</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-5 w-5" />
                <span>{formatDuration(totalDuration)} total</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <BookOpen className="h-5 w-5" />
                <span>{totalLessons} lessons</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-5 w-5" />
                <span>Last updated 1/2024</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Globe className="h-5 w-5" />
                <span>English</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
              </Badge>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {course.category || 'Programming'}
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Certificate
              </Badge>
            </div>

            {/* Instructor Info */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <img 
                src={course.instructor?.profilePicture || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=entropy&auto=format'}
                alt={`${course.instructor?.firstName} ${course.instructor?.lastName}`}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h3 className="font-semibold text-gray-900">
                  {course.instructor?.firstName} {course.instructor?.lastName}
                </h3>
                <p className="text-sm text-gray-600">Senior Software Engineer & Instructor</p>
              </div>
            </div>
          </div>
        </div>

        {/* Course Preview Card */}
        <div className="lg:sticky lg:top-8">
          <Card className="overflow-hidden shadow-lg">
            <div className="relative">
              <img 
                src={course.thumbnail || getCourseThumbnail(course.title)}
                alt={course.title}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                <Button 
                  size="lg" 
                  className="bg-white text-black hover:bg-gray-100"
                  onClick={() => setShowVideoModal(true)}
                >
                  <Play className="h-6 w-6 mr-2" />
                  Preview this course
                </Button>
              </div>
            </div>
            
            <CardContent className="p-6">
              <div className="text-center mb-6">
                {Number(course.price) === 0 ? (
                  <div className="text-3xl font-bold text-green-600">Free</div>
                ) : (
                  <div>
                    <div className="text-3xl font-bold text-gray-900">${course.price}</div>
                    <div className="text-sm text-gray-500 line-through">$199.99</div>
                  </div>
                )}
              </div>

              {isEnrolled ? (
                <Link href={`/courses/${courseId}/learn/1-1`}>
                  <Button 
                    className="w-full mb-4 bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    Continue Learning
                  </Button>
                </Link>
              ) : (
                <Button 
                  className="w-full mb-4 bg-purple-600 hover:bg-purple-700"
                  size="lg"
                  onClick={handleEnroll}
                >
                  Enroll Now
                </Button>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`flex items-center gap-2 ${isInWishlist ? 'bg-red-50 text-red-600 border-red-200' : ''}`}
                  onClick={handleWishlist}
                  disabled={wishlistLoading}
                >
                  <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-current' : ''}`} />
                  {wishlistLoading ? 'Loading...' : isInWishlist ? 'Wishlisted' : 'Wishlist'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Full lifetime access</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-green-500" />
                  <span>Access on mobile and TV</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-green-500" />
                  <span>Downloadable resources</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-green-500" />
                  <span>Certificate of completion</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Course Content Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* What you'll learn */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">What you'll learn</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                'Master the fundamentals and advanced concepts',
                'Build real-world projects from scratch',
                'Understand best practices and industry standards',
                'Deploy applications to production',
                'Optimize performance and scalability',
                'Work with modern development tools'
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Course Content */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Course content</h2>
              <div className="text-sm text-gray-600">
                {sampleCurriculum.length} sections • {totalLessons} lectures • {formatDuration(totalDuration)} total length
              </div>
            </div>

            <div className="space-y-2">
              {sampleCurriculum.map((section) => (
                <Card key={section.id} className="overflow-hidden">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedSections.has(section.id) ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                        <h3 className="font-semibold text-gray-900">{section.title}</h3>
                      </div>
                      <div className="text-sm text-gray-600">
                        {section.lessons.length} lectures • {formatDuration(
                          section.lessons.reduce((acc, lesson) => acc + lesson.duration, 0)
                        )}
                      </div>
                    </div>
                  </button>
                  
                  {expandedSections.has(section.id) && (
                    <div className="border-t bg-gray-50">
                      {section.lessons.map((lesson) => (
                        <div key={lesson.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                          <div className="flex items-center gap-3">
                            {lesson.isPreview ? (
                              <PlayCircle className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Lock className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-700">{lesson.title}</span>
                            {lesson.isPreview && (
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                Preview
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">{formatDuration(lesson.duration)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>

          {/* Requirements */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Requirements</h2>
            <ul className="space-y-2 text-gray-700">
              <li>• No prior experience necessary - we'll teach you everything you need to know</li>
              <li>• A computer with internet access</li>
              <li>• Enthusiasm to learn and practice</li>
            </ul>
          </section>

          {/* Reviews */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Student feedback</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="text-center">
                <div className="text-6xl font-bold text-orange-500 mb-2">
                  {(Number(course.rating) || 4.5).toFixed(1)}
                </div>
                <div className="flex justify-center mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`h-6 w-6 ${
                        star <= Math.floor(Number(course.rating) || 4.5) 
                          ? 'text-orange-500 fill-current' 
                          : 'text-gray-300'
                      }`} 
                    />
                  ))}
                </div>
                <div className="text-gray-600">Course Rating</div>
              </div>
              
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <div key={stars} className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {[...Array(stars)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 text-orange-500 fill-current" />
                      ))}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full" 
                        style={{ width: `${Math.max(0, 100 - (5 - stars) * 15)}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8">{Math.max(0, 100 - (5 - stars) * 15)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {sampleReviews.map((review) => (
                <Card key={review.id} className="p-6">
                  <div className="flex items-start gap-4">
                    <img 
                      src={review.user.avatar}
                      alt={review.user.name}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user.name)}&background=6366f1&color=ffffff&size=40`;
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{review.user.name}</h4>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`h-4 w-4 ${
                                star <= review.rating ? 'text-orange-500 fill-current' : 'text-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">{review.date}</span>
                      </div>
                      <p className="text-gray-700 mb-3">{review.comment}</p>
                      <div className="flex items-center gap-4">
                        <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                          <ThumbsUp className="h-4 w-4" />
                          Helpful ({review.helpful})
                        </button>
                        <button className="text-sm text-gray-500 hover:text-gray-700">
                          Report
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* More courses by instructor */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">More courses by this instructor</h3>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <img 
                    src={`https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=80&h=60&fit=crop&crop=entropy&auto=format&q=80&r=${i}`}
                    alt="Course thumbnail"
                    className="w-20 h-15 rounded object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Advanced Course {i}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Star className="h-3 w-3 text-orange-500 fill-current" />
                      <span>4.8</span>
                      <span>(234)</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">$89.99</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Related Courses Section */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Students also bought</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img 
                  src={i === 1 ? 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=300&h=180&fit=crop&crop=entropy&auto=format&q=80' : 
                       i === 2 ? 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300&h=180&fit=crop&crop=entropy&auto=format&q=80' : 
                       i === 3 ? 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&h=180&fit=crop&crop=entropy&auto=format&q=80' : 
                       'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300&h=180&fit=crop&crop=entropy&auto=format&q=80'}
                  alt={`Related course ${i}`}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge className="bg-green-500 text-white">Bestseller</Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {i === 1 && 'Advanced JavaScript Concepts'}
                  {i === 2 && 'React State Management'}
                  {i === 3 && 'Node.js API Development'}
                  {i === 4 && 'Full Stack Project Build'}
                </h3>
                <p className="text-sm text-gray-600 mb-2">Dr. Sarah Johnson</p>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-orange-500 fill-current" />
                    <span className="text-sm font-medium ml-1">4.{5 + i}</span>
                  </div>
                  <span className="text-sm text-gray-500">({(234 + i * 100).toLocaleString()})</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-gray-900">${59 + i * 10}.99</div>
                  <div className="text-sm text-gray-500 line-through">${99 + i * 20}.99</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Video Player Modal */}
      <VideoPlayerModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        courseTitle={course.title}
        lessonTitle="Course Preview"
      />
    </div>
  );
}