'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Wifi, WifiOff, Monitor, Smartphone, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface VideoQualityManagerProps {
  videoId: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  availableQualities: {
    quality: string;
    resolution: string;
    bitrate: number;
    url: string;
  }[];
  onQualityChange: (quality: string) => void;
}

interface NetworkInfo {
  downlink: number;
  effectiveType: string;
  rtt: number;
  saveData: boolean;
}

interface DeviceInfo {
  type: 'desktop' | 'tablet' | 'mobile';
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
}

export function VideoQualityManager({
  videoId,
  videoRef,
  availableQualities,
  onQualityChange
}: VideoQualityManagerProps) {
  const [currentQuality, setCurrentQuality] = useState<string>('auto');
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [adaptiveMode, setAdaptiveMode] = useState(true);
  const [bufferHealth, setBufferHealth] = useState(100);
  const [qualityHistory, setQualityHistory] = useState<Array<{
    timestamp: number;
    quality: string;
    reason: string;
    bufferHealth: number;
    networkSpeed: number;
  }>>([]);
  const [showQualityStats, setShowQualityStats] = useState(false);
  
  const lastQualityChange = useRef(0);
  const bufferCheckInterval = useRef<NodeJS.Timeout>();
  const networkMonitorInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    detectDeviceInfo();
    startNetworkMonitoring();
    startBufferMonitoring();
    
    // Auto-select initial quality based on device and network
    selectOptimalQuality();

    return () => {
      if (bufferCheckInterval.current) {
        clearInterval(bufferCheckInterval.current);
      }
      if (networkMonitorInterval.current) {
        clearInterval(networkMonitorInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (adaptiveMode && networkInfo && deviceInfo) {
      const now = Date.now();
      // Prevent too frequent quality changes (minimum 10 seconds)
      if (now - lastQualityChange.current > 10000) {
        evaluateAndAdjustQuality();
      }
    }
  }, [networkInfo, bufferHealth, adaptiveMode]);

  const detectDeviceInfo = () => {
    const width = window.screen.width;
    const height = window.screen.height;
    const pixelRatio = window.devicePixelRatio || 1;
    
    let deviceType: 'desktop' | 'tablet' | 'mobile' = 'desktop';
    
    if (width <= 768) {
      deviceType = 'mobile';
    } else if (width <= 1024) {
      deviceType = 'tablet';
    }

    setDeviceInfo({
      type: deviceType,
      screenWidth: width,
      screenHeight: height,
      pixelRatio
    });
  };

  const startNetworkMonitoring = () => {
    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setNetworkInfo({
          downlink: connection.downlink || 1,
          effectiveType: connection.effectiveType || '4g',
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false
        });
      } else {
        // Fallback: estimate network speed based on download performance
        measureNetworkSpeed();
      }
    };

    updateNetworkInfo();
    networkMonitorInterval.current = setInterval(updateNetworkInfo, 30000); // Check every 30 seconds
  };

  const measureNetworkSpeed = async () => {
    try {
      const startTime = Date.now();
      const response = await fetch(`/api/videos/${videoId}/speed-test`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        const contentLength = parseInt(response.headers.get('content-length') || '0');
        const speed = (contentLength * 8) / duration / 1000000; // Mbps
        
        setNetworkInfo(prev => prev ? {
          ...prev,
          downlink: speed
        } : {
          downlink: speed,
          effectiveType: speed > 10 ? '4g' : speed > 1.5 ? '3g' : '2g',
          rtt: 100,
          saveData: false
        });
      }
    } catch (error) {
      console.error('Failed to measure network speed:', error);
    }
  };

  const startBufferMonitoring = () => {
    bufferCheckInterval.current = setInterval(() => {
      if (videoRef.current) {
        const video = videoRef.current;
        const buffered = video.buffered;
        const currentTime = video.currentTime;
        
        if (buffered.length > 0) {
          let bufferEnd = 0;
          for (let i = 0; i < buffered.length; i++) {
            if (buffered.start(i) <= currentTime && buffered.end(i) > currentTime) {
              bufferEnd = buffered.end(i);
              break;
            }
          }
          
          const bufferSeconds = bufferEnd - currentTime;
          const healthPercentage = Math.min(100, (bufferSeconds / 30) * 100); // 30 seconds = 100% health
          setBufferHealth(healthPercentage);
        }
      }
    }, 1000);
  };

  const selectOptimalQuality = () => {
    if (!networkInfo || !deviceInfo) return;

    const sortedQualities = [...availableQualities].sort((a, b) => b.bitrate - a.bitrate);
    let optimalQuality = sortedQualities[sortedQualities.length - 1]; // Start with lowest quality

    // Consider network speed
    const networkSpeedMbps = networkInfo.downlink;
    const recommendedBitrate = networkSpeedMbps * 1000 * 0.7; // Use 70% of available bandwidth

    // Consider device capabilities
    const maxResolution = getMaxResolutionForDevice(deviceInfo);

    // Find best quality that fits network and device constraints
    for (const quality of sortedQualities) {
      const qualityBitrate = quality.bitrate / 1000; // Convert to kbps
      const [width, height] = quality.resolution.split('x').map(Number);
      
      if (qualityBitrate <= recommendedBitrate && 
          height <= maxResolution.height && 
          width <= maxResolution.width) {
        optimalQuality = quality;
        break;
      }
    }

    if (currentQuality !== optimalQuality.quality) {
      changeQuality(optimalQuality.quality, 'Initial optimization');
    }
  };

  const evaluateAndAdjustQuality = () => {
    if (!networkInfo || !deviceInfo) return;

    const currentQualityObj = availableQualities.find(q => q.quality === currentQuality);
    if (!currentQualityObj) return;

    const networkSpeedMbps = networkInfo.downlink;
    const currentBitrateMbps = currentQualityObj.bitrate / 1000000;

    // Decision factors
    const factors = {
      networkUtilization: currentBitrateMbps / networkSpeedMbps,
      bufferHealth: bufferHealth,
      saveData: networkInfo.saveData,
      effectiveType: networkInfo.effectiveType
    };

    let suggestedChange: { quality: string; reason: string } | null = null;

    // Buffer health is critical
    if (factors.bufferHealth < 20) {
      const lowerQuality = getLowerQuality(currentQuality);
      if (lowerQuality) {
        suggestedChange = {
          quality: lowerQuality.quality,
          reason: 'Low buffer health'
        };
      }
    }
    // Network utilization is too high
    else if (factors.networkUtilization > 0.8) {
      const lowerQuality = getLowerQuality(currentQuality);
      if (lowerQuality) {
        suggestedChange = {
          quality: lowerQuality.quality,
          reason: 'High network utilization'
        };
      }
    }
    // Conditions are good, try higher quality
    else if (factors.bufferHealth > 80 && factors.networkUtilization < 0.5 && !factors.saveData) {
      const higherQuality = getHigherQuality(currentQuality);
      if (higherQuality) {
        suggestedChange = {
          quality: higherQuality.quality,
          reason: 'Optimal conditions'
        };
      }
    }

    if (suggestedChange) {
      changeQuality(suggestedChange.quality, suggestedChange.reason);
    }
  };

  const changeQuality = (newQuality: string, reason: string) => {
    setCurrentQuality(newQuality);
    onQualityChange(newQuality);
    lastQualityChange.current = Date.now();

    // Add to history
    setQualityHistory(prev => [...prev, {
      timestamp: Date.now(),
      quality: newQuality,
      reason,
      bufferHealth,
      networkSpeed: networkInfo?.downlink || 0
    }].slice(-20)); // Keep last 20 changes
  };

  const getMaxResolutionForDevice = (device: DeviceInfo) => {
    switch (device.type) {
      case 'mobile':
        return { width: 720, height: 480 }; // 480p max for mobile
      case 'tablet':
        return { width: 1280, height: 720 }; // 720p max for tablet
      case 'desktop':
      default:
        return { width: 1920, height: 1080 }; // 1080p max for desktop
    }
  };

  const getLowerQuality = (currentQuality: string) => {
    const currentIndex = availableQualities.findIndex(q => q.quality === currentQuality);
    if (currentIndex < availableQualities.length - 1) {
      return availableQualities[currentIndex + 1];
    }
    return null;
  };

  const getHigherQuality = (currentQuality: string) => {
    const currentIndex = availableQualities.findIndex(q => q.quality === currentQuality);
    if (currentIndex > 0) {
      return availableQualities[currentIndex - 1];
    }
    return null;
  };

  const getNetworkIcon = () => {
    if (!networkInfo) return <WifiOff className="h-4 w-4" />;
    
    switch (networkInfo.effectiveType) {
      case '4g':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case '3g':
        return <Wifi className="h-4 w-4 text-yellow-600" />;
      case '2g':
        return <Wifi className="h-4 w-4 text-red-600" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-600" />;
    }
  };

  const getDeviceIcon = () => {
    if (!deviceInfo) return <Monitor className="h-4 w-4" />;
    
    switch (deviceInfo.type) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'desktop':
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getBufferHealthColor = () => {
    if (bufferHealth > 70) return 'text-green-600';
    if (bufferHealth > 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowQualityStats(!showQualityStats)}
        className="flex items-center gap-2 text-white hover:bg-white/20"
      >
        <Settings className="h-4 w-4" />
        <span className="text-xs">
          {currentQuality === 'auto' ? 'Auto' : currentQuality}
        </span>
        {adaptiveMode && (
          <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
            Adaptive
          </Badge>
        )}
      </Button>

      {showQualityStats && (
        <Card className="absolute bottom-full right-0 mb-2 w-80 z-50">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Video Quality</h3>
                <Button
                  size="sm"
                  variant={adaptiveMode ? "default" : "outline"}
                  onClick={() => setAdaptiveMode(!adaptiveMode)}
                  className="text-xs"
                >
                  {adaptiveMode ? 'Auto' : 'Manual'}
                </Button>
              </div>

              {/* Current Status */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  {getNetworkIcon()}
                  <div>
                    <div className="font-medium">Network</div>
                    <div className="text-gray-600">
                      {networkInfo?.downlink.toFixed(1)}Mbps
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getDeviceIcon()}
                  <div>
                    <div className="font-medium">Device</div>
                    <div className="text-gray-600 capitalize">
                      {deviceInfo?.type || 'Unknown'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${bufferHealth > 70 ? 'bg-green-500' : bufferHealth > 30 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <div>
                    <div className="font-medium">Buffer</div>
                    <div className={`${getBufferHealthColor()}`}>
                      {bufferHealth.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Quality Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Quality Settings</label>
                <div className="space-y-2">
                  <Button
                    variant={currentQuality === 'auto' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setCurrentQuality('auto');
                      setAdaptiveMode(true);
                      selectOptimalQuality();
                    }}
                    className="w-full justify-start text-xs"
                  >
                    Auto (Recommended)
                  </Button>
                  
                  {availableQualities.map((quality) => (
                    <Button
                      key={quality.quality}
                      variant={currentQuality === quality.quality ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setCurrentQuality(quality.quality);
                        setAdaptiveMode(false);
                        onQualityChange(quality.quality);
                      }}
                      className="w-full justify-between text-xs"
                    >
                      <span>{quality.quality}</span>
                      <span className="text-gray-500">
                        {quality.resolution} • {(quality.bitrate / 1000).toFixed(0)}kbps
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Recent Quality Changes */}
              {qualityHistory.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Recent Changes</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {qualityHistory.slice(-5).reverse().map((change, index) => (
                      <div key={change.timestamp} className="text-xs p-2 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{change.quality}</span>
                          <span className="text-gray-500">
                            {new Date(change.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-gray-600">{change.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance Tips */}
              {networkInfo && (
                <div className="text-xs text-gray-600">
                  <div className="font-medium mb-1">Tips:</div>
                  {networkInfo.saveData && (
                    <div>• Data saver mode detected - using lower quality</div>
                  )}
                  {networkInfo.downlink < 1 && (
                    <div>• Slow connection - consider using WiFi for better quality</div>
                  )}
                  {bufferHealth < 30 && (
                    <div>• Low buffer - quality automatically reduced for smooth playback</div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}