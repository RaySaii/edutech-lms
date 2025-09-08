'use client';

import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Video, 
  Image, 
  Download,
  Trash2,
  Search,
  Filter,
  Eye,
  Edit,
  FolderPlus,
  Folder,
  ChevronRight,
  ChevronDown,
  MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface ContentItem {
  id: string;
  name: string;
  type: 'folder' | 'video' | 'document' | 'image' | 'audio';
  size?: number;
  uploadedAt: string;
  uploadedBy: string;
  path: string;
  url?: string;
  thumbnail?: string;
  courseId?: string;
  courseName?: string;
  isPublic?: boolean;
  children?: ContentItem[];
}

interface UploadProgress {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

export function ContentManager() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'document' | 'image'>('all');
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['root']);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadContent();
  }, [currentPath, searchQuery, filterType]);

  const loadContent = async () => {
    try {
      setLoading(true);
      
      // Mock content data - replace with API call
      const mockContent: ContentItem[] = [
        {
          id: 'folder-1',
          name: 'Course Materials',
          type: 'folder',
          uploadedAt: '2024-01-15T10:00:00Z',
          uploadedBy: 'Admin',
          path: '/course-materials',
          children: [
            {
              id: 'video-1',
              name: 'Introduction to JavaScript.mp4',
              type: 'video',
              size: 157286400, // 150MB
              uploadedAt: '2024-01-15T10:30:00Z',
              uploadedBy: 'Admin',
              path: '/course-materials/javascript-intro.mp4',
              url: '/content/videos/javascript-intro.mp4',
              thumbnail: '/thumbnails/javascript-intro.jpg',
              courseId: 'js-fundamentals',
              courseName: 'JavaScript Fundamentals',
              isPublic: true
            }
          ]
        },
        {
          id: 'folder-2',
          name: 'Assessment Resources',
          type: 'folder',
          uploadedAt: '2024-01-14T15:20:00Z',
          uploadedBy: 'Admin',
          path: '/assessments',
          children: []
        },
        {
          id: 'video-2',
          name: 'Welcome Video.mp4',
          type: 'video',
          size: 89478485, // 85MB
          uploadedAt: '2024-01-16T09:15:00Z',
          uploadedBy: 'Admin',
          path: '/welcome-video.mp4',
          url: '/content/videos/welcome.mp4',
          thumbnail: '/thumbnails/welcome.jpg',
          isPublic: true
        },
        {
          id: 'doc-1',
          name: 'Course Curriculum.pdf',
          type: 'document',
          size: 2456789, // 2.4MB
          uploadedAt: '2024-01-13T14:45:00Z',
          uploadedBy: 'Admin',
          path: '/curriculum.pdf',
          url: '/content/documents/curriculum.pdf',
          courseId: 'js-fundamentals',
          courseName: 'JavaScript Fundamentals',
          isPublic: false
        },
        {
          id: 'img-1',
          name: 'Course Banner.jpg',
          type: 'image',
          size: 1024000, // 1MB
          uploadedAt: '2024-01-12T11:20:00Z',
          uploadedBy: 'Admin',
          path: '/images/banner.jpg',
          url: '/content/images/banner.jpg',
          thumbnail: '/content/images/banner.jpg',
          isPublic: true
        }
      ];

      setContentItems(mockContent);
    } catch (error) {
      console.error('Failed to load content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (files: FileList) => {
    Array.from(files).forEach((file) => {
      const uploadId = `upload-${Date.now()}-${file.name}`;
      
      setUploadProgress(prev => [...prev, {
        id: uploadId,
        name: file.name,
        progress: 0,
        status: 'uploading'
      }]);

      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setUploadProgress(prev => prev.map(item =>
            item.id === uploadId
              ? { ...item, progress: 100, status: 'completed' }
              : item
          ));
          
          // Remove completed upload after 2 seconds
          setTimeout(() => {
            setUploadProgress(prev => prev.filter(item => item.id !== uploadId));
          }, 2000);
        } else {
          setUploadProgress(prev => prev.map(item =>
            item.id === uploadId
              ? { ...item, progress: Math.round(progress) }
              : item
          ));
        }
      }, 500);
    });
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        // API call to delete item
        setContentItems(prev => prev.filter(item => item.id !== itemId));
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'folder':
        return <Folder className="h-5 w-5 text-blue-500" />;
      case 'video':
        return <Video className="h-5 w-5 text-purple-500" />;
      case 'document':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'image':
        return <Image className="h-5 w-5 text-green-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const filteredContent = contentItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Management</h1>
          <p className="text-gray-600">Manage course materials, videos, documents, and other content</p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex flex-col md:flex-row gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="video">Videos</option>
                  <option value="document">Documents</option>
                  <option value="image">Images</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setShowUploadModal(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
                <Button variant="outline">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {uploadProgress.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Uploading Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadProgress.map((upload) => (
                  <div key={upload.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{upload.name}</span>
                      <span className="text-sm text-gray-500">{upload.progress}%</span>
                    </div>
                    <Progress value={upload.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading content...</p>
              </div>
            ) : filteredContent.length > 0 ? (
              <div className="divide-y">
                {filteredContent.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(prev => [...prev, item.id]);
                            } else {
                              setSelectedItems(prev => prev.filter(id => id !== item.id));
                            }
                          }}
                          className="rounded"
                        />
                        
                        {getFileIcon(item.type)}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium text-gray-900 truncate">
                              {item.name}
                            </span>
                            {item.isPublic && (
                              <Badge variant="secondary">Public</Badge>
                            )}
                            {item.courseName && (
                              <Badge variant="outline">{item.courseName}</Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            {item.size && <span>{formatFileSize(item.size)}</span>}
                            <span>Uploaded {formatDate(item.uploadedAt)}</span>
                            <span>by {item.uploadedBy}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {item.url && (
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Upload className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No content found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery || filterType !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Upload your first files to get started'
                  }
                </p>
                <Button onClick={() => setShowUploadModal(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Upload Files</h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Drag and drop files here, or click to select</p>
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFileUpload(e.target.files);
                      setShowUploadModal(false);
                    }
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer">
                    Select Files
                  </Button>
                </label>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}