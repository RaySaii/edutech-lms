'use client';

import React, { useState, useEffect } from 'react';
import { useEnrolledCourses } from '../../hooks/useEnrolledCourses';
import { UnifiedDashboard } from '../common/UnifiedDashboard';
import { useDashboard } from '../../hooks/useDashboard';
import { 
  Search,
  RefreshCw,
  Play,
  CheckCircle,
  Star,
  Download
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import Link from 'next/link';
import { formatDuration, formatDate, sanitizeProgress } from '../../utils/learningStats';

// Helper function for course thumbnails
const getCourseThumbnail = (title: string): string => {
  const thumbnails: Record<string, string> = {
    'javascript': 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=300&h=180&fit=crop&crop=entropy&auto=format',
    'react': 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300&h=180&fit=crop&crop=entropy&auto=format',
    'python': 'https://images.unsplash.com/photo-1526379879527-8559ecfcaec0?w=300&h=180&fit=crop&crop=entropy&auto=format',
    'design': 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=300&h=180&fit=crop&crop=entropy&auto=format',
    'programming': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=300&h=180&fit=crop&crop=entropy&auto=format'
  };

  const titleLower = title.toLowerCase();
  for (const [keyword, thumbnail] of Object.entries(thumbnails)) {
    if (titleLower.includes(keyword)) {
      return thumbnail;
    }
  }
  
  return 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=300&h=180&fit=crop&crop=entropy&auto=format';
};

export function SimplifiedMyLearning() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
  
  const { enrolledCourses, loading, error, refetch } = useEnrolledCourses();
  const { stats } = useDashboard();

  useEffect(() => {
    let filtered = enrolledCourses;

    if (searchQuery) {
      filtered = filtered.filter(course =>
        course.course?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.course?.instructor?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.course?.instructor?.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(course =>
        course.course?.category?.toLowerCase() === filterCategory.toLowerCase()
      );
    }

    setFilteredCourses(filtered);
  }, [searchQuery, filterCategory, enrolledCourses]);

  // Course filters component
  const CourseFilters = () => (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search your courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <select
        value={filterCategory}
        onChange={(e) => setFilterCategory(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <option value="all">All Categories</option>
        <option value="programming">Programming</option>
        <option value="frontend">Frontend</option>
        <option value="design">Design</option>
      </select>
    </div>
  );

  // Course card component
  const CourseCard = ({ enrollment }: { enrollment: any }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <img
          src={enrollment.course?.thumbnail || getCourseThumbnail(enrollment.course?.title || '')}
          alt={enrollment.course?.title || ''}
          className="w-full h-40 object-cover"
        />
        {enrollment.progress === 100 && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-500 text-white">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          </div>
        )}
        <div className="absolute bottom-2 left-2">
          <Badge variant="secondary" className="bg-black/70 text-white">
            {enrollment.course?.category || 'Course'}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1 mr-2">
            {enrollment.course?.title}
          </h3>
          <div className="text-right">
            <div className="font-semibold text-purple-600">{sanitizeProgress(enrollment.progress)}%</div>
            <Progress value={sanitizeProgress(enrollment.progress)} className="w-16 mt-1" />
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3">
          {enrollment.course?.instructor?.firstName} {enrollment.course?.instructor?.lastName}
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-orange-500 fill-current" />
            <span>{enrollment.course?.rating || 4.5}</span>
          </div>
          <span>{formatDuration((enrollment.timeSpent || 0) * 60)}</span>
        </div>

        <div className="flex gap-2">
          {enrollment.progress === 100 ? (
            <Button variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Certificate
            </Button>
          ) : (
            <Link href={`/courses/${enrollment.course?.id}/learn/1-1`} className="flex-1">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                <Play className="h-4 w-4 mr-2" />
                {enrollment.progress === 0 ? 'Start' : 'Continue'}
              </Button>
            </Link>
          )}
          <Link href={`/courses/${enrollment.course?.id}`}>
            <Button variant="outline">View</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  // All courses section
  const AllCoursesSection = () => (
    <div className="space-y-6">
      <CourseFilters />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((enrollment) => (
          <CourseCard key={enrollment.id} enrollment={enrollment} />
        ))}
      </div>
      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>
          <Link href="/courses">
            <Button className="bg-purple-600 hover:bg-purple-700">Browse Courses</Button>
          </Link>
        </div>
      )}
    </div>
  );

  // Continue learning section
  const ContinueLearningSection = () => {
    const inProgressCourses = filteredCourses.filter(
      enrollment => enrollment.progress > 0 && enrollment.progress < 100
    ).slice(0, 2);

    if (inProgressCourses.length === 0) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {inProgressCourses.map((enrollment) => (
          <Card key={enrollment.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="flex">
              <img
                src={enrollment.course?.thumbnail || getCourseThumbnail(enrollment.course?.title || '')}
                alt={enrollment.course?.title || ''}
                className="w-32 h-24 object-cover"
              />
              <CardContent className="flex-1 p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 mr-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{enrollment.course?.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {enrollment.course?.instructor?.firstName} {enrollment.course?.instructor?.lastName}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Progress: {sanitizeProgress(enrollment.progress)}%</span>
                      <span>Enrolled: {formatDate(enrollment.enrolledAt)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-purple-600 mb-1">
                      {sanitizeProgress(enrollment.progress)}%
                    </div>
                    <Progress value={sanitizeProgress(enrollment.progress)} className="w-16" />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Continue learning</span>
                  <Link href={`/courses/${enrollment.course?.id}/learn/1-1`}>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                      <Play className="h-4 w-4 mr-1" />
                      Continue
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <UnifiedDashboard
      title="My Learning"
      description="Track your progress and continue your learning journey"
      stats={stats}
      sections={[
        {
          id: 'continue-learning',
          title: 'Continue Learning',
          description: 'Pick up where you left off',
          component: <ContinueLearningSection />
        },
        {
          id: 'all-courses',
          title: 'All My Courses',
          description: 'Your complete learning library',
          component: <AllCoursesSection />
        }
      ]}
      actions={[
        {
          label: 'Refresh',
          onClick: refetch,
          variant: 'outline',
          icon: RefreshCw
        }
      ]}
      loading={loading}
      error={error}
      onRetry={refetch}
    />
  );
}