'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Smartphone,
  Download,
  Bell,
  Settings,
  Activity,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface MobileDevice {
  id: string;
  deviceName: string;
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  lastActiveAt: string;
  isActive: boolean;
  offlineContentCount: number;
  user: {
    name: string;
    email: string;
  };
}

interface MobileAnalytics {
  overview: {
    totalEvents: number;
    activeDevices: number;
    uniqueUsers: number;
    averageSessionDuration: number;
    topEvents: Array<{ eventType: string; count: number }>;
  };
  platforms: Record<string, {
    devices: number;
    events: number;
    crashes: number;
    averageSessionDuration: number;
  }>;
  performance: {
    averageLoadTime: number;
    averageResponseTime: number;
    errorRate: number;
    crashRate: number;
  };
  usage: {
    dailyActiveUsers: Array<{ date: string; count: number }>;
    screenViews: Array<{ screen: string; views: number; avgDuration: number }>;
    featureUsage: Array<{ feature: string; usage: number }>;
  };
}

interface NotificationAnalytics {
  totalSent: number;
  totalDelivered: number;
  deliveryRate: number;
  platformBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  trends: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const MobileDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [analytics, setAnalytics] = useState<MobileAnalytics | null>(null);
  const [notificationAnalytics, setNotificationAnalytics] = useState<NotificationAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMobileData();
  }, []);

  const fetchMobileData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [devicesResponse, analyticsResponse, notificationResponse] = await Promise.all([
        fetch('/api/mobile/devices'),
        fetch('/api/mobile/analytics/report?period=30d'),
        fetch('/api/mobile/notifications/analytics?period=30d'),
      ]);

      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json();
        setDevices(devicesData.data || []);
      }

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData.data);
      }

      if (notificationResponse.ok) {
        const notificationData = await notificationResponse.json();
        setNotificationAnalytics(notificationData.data);
      }
    } catch (err) {
      setError('Failed to fetch mobile dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'ios':
        return '📱';
      case 'android':
        return '🤖';
      case 'web':
        return '🌐';
      default:
        return '📱';
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.overview.activeDevices || 0}</div>
            <p className="text-xs text-muted-foreground">
              {devices.filter(d => d.isActive).length} currently online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.overview.uniqueUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Active users this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(analytics?.overview.averageSessionDuration || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Average session duration</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.overview.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">Analytics events tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Distribution</CardTitle>
            <CardDescription>Device breakdown by platform</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.platforms && (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(analytics.platforms).map(([platform, data]) => ({
                      name: platform.toUpperCase(),
                      value: data.devices,
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.keys(analytics.platforms).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Active Users</CardTitle>
            <CardDescription>User engagement over time</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.usage.dailyActiveUsers && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.usage.dailyActiveUsers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Events */}
      <Card>
        <CardHeader>
          <CardTitle>Top Events</CardTitle>
          <CardDescription>Most frequent user actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.overview.topEvents?.map((event, index) => (
              <div key={event.eventType} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">#{index + 1}</Badge>
                  <span className="font-medium">{event.eventType.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-32">
                    <Progress 
                      value={(event.count / (analytics.overview.topEvents[0]?.count || 1)) * 100} 
                      className="h-2"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{event.count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const DevicesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Registered Devices</h3>
        <Button onClick={fetchMobileData} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {devices.map((device) => (
          <Card key={device.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{getPlatformIcon(device.platform)}</div>
                  <div>
                    <h4 className="font-medium">{device.deviceName || 'Unknown Device'}</h4>
                    <p className="text-sm text-muted-foreground">{device.user.name}</p>
                    <p className="text-xs text-muted-foreground">{device.user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <Badge variant={device.isActive ? 'default' : 'secondary'}>
                      {device.isActive ? 'Online' : 'Offline'}
                    </Badge>
                    <Badge variant="outline">{device.platform.toUpperCase()}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    v{device.appVersion}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last active: {new Date(device.lastActiveAt).toLocaleString()}
                  </p>
                  {device.offlineContentCount > 0 && (
                    <p className="text-xs text-blue-600">
                      {device.offlineContentCount} offline items
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {devices.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <Smartphone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No devices registered</h3>
              <p className="text-muted-foreground">
                Mobile devices will appear here once users start using the mobile app.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const PerformanceTab = () => (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Load Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.performance.averageLoadTime || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">Screen loading performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.performance.averageResponseTime || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">API response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.performance.errorRate.toFixed(2) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Application errors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crash Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.performance.crashRate.toFixed(2) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">App crash frequency</p>
          </CardContent>
        </Card>
      </div>

      {/* Screen Views */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Screens</CardTitle>
          <CardDescription>Most viewed screens and average time spent</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics?.usage.screenViews && (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={analytics.usage.screenViews.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="screen" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="views" fill="#8884d8" name="Views" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Platform Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance</CardTitle>
          <CardDescription>Performance metrics by platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics?.platforms && Object.entries(analytics.platforms).map(([platform, data]) => (
              <div key={platform} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{platform.toUpperCase()}</h4>
                  <Badge variant="outline">{data.devices} devices</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Events:</span>
                    <span className="font-medium">{data.events}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Crashes:</span>
                    <span className={`font-medium ${data.crashes > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {data.crashes}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Session:</span>
                    <span className="font-medium">{formatDuration(data.averageSessionDuration)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const NotificationsTab = () => (
    <div className="space-y-6">
      {/* Notification Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notificationAnalytics?.totalSent || 0}</div>
            <p className="text-xs text-muted-foreground">Notifications sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notificationAnalytics?.totalDelivered || 0}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notificationAnalytics?.deliveryRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Success rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notificationAnalytics?.categoryBreakdown ? Object.keys(notificationAnalytics.categoryBreakdown).length : 0}
            </div>
            <p className="text-xs text-muted-foreground">Active categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Notification Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Trends</CardTitle>
          <CardDescription>Daily notification delivery trends</CardDescription>
        </CardHeader>
        <CardContent>
          {notificationAnalytics?.trends && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={notificationAnalytics.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sent" stroke="#8884d8" name="Sent" />
                <Line type="monotone" dataKey="delivered" stroke="#82ca9d" name="Delivered" />
                <Line type="monotone" dataKey="failed" stroke="#ff7300" name="Failed" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>Notifications by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notificationAnalytics?.categoryBreakdown && Object.entries(notificationAnalytics.categoryBreakdown).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="font-medium capitalize">{category}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Distribution</CardTitle>
            <CardDescription>Notifications by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notificationAnalytics?.platformBreakdown && Object.entries(notificationAnalytics.platformBreakdown).map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getPlatformIcon(platform)}</span>
                    <span className="font-medium">{platform.toUpperCase()}</span>
                  </div>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mobile Dashboard</h1>
        <p className="text-muted-foreground">Monitor mobile app usage, performance, and engagement</p>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <DevicesTab />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceTab />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MobileDashboard;