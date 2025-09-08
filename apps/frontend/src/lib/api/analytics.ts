import { api } from './base';

export interface TimeRange {
  timeRange?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
}

export interface AnalyticsQuery extends TimeRange {
  limit?: number;
  offset?: number;
  userId?: string;
  courseId?: string;
}

// User Analytics Types
export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userGrowth: number;
  avgSessionDuration: number;
  avgPageViews: number;
  engagementRate: number;
  retentionRate: number;
}

export interface UserEngagementData {
  dailyActiveUsers: Array<{ date: string; count: number }>;
  userActivities: Array<{ activity: string; count: number }>;
  learningProgress: Array<{ userId: string; progress: number }>;
  topUsers: Array<{ userId: string; score: number }>;
}

// Course Analytics Types
export interface CourseMetrics {
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  avgCompletionRate: number;
  avgRating: number;
  totalRevenue: number;
  popularCourses: Array<{
    courseId: string;
    enrollments: number;
    completionRate: number;
    rating: number;
  }>;
}

export interface CoursePerformanceData {
  enrollmentTrends: Array<{ date: string; enrollments: number }>;
  completionRates: Array<{ courseId: string; rate: number }>;
  dropoffAnalysis: Array<{ courseId: string; dropoffPoints: any[] }>;
  engagementMetrics: Array<{ courseId: string; metrics: any }>;
}

// Revenue Analytics Types
export interface RevenueMetrics {
  totalRevenue: number;
  netRevenue: number;
  totalTransactions: number;
  avgTransactionValue: number;
  revenueGrowth: number;
  refundRate: number;
  revenueBySource: Array<{
    source: string;
    amount: number;
    percentage: number;
    transactionCount: number;
  }>;
  topCourses: Array<{
    courseId: string;
    revenue: number;
    transactionCount: number;
  }>;
}

export interface RevenueAnalysisData {
  dailyRevenue: Array<{ date: string; amount: number; transactionCount: number }>;
  monthlyTrends: Array<{ month: string; amount: number }>;
  paymentMethods: Array<{ method: string; amount: number; count: number }>;
  regionAnalysis: Array<{ region: string; amount: number; count: number }>;
}

// Dashboard Types
export interface DashboardOverview {
  users: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    userGrowth: number;
  };
  courses: {
    totalCourses: number;
    publishedCourses: number;
    totalEnrollments: number;
    avgCompletionRate: number;
  };
  revenue: {
    totalRevenue: number;
    revenueGrowth: number;
    avgTransactionValue: number;
    totalTransactions: number;
  };
  engagement: {
    avgSessionDuration: number;
    avgPageViews: number;
    engagementRate: number;
    retentionRate: number;
  };
}

export interface DashboardCharts {
  userGrowth: Array<{ date: string; count: number }>;
  enrollmentTrends: Array<{ date: string; enrollments: number }>;
  revenueTrends: Array<{ date: string; amount: number }>;
  popularCourses: Array<{ courseId: string; enrollments: number; rating: number }>;
  userActivities: Array<{ activity: string; count: number }>;
  deviceBreakdown: Array<{ deviceType: string; count: number; percentage: number }>;
}

// Analytics API Service
export const analyticsApi = {
  // User Analytics
  getUserMetrics: async (query: AnalyticsQuery = {}): Promise<UserMetrics> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/user-analytics/metrics?${params}`);
  },

  getUserEngagement: async (query: AnalyticsQuery = {}): Promise<UserEngagementData> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/user-analytics/engagement?${params}`);
  },

  getUserActivity: async (userId: string, query: AnalyticsQuery = {}): Promise<any[]> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/user-analytics/activity/${userId}?${params}`);
  },

  getUserDashboard: async (query: AnalyticsQuery = {}): Promise<any> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/user-analytics/dashboard?${params}`);
  },

  // Course Analytics
  getCourseMetrics: async (query: AnalyticsQuery = {}): Promise<CourseMetrics> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/course-analytics/metrics?${params}`);
  },

  getCoursePerformance: async (query: AnalyticsQuery = {}): Promise<CoursePerformanceData> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/course-analytics/performance?${params}`);
  },

  getCourseAnalytics: async (courseId: string, query: AnalyticsQuery = {}): Promise<any> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/course-analytics/course/${courseId}?${params}`);
  },

  getCourseDashboard: async (query: AnalyticsQuery = {}): Promise<any> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/course-analytics/dashboard?${params}`);
  },

  // Revenue Analytics
  getRevenueMetrics: async (query: AnalyticsQuery = {}): Promise<RevenueMetrics> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/revenue-analytics/metrics?${params}`);
  },

  getRevenueAnalysis: async (query: AnalyticsQuery = {}): Promise<RevenueAnalysisData> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/revenue-analytics/analysis?${params}`);
  },

  getCourseRevenue: async (courseId: string, query: AnalyticsQuery = {}): Promise<any> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/revenue-analytics/course/${courseId}?${params}`);
  },

  getRevenueDashboard: async (query: AnalyticsQuery = {}): Promise<any> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/revenue-analytics/dashboard?${params}`);
  },

  // Dashboard Analytics
  getDashboardOverview: async (query: AnalyticsQuery = {}): Promise<DashboardOverview> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/dashboard/overview?${params}`);
  },

  getDashboardCharts: async (query: AnalyticsQuery = {}): Promise<DashboardCharts> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/dashboard/charts?${params}`);
  },

  getComprehensiveDashboard: async (query: AnalyticsQuery = {}): Promise<any> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/dashboard/comprehensive?${params}`);
  },

  getExecutiveSummary: async (query: AnalyticsQuery = {}): Promise<any> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/dashboard/executive-summary?${params}`);
  },

  getRealtimeMetrics: async (): Promise<any> => {
    return api.get('/analytics/dashboard/realtime');
  },

  // Event Tracking
  trackEvent: async (eventData: any): Promise<any> => {
    return api.post('/analytics/event-tracking/track', eventData);
  },

  getEventStatistics: async (query: AnalyticsQuery = {}): Promise<any> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/event-tracking/statistics?${params}`);
  },

  getEventTrackingDashboard: async (query: AnalyticsQuery = {}): Promise<any> => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });
    return api.get(`/analytics/event-tracking/dashboard?${params}`);
  }
};