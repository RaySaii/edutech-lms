import { api } from './base';

export interface DashboardStats {
  totalCourses: number;
  enrolledCourses: number;
  completedCourses: number;
  totalStudents?: number;
  averageProgress: number;
  totalTimeSpent: number;
  recentEnrollments?: number;
  revenue?: number;
}

export interface RecentActivity {
  id: string;
  type: 'enrollment' | 'completion' | 'progress' | 'review' | 'course_created';
  title: string;
  description: string;
  timestamp: string;
  courseId?: string;
  userId?: string;
  metadata?: any;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivity: RecentActivity[];
  enrolledCourses: any[];
  createdCourses?: any[];
}

export const dashboardApi = {
  // Get overall dashboard data based on user role
  getDashboardData: async (): Promise<DashboardData> => {
    return api.get('/dashboard');
  },

  // Get student-specific dashboard data
  getStudentDashboard: async (): Promise<{
    stats: DashboardStats;
    enrolledCourses: any[];
    recentActivity: RecentActivity[];
    recommendedCourses: any[];
  }> => {
    return api.get('/dashboard/student');
  },

  // Get instructor-specific dashboard data
  getInstructorDashboard: async (): Promise<{
    stats: DashboardStats;
    createdCourses: any[];
    recentActivity: RecentActivity[];
    enrollmentTrends: any[];
  }> => {
    return api.get('/dashboard/instructor');
  },

  // Get course progress for a specific course
  getCourseProgress: async (courseId: string): Promise<{
    progress: number;
    timeSpent: number;
    completedLessons: string[];
    totalLessons: number;
    currentLesson?: string;
    lastAccessed: string;
  }> => {
    return api.get(`/courses/${courseId}/progress`);
  },

  // Get recent activities with pagination
  getRecentActivities: async (page: number = 1, limit: number = 10): Promise<{
    activities: RecentActivity[];
    pagination: any;
  }> => {
    return api.get(`/dashboard/activities?page=${page}&limit=${limit}`);
  },

  // Get learning statistics for charts
  getLearningStats: async (period: 'week' | 'month' | 'year' = 'month'): Promise<{
    progressOverTime: Array<{ date: string; progress: number; timeSpent: number }>;
    courseCompletions: Array<{ date: string; completions: number }>;
    enrollmentTrends: Array<{ date: string; enrollments: number }>;
  }> => {
    return api.get(`/dashboard/stats?period=${period}`);
  },

  // Get quick stats for dashboard cards
  getQuickStats: async (): Promise<DashboardStats> => {
    return api.get('/dashboard/quick-stats');
  },
};