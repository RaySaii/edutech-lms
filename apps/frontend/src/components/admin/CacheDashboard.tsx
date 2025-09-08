'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  Trash2,
  RefreshCw,
  TrendingUp,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api/base';

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage?: number;
  timestamp: string;
}

interface CacheHealth {
  healthy: boolean;
  status: 'UP' | 'DOWN';
  stats: CacheStats;
  details: {
    canWrite: boolean;
    canRead: boolean;
    canDelete: boolean;
  };
  lastChecked: string;
}

const CacheDashboard: React.FC = () => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [health, setHealth] = useState<CacheHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedPattern, setSelectedPattern] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState('');
  const [warmingType, setWarmingType] = useState<string>('popular-courses');
  const [operationResult, setOperationResult] = useState<string>('');

  useEffect(() => {
    fetchCacheData();
    const interval = setInterval(fetchCacheData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchCacheData = async () => {
    try {
      setIsLoading(true);
      const [statsResponse, healthResponse] = await Promise.all([
        api.get('/cache/stats'),
        api.get('/cache/health'),
      ]);

      setStats((statsResponse as any).data.data);
      setHealth((healthResponse as any).data.data);
    } catch (error) {
      console.error('Failed to fetch cache data:', error);
      setOperationResult('Failed to fetch cache data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!selectedKey) return;
    
    try {
      const url = selectedNamespace 
        ? `/cache/key/${encodeURIComponent(selectedKey)}?namespace=${selectedNamespace}`
        : `/cache/key/${encodeURIComponent(selectedKey)}`;
      const response = await api.delete(url);
      
      setOperationResult((response as any).data.message);
      setSelectedKey('');
      fetchCacheData();
    } catch (error) {
      setOperationResult('Failed to delete cache key');
      console.error(error);
    }
  };

  const handleDeletePattern = async () => {
    if (!selectedPattern) return;
    
    try {
      const url = selectedNamespace 
        ? `/cache/pattern/${encodeURIComponent(selectedPattern)}?namespace=${selectedNamespace}`
        : `/cache/pattern/${encodeURIComponent(selectedPattern)}`;
      const response = await api.delete(url);
      
      setOperationResult((response as any).data.message);
      setSelectedPattern('');
      fetchCacheData();
    } catch (error) {
      setOperationResult('Failed to delete cache pattern');
      console.error(error);
    }
  };

  const handleClearNamespace = async () => {
    if (!selectedNamespace) return;
    
    if (!confirm(`Are you sure you want to clear all cache in namespace "${selectedNamespace}"?`)) {
      return;
    }
    
    try {
      const response = await api.delete(`/cache/namespace/${encodeURIComponent(selectedNamespace)}`);
      setOperationResult((response as any).data.message);
      setSelectedNamespace('');
      fetchCacheData();
    } catch (error) {
      setOperationResult('Failed to clear namespace cache');
      console.error(error);
    }
  };

  const handleWarmCache = async () => {
    try {
      const response = await api.post('/cache/warm', { type: warmingType });
      setOperationResult((response as any).data.message);
      fetchCacheData();
    } catch (error) {
      setOperationResult('Failed to warm cache');
      console.error(error);
    }
  };

  const handleRefreshKey = async () => {
    if (!selectedKey) return;
    
    try {
      const url = selectedNamespace 
        ? `/cache/refresh/${encodeURIComponent(selectedKey)}?namespace=${selectedNamespace}`
        : `/cache/refresh/${encodeURIComponent(selectedKey)}`;
      const response = await api.post(url, {});
      
      setOperationResult((response as any).data.message);
      fetchCacheData();
    } catch (error) {
      setOperationResult('Failed to refresh cache key');
      console.error(error);
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-8 bg-gray-300 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Cache Management</h1>
        <div className="flex items-center gap-2">
          {health && (
            <Badge 
              variant={health.healthy ? "default" : "destructive"}
              className="flex items-center gap-1"
            >
              {health.healthy ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {health.status}
            </Badge>
          )}
          <Button onClick={fetchCacheData} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.hitRate.toFixed(1)}%</div>
              <Progress value={stats.hitRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.totalKeys)}</div>
              <p className="text-xs text-muted-foreground">
                {formatNumber(stats.hits)} hits, {formatNumber(stats.misses)} misses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Operations</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.sets + stats.deletes)}</div>
              <p className="text-xs text-muted-foreground">
                {formatNumber(stats.sets)} sets, {formatNumber(stats.deletes)} deletes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {new Date(stats.timestamp).toLocaleTimeString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(stats.timestamp).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Operation Result */}
      {operationResult && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">{operationResult}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2" 
              onClick={() => setOperationResult('')}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Management Operations */}
      <Tabs defaultValue="operations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="operations">Cache Operations</TabsTrigger>
          <TabsTrigger value="warming">Cache Warming</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="operations">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delete Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Cache Invalidation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Namespace (optional)</label>
                  <Input
                    placeholder="e.g., courses, users"
                    value={selectedNamespace}
                    onChange={(e) => setSelectedNamespace(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Delete by Key</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Cache key to delete"
                      value={selectedKey}
                      onChange={(e) => setSelectedKey(e.target.value)}
                    />
                    <Button onClick={handleDeleteKey} disabled={!selectedKey}>
                      Delete
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Delete by Pattern</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Pattern (e.g., user:*, course:list:*)"
                      value={selectedPattern}
                      onChange={(e) => setSelectedPattern(e.target.value)}
                    />
                    <Button onClick={handleDeletePattern} disabled={!selectedPattern}>
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    variant="destructive" 
                    onClick={handleClearNamespace}
                    disabled={!selectedNamespace}
                  >
                    Clear Namespace
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will delete all cache entries in the selected namespace
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Refresh Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Cache Refresh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Refresh Key</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Key to refresh"
                      value={selectedKey}
                      onChange={(e) => setSelectedKey(e.target.value)}
                    />
                    <Button onClick={handleRefreshKey} disabled={!selectedKey}>
                      Refresh
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will delete the key and force it to be repopulated on next access
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedPattern('courses:*')}
                    >
                      Clear Courses
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedPattern('users:*')}
                    >
                      Clear Users
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedPattern('dashboard:*')}
                    >
                      Clear Dashboard
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedPattern('search:*')}
                    >
                      Clear Search
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="warming">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Cache Warming
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Warming Type</label>
                <Select value={warmingType} onValueChange={setWarmingType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular-courses">Popular Courses</SelectItem>
                    <SelectItem value="featured-courses">Featured Courses</SelectItem>
                    <SelectItem value="categories">Categories</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleWarmCache} className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Start Warming
              </Button>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <h4 className="font-medium text-blue-900 mb-1">Cache Warming Info</h4>
                <p className="text-sm text-blue-700">
                  Cache warming preloads frequently accessed data to improve performance. 
                  This process runs in the background and may take a few moments to complete.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cache Health</CardTitle>
              </CardHeader>
              <CardContent>
                {health ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Overall Status</span>
                      <Badge variant={health.healthy ? "default" : "destructive"}>
                        {health.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Can Read</span>
                        <Badge variant={health.details.canRead ? "default" : "destructive"}>
                          {health.details.canRead ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Can Write</span>
                        <Badge variant={health.details.canWrite ? "default" : "destructive"}>
                          {health.details.canWrite ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Can Delete</span>
                        <Badge variant={health.details.canDelete ? "default" : "destructive"}>
                          {health.details.canDelete ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Last checked: {new Date(health.lastChecked).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <p>Loading health status...</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {stats && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">Hit Rate</span>
                        <span className="text-sm font-medium">{stats.hitRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={stats.hitRate} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Hits</div>
                        <div className="font-medium">{formatNumber(stats.hits)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Misses</div>
                        <div className="font-medium">{formatNumber(stats.misses)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Sets</div>
                        <div className="font-medium">{formatNumber(stats.sets)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Deletes</div>
                        <div className="font-medium">{formatNumber(stats.deletes)}</div>
                      </div>
                    </div>

                    {stats.memoryUsage && (
                      <div>
                        <div className="text-sm text-muted-foreground">Memory Usage</div>
                        <div className="font-medium">{formatBytes(stats.memoryUsage)}</div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CacheDashboard;