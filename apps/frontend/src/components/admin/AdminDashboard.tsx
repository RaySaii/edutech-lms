'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  DollarSign,
  UserPlus,
  FileText,
  Settings,
  BarChart3,
  Calendar,
  MessageSquare,
  Shield,
  Download,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import Link from 'next/link';
import { dashboardApi } from '../../lib/api/dashboard';

interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  newUsersThisMonth: number;
  newCoursesThisMonth: number;
  averageProgress: number;
  activeUsers: number;
}

interface RecentActivity {
  id: string;
  type: 'user_registration' | 'course_created' | 'enrollment' | 'completion' | 'progress' | 'review';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  course?: string;
  courseId?: string;
  userId?: string;
  metadata?: any;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalRevenue: 0,
    newUsersThisMonth: 0,
    newCoursesThisMonth: 0,
    averageProgress: 0,
    activeUsers: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch real admin dashboard data
      const data = await dashboardApi.getDashboardData();
      setStats({
        totalUsers: data.stats.totalStudents || 0,
        totalCourses: data.stats.totalCourses || 0,
        totalEnrollments: data.stats.enrolledCourses || 0,
        totalRevenue: data.stats.revenue || 0,
        newUsersThisMonth: data.stats.recentEnrollments || 0,
        newCoursesThisMonth: 5,
        averageProgress: data.stats.averageProgress || 0,
        activeUsers: Math.floor((data.stats.totalStudents || 0) * 0.7)
      });
      setRecentActivity(data.recentActivity || []);
      
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      setError('Using demo data - API connection pending');
      
      // Fallback to mock data
      setStats({
        totalUsers: 1250,
        totalCourses: 45,
        totalEnrollments: 3200,
        totalRevenue: 125000,
        newUsersThisMonth: 89,
        newCoursesThisMonth: 5,
        averageProgress: 68.5,
        activeUsers: 875
      });
      
      setRecentActivity([
        {
          id: '1',
          type: 'user_registration',
          title: 'New User Registration',
          description: 'John Smith registered as a student',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          user: 'John Smith'
        },
        {
          id: '2',
          type: 'course_created',
          title: 'Course Published',
          description: 'Advanced React Patterns course was published',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          course: 'Advanced React Patterns'
        },
        {
          id: '3',
          type: 'enrollment',
          title: 'New Enrollment',
          description: 'Sarah Johnson enrolled in JavaScript Fundamentals',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          user: 'Sarah Johnson',
          course: 'JavaScript Fundamentals'
        },
        {
          id: '4',
          type: 'completion',
          title: 'Course Completed',
          description: 'Mike Davis completed Python for Beginners',
          timestamp: new Date(Date.now() - 14400000).toISOString(),
          user: 'Mike Davis',
          course: 'Python for Beginners'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'course_created':
        return <BookOpen className="h-4 w-4 text-green-500" />;
      case 'enrollment':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'completion':
        return <TrendingUp className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-96 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your learning platform</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Link href="/admin/settings">
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> {error}
            </p>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-gray-600">Total Users</p>
                  <p className="text-sm text-green-600">+{stats.newUsersThisMonth} this month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                  <p className="text-gray-600">Total Courses</p>
                  <p className="text-sm text-green-600">+{stats.newCoursesThisMonth} this month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEnrollments.toLocaleString()}</p>
                  <p className="text-gray-600">Total Enrollments</p>
                  <p className="text-sm text-blue-600">{stats.averageProgress.toFixed(1)}% avg progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-gray-600">Total Revenue</p>
                  <p className="text-sm text-green-600">{stats.activeUsers} active users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-600">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm">
                  View All Activity
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/admin/users">
                  <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                    <Users className="h-6 w-6 mb-2" />
                    <span className="text-sm">Manage Users</span>
                  </Button>
                </Link>
                
                <Link href="/admin/courses">
                  <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                    <BookOpen className="h-6 w-6 mb-2" />
                    <span className="text-sm">Manage Courses</span>
                  </Button>
                </Link>
                
                <Link href="/admin/analytics">
                  <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                    <BarChart3 className="h-6 w-6 mb-2" />
                    <span className="text-sm">Analytics</span>
                  </Button>
                </Link>
                
                <Link href="/admin/reports">
                  <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                    <FileText className="h-6 w-6 mb-2" />
                    <span className="text-sm">Reports</span>
                  </Button>
                </Link>
                
                <Link href="/admin/notifications">
                  <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                    <MessageSquare className="h-6 w-6 mb-2" />
                    <span className="text-sm">Notifications</span>
                  </Button>
                </Link>
                
                <Link href="/admin/security">
                  <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                    <Shield className="h-6 w-6 mb-2" />
                    <span className="text-sm">Security</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">API Gateway</span>
                  <Badge className="bg-green-100 text-green-800">Online</Badge>
                </div>
                <Progress value={98} className="h-2" />
                <p className="text-xs text-gray-500">Response time: 45ms</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Database</span>
                  <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                </div>
                <Progress value={95} className="h-2" />
                <p className="text-xs text-gray-500">Connections: 23/100</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Storage</span>
                  <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
                </div>
                <Progress value={78} className="h-2" />
                <p className="text-xs text-gray-500">Used: 780GB / 1TB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}