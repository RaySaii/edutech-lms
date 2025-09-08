'use client';

import React from 'react';
import { BookOpen, Users, BarChart3, Clock, Award, TrendingUp } from 'lucide-react';
import { DashboardStats as StatsType } from '../../lib/api/dashboard';
import { SkeletonDashboardStats } from '../ui/skeleton';

interface DashboardStatsProps {
  stats: StatsType;
  userRole: string;
  loading?: boolean;
}

const DashboardStats = React.memo<DashboardStatsProps>(({ stats, userRole, loading = false }) => {
  const getStatsCards = () => {
    if (userRole === 'teacher') {
      return [
        {
          title: 'Created Courses',
          value: stats.totalCourses || 0,
          icon: BookOpen,
          color: 'blue',
          description: 'Total courses created',
        },
        {
          title: 'Total Students',
          value: stats.totalStudents || 0,
          icon: Users,
          color: 'green',
          description: 'Students enrolled across all courses',
        },
        {
          title: 'Revenue',
          value: `$${(stats.revenue || 0).toFixed(2)}`,
          icon: TrendingUp,
          color: 'purple',
          description: 'Total earnings from courses',
        },
        {
          title: 'Avg. Completion',
          value: `${(stats.averageProgress || 0).toFixed(1)}%`,
          icon: Award,
          color: 'orange',
          description: 'Average student completion rate',
        },
      ];
    } else {
      return [
        {
          title: 'Enrolled Courses',
          value: stats.enrolledCourses || 0,
          icon: BookOpen,
          color: 'blue',
          description: 'Courses you are enrolled in',
        },
        {
          title: 'Completed',
          value: stats.completedCourses || 0,
          icon: Award,
          color: 'green',
          description: 'Courses completed',
        },
        {
          title: 'Progress',
          value: `${(stats.averageProgress || 0).toFixed(1)}%`,
          icon: BarChart3,
          color: 'purple',
          description: 'Overall learning progress',
        },
        {
          title: 'Time Spent',
          value: `${Math.floor((stats.totalTimeSpent || 0) / 3600)}h`,
          icon: Clock,
          color: 'orange',
          description: 'Total learning time',
        },
      ];
    }
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      purple: 'text-purple-600 bg-purple-100',
      orange: 'text-orange-600 bg-orange-100',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const statsCards = getStatsCards();

  if (loading) {
    return <SkeletonDashboardStats />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
            <div className="flex items-center">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${getColorClasses(card.color)}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className="text-2xl font-semibold text-gray-900" data-testid={`stat-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {card.value}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400">{card.description}</p>
          </div>
        );
      })}
    </div>
  );
});

DashboardStats.displayName = 'DashboardStats';

export default DashboardStats;