'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Upload, 
  Eye, 
  Edit, 
  Trash2,
  Archive,
  History,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api/base';

interface ContentVersion {
  id: string;
  version: number;
  title: string;
  description: string;
  status: string;
  changeType: string;
  changeDescription: string;
  size: number;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
}

interface ContentApproval {
  id: string;
  type: string;
  status: string;
  priority: number;
  dueDate: string;
  content: {
    id: string;
    title: string;
  };
  requester: {
    firstName: string;
    lastName: string;
  };
  isOverdue: boolean;
  isUrgent: boolean;
}

interface MediaAsset {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  type: string;
  status: string;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
  formattedSize: string;
}

interface DashboardOverview {
  pendingApprovals: {
    count: number;
    urgent: number;
    overdue: number;
  };
  mediaAssets: {
    count: number;
    totalSize: number;
    byType: Record<string, number>;
  };
  recentActivity: any[];
}

const ContentManagementDashboard: React.FC = () => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [approvals, setApprovals] = useState<ContentApproval[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [overviewRes, approvalsRes, mediaRes] = await Promise.all([
        api.get('/content-management/dashboard/overview'),
        api.get('/content-management/approvals/queue'),
        api.get('/content-management/media'),
      ]);

      setOverview((overviewRes as any).data.data);
      setApprovals((approvalsRes as any).data.data);
      setMediaAssets((mediaRes as any).data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContentVersions = async (contentId: string) => {
    try {
      const response = await api.get(`/content-management/${contentId}/versions`);
      setVersions((response as any).data.data);
    } catch (error) {
      console.error('Failed to fetch content versions:', error);
    }
  };

  const handleApprovalAction = async (approvalId: string, status: string, notes?: string) => {
    try {
      await api.put(`/content-management/approvals/${approvalId}/review`, {
        status,
        approverNotes: notes,
      });
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to process approval:', error);
    }
  };

  const handleUploadMedia = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        await api.post('/content-management/media/upload', formData);
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }
    fetchDashboardData(); // Refresh data
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'text-red-600';
    if (priority === 3) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map((i) => (
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Content Management</h1>
        <div className="flex gap-2">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Content
          </Button>
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleUploadMedia(e.target.files)}
            />
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Media
            </Button>
          </label>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.pendingApprovals.count}</div>
              <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                <span className="text-red-600">
                  {overview.pendingApprovals.urgent} urgent
                </span>
                <span className="text-orange-600">
                  {overview.pendingApprovals.overdue} overdue
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Media Assets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.mediaAssets.count}</div>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(overview.mediaAssets.totalSize)} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Content Types</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(overview.mediaAssets.byType).map(([type, count]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="capitalize">{type}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="approvals">Approvals Queue</TabsTrigger>
          <TabsTrigger value="media">Media Library</TabsTrigger>
          <TabsTrigger value="versions">Version History</TabsTrigger>
        </TabsList>

        {/* Approvals Queue */}
        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approvals.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No pending approvals
                  </div>
                ) : (
                  approvals.map((approval) => (
                    <div
                      key={approval.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{approval.content.title}</h3>
                            <Badge className={getStatusColor(approval.status)}>
                              {approval.status}
                            </Badge>
                            {approval.isUrgent && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Urgent
                              </Badge>
                            )}
                            {approval.isOverdue && (
                              <Badge variant="destructive">Overdue</Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Type: {approval.type.replace('_', ' ')}</p>
                            <p>
                              Requested by: {approval.requester.firstName} {approval.requester.lastName}
                            </p>
                            <p>Due: {new Date(approval.dueDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${getPriorityColor(approval.priority)}`}>
                            Priority {approval.priority}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprovalAction(approval.id, 'approved')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprovalAction(approval.id, 'rejected')}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media Library */}
        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle>Media Library</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {mediaAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                      {asset.thumbnailUrl ? (
                        <img
                          src={asset.thumbnailUrl}
                          alt={asset.originalFilename}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <FileText className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm truncate" title={asset.originalFilename}>
                        {asset.originalFilename}
                      </h4>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span className="capitalize">{asset.type}</span>
                        <span>{asset.formattedSize}</span>
                      </div>
                      <Badge className={getStatusColor(asset.status)}>
                        {asset.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between mt-3">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Version History */}
        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedContent ? (
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedContent(null);
                      setVersions([]);
                    }}
                  >
                    ← Back to Content List
                  </Button>
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">
                              v{version.version} - {version.title}
                            </h3>
                            <Badge className={getStatusColor(version.status)}>
                              {version.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {version.description}
                          </p>
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>
                              {version.changeType} by {version.author.firstName} {version.author.lastName}
                            </p>
                            <p>
                              {new Date(version.createdAt).toLocaleDateString()} • {formatFileSize(version.size)}
                            </p>
                            {version.changeDescription && (
                              <p>Changes: {version.changeDescription}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <History className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Select a content item to view version history</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentManagementDashboard;