'use client';

import { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen,
  Download,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { analyticsApi, DashboardOverview, DashboardCharts, TimeRange } from '@/lib/api/analytics';

interface AnalyticsDashboardProps {
  className?: string;
}

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange['timeRange']>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [overviewData, chartsData] = await Promise.all([
        analyticsApi.getDashboardOverview({ timeRange }),
        analyticsApi.getDashboardCharts({ timeRange })
      ]);
      
      setOverview(overviewData);
      setCharts(chartsData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className={`space-y-6 p-6 ${className}`}>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <div className="animate-pulse bg-gray-200 h-10 w-32 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mt-2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 p-6 ${className}`}>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-red-600 text-lg font-medium mb-2">Error Loading Analytics</div>
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={loadAnalyticsData}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights into platform performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={(value: string) => setTimeRange(value as TimeRange['timeRange'])}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadAnalyticsData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Users Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
              <div className="text-2xl font-bold">{formatNumber(overview.users.totalUsers)}</div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 text-sm">
                <Badge variant={overview.users.userGrowth >= 0 ? "default" : "destructive"}>
                  {formatPercentage(overview.users.userGrowth)}
                </Badge>
                <span className="text-gray-500">growth</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
              <div className="text-2xl font-bold">{formatNumber(overview.users.activeUsers)}</div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500">
                {formatNumber(overview.users.newUsers)} new users
              </div>
            </CardContent>
          </Card>

          {/* Course Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Courses</CardTitle>
              <div className="text-2xl font-bold">{formatNumber(overview.courses.totalCourses)}</div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500">
                {formatNumber(overview.courses.publishedCourses)} published
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Enrollments</CardTitle>
              <div className="text-2xl font-bold">{formatNumber(overview.courses.totalEnrollments)}</div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 text-sm">
                <Badge variant="outline">
                  {overview.courses.avgCompletionRate.toFixed(1)}% completion
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
              <div className="text-2xl font-bold">{formatCurrency(overview.revenue.totalRevenue)}</div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 text-sm">
                <Badge variant={overview.revenue.revenueGrowth >= 0 ? "default" : "destructive"}>
                  {formatPercentage(overview.revenue.revenueGrowth)}
                </Badge>
                <span className="text-gray-500">growth</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Transaction</CardTitle>
              <div className="text-2xl font-bold">{formatCurrency(overview.revenue.avgTransactionValue)}</div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500">
                {formatNumber(overview.revenue.totalTransactions)} transactions
              </div>
            </CardContent>
          </Card>

          {/* Engagement Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Session</CardTitle>
              <div className="text-2xl font-bold">{Math.round(overview.engagement.avgSessionDuration)}m</div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500">
                {overview.engagement.avgPageViews.toFixed(1)} pages/session
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Retention Rate</CardTitle>
              <div className="text-2xl font-bold">{overview.engagement.retentionRate.toFixed(1)}%</div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 text-sm">
                <Badge variant="outline">
                  {overview.engagement.engagementRate.toFixed(1)}% engaged
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>User Growth Trend</CardTitle>
              <CardDescription>Daily active users over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {charts.userGrowth.slice(-7).map((point, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {new Date(point.date).toLocaleDateString()}
                    </span>
                    <span className="font-medium">{formatNumber(point.count)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Daily revenue over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {charts.revenueTrends.slice(-7).map((point, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {new Date(point.date).toLocaleDateString()}
                    </span>
                    <span className="font-medium">{formatCurrency(point.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Popular Courses */}
          <Card>
            <CardHeader>
              <CardTitle>Popular Courses</CardTitle>
              <CardDescription>Top performing courses by enrollments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {charts.popularCourses.slice(0, 5).map((course, index) => (
                  <div key={course.courseId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">Course #{course.courseId}</div>
                      <div className="text-sm text-gray-500">
                        Rating: {course.rating.toFixed(1)}/5
                      </div>
                    </div>
                    <Badge variant="outline">
                      {formatNumber(course.enrollments)} enrolled
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Device Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Device Usage</CardTitle>
              <CardDescription>Platform usage by device type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {charts.deviceBreakdown.map((device, index) => (
                  <div key={device.deviceType} className="flex justify-between items-center">
                    <span className="font-medium capitalize">{device.deviceType}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">{formatNumber(device.count)}</span>
                      <Badge variant="outline">{device.percentage.toFixed(1)}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Insights</CardTitle>
          <CardDescription>Key performance indicators at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          {overview && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {((overview.users.activeUsers / overview.users.totalUsers) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-blue-700">User Activation Rate</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {((overview.courses.publishedCourses / overview.courses.totalCourses) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-green-700">Course Publish Rate</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {(overview.courses.totalEnrollments / overview.courses.publishedCourses).toFixed(1)}
                </div>
                <div className="text-sm text-purple-700">Avg Enrollments/Course</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {(overview.revenue.totalRevenue / overview.revenue.totalTransactions).toFixed(0)}
                </div>
                <div className="text-sm text-orange-700">Revenue per User</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Activities */}
      {charts?.userActivities && (
        <Card>
          <CardHeader>
            <CardTitle>User Activities</CardTitle>
            <CardDescription>Most common user actions on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {charts.userActivities.map((activity, index) => (
                <div key={activity.activity} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">{formatNumber(activity.count)}</div>
                  <div className="text-sm text-gray-600 capitalize">{activity.activity.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enrollment Trends */}
      {charts?.enrollmentTrends && (
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Trends</CardTitle>
            <CardDescription>Daily course enrollments over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {charts.enrollmentTrends.slice(-10).map((trend, index) => (
                <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">
                    {new Date(trend.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min((trend.enrollments / Math.max(...charts.enrollmentTrends.map(t => t.enrollments))) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="font-medium w-12 text-right">{trend.enrollments}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}