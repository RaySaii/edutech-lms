'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  File,
  Image,
  Video,
  Music,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/base';

interface FileUploadProps {
  endpoint?: string;
  multiple?: boolean;
  accept?: Record<string, string[]>;
  maxSize?: number;
  maxFiles?: number;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  thumbnailId?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
  };
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  uploadedFile?: UploadedFile;
}

const FileUpload: React.FC<FileUploadProps> = ({
  endpoint = '/files/upload/single',
  multiple = false,
  accept = {
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    'video/*': ['.mp4', '.webm', '.ogg'],
    'audio/*': ['.mp3', '.wav', '.ogg'],
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],
  },
  maxSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 10,
  onUploadComplete,
  onUploadError,
  className = '',
}) => {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(({ file, errors }) => 
        `${file.name}: ${errors.map(e => e.message).join(', ')}`
      );
      onUploadError?.(errors.join('\n'));
    }

    // Add accepted files to the list
    const newFiles: FileWithProgress[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, [onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: multiple ? maxFiles : 1,
    multiple,
    disabled: isUploading,
  });

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = files.map(async (fileWithProgress, index) => {
        if (fileWithProgress.status !== 'pending') return fileWithProgress;

        const formData = new FormData();
        const fieldName = multiple ? 'files' : 'file';
        formData.append(fieldName, fileWithProgress.file);

        // Update status to uploading
        setFiles(prev => prev.map((f, i) => 
          i === index ? { ...f, status: 'uploading' as const } : f
        ));

        try {
          const response = await api.post(endpoint, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total!
              );
              
              setFiles(prev => prev.map((f, i) => 
                i === index ? { ...f, progress } : f
              ));
            },
          });

          const uploadedFile = multiple 
            ? response.data.data[0] 
            : response.data.data;

          // Update status to success
          setFiles(prev => prev.map((f, i) => 
            i === index ? { 
              ...f, 
              status: 'success' as const, 
              progress: 100,
              uploadedFile 
            } : f
          ));

          return { ...fileWithProgress, uploadedFile, status: 'success' as const };
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Upload failed';
          
          // Update status to error
          setFiles(prev => prev.map((f, i) => 
            i === index ? { 
              ...f, 
              status: 'error' as const, 
              error: errorMessage 
            } : f
          ));

          return { ...fileWithProgress, status: 'error' as const, error: errorMessage };
        }
      });

      const results = await Promise.all(uploadPromises);
      const successful = results.filter(r => r.uploadedFile).map(r => r.uploadedFile!);
      
      if (successful.length > 0 && onUploadComplete) {
        onUploadComplete(successful);
      }

    } catch (error: any) {
      onUploadError?.(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (type.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (type.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (type === 'application/pdf') return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'uploading': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'uploading': return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default: return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-blue-600">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-2">
              Drag 'n' drop {multiple ? 'files' : 'a file'} here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              Max size: {formatFileSize(maxSize)}
              {multiple && `, Max files: ${maxFiles}`}
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Files ({files.length})</h3>
              <div className="space-x-2">
                <Button
                  onClick={uploadFiles}
                  disabled={isUploading || files.every(f => f.status !== 'pending')}
                  size="sm"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload All
                    </>
                  )}
                </Button>
                <Button onClick={clearAll} variant="outline" size="sm">
                  Clear All
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {files.map((fileWithProgress, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(fileWithProgress.file.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fileWithProgress.file.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {formatFileSize(fileWithProgress.file.size)}
                        </Badge>
                        {getStatusIcon(fileWithProgress.status)}
                      </div>
                    </div>
                    
                    <p className={`text-xs ${getStatusColor(fileWithProgress.status)}`}>
                      {fileWithProgress.status === 'error' && fileWithProgress.error}
                      {fileWithProgress.status === 'success' && 'Upload complete'}
                      {fileWithProgress.status === 'uploading' && `Uploading... ${fileWithProgress.progress}%`}
                      {fileWithProgress.status === 'pending' && 'Ready to upload'}
                    </p>
                    
                    {fileWithProgress.status === 'uploading' && (
                      <Progress 
                        value={fileWithProgress.progress} 
                        className="w-full mt-2 h-2"
                      />
                    )}
                  </div>
                  
                  <Button
                    onClick={() => removeFile(index)}
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0"
                    disabled={fileWithProgress.status === 'uploading'}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUpload;