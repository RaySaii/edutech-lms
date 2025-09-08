'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  MessageSquare,
  User,
  Calendar,
  DollarSign,
  Star,
  Filter,
  Search,
  MoreVertical,
  Download,
  RefreshCw,
  AlertCircle,
  FileText,
  Video,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  category: string;
  price: number;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  thumbnail?: string;
  duration: number;
  lessonsCount: number;
  enrollmentCount: number;
  rating: number;
  reviewCount: number;
  tags: string[];
}

interface ApprovalStats {
  totalCourses: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  published: number;
  averageReviewTime: number;
}

export function CourseApprovalSystem() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<ApprovalStats>({
    totalCourses: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    published: 0,
    averageReviewTime: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review' | 'approved' | 'rejected' | 'published'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    loadCourses();
  }, [searchQuery, statusFilter, categoryFilter]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      
      // Mock course data - replace with API call
      const mockCourses: Course[] = [
        {
          id: '1',
          title: 'Advanced React Development',
          description: 'Learn advanced React concepts including hooks, context, and performance optimization',
          instructor: {
            id: 'teacher1',
            name: 'Jane Smith',
            email: 'jane.smith@example.com'
          },
          category: 'Programming',
          price: 99.99,
          status: 'pending_review',
          submittedAt: '2024-08-24T10:00:00Z',
          duration: 480,
          lessonsCount: 25,
          enrollmentCount: 0,
          rating: 0,
          reviewCount: 0,
          tags: ['React', 'JavaScript', 'Frontend', 'Advanced']
        },
        {
          id: '2',
          title: 'Python for Data Science',
          description: 'Complete guide to using Python for data analysis and machine learning',
          instructor: {
            id: 'teacher2',
            name: 'David Brown',
            email: 'david.brown@example.com'
          },
          category: 'Data Science',
          price: 149.99,
          status: 'approved',
          submittedAt: '2024-08-20T14:30:00Z',
          reviewedAt: '2024-08-22T09:15:00Z',
          reviewedBy: 'Admin User',
          reviewNotes: 'Excellent content quality and structure. Approved for publication.',
          duration: 720,
          lessonsCount: 40,
          enrollmentCount: 125,
          rating: 4.8,
          reviewCount: 23,
          tags: ['Python', 'Data Science', 'Machine Learning', 'Analytics']
        },
        {
          id: '3',
          title: 'Digital Marketing Fundamentals',
          description: 'Learn the basics of digital marketing including SEO, social media, and content marketing',
          instructor: {
            id: 'teacher3',
            name: 'Sarah Wilson',
            email: 'sarah.wilson@example.com'
          },
          category: 'Marketing',
          price: 79.99,
          status: 'rejected',
          submittedAt: '2024-08-18T16:45:00Z',
          reviewedAt: '2024-08-19T11:30:00Z',
          reviewedBy: 'Admin User',
          reviewNotes: 'Content needs more depth and practical examples. Please revise and resubmit.',
          duration: 360,
          lessonsCount: 15,
          enrollmentCount: 0,
          rating: 0,
          reviewCount: 0,
          tags: ['Marketing', 'Digital', 'SEO', 'Social Media']
        },
        {
          id: '4',
          title: 'Web Design with Figma',
          description: 'Master web design using Figma and learn industry best practices',
          instructor: {
            id: 'teacher4',
            name: 'Michael Johnson',
            email: 'michael.j@example.com'
          },
          category: 'Design',
          price: 89.99,
          status: 'published',
          submittedAt: '2024-08-15T12:00:00Z',
          reviewedAt: '2024-08-17T14:20:00Z',
          reviewedBy: 'Admin User',
          reviewNotes: 'Great visual content and clear explanations. Published successfully.',
          duration: 420,
          lessonsCount: 18,
          enrollmentCount: 89,
          rating: 4.6,
          reviewCount: 15,
          tags: ['Design', 'Figma', 'UI/UX', 'Web Design']
        }
      ];

      setCourses(mockCourses);
      
      // Calculate stats
      setStats({
        totalCourses: mockCourses.length,
        pendingReview: mockCourses.filter(c => c.status === 'pending_review').length,
        approved: mockCourses.filter(c => c.status === 'approved').length,
        rejected: mockCourses.filter(c => c.status === 'rejected').length,
        published: mockCourses.filter(c => c.status === 'published').length,
        averageReviewTime: 2.5
      });
      
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewCourse = async (courseId: string, action: 'approve' | 'reject', notes: string) => {
    try {
      setCourses(prev => prev.map(course => 
        course.id === courseId
          ? {
              ...course,
              status: action === 'approve' ? 'approved' : 'rejected',
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'Current Admin',
              reviewNotes: notes
            }
          : course
      ));
      
      setShowReviewModal(false);
      setSelectedCourse(null);
      setReviewNotes('');
      
    } catch (error) {
      console.error('Failed to review course:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      published: 'bg-blue-100 text-blue-800'
    };
    
    const labels = {
      draft: 'Draft',
      pending_review: 'Pending Review',
      approved: 'Approved',
      rejected: 'Rejected',
      published: 'Published'
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.instructor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const categories = Array.from(new Set(courses.map(c => c.category)));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                <p className="text-gray-600">Total Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.pendingReview}</p>
                <p className="text-gray-600">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                <p className="text-gray-600">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                <p className="text-gray-600">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.published}</p>
                <p className="text-gray-600">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="published">Published</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <Button onClick={loadCourses} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Courses ({filteredCourses.length})
            </div>
            {stats.pendingReview > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800">
                {stats.pendingReview} awaiting review
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading courses...</p>
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="divide-y">
              {filteredCourses.map((course) => (
                <div key={course.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <img
                        src={course.thumbnail || '/api/placeholder/120/80'}
                        alt={course.title}
                        className="w-20 h-14 object-cover rounded-lg"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {course.title}
                              </h3>
                              {getStatusBadge(course.status)}
                              {course.status === 'pending_review' && (
                                <Badge variant="outline" className="text-orange-600 border-orange-200">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Review Required
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                              {course.description}
                            </p>
                            
                            <div className="flex items-center space-x-6 text-sm text-gray-500">
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-1" />
                                {course.instructor.name}
                              </div>
                              <div className="flex items-center">
                                <BookOpen className="h-4 w-4 mr-1" />
                                {course.category}
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {formatDuration(course.duration)}
                              </div>
                              <div className="flex items-center">
                                <Video className="h-4 w-4 mr-1" />
                                {course.lessonsCount} lessons
                              </div>
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-1" />
                                ${course.price}
                              </div>
                              {course.enrollmentCount > 0 && (
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-1" />
                                  {course.enrollmentCount} enrolled
                                </div>
                              )}
                              {course.rating > 0 && (
                                <div className="flex items-center">
                                  <Star className="h-4 w-4 mr-1 text-yellow-400 fill-current" />
                                  {course.rating} ({course.reviewCount})
                                </div>
                              )}
                            </div>
                            
                            {course.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {course.tags.map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 pt-3 border-t">
                          <div className="text-xs text-gray-500">
                            <p>Submitted: {formatDate(course.submittedAt)}</p>
                            {course.reviewedAt && (
                              <p>Reviewed: {formatDate(course.reviewedAt)} by {course.reviewedBy}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {course.status === 'pending_review' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={() => {
                                    setSelectedCourse(course);
                                    setReviewAction('approve');
                                    setShowReviewModal(true);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedCourse(course);
                                    setReviewAction('reject');
                                    setShowReviewModal(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            
                            <Button variant="ghost" size="sm">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {course.reviewNotes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-start">
                              <FileText className="h-4 w-4 text-gray-400 mt-0.5 mr-2" />
                              <div>
                                <p className="text-sm font-medium text-gray-700">Review Notes:</p>
                                <p className="text-sm text-gray-600 mt-1">{course.reviewNotes}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No courses have been submitted for review yet'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      {showReviewModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                {reviewAction === 'approve' ? 'Approve Course' : 'Reject Course'}
              </h3>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedCourse(null);
                  setReviewNotes('');
                }}
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <h4 className="font-medium text-gray-900">{selectedCourse.title}</h4>
                <p className="text-sm text-gray-600">by {selectedCourse.instructor.name}</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{selectedCourse.description}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes {reviewAction === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={reviewAction === 'approve' 
                    ? 'Add optional notes about the approval...' 
                    : 'Please explain why this course is being rejected and what needs to be improved...'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>
              
              {reviewAction === 'reject' && !reviewNotes.trim() && (
                <div className="flex items-center text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Review notes are required when rejecting a course
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedCourse(null);
                  setReviewNotes('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => handleReviewCourse(selectedCourse.id, reviewAction, reviewNotes)}
                disabled={reviewAction === 'reject' && !reviewNotes.trim()}
                className={reviewAction === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
                }
              >
                {reviewAction === 'approve' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Course
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Course
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}