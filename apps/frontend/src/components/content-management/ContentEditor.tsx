'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, 
  Eye, 
  History, 
  Upload, 
  GitBranch, 
  Send, 
  AlertCircle,
  Clock,
  CheckCircle,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api/base';

interface ContentVersion {
  id: string;
  version: number;
  title: string;
  description: string;
  content: Record<string, any>;
  status: string;
  changeType: string;
  changeDescription: string;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
  };
}

interface ContentEditorProps {
  contentId?: string;
  onSave?: (content: any) => void;
  onCancel?: () => void;
}

const ContentEditor: React.FC<ContentEditorProps> = ({
  contentId,
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentData, setContentData] = useState<Record<string, any>>({});
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [changeDescription, setChangeDescription] = useState('');
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<ContentVersion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState('');
  const [approvalType, setApprovalType] = useState('content_review');

  // Content editing states
  const [blocks, setBlocks] = useState<any[]>([
    { id: '1', type: 'heading', content: '', level: 1 },
  ]);

  useEffect(() => {
    if (contentId) {
      loadContent();
      loadVersions();
    }
  }, [contentId]);

  const loadContent = async () => {
    if (!contentId) return;

    try {
      setIsLoading(true);
      const response = await api.get(`/content/${contentId}`);
      const content = (response as any).data.data;

      setTitle(content.title);
      setDescription(content.description || '');
      setContentData(content.content || {});
      setMetadata(content.metadata || {});
      
      if (content.content?.blocks) {
        setBlocks(content.content.blocks);
      }
    } catch (error) {
      console.error('Failed to load content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVersions = async () => {
    if (!contentId) return;

    try {
      const response = await api.get(`/content-management/${contentId}/versions`);
      setVersions((response as any).data.data);
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  };

  const handleSaveVersion = async () => {
    if (!contentId) return;

    try {
      setIsSaving(true);
      
      const versionData = {
        title,
        description,
        content: {
          ...contentData,
          blocks,
        },
        metadata,
        changeDescription: changeDescription || 'Content updated',
      };

      const response = await api.post(`/content-management/${contentId}/versions`, versionData);
      
      setHasUnsavedChanges(false);
      setChangeDescription('');
      await loadVersions();
      
      onSave?.((response as any).data.data);
    } catch (error) {
      console.error('Failed to save version:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestApproval = async (versionId: string) => {
    try {
      await api.post(`/content-management/${contentId}/versions/${versionId}/request-approval`, {
        type: approvalType,
        approverId: selectedApprover || undefined,
        requestNotes: `Please review this content for ${approvalType.replace('_', ' ')}`,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      });

      await loadVersions();
    } catch (error) {
      console.error('Failed to request approval:', error);
    }
  };

  const handleLoadVersion = async (version: ContentVersion) => {
    setTitle(version.title);
    setDescription(version.description);
    setContentData(version.content);
    setBlocks(version.content.blocks || []);
    setCurrentVersion(version);
    setHasUnsavedChanges(true);
  };

  const addBlock = (type: string) => {
    const newBlock = {
      id: Date.now().toString(),
      type,
      content: '',
      ...(type === 'heading' && { level: 1 }),
      ...(type === 'image' && { src: '', alt: '', caption: '' }),
      ...(type === 'video' && { src: '', poster: '', caption: '' }),
      ...(type === 'code' && { language: 'javascript' }),
    };

    setBlocks([...blocks, newBlock]);
    setHasUnsavedChanges(true);
  };

  const updateBlock = (id: string, updates: any) => {
    setBlocks(blocks.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ));
    setHasUnsavedChanges(true);
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(block => block.id !== id));
    setHasUnsavedChanges(true);
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(block => block.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    
    setBlocks(newBlocks);
    setHasUnsavedChanges(true);
  };

  const renderBlockEditor = (block: any) => {
    switch (block.type) {
      case 'heading':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Select
                value={block.level?.toString() || '1'}
                onValueChange={(value) => updateBlock(block.id, { level: parseInt(value) })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">H1</SelectItem>
                  <SelectItem value="2">H2</SelectItem>
                  <SelectItem value="3">H3</SelectItem>
                  <SelectItem value="4">H4</SelectItem>
                  <SelectItem value="5">H5</SelectItem>
                  <SelectItem value="6">H6</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveBlock(block.id, 'up')}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveBlock(block.id, 'down')}
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteBlock(block.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Input
              placeholder="Enter heading text..."
              value={block.content || ''}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
            />
          </div>
        );

      case 'paragraph':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Paragraph</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveBlock(block.id, 'up')}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveBlock(block.id, 'down')}
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteBlock(block.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              placeholder="Enter paragraph text..."
              value={block.content || ''}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              rows={3}
            />
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Image</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveBlock(block.id, 'up')}
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveBlock(block.id, 'down')}
              >
                ↓
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteBlock(block.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Image URL..."
                value={block.src || ''}
                onChange={(e) => updateBlock(block.id, { src: e.target.value })}
              />
              <Input
                placeholder="Alt text..."
                value={block.alt || ''}
                onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
              />
              <Input
                placeholder="Caption (optional)..."
                value={block.caption || ''}
                onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
              />
            </div>
          </div>
        );

      default:
        return <div>Unknown block type: {block.type}</div>;
    }
  };

  const renderBlockPreview = (block: any) => {
    switch (block.type) {
      case 'heading':
        const HeadingTag = `h${block.level || 1}` as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag className={`font-bold ${
            block.level === 1 ? 'text-3xl' :
            block.level === 2 ? 'text-2xl' :
            block.level === 3 ? 'text-xl' :
            block.level === 4 ? 'text-lg' :
            block.level === 5 ? 'text-base' : 'text-sm'
          }`}>
            {block.content}
          </HeadingTag>
        );

      case 'paragraph':
        return <p className="text-base leading-relaxed">{block.content}</p>;

      case 'image':
        return block.src ? (
          <div className="space-y-2">
            <img 
              src={block.src} 
              alt={block.alt} 
              className="max-w-full h-auto rounded"
            />
            {block.caption && (
              <p className="text-sm text-gray-600 italic">{block.caption}</p>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 p-4 text-center text-gray-500">
            No image selected
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 space-y-2">
          <Input
            placeholder="Content title..."
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setHasUnsavedChanges(true);
            }}
            className="text-2xl font-bold border-none p-0 focus:ring-0"
          />
          <Textarea
            placeholder="Content description..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setHasUnsavedChanges(true);
            }}
            className="border-none p-0 focus:ring-0 resize-none"
            rows={2}
          />
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-yellow-600">
              <Clock className="w-3 h-3 mr-1" />
              Unsaved
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button
            onClick={handleSaveVersion}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Version'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Content Editor
                {!previewMode && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addBlock('heading')}
                    >
                      + Heading
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addBlock('paragraph')}
                    >
                      + Paragraph
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addBlock('image')}
                    >
                      + Image
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewMode ? (
                <div className="space-y-4 prose max-w-none">
                  {blocks.map((block) => (
                    <div key={block.id} className="block">
                      {renderBlockPreview(block)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {blocks.map((block) => (
                    <Card key={block.id} className="p-4">
                      {renderBlockEditor(block)}
                    </Card>
                  ))}
                  
                  {hasUnsavedChanges && (
                    <Card className="p-4 border-yellow-200 bg-yellow-50">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        <span className="font-medium">Save Changes</span>
                      </div>
                      <Textarea
                        placeholder="Describe what you changed..."
                        value={changeDescription}
                        onChange={(e) => setChangeDescription(e.target.value)}
                        rows={2}
                        className="mb-2"
                      />
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Version History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Versions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="border rounded p-2 text-sm hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleLoadVersion(version)}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">v{version.version}</span>
                      <Badge
                        variant="outline"
                        className={
                          version.status === 'published' ? 'bg-green-100 text-green-800' :
                          version.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          version.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        {version.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      by {version.author.firstName} {version.author.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(version.createdAt).toLocaleDateString()}
                    </p>
                    {version.changeDescription && (
                      <p className="text-xs text-gray-700 mt-1">
                        {version.changeDescription}
                      </p>
                    )}
                    
                    {version.status === 'approved' && (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestApproval(version.id);
                          }}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Publish
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Approval Request */}
          {versions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Request Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={approvalType} onValueChange={setApprovalType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="content_review">Content Review</SelectItem>
                    <SelectItem value="technical_review">Technical Review</SelectItem>
                    <SelectItem value="legal_review">Legal Review</SelectItem>
                    <SelectItem value="final_approval">Final Approval</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input
                  placeholder="Approver ID (optional)"
                  value={selectedApprover}
                  onChange={(e) => setSelectedApprover(e.target.value)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentEditor;