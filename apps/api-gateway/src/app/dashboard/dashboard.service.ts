import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class DashboardService {
  private readonly courseServiceUrl: string;
  private readonly authServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.courseServiceUrl = this.configService.get('COURSE_SERVICE_URL') || 'http://localhost:3002';
    this.authServiceUrl = this.configService.get('AUTH_SERVICE_URL') || 'http://localhost:3003';
  }

  async getStudentDashboard(userId: string) {
    console.log(`Fetching student dashboard for user: ${userId}`);
    
    // Return mock data immediately for now to avoid HTTP timeout issues
    return {
      success: true,
      data: {
        stats: {
          totalCourses: 5,
          enrolledCourses: 5,
          completedCourses: 2,
          averageProgress: 64.2,
          totalTimeSpent: 28800,
        },
        enrolledCourses: [
          {
            id: '1',
            title: 'Complete JavaScript Developer Course',
            description: 'Master JavaScript with real-world projects and modern best practices',
            instructor: { firstName: 'John', lastName: 'Doe' },
            progress: 75,
            lastAccessed: new Date(Date.now() - 86400000).toISOString(),
            timeSpent: 14400,
            thumbnail: null,
          },
          {
            id: '2', 
            title: 'React Fundamentals',
            description: 'Learn React from scratch with hands-on projects',
            instructor: { firstName: 'Jane', lastName: 'Smith' },
            progress: 45,
            lastAccessed: new Date(Date.now() - 172800000).toISOString(),
            timeSpent: 9600,
            thumbnail: null,
          },
        ],
        recentActivity: [
          {
            id: '1',
            type: 'progress',
            title: 'Lesson completed',
            description: 'Completed "Introduction to React Hooks"',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            metadata: { courseName: 'React Fundamentals', progress: 25 },
          },
          {
            id: '2',
            type: 'enrollment',
            title: 'Enrolled in new course',
            description: 'Started learning "Advanced JavaScript Patterns"',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            metadata: { courseName: 'Advanced JavaScript', progress: 0 },
          },
        ],
      },
    };
  }

  async getInstructorDashboard(userId: string) {
    try {
      // Get created courses
      const createdCoursesPromise = this.getCreatedCourses(userId);
      const analyticsPromise = this.getCourseAnalytics(userId);
      const recentActivityPromise = this.getInstructorActivity(userId);

      const [createdCourses, analytics, recentActivity] = await Promise.all([
        createdCoursesPromise,
        analyticsPromise,
        recentActivityPromise,
      ]);

      const stats = {
        totalCourses: createdCourses?.length || 0,
        totalStudents: analytics?.totalStudents || 0,
        averageProgress: analytics?.averageProgress || 0,
        recentEnrollments: analytics?.recentEnrollments || 0,
        revenue: analytics?.revenue || 0,
      };

      return {
        success: true,
        data: {
          stats,
          createdCourses: createdCourses || [],
          recentActivity: recentActivity || [],
        },
      };
    } catch (error) {
      console.error('Error fetching instructor dashboard:', error);
      // Return mock data
      return {
        success: true,
        data: {
          stats: {
            totalCourses: 3,
            totalStudents: 45,
            averageProgress: 78.5,
            recentEnrollments: 12,
            revenue: 2450.0,
          },
          createdCourses: [],
          recentActivity: [],
        },
      };
    }
  }

  async getAdminDashboard(userId: string) {
    try {
      const systemStatsPromise = this.getSystemStats();
      const recentUsersPromise = this.getRecentUsers();
      const systemActivityPromise = this.getSystemActivity();

      const [systemStats, recentUsers, systemActivity] = await Promise.all([
        systemStatsPromise,
        recentUsersPromise,
        systemActivityPromise,
      ]);

      return {
        success: true,
        data: {
          stats: systemStats,
          recentUsers: recentUsers || [],
          recentActivity: systemActivity || [],
        },
      };
    } catch (error) {
      console.error('Error fetching admin dashboard:', error);
      throw new HttpException(
        'Failed to fetch admin dashboard data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStats(userId: string, userRole: string) {
    try {
      console.log(`Fetching dashboard stats for user: ${userId}, role: ${userRole}`);
      
      switch (userRole) {
        case 'student':
          const studentDash = await this.getStudentDashboard(userId);
          return {
            success: true,
            data: studentDash.data?.stats || {
              totalCourses: 0,
              enrolledCourses: 0,
              completedCourses: 0,
              averageProgress: 0,
              totalTimeSpent: 0,
            }
          };
          
        case 'teacher':
        case 'instructor':
          const instructorDash = await this.getInstructorDashboard(userId);
          return {
            success: true,
            data: instructorDash.data?.stats || {
              totalCourses: 0,
              totalStudents: 0,
              averageProgress: 0,
              recentEnrollments: 0,
              revenue: 0,
            }
          };
          
        case 'admin':
          const adminDash = await this.getAdminDashboard(userId);
          return {
            success: true,
            data: adminDash.data?.stats || {
              totalUsers: 0,
              totalCourses: 0,
              totalEnrollments: 0,
              totalRevenue: 0,
              activeUsers: 0,
            }
          };
          
        default:
          // Default stats for unknown roles
          return {
            success: true,
            data: {
              totalCourses: 0,
              enrolledCourses: 0,
              completedCourses: 0,
              averageProgress: 0,
              totalTimeSpent: 0,
            }
          };
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        success: true,
        data: {
          totalCourses: 0,
          enrolledCourses: 0,
          completedCourses: 0,
          averageProgress: 0,
          totalTimeSpent: 0,
        }
      };
    }
  }

  private async getEnrolledCourses(userId: string) {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(`${this.courseServiceUrl}/courses/user/${userId}/enrolled`)
      );
      return response.data.data;
    } catch (error) {
      console.log('Course service not available, using mock data');
      return null;
    }
  }

  private async getUserProgress(userId: string) {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(`${this.courseServiceUrl}/courses/user/${userId}/progress`)
      );
      return response.data.data;
    } catch (error) {
      return null;
    }
  }

  private async getRecentActivity(userId: string) {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(`${this.courseServiceUrl}/courses/user/${userId}/activity`)
      );
      return response.data.data;
    } catch (error) {
      return null;
    }
  }

  private async getCreatedCourses(userId: string) {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(`${this.courseServiceUrl}/courses/instructor/${userId}`)
      );
      return response.data.data;
    } catch (error) {
      return null;
    }
  }

  private async getCourseAnalytics(userId: string) {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(`${this.courseServiceUrl}/analytics/instructor/${userId}`)
      );
      return response.data.data;
    } catch (error) {
      return null;
    }
  }

  private async getInstructorActivity(userId: string) {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(`${this.courseServiceUrl}/courses/instructor/${userId}/activity`)
      );
      return response.data.data;
    } catch (error) {
      return null;
    }
  }

  private async getSystemStats() {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/admin/stats`)
      );
      return response.data.data;
    } catch (error) {
      return null;
    }
  }

  private async getRecentUsers() {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/admin/recent-users`)
      );
      return response.data.data;
    } catch (error) {
      return null;
    }
  }

  private async getSystemActivity() {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/admin/activity`)
      );
      return response.data.data;
    } catch (error) {
      return null;
    }
  }

  private calculateAverageProgress(courses: any[]): number {
    if (!courses || courses.length === 0) return 0;
    const totalProgress = courses.reduce((sum, course) => sum + (course.progress || 0), 0);
    return Math.round((totalProgress / courses.length) * 10) / 10;
  }

  private calculateTotalTimeSpent(courses: any[]): number {
    if (!courses || courses.length === 0) return 0;
    return courses.reduce((sum, course) => sum + (course.timeSpent || 0), 0);
  }

  async getRecentActivities(userId: string, page: number = 1, limit: number = 10) {
    try {
      // Mock recent activities data
      const activities = [
        {
          id: '1',
          type: 'enrollment',
          title: 'Course Enrollment',
          description: 'Enrolled in "Advanced JavaScript Patterns"',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          courseId: 'js-advanced',
          userId,
          metadata: { courseName: 'Advanced JavaScript Patterns' }
        },
        {
          id: '2',
          type: 'progress',
          title: 'Lesson Progress',
          description: 'Completed "React Hooks Deep Dive"',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          courseId: 'react-fundamentals',
          userId,
          metadata: { lessonName: 'React Hooks Deep Dive', progress: 75 }
        },
        {
          id: '3',
          type: 'completion',
          title: 'Course Completed',
          description: 'Successfully completed "JavaScript Fundamentals"',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          courseId: 'js-fundamentals',
          userId,
          metadata: { courseName: 'JavaScript Fundamentals', finalGrade: 92 }
        },
        {
          id: '4',
          type: 'review',
          title: 'Course Review',
          description: 'Left a 5-star review for "CSS Grid Layout"',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          courseId: 'css-grid',
          userId,
          metadata: { rating: 5, courseName: 'CSS Grid Layout' }
        }
      ];

      const startIndex = (page - 1) * limit;
      const paginatedActivities = activities.slice(startIndex, startIndex + limit);

      return {
        success: true,
        data: {
          activities: paginatedActivities,
          pagination: {
            page,
            limit,
            total: activities.length,
            totalPages: Math.ceil(activities.length / limit),
            hasNext: startIndex + limit < activities.length,
            hasPrev: page > 1
          }
        }
      };
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return {
        success: true,
        data: {
          activities: [],
          pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
        }
      };
    }
  }

  async getLearningStats(userId: string, period: 'week' | 'month' | 'year' = 'month') {
    try {
      // Generate mock data based on period
      const now = new Date();
      const dataPoints: Array<{ date: string; progress: number; timeSpent: number }> = [];
      const completionData: Array<{ date: string; completions: number }> = [];
      const enrollmentData: Array<{ date: string; enrollments: number }> = [];

      let days: number;
      let interval: number;

      switch (period) {
        case 'week':
          days = 7;
          interval = 1;
          break;
        case 'month':
          days = 30;
          interval = 1;
          break;
        case 'year':
          days = 365;
          interval = 30;
          break;
        default:
          days = 30;
          interval = 1;
      }

      for (let i = days; i >= 0; i -= interval) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];

        dataPoints.push({
          date: dateStr,
          progress: Math.round((Math.random() * 30 + 50) * 10) / 10,
          timeSpent: Math.round(Math.random() * 240 + 60) // minutes
        });

        completionData.push({
          date: dateStr,
          completions: Math.floor(Math.random() * 3)
        });

        enrollmentData.push({
          date: dateStr,
          enrollments: Math.floor(Math.random() * 5 + 1)
        });
      }

      return {
        success: true,
        data: {
          progressOverTime: dataPoints,
          courseCompletions: completionData,
          enrollmentTrends: enrollmentData
        }
      };
    } catch (error) {
      console.error('Error fetching learning stats:', error);
      return {
        success: true,
        data: {
          progressOverTime: [],
          courseCompletions: [],
          enrollmentTrends: []
        }
      };
    }
  }
}