'use client';

import React, { useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UnifiedDashboard } from '../../components/common/UnifiedDashboard';
import { useDashboard } from '../../hooks/useDashboard';
import { RefreshCw } from 'lucide-react';
import EnrolledCourses from '../../components/dashboard/EnrolledCourses';
import RecentActivity from '../../components/dashboard/RecentActivity';
import QuickActions from '../../components/dashboard/QuickActions';
import { useEnrolledCourses } from '../../hooks/useEnrolledCourses';

export default function Dashboard() {
  const { user } = useAuth();
  const { stats, loading, error, refetch } = useDashboard();
  const { enrolledCourses, loading: coursesLoading } = useEnrolledCourses();
  const searchRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Mock recent activity data
  const recentActivity: import('../../lib/api/dashboard').RecentActivity[] = [
    {
      id: '1',
      type: user?.role === 'admin' ? 'enrollment' : 'progress',
      title: user?.role === 'admin' ? 'New student enrolled' : 'Lesson completed',
      description: user?.role === 'admin' ? 'John Doe enrolled in React Fundamentals' : 'Completed "Introduction to React Hooks"',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      metadata: { courseName: 'React Fundamentals', progress: 25 }
    },
    {
      id: '2',
      type: user?.role === 'admin' ? 'review' : 'enrollment',
      title: user?.role === 'admin' ? 'New course review' : 'Enrolled in new course',
      description: user?.role === 'admin' ? '5-star review on Advanced JavaScript' : 'Started learning "Advanced JavaScript Patterns"',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      metadata: { courseName: 'Advanced JavaScript', progress: 0 }
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="dashboard">
      <div className="px-6 pt-4">
        {/* Quick Search control for E2E */}
        <div className="flex items-center justify-end mb-2">
          <button
            data-testid="quick-search"
            onClick={() => searchRef.current?.focus()}
            className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
          >
            Quick Search
          </button>
          <input
            ref={searchRef}
            placeholder="Search..."
            className="ml-2 px-2 py-1 border rounded-md focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <UnifiedDashboard
        title={`${user.firstName}'s Dashboard`}
        description={`Welcome back, ${user.firstName}! Here's your learning overview.`}
        stats={stats}
        sections={[
          {
            id: 'enrolled-courses',
            title: 'My Courses',
            description: 'Continue your learning journey',
            component: (
              <EnrolledCourses 
                courses={enrolledCourses} 
                loading={coursesLoading} 
                userRole={user?.role || ''} 
              />
            )
          },
          {
            id: 'quick-actions',
            title: 'Quick Actions',
            component: <QuickActions userRole={user?.role || ''} />,
            className: 'lg:col-span-1'
          },
          {
            id: 'recent-activity',
            title: 'Recent Activity',
            description: 'Your latest learning activities',
            component: (
              <RecentActivity 
                activities={recentActivity} 
                loading={loading} 
              />
            ),
            className: 'lg:col-span-2'
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
        error={error || undefined}
        onRetry={refetch}
      />
    </div>
  );
}
