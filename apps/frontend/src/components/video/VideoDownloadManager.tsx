'use client';

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FileDown, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  Settings,
  HardDrive,
  Wifi,
  WifiOff,
  PlayCircle,
  FileVideo,
  Monitor,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

interface VideoDownload {
  id: string;
  video: {
    id: string;
    title: string;
    thumbnailUrl: string;
    duration: number;
  };
  quality: string;
  format: string;
  fileSize: number;
  downloadCount: number;
  maxDownloads: number;
  createdAt: string;
  expiresAt: string;
  status: 'preparing' | 'ready' | 'expired' | 'revoked';
  downloadUrl?: string;
}

interface OfflinePackage {
  id: string;
  courseId?: string;
  playlistId?: string;
  videos: Array<{
    videoId: string;
    title: string;
    downloadUrl: string;
  }>;
  metadata: {
    totalSize: number;
    videoCount: number;
    includesSubtitles: boolean;
    quality: string;
  };
  expiresAt: string;
  downloadCount: number;
  status: 'preparing' | 'ready' | 'expired';
  createdAt: string;
}

interface VideoDownloadManagerProps {
  userId?: string;
  videoId?: string;
  courseId?: string;
  playlistId?: string;
  selectedVideos?: string[];
  onDownloadStart?: (downloadId: string) => void;
  onDownloadComplete?: (downloadId: string) => void;
}

