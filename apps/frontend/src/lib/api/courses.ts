import { api } from './base';

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  thumbnail?: string;
  price: number;
  status: 'draft' | 'published' | 'archived';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category?: string;
  tags?: string[];
  curriculum?: {
    totalDuration?: number;
    totalLessons?: number;
    modules: Array<{
      id: string;
      title: string;
      lessons: Array<{
        id: string;
        title: string;
        type: 'video' | 'text' | 'quiz' | 'assignment';
        content: string;
        duration: number;
      }>;
    }>;
  };
  enrollmentCount: number;
  rating: number;
  reviewCount: number;
  organizationId: string;
  instructorId: string;
  instructor: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  enrollment?: any;
}

export interface CreateCourseData {
  title: string;
  description: string;
  shortDescription?: string;
  thumbnail?: string;
  price: number;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tags?: string[];
  curriculum?: {
    modules: Array<{
      id: string;
      title: string;
      lessons: Array<{
        id: string;
        title: string;
        type: 'video' | 'text' | 'quiz' | 'assignment';
        content: string;
        duration: number;
      }>;
    }>;
  };
}

export interface CourseQuery {
  page?: number;
  limit?: number;
  search?: string;
  level?: string;
  status?: string;
  tags?: string;
  organizationId?: string;
  instructorId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CoursesResponse {
  success: boolean;
  data: {
    courses: Course[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export const courseAPI = {
  // Get all courses with filtering and pagination
  getCourses: async (query: CourseQuery = {}): Promise<CoursesResponse> => {
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
    
    const queryString = searchParams.toString();
    const url = queryString ? `/courses?${queryString}` : '/courses';
    
    return api.get(url);
  },

  // Search courses
  searchCourses: async (searchQuery: string, page = 1, limit = 10): Promise<CoursesResponse> => {
    return api.get(`/courses/search?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=${limit}`);
  },

  // Get courses by instructor
  getInstructorCourses: async (instructorId: string): Promise<CoursesResponse> => {
    return api.get(`/courses/instructor/${instructorId}`);
  },

  // Get current user's courses (as instructor)
  getMyCourses: async (): Promise<CoursesResponse> => {
    return api.get('/courses/my-courses');
  },

  // Get course by ID
  getCourseById: async (id: string): Promise<{ success: boolean; data: Course }> => {
    return api.get(`/courses/${id}`);
  },

  // Get course by ID (alias for consistency)
  getCourse: async (id: string): Promise<{ success: boolean; data: Course }> => {
    return api.get(`/courses/${id}`);
  },

  // Create new course
  createCourse: async (courseData: CreateCourseData): Promise<{ success: boolean; data: Course; message: string }> => {
    return api.post('/courses', courseData);
  },

  // Update course
  updateCourse: async (id: string, courseData: Partial<CreateCourseData>): Promise<{ success: boolean; data: Course; message: string }> => {
    return api.put(`/courses/${id}`, courseData);
  },

  // Delete course
  deleteCourse: async (id: string): Promise<{ success: boolean; message: string }> => {
    return api.delete(`/courses/${id}`);
  },

  // Publish course
  publishCourse: async (id: string): Promise<{ success: boolean; message: string }> => {
    return api.post(`/courses/${id}/publish`);
  },

  // Enroll in course
  enrollInCourse: async (id: string): Promise<{ success: boolean; message: string }> => {
    return api.post(`/courses/${id}/enroll`);
  },

  // Get course progress
  getCourseProgress: async (id: string): Promise<{ success: boolean; data: any }> => {
    return api.get(`/courses/${id}/progress`);
  },

  // Update course progress
  updateCourseProgress: async (id: string, progressData: any): Promise<{ success: boolean; message: string }> => {
    return api.put(`/courses/${id}/progress`, progressData);
  },

  // Get user's enrolled courses
  getMyEnrollments: async (): Promise<{ success: boolean; data: any[] }> => {
    return api.get('/courses/enrollments/my');
  },

  // Wishlist Management
  addToWishlist: async (id: string): Promise<{ success: boolean; message: string }> => {
    return api.post(`/courses/${id}/wishlist`);
  },

  removeFromWishlist: async (id: string): Promise<{ success: boolean; message: string }> => {
    return api.delete(`/courses/${id}/wishlist`);
  },

  getMyWishlist: async (): Promise<{ success: boolean; data: Course[] }> => {
    return api.get('/courses/wishlist/my');
  },
};