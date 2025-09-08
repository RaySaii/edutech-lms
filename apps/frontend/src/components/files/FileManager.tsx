'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Download,
  Trash2,
  Eye,
  MoreHorizontal,
  Upload,
  FolderOpen,
  Image,
  Video,
  Music,
  FileText,
  File,
  Calendar,
  User,
  HardDrive,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/lib/api/base';
import FileUpload from './FileUpload';

interface FileItem {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  thumbnailId?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    bitrate?: number;
  };
}

interface FileStats {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  storageUsage: {
    local: number;
    s3: number;
  };
}

const FileManager: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    fetchFiles();
    fetchStats();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/files', {
        params: {
          page: 1,
          limit: 50,
          type: typeFilter !== 'all' ? typeFilter : undefined,
        },
      });

      if (response.data.success) {
        setFiles(response.data.data.files);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/files/stats/overview');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch file stats:', error);
    }
  };

  const getFileIcon = (mimetype: string, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-12 h-12',
    };

    const className = `${sizeClasses[size]} text-gray-600`;

    if (mimetype.startsWith('image/')) return <Image className={className} />;
    if (mimetype.startsWith('video/')) return <Video className={className} />;
    if (mimetype.startsWith('audio/')) return <Music className={className} />;
    if (mimetype === 'application/pdf') return <FileText className={className} />;
    return <File className={className} />;
  };

  const getFileTypeColor = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return 'bg-green-100 text-green-800';
    if (mimetype.startsWith('video/')) return 'bg-blue-100 text-blue-800';
    if (mimetype.startsWith('audio/')) return 'bg-purple-100 text-purple-800';
    if (mimetype === 'application/pdf') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFileSelect = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const handleDownload = async (fileId: string) => {
    try {
      const response = await api.get(`/files/${fileId}/download`);
      if (response.data.presignedUrl) {
        window.open(response.data.presignedUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      const response = await api.delete(`/files/${fileId}`);
      if (response.data.success) {
        setFiles(files.filter(f => f.id !== fileId));
        setSelectedFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const handleBulkDelete = async () => {
    const deletePromises = Array.from(selectedFiles).map(fileId => 
      handleDelete(fileId)
    );
    
    try {
      await Promise.all(deletePromises);
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Failed to delete files:', error);
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.originalName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || file.mimetype.startsWith(typeFilter);
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.originalName.localeCompare(b.originalName);
      case 'size':
        return b.size - a.size;
      case 'type':
        return a.mimetype.localeCompare(b.mimetype);
      default: // date
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    }
  });

  const handleUploadComplete = (uploadedFiles: any[]) => {
    setFiles(prev => [...uploadedFiles, ...prev]);
    setShowUploadDialog(false);
    fetchStats();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">File Manager</h1>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Files
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Files</DialogTitle>
            </DialogHeader>
            <FileUpload
              endpoint="/files/upload/multiple"
              multiple={true}
              maxFiles={10}
              onUploadComplete={handleUploadComplete}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFiles.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across all file types
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
              <p className="text-xs text-muted-foreground">
                Local: {formatFileSize(stats.storageUsage.local)}, S3: {formatFileSize(stats.storageUsage.s3)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Images</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.filesByType['image/jpeg'] || 0) + (stats.filesByType['image/png'] || 0)}</div>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, and others
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Videos</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.filesByType['video/mp4'] || 0}</div>
              <p className="text-xs text-muted-foreground">
                MP4 and other formats
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="application">Documents</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Sort by Date</SelectItem>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="size">Sort by Size</SelectItem>
            <SelectItem value="type">Sort by Type</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedFiles.size > 0 && (
        <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm text-blue-800">
            {selectedFiles.size} file(s) selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelectedFiles(new Set())}>
              Clear Selection
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* File Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-32 bg-gray-300 rounded mb-3"></div>
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-3 bg-gray-300 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredFiles.map((file) => (
            <Card
              key={file.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedFiles.has(file.id) ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleFileSelect(file.id)}
            >
              <CardContent className="p-4">
                {/* File Preview */}
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  {file.mimetype.startsWith('image/') ? (
                    <img
                      src={file.url}
                      alt={file.originalName}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    getFileIcon(file.mimetype, 'lg')
                  )}
                </div>

                {/* File Info */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium truncate" title={file.originalName}>
                    {file.originalName}
                  </h3>
                  
                  <div className="flex justify-between items-center">
                    <Badge className={getFileTypeColor(file.mimetype)}>
                      {file.mimetype.split('/')[1].toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500">
                    {formatDate(file.uploadedAt)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end mt-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(file.id)}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(file.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0">
              <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                  <span className="font-medium">Name</span>
                </div>
                <div className="flex gap-8 text-sm font-medium text-gray-600">
                  <span>Type</span>
                  <span>Size</span>
                  <span>Date</span>
                  <span>Actions</span>
                </div>
              </div>

              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center justify-between p-4 border-b hover:bg-gray-50 ${
                    selectedFiles.has(file.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => handleFileSelect(file.id)}
                      className="rounded border-gray-300"
                    />
                    {getFileIcon(file.mimetype, 'sm')}
                    <span className="text-sm truncate max-w-[200px]" title={file.originalName}>
                      {file.originalName}
                    </span>
                  </div>

                  <div className="flex gap-8 items-center text-sm text-gray-600">
                    <Badge className={getFileTypeColor(file.mimetype)}>
                      {file.mimetype.split('/')[1].toUpperCase()}
                    </Badge>
                    <span className="w-16 text-right">{formatFileSize(file.size)}</span>
                    <span className="w-32 text-right">{formatDate(file.uploadedAt)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(file.id)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(file.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredFiles.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || typeFilter !== 'all' 
                ? 'Try adjusting your search or filters.'
                : 'Upload some files to get started.'
              }
            </p>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileManager;