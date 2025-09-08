'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Clock, User, BarChart3, Play } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  instructor?: {
    firstName?: string;
    lastName?: string;
  };
  progress?: number;
  lastAccessed?: string;
  timeSpent?: number;
  status?: string;
  category?: string;
  rating?: number;
}

interface Enrollment {
  id: string;
  progress?: number;
  lastAccessedAt?: string;
  timeSpent?: number;
  course?: Course;
}

interface EnrolledCoursesProps {
  courses: Enrollment[];
  loading?: boolean;
  userRole: string;
}

const EnrolledCourses = React.memo<EnrolledCoursesProps>(({ courses, loading = false, userRole }) => {
  const router = useRouter();

  // Helper function to normalize course data
  const normalizeCourse = (item: Course | Enrollment): Course => {
    // If it's an enrollment object, extract the course
    if ('course' in item && item.course) {
      return {
        id: item.course.id,
        title: item.course.title,
        description: item.course.description,
        thumbnail: item.course.thumbnail,
        instructor: item.course.instructor,
        progress: item.progress,
        lastAccessed: item.lastAccessedAt,
        timeSpent: item.timeSpent,
        status: item.course.status,
      };
    }
    // If it's already a course object, return as is
    return item as Course;
  };

  const formatTimeSpent = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatLastAccessed = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleCourseClick = (courseId: string) => {
    if (userRole === 'admin') {
      router.push(`/courses/${courseId}/edit`);
    } else {
      router.push(`/courses/${courseId}`);
    }
  };

  const handleContinueLearning = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/courses/${courseId}/learn`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {userRole === 'instructor' ? 'My Courses' : 'Continue Learning'}
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <div key={index} className="border rounded-lg p-4 animate-pulse">
              <div className="flex items-start space-x-4">
                <div className="h-16 w-24 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {userRole === 'instructor' ? 'My Courses' : 'Continue Learning'}
        </h3>
        <div className="text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {userRole === 'admin' 
              ? 'No courses in system yet' 
              : 'No enrolled courses yet'
            }
          </p>
          <p className="text-sm text-gray-400 mb-4">
            {userRole === 'admin' 
              ? 'Manage courses from the main dashboard' 
              : 'Browse our course catalog to get started'
            }
          </p>
          <button
            onClick={() => router.push(userRole === 'admin' ? '/courses' : '/courses')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {userRole === 'admin' ? 'Manage Courses' : 'Browse Courses'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {userRole === 'admin' ? 'Course Management' : 'Continue Learning'}
        </h3>
        <button
          data-testid="view-all-courses"
          onClick={() => router.push(userRole === 'admin' ? '/courses' : '/courses/my-learning')}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View all
        </button>
      </div>

      <div className="space-y-4">
        {courses.slice(0, 3).map((item) => {
          const course = normalizeCourse(item);
          return (
          <div
            data-testid="course-card"
            data-testid="enrolled-course"
            key={course.id}
            className="border rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => handleCourseClick(course.id)}
          >
            <div className="flex items-start space-x-4">
              {/* Course Thumbnail */}
              <div className="h-16 w-24 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-full w-full object-cover rounded"
                  />
                ) : (
                  <BookOpen className="h-8 w-8 text-gray-400" />
                )}
              </div>

              {/* Course Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {course.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {course.description}
                </p>
                
                <div className="flex items-center mt-2 space-x-4 text-xs text-gray-400">
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {course.instructor?.firstName || 'Unknown'} {course.instructor?.lastName || 'Instructor'}
                  </div>
                  
                  {course.timeSpent && (
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTimeSpent(course.timeSpent)}
                    </div>
                  )}
                  
                  {course.lastAccessed && (
                    <div className="flex items-center">
                      <span>Last: {formatLastAccessed(course.lastAccessed)}</span>
                    </div>
                  )}
                </div>

                {/* Progress Bar (for students) */}
                {userRole !== 'instructor' && course.progress !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(Number(course.progress) || 0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Number(course.progress) || 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {userRole === 'student' && (
                <button
                  onClick={(e) => handleContinueLearning(course.id, e)}
                  className="flex items-center px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Continue
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
});

EnrolledCourses.displayName = 'EnrolledCourses';

export default EnrolledCourses;