export function VideoDownloadManager({
  userId,
  videoId,
  courseId,
  playlistId,
  selectedVideos = [],
  onDownloadStart,
  onDownloadComplete
}: VideoDownloadManagerProps) {
  const [downloads, setDownloads] = useState<VideoDownload[]>([]);
  const [packages, setPackages] = useState<OfflinePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('downloads');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Download creation state
  const [showCreateDownload, setShowCreateDownload] = useState(false);
  const [downloadSettings, setDownloadSettings] = useState({
    quality: '720p',
    format: 'mp4',
    includeSubtitles: true,
    validityDays: 7,
    maxDownloads: 3,
  });

  // Package creation state
  const [showCreatePackage, setShowCreatePackage] = useState(false);
  const [packageSettings, setPackageSettings] = useState({
    quality: '720p',
    includeSubtitles: true,
    validityDays: 7,
    selectedVideos: selectedVideos,
  });

  const [estimatedSize, setEstimatedSize] = useState<{
    totalSize: number;
    videoCount: number;
    estimatedDownloadTime: number;
  } | null>(null);

  useEffect(() => {
    loadDownloads();
    loadPackages();
    
    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (packageSettings.selectedVideos.length > 0) {
      estimatePackageSize();
    }
  }, [packageSettings.selectedVideos, packageSettings.quality]);

  const loadDownloads = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/videos/downloads', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDownloads(data.downloads || []);
      }
    } catch (error) {
      console.error('Failed to load downloads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPackages = async () => {
    try {
      const response = await fetch('/api/videos/offline-packages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPackages(data || []);
      }
    } catch (error) {
      console.error('Failed to load packages:', error);
    }
  };

  const estimatePackageSize = async () => {
    if (packageSettings.selectedVideos.length === 0) return;

    try {
      const response = await fetch('/api/videos/estimate-package-size', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          videoIds: packageSettings.selectedVideos,
          quality: packageSettings.quality,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEstimatedSize(data);
      }
    } catch (error) {
      console.error('Failed to estimate package size:', error);
    }
  };

  const createVideoDownload = async () => {
    if (!videoId) return;

    try {
      const response = await fetch(`/api/videos/${videoId}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(downloadSettings),
      });

      if (response.ok) {
        const download = await response.json();
        setDownloads(prev => [download, ...prev]);
        setShowCreateDownload(false);
        onDownloadStart?.(download.id);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create download');
      }
    } catch (error) {
      console.error('Failed to create download:', error);
      alert('Failed to create download');
    }
  };

  const createOfflinePackage = async () => {
    try {
      const response = await fetch('/api/videos/offline-packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          videoIds: packageSettings.selectedVideos,
          courseId,
          playlistId,
          quality: packageSettings.quality,
          includeSubtitles: packageSettings.includeSubtitles,
          validityDays: packageSettings.validityDays,
        }),
      });

      if (response.ok) {
        const package_ = await response.json();
        setPackages(prev => [package_, ...prev]);
        setShowCreatePackage(false);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create offline package');
      }
    } catch (error) {
      console.error('Failed to create package:', error);
      alert('Failed to create package');
    }
  };

  const downloadFile = async (download: VideoDownload) => {
    if (!download.downloadUrl) return;

    try {
      const link = document.createElement('a');
      link.href = download.downloadUrl;
      link.download = `${download.video.title}.${download.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onDownloadComplete?.(download.id);
      
      // Update download count locally
      setDownloads(prev => prev.map(d => 
        d.id === download.id 
          ? { ...d, downloadCount: d.downloadCount + 1 }
          : d
      ));
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed');
    }
  };

  const revokeDownload = async (downloadId: string) => {
    try {
      const response = await fetch(`/api/videos/downloads/${downloadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setDownloads(prev => prev.filter(d => d.id !== downloadId));
      }
    } catch (error) {
      console.error('Failed to revoke download:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffInHours = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 0) return 'Expired';
    if (diffInHours < 24) return `${diffInHours}h remaining`;
    
    const days = Math.floor(diffInHours / 24);
    return `${days}d remaining`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'preparing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'revoked':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case '1080p':
        return <Monitor className="h-4 w-4" />;
      case '720p':
        return <Monitor className="h-4 w-4" />;
      case '480p':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <FileVideo className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Online Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Download className="h-6 w-6" />
          Downloads & Offline Content
        </h2>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isOnline 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
          
          {videoId && (
            <Button
              onClick={() => setShowCreateDownload(true)}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Video
            </Button>
          )}
          
          {selectedVideos.length > 0 && (
            <Button
              onClick={() => setShowCreatePackage(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Create Package
            </Button>
          )}
        </div>
      </div>

      {/* Storage Usage */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              <span className="font-medium">Storage Usage</span>
            </div>
            <span className="text-sm text-gray-600">
              2.3 GB used of 10 GB available
            </span>
          </div>
          <Progress value={23} className="h-2" />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="downloads">
            Single Downloads ({downloads.length})
          </TabsTrigger>
          <TabsTrigger value="packages">
            Offline Packages ({packages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="downloads" className="space-y-4">
          {downloads.length === 0 ? (
            <div className="text-center py-12">
              <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No downloads yet</h3>
              <p className="text-gray-600 mb-4">
                Create downloads to watch videos offline
              </p>
              {videoId && (
                <Button
                  onClick={() => setShowCreateDownload(true)}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Current Video
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {downloads.map(download => (
                <Card key={download.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                        {download.video.thumbnailUrl ? (
                          <img 
                            src={download.video.thumbnailUrl} 
                            alt={download.video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                            <PlayCircle className="h-6 w-6 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{download.video.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            {getQualityIcon(download.quality)}
                            <span>{download.quality}</span>
                          </div>
                          <span>{download.format.toUpperCase()}</span>
                          <span>{formatFileSize(download.fileSize)}</span>
                          <span>{download.downloadCount}/{download.maxDownloads} downloads</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {formatTimeRemaining(download.expiresAt)}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(download.status)}
                            <span className="text-xs capitalize">{download.status}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {download.status === 'ready' && (
                          <Button
                            onClick={() => downloadFile(download)}
                            disabled={!isOnline}
                            className="flex items-center gap-2"
                          >
                            <FileDown className="h-4 w-4" />
                            Download
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeDownload(download.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="packages" className="space-y-4">
          {packages.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No offline packages</h3>
              <p className="text-gray-600 mb-4">
                Create packages to download multiple videos at once
              </p>
              {selectedVideos.length > 0 && (
                <Button
                  onClick={() => setShowCreatePackage(true)}
                  className="flex items-center gap-2"
                >
                  <Package className="h-4 w-4" />
                  Create Package
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {packages.map(package_ => (
                <Card key={package_.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">
                          {courseId ? 'Course Package' : 'Video Package'}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Videos:</span>
                            <span className="ml-2 font-medium">{package_.metadata.videoCount}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Size:</span>
                            <span className="ml-2 font-medium">{formatFileSize(package_.metadata.totalSize)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Quality:</span>
                            <span className="ml-2 font-medium">{package_.metadata.quality}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Expires:</span>
                            <span className="ml-2 font-medium">{formatTimeRemaining(package_.expiresAt)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(package_.status)}
                            <span className="text-xs capitalize">{package_.status}</span>
                          </div>
                          {package_.metadata.includesSubtitles && (
                            <Badge variant="outline" className="text-xs">
                              Subtitles included
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {package_.status === 'ready' && (
                          <Button
                            disabled={!isOnline}
                            className="flex items-center gap-2"
                          >
                            <FileDown className="h-4 w-4" />
                            Download Package
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Download Modal */}
      {showCreateDownload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Download Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Quality</label>
                  <Select
                    value={downloadSettings.quality}
                    onValueChange={(value) => setDownloadSettings(prev => ({ ...prev, quality: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="480p">480p (Smaller file)</SelectItem>
                      <SelectItem value="720p">720p (Recommended)</SelectItem>
                      <SelectItem value="1080p">1080p (Best quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Format</label>
                  <Select
                    value={downloadSettings.format}
                    onValueChange={(value) => setDownloadSettings(prev => ({ ...prev, format: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp4">MP4 (Compatible)</SelectItem>
                      <SelectItem value="webm">WebM (Smaller)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeSubtitles"
                  checked={downloadSettings.includeSubtitles}
                  onCheckedChange={(checked) => 
                    setDownloadSettings(prev => ({ ...prev, includeSubtitles: checked as boolean }))
                  }
                />
                <label htmlFor="includeSubtitles" className="text-sm">
                  Include subtitles
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Validity (days)</label>
                  <Select
                    value={downloadSettings.validityDays.toString()}
                    onValueChange={(value) => 
                      setDownloadSettings(prev => ({ ...prev, validityDays: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">1 week</SelectItem>
                      <SelectItem value="30">1 month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Max downloads</label>
                  <Select
                    value={downloadSettings.maxDownloads.toString()}
                    onValueChange={(value) => 
                      setDownloadSettings(prev => ({ ...prev, maxDownloads: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 time</SelectItem>
                      <SelectItem value="3">3 times</SelectItem>
                      <SelectItem value="5">5 times</SelectItem>
                      <SelectItem value="10">10 times</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDownload(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createVideoDownload}>
                  Create Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Package Modal */}
      {showCreatePackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create Offline Package</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Selected Videos ({packageSettings.selectedVideos.length})
                </label>
                <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-sm">
                  {packageSettings.selectedVideos.length === 0 ? (
                    <p className="text-gray-500">No videos selected</p>
                  ) : (
                    <p>{packageSettings.selectedVideos.length} videos selected</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Quality</label>
                  <Select
                    value={packageSettings.quality}
                    onValueChange={(value) => setPackageSettings(prev => ({ ...prev, quality: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="480p">480p (Smaller files)</SelectItem>
                      <SelectItem value="720p">720p (Recommended)</SelectItem>
                      <SelectItem value="1080p">1080p (Best quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Validity</label>
                  <Select
                    value={packageSettings.validityDays.toString()}
                    onValueChange={(value) => 
                      setPackageSettings(prev => ({ ...prev, validityDays: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">1 week</SelectItem>
                      <SelectItem value="14">2 weeks</SelectItem>
                      <SelectItem value="30">1 month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="packageSubtitles"
                  checked={packageSettings.includeSubtitles}
                  onCheckedChange={(checked) => 
                    setPackageSettings(prev => ({ ...prev, includeSubtitles: checked as boolean }))
                  }
                />
                <label htmlFor="packageSubtitles" className="text-sm">
                  Include subtitles
                </label>
              </div>

              {/* Size Estimation */}
              {estimatedSize && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-3">
                    <div className="grid grid-cols-3 gap-3 text-center text-sm">
                      <div>
                        <div className="font-semibold">{formatFileSize(estimatedSize.totalSize)}</div>
                        <div className="text-gray-600">Total size</div>
                      </div>
                      <div>
                        <div className="font-semibold">{estimatedSize.videoCount}</div>
                        <div className="text-gray-600">Videos</div>
                      </div>
                      <div>
                        <div className="font-semibold">{estimatedSize.estimatedDownloadTime}m</div>
                        <div className="text-gray-600">Est. time</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreatePackage(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createOfflinePackage}
                  disabled={packageSettings.selectedVideos.length === 0}
                >
                  Create Package
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}