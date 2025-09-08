'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Settings, Plus, Users, BarChart3, Search } from 'lucide-react';

interface QuickActionsProps {
  userRole: string;
}

export default function QuickActions({ userRole }: QuickActionsProps) {
  const router = useRouter();
  const normalizedRole = (userRole || '').toString().trim().toUpperCase();
  const isInstructor = normalizedRole === 'INSTRUCTOR' || normalizedRole === 'TEACHER';

  const getActions = () => {
    if (isInstructor) {
      return [
        {
          title: 'Create Course',
          description: 'Start building a new course',
          icon: Plus,
          color: 'blue',
          action: () => router.push('/courses/create'),
        },
        {
          title: 'My Courses',
          description: 'Manage your existing courses',
          icon: BookOpen,
          color: 'green',
          action: () => router.push('/courses?filter=my-courses'),
        },
        {
          title: 'Students',
          description: 'View enrolled students',
          icon: Users,
          color: 'purple',
          action: () => router.push('/students'),
        },
        {
          title: 'Analytics',
          description: 'View course performance',
          icon: BarChart3,
          color: 'orange',
          action: () => router.push('/analytics'),
        },
      ];
    } else {
      return [
        {
          title: 'Browse Courses',
          description: 'Discover new learning opportunities',
          icon: Search,
          color: 'blue',
          action: () => router.push('/courses'),
        },
        {
          title: 'My Learning',
          description: 'Continue your enrolled courses',
          icon: BookOpen,
          color: 'green',
          action: () => router.push('/courses/enrollments/my'),
        },
        {
          title: 'Progress',
          description: 'Track your learning progress',
          icon: BarChart3,
          color: 'purple',
          action: () => router.push('/progress'),
        },
        {
          title: 'Account Settings',
          description: 'Manage your profile and preferences',
          icon: Settings,
          color: 'orange',
          action: () => router.push('/settings'),
        },
      ];
    }
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'border-blue-200 hover:border-blue-300 hover:bg-blue-50',
      green: 'border-green-200 hover:border-green-300 hover:bg-green-50',
      purple: 'border-purple-200 hover:border-purple-300 hover:bg-purple-50',
      orange: 'border-orange-200 hover:border-orange-300 hover:bg-orange-50',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getIconColorClasses = (color: string) => {
    const colors = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      purple: 'text-purple-600',
      orange: 'text-orange-600',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const actions = getActions();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.action}
              className={`flex items-center p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${getColorClasses(action.color)}`}
              data-testid={`quick-action-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className={`h-6 w-6 mr-3 ${getIconColorClasses(action.color)}`} />
              <div className="text-left">
                <p className="font-medium text-gray-900">{action.title}</p>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
