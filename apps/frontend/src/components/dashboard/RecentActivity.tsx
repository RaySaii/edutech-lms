'use client';

import React from 'react';
import { BookOpen, User, Award, Star, Plus, Clock } from 'lucide-react';
import { RecentActivity as ActivityType } from '../../lib/api/dashboard';
import { SkeletonList } from '../ui/skeleton';

interface RecentActivityProps {
  activities: ActivityType[];
  loading?: boolean;
}

const RecentActivity = React.memo<RecentActivityProps>(({ activities, loading = false }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'enrollment':
        return BookOpen;
      case 'completion':
        return Award;
      case 'progress':
        return Clock;
      case 'review':
        return Star;
      case 'course_created':
        return Plus;
      default:
        return User;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'enrollment':
        return 'text-blue-600 bg-blue-100';
      case 'completion':
        return 'text-green-600 bg-green-100';
      case 'progress':
        return 'text-orange-600 bg-orange-100';
      case 'review':
        return 'text-yellow-600 bg-yellow-100';
      case 'course_created':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return activityTime.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <SkeletonList items={5} />
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No recent activity to display</p>
          <p className="text-sm text-gray-400">Start learning to see your progress here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = getActivityIcon(activity.type);
          return (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {activity.title}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {activity.description}
                </p>
                {activity.metadata && (
                  <div className="mt-1 text-xs text-gray-400">
                    {activity.metadata.courseName && (
                      <span>Course: {activity.metadata.courseName}</span>
                    )}
                    {activity.metadata.progress && (
                      <span className="ml-2">Progress: {activity.metadata.progress}%</span>
                    )}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 whitespace-nowrap">
                {formatTimeAgo(activity.timestamp)}
              </div>
            </div>
          );
        })}
      </div>
      
      {activities.length >= 5 && (
        <div className="mt-4 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all activity
          </button>
        </div>
      )}
    </div>
  );
});

RecentActivity.displayName = 'RecentActivity';

export default RecentActivity;