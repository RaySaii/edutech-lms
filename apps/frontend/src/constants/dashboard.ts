/**
 * Dashboard Constants
 * Centralized configuration for dashboard mock data and calculations
 */

export const DASHBOARD_MOCK_DATA = {
  STUDENT_STATS: {
    TOTAL_TIME_SPENT: 28800, // 8 hours in seconds
    AVERAGE_PROGRESS: 65.5,
    COMPLETED_COURSES: 3,
    ENROLLED_COURSES: 8,
  },
  INSTRUCTOR_STATS: {
    TOTAL_REVENUE: 2450.00,
    RECENT_ENROLLMENTS: 12,
    TOTAL_COURSES: 5,
    TOTAL_STUDENTS: 180,
    AVERAGE_PROGRESS: 72.3,
  },
} as const;

export const TIME_CONSTANTS = {
  SECONDS_PER_HOUR: 3600,
  MINUTES_PER_HOUR: 60,
} as const;