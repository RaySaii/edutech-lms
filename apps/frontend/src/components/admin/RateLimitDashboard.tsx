'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap,
  RefreshCw,
  Settings,
  TrendingUp,
  Users,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api/base';

interface RateLimitStats {
  totalKeys: number;
  activeWindows: number;
  totalRequests: number;
  timestamp: string;
}

interface RateLimitHealth {
  healthy: boolean;
  status: 'UP' | 'DOWN';
  lastChecked: string;
  testResult: {
    allowed: boolean;
    rateLimitInfo: {
      totalRequests: number;
      remainingRequests: number;
      resetTime: number;
      windowMs: number;
      maxRequests: number;
    };
  };
  details: {
    cacheConnected: boolean;
    rateLimitingEnabled: boolean;
  };
}

interface RateLimitPreset {
  description: string;
  windowMs: number;
  maxRequests: number;
  keyGenerator: string;
  roleBasedLimits?: {
    [role: string]: {
      windowMs: number;
      maxRequests: number;
    };
  };
}

interface RateLimitPresets {
  [key: string]: RateLimitPreset;
}

interface TestResult {
  requestNumber: number;
  allowed: boolean;
  remainingRequests: number;
  totalRequests: number;
  resetTime: number;
}

const RateLimitDashboard: React.FC = () => {
  const [stats, setStats] = useState<RateLimitStats | null>(null);
  const [health, setHealth] = useState<RateLimitHealth | null>(null);
  const [presets, setPresets] = useState<RateLimitPresets | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [operationResult, setOperationResult] = useState<string>('');
  
  // Reset form state
  const [resetKey, setResetKey] = useState('');
  
  // Rate limit info form state
  const [infoKey, setInfoKey] = useState('');
  const [windowMs, setWindowMs] = useState(60000);
  const [rateLimitInfo, setRateLimitInfo] = useState<any>(null);
  
  // Test form state
  const [testKey, setTestKey] = useState('test-key');
  const [testWindowMs, setTestWindowMs] = useState(60000);
  const [testMaxRequests, setTestMaxRequests] = useState(10);
  const [testRequestCount, setTestRequestCount] = useState(15);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statsResponse, healthResponse, presetsResponse] = await Promise.all([
        api.get('/rate-limiting/stats'),
        api.get('/rate-limiting/health'),
        api.get('/rate-limiting/presets'),
      ]);

      setStats((statsResponse as any).data.data);
      setHealth((healthResponse as any).data.data);
      setPresets((presetsResponse as any).data.data.presets);
    } catch (error) {
      console.error('Failed to fetch rate limiting data:', error);
      setOperationResult('Failed to fetch rate limiting data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRateLimit = async () => {
    if (!resetKey) return;
    
    try {
      const response = await api.delete(`/rate-limiting/reset/${encodeURIComponent(resetKey)}`);
      setOperationResult((response as any).data.message);
      setResetKey('');
      fetchData();
    } catch (error) {
      setOperationResult('Failed to reset rate limit');
      console.error(error);
    }
  };

  const handleGetRateLimitInfo = async () => {
    if (!infoKey) return;
    
    try {
      const url = `/rate-limiting/info/${encodeURIComponent(infoKey)}?windowMs=${windowMs}`;
      const response = await api.get(url);
      
      if ((response as any).data.success) {
        setRateLimitInfo((response as any).data.data);
        setOperationResult(`Rate limit info retrieved for key: ${infoKey}`);
      } else {
        setRateLimitInfo(null);
        setOperationResult((response as any).data.message);
      }
    } catch (error) {
      setOperationResult('Failed to get rate limit info');
      console.error(error);
    }
  };

  const handleTestRateLimit = async () => {
    if (!testKey) return;
    
    try {
      setIsTestRunning(true);
      setTestResults([]);
      
      const response = await api.post('/rate-limiting/test', {
        key: testKey,
        windowMs: testWindowMs,
        maxRequests: testMaxRequests,
        testRequests: testRequestCount,
      });
      
      if ((response as any).data.success) {
        setTestResults((response as any).data.data.results);
        setOperationResult(`Rate limiting test completed: ${(response as any).data.data.summary.allowedRequests}/${(response as any).data.data.summary.totalRequests} requests allowed`);
      } else {
        setOperationResult((response as any).data.message);
      }
    } catch (error) {
      setOperationResult('Failed to run rate limiting test');
      console.error(error);
    } finally {
      setIsTestRunning(false);
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

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Rate Limiting Management</h1>
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
          <Button onClick={fetchData} variant="outline" className="flex items-center gap-2">
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
              <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.totalKeys)}</div>
              <p className="text-xs text-muted-foreground">
                Rate limiting keys tracked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Windows</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.activeWindows)}</div>
              <p className="text-xs text-muted-foreground">
                Currently active rate limit windows
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.totalRequests)}</div>
              <p className="text-xs text-muted-foreground">
                Requests processed through rate limiting
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="operations">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reset Rate Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Reset Rate Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Reset Key</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Rate limit key to reset"
                      value={resetKey}
                      onChange={(e) => setResetKey(e.target.value)}
                    />
                    <Button onClick={handleResetRateLimit} disabled={!resetKey}>
                      Reset
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will reset all rate limiting windows for the specified key
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Quick Reset Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setResetKey('ip:*')}
                    >
                      Reset IP Limits
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setResetKey('user:*')}
                    >
                      Reset User Limits
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setResetKey('auth:*')}
                    >
                      Reset Auth Limits
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setResetKey('api:*')}
                    >
                      Reset API Limits
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rate Limit Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Rate Limit Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Lookup Key</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Rate limit key to lookup"
                      value={infoKey}
                      onChange={(e) => setInfoKey(e.target.value)}
                    />
                    <Button onClick={handleGetRateLimitInfo} disabled={!infoKey}>
                      Lookup
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Window (ms)</label>
                  <Input
                    type="number"
                    value={windowMs}
                    onChange={(e) => setWindowMs(Number(e.target.value))}
                  />
                </div>

                {rateLimitInfo && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="font-medium mb-2">Rate Limit Information</h4>
                    <div className="space-y-1 text-sm">
                      <div>Key: {rateLimitInfo.key}</div>
                      <div>Total Requests: {rateLimitInfo.totalRequests}</div>
                      <div>Reset Time: {new Date(rateLimitInfo.resetTime).toLocaleString()}</div>
                      <div>Window: {formatDuration(rateLimitInfo.windowMs)}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="testing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Rate Limiting Test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Test Key</label>
                  <Input
                    value={testKey}
                    onChange={(e) => setTestKey(e.target.value)}
                    placeholder="test-key"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Window (ms)</label>
                  <Input
                    type="number"
                    value={testWindowMs}
                    onChange={(e) => setTestWindowMs(Number(e.target.value))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Max Requests</label>
                  <Input
                    type="number"
                    value={testMaxRequests}
                    onChange={(e) => setTestMaxRequests(Number(e.target.value))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Test Requests</label>
                  <Input
                    type="number"
                    value={testRequestCount}
                    onChange={(e) => setTestRequestCount(Number(e.target.value))}
                  />
                </div>
              </div>

              <Button 
                onClick={handleTestRateLimit} 
                disabled={isTestRunning || !testKey}
                className="flex items-center gap-2"
              >
                {isTestRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Run Test
                  </>
                )}
              </Button>

              {testResults.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Test Results</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {testResults.map((result, index) => (
                      <div 
                        key={index} 
                        className={`flex justify-between items-center p-2 rounded text-sm ${
                          result.allowed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                        }`}
                      >
                        <span>Request #{result.requestNumber}</span>
                        <div className="flex items-center gap-4">
                          <Badge variant={result.allowed ? "default" : "destructive"}>
                            {result.allowed ? 'Allowed' : 'Blocked'}
                          </Badge>
                          <span>{result.remainingRequests} remaining</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presets">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {presets && Object.entries(presets).map(([key, preset]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-lg">{key.replace(/_/g, ' ')}</CardTitle>
                  <p className="text-sm text-muted-foreground">{preset.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Window:</span>
                      <span>{formatDuration(preset.windowMs)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Requests:</span>
                      <span>{preset.maxRequests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Key Generator:</span>
                      <span>{preset.keyGenerator}</span>
                    </div>
                    
                    {preset.roleBasedLimits && (
                      <div className="mt-4">
                        <h5 className="font-medium mb-2">Role-Based Limits</h5>
                        <div className="space-y-1">
                          {Object.entries(preset.roleBasedLimits).map(([role, limits]) => (
                            <div key={role} className="flex justify-between text-xs">
                              <span>{role}:</span>
                              <span>{limits.maxRequests}/{formatDuration(limits.windowMs)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="monitoring">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
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
                        <span className="text-sm">Cache Connected</span>
                        <Badge variant={health.details.cacheConnected ? "default" : "destructive"}>
                          {health.details.cacheConnected ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Rate Limiting Enabled</span>
                        <Badge variant={health.details.rateLimitingEnabled ? "default" : "destructive"}>
                          {health.details.rateLimitingEnabled ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>

                    {health.testResult && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <h4 className="font-medium mb-2">Test Result</h4>
                        <div className="text-sm space-y-1">
                          <div>Test Allowed: {health.testResult.allowed ? 'Yes' : 'No'}</div>
                          <div>Remaining: {health.testResult.rateLimitInfo.remainingRequests}</div>
                          <div>Window: {formatDuration(health.testResult.rateLimitInfo.windowMs)}</div>
                        </div>
                      </div>
                    )}

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
                <CardTitle>Performance Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">Rate Limiting Overhead</span>
                      <span className="text-sm font-medium">Low</span>
                    </div>
                    <Progress value={15} />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimal impact on request processing time
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">Memory Usage</span>
                      <span className="text-sm font-medium">Moderate</span>
                    </div>
                    <Progress value={35} />
                    <p className="text-xs text-muted-foreground mt-1">
                      Rate limit keys cached in Redis and memory
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">Cache Hit Rate</span>
                      <span className="text-sm font-medium">High</span>
                    </div>
                    <Progress value={92} />
                    <p className="text-xs text-muted-foreground mt-1">
                      Efficient caching of rate limit counters
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RateLimitDashboard;