import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEnrolledCourses } from './useEnrolledCourses';
import { StatCard } from '../components/common/UnifiedDashboard';
import { calculateLearningStats } from '../utils/learningStats';
import { 
  BookOpen, 
  Users, 
  Award, 
  Clock, 
  TrendingUp, 
  BarChart3,
  DollarSign 
} from 'lucide-react';

export type DashboardType = 'student' | 'teacher' | 'admin';

export interface DashboardData {
  type: DashboardType;
  stats: StatCard[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Unified dashboard hook for all user roles
 * Consolidates all dashboard logic into a single hook
 */
export function useDashboard(): DashboardData {
  const { user } = useAuth();
  const { enrolledCourses, loading: coursesLoading, error: coursesError, refetch } = useEnrolledCourses();
  const [error, setError] = useState<string | null>(null);

  // Determine dashboard type based on user role
  const dashboardType: DashboardType = useMemo(() => {
    if (!user) return 'student';
    if (user.role === 'admin' || user.role === 'super_admin') return 'admin';
    if (user.role === 'teacher') return 'teacher';
    return 'student';
  }, [user?.role]);

  // Calculate learning statistics for students
  const learningStats = useMemo(() => {
    return calculateLearningStats(enrolledCourses);
  }, [enrolledCourses]);

  // Generate stats cards based on user role
  const stats: StatCard[] = useMemo(() => {
    switch (dashboardType) {
      case 'student':
        return [
          {
            title: 'Enrolled Courses',
            value: learningStats.enrolledCourses,
            icon: BookOpen,
            color: 'blue',
            description: 'Active course enrollments'
          },
          {
            title: 'Completed',
            value: learningStats.completedCourses,
            icon: Award,
            color: 'green',
            description: 'Successfully finished courses'
          },
          {
            title: 'Progress',
            value: `${learningStats.averageProgress.toFixed(1)}%`,
            icon: BarChart3,
            color: 'purple',
            description: 'Overall learning progress'
          },
          {
            title: 'Learning Time',
            value: `${Math.floor(learningStats.totalHours)}h`,
            icon: Clock,
            color: 'orange',
            description: 'Total time invested'
          }
        ];

      case 'teacher':
        return [
          {
            title: 'Created Courses',
            value: 10, // Mock data - would come from API
            icon: BookOpen,
            color: 'blue',
            description: 'Total courses created',
            trend: {
              value: 3.4,
              isPositive: true
            }
          },
          {
            title: 'Total Students',
            value: 85, // Mock data
            icon: Users,
            color: 'green',
            description: 'Students across all courses',
            trend: {
              value: 7.2,
              isPositive: true
            }
          },
          {
            title: 'Completion Rate',
            value: '75.5%', // Mock data
            icon: Award,
            color: 'purple',
            description: 'Average student completion',
            trend: {
              value: 2.1,
              isPositive: true
            }
          },
          {
            title: 'Revenue',
            value: '$1,200', // Mock data
            icon: DollarSign,
            color: 'orange',
            description: 'Total earnings',
            trend: {
              value: 18.9,
              isPositive: true
            }
          }
        ];

      case 'admin':
        return [
          {
            title: 'Total Users',
            value: 1250, // Mock data
            icon: Users,
            color: 'blue',
            description: 'Registered users',
            trend: {
              value: 12.5,
              isPositive: true
            }
          },
          {
            title: 'Total Courses',
            value: 50, // Mock data
            icon: BookOpen,
            color: 'green',
            description: 'Available courses',
            trend: {
              value: 8.3,
              isPositive: true
            }
          },
          {
            title: 'Platform Revenue',
            value: '$25,000', // Mock data
            icon: DollarSign,
            color: 'purple',
            description: 'Total platform revenue',
            trend: {
              value: 15.7,
              isPositive: true
            }
          },
          {
            title: 'Active Sessions',
            value: 125, // Mock data
            icon: TrendingUp,
            color: 'orange',
            description: 'Current active users',
            trend: {
              value: 5.2,
              isPositive: true
            }
          }
        ];

      default:
        return [];
    }
  }, [dashboardType, learningStats]);

  // Handle errors
  useEffect(() => {
    if (coursesError) {
      setError(coursesError);
    } else {
      setError(null);
    }
  }, [coursesError]);

  return {
    type: dashboardType,
    stats,
    loading: coursesLoading,
    error,
    refetch
  };
}
