'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useTeacherCourses } from '../../hooks/useTeacherCourses';
import { 
  BookOpen, 
  Users, 
  BarChart3, 
  Clock, 
  Award, 
  TrendingUp,
  Plus,
  Calendar,
  MessageSquare,
  Star,
  ChevronRight,
  Edit,
  Eye,
  DollarSign,
  FileText
} from 'lucide-react';

interface TeacherStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalStudents: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
  totalReviews: number;
}

interface Course {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  students: number;
  revenue: number;
  rating: number;
  lastUpdated: string;
  thumbnail?: string;
}

interface StudentProgress {
  id: string;
  name: string;
  email: string;
  courseName: string;
  progress: number;
  lastActivity: string;
  avatar?: string;
}

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { courses, stats, loading, error } = useTeacherCourses();

  // Use real courses from API instead of mock data

  const [studentProgress] = useState<StudentProgress[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      courseName: 'React Fundamentals',
      progress: 85,
      lastActivity: '2 hours ago'
    },
    {
      id: '2',
      name: 'Mike Chen',
      email: 'mike@example.com',
      courseName: 'Advanced JavaScript',
      progress: 62,
      lastActivity: '1 day ago'
    },
    {
      id: '3',
      name: 'Emma Davis',
      email: 'emma@example.com',
      courseName: 'React Fundamentals',
      progress: 94,
      lastActivity: '30 minutes ago'
    }
  ]);

  const statCards = stats ? [
    {
      title: 'Total Courses',
      value: stats.totalCourses,
      icon: BookOpen,
      color: 'blue',
      description: `${stats.publishedCourses} published, ${stats.draftCourses} drafts`,
      trend: loading ? 'Loading...' : `${stats.totalCourses} total`
    },
    {
      title: 'Total Students',
      value: stats.totalStudents.toLocaleString(),
      icon: Users,
      color: 'green',
      description: 'Across all courses',
      trend: loading ? 'Loading...' : `${stats.totalStudents} enrolled`
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'purple',
      description: 'From course sales',
      trend: loading ? 'Loading...' : `$${stats.totalRevenue} earned`
    },
    {
      title: 'Average Rating',
      value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A',
      icon: Star,
      color: 'yellow',
      description: stats.totalReviews > 0 ? `Based on ${stats.totalReviews} reviews` : 'No reviews yet',
      trend: loading ? 'Loading...' : stats.totalReviews > 0 ? `${stats.totalReviews} reviews` : 'No ratings'
    }
  ] : [];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      purple: 'text-purple-600 bg-purple-100',
      yellow: 'text-yellow-600 bg-yellow-100',
      orange: 'text-orange-600 bg-orange-100',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    return badges[status as keyof typeof badges] || badges.draft;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.firstName}! 👨‍🏫
              </p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => router.push('/schedule')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </button>
              <button 
                onClick={() => router.push('/courses/create')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${getColorClasses(card.color)}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">{card.title}</p>
                      <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-gray-400">{card.description}</p>
                  <p className="text-xs text-green-600 mt-1">{card.trend}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Courses */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">My Courses</h3>
                  <button className="text-sm text-blue-600 hover:text-blue-500 flex items-center">
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                        <div className="w-16 h-12 bg-gray-300 rounded"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-red-600 mb-2">Error loading courses</p>
                    <p className="text-gray-500 text-sm">{error}</p>
                  </div>
                ) : courses.length > 0 ? (
                  <div className="space-y-4">
                    {courses.slice(0, 3).map((course) => (
                      <div key={course.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-4">
                          <img 
                            src={course.thumbnail || 'https://via.placeholder.com/64x48'} 
                            alt={course.title}
                            className="w-16 h-12 object-cover rounded"
                          />
                          <div>
                            <h4 className="font-medium text-gray-900">{course.title}</h4>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(course.status)}`}>
                                {course.status}
                              </span>
                              <span className="text-sm text-gray-500">{course.enrollmentCount || 0} students</span>
                              {parseFloat(course.rating || '0') > 0 && (
                                <div className="flex items-center">
                                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                  <span className="text-sm text-gray-500 ml-1">{parseFloat(course.rating).toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            ${(course.price * (course.enrollmentCount || 0)).toLocaleString()}
                          </span>
                          <div className="flex space-x-1">
                            <button 
                              onClick={() => router.push(`/courses/${course.id}`)}
                              className="p-2 text-gray-400 hover:text-gray-600"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => router.push(`/courses/${course.id}/edit`)}
                              className="p-2 text-gray-400 hover:text-gray-600"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No courses created yet</p>
                    <button 
                      onClick={() => router.push('/courses/create')}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Course
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Student Progress & Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push('/courses/create')}
                  className="w-full flex items-center p-3 border border-blue-200 rounded-lg hover:bg-blue-50 text-left"
                >
                  <Plus className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Create Course</p>
                    <p className="text-sm text-gray-500">Start building a new course</p>
                  </div>
                </button>
                <button 
                  onClick={() => router.push('/analytics')}
                  className="w-full flex items-center p-3 border border-green-200 rounded-lg hover:bg-green-50 text-left"
                >
                  <BarChart3 className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Analytics</p>
                    <p className="text-sm text-gray-500">View course performance</p>
                  </div>
                </button>
                <button 
                  onClick={() => router.push('/messages')}
                  className="w-full flex items-center p-3 border border-purple-200 rounded-lg hover:bg-purple-50 text-left"
                >
                  <MessageSquare className="h-5 w-5 text-purple-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Messages</p>
                    <p className="text-sm text-gray-500">Student questions & feedback</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Student Progress */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Student Activity</h3>
              <div className="space-y-4">
                {studentProgress.map((student) => (
                  <div key={student.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {student.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.courseName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{student.progress}%</p>
                      <p className="text-xs text-gray-500">{student.lastActivity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;