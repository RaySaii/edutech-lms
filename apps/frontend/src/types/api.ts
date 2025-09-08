// Standardized API Response Types
import { UserRole, UserStatus } from './auth';
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  statusCode?: number;
  timestamp: string;
}

// Authentication Response Types
export interface EmailCheckResponse {
  available: boolean;
  message: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    organizationId: string;
    twoFactorEnabled: boolean;
    avatar?: string;
    phone?: string;
    emailVerifiedAt?: string;
    lastLoginAt?: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    organizationId: string;
    twoFactorEnabled: boolean;
    avatar?: string;
    phone?: string;
    emailVerifiedAt?: string;
    lastLoginAt?: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

// Course Response Types
export interface CourseResponse {
  id: string;
  title: string;
  description: string;
  instructor: {
    id: string;
    firstName: string;
    lastName: string;
  };
  category: string;
  level: string;
  duration: number;
  price: number;
  thumbnail?: string;
  rating?: number;
  totalEnrollments: number;
  createdAt: string;
  updatedAt: string;
}

export interface CoursesResponse {
  courses: CourseResponse[];
  pagination: PaginationMeta;
}

// Enrollment Response Types
export interface EnrollmentResponse {
  id: string;
  progress: number;
  enrolledAt: string;
  lastAccessedAt?: string;
  timeSpent: number;
  course: CourseResponse;
}

// Dashboard Response Types
export interface DashboardResponse {
  stats: {
    totalCourses: number;
    enrolledCourses: number;
    completedCourses: number;
    averageProgress: number;
    totalTimeSpent: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
  }>;
  enrolledCourses: EnrollmentResponse[];
}

// Generic API Error
export class APIError extends Error {
  constructor(
    public message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}