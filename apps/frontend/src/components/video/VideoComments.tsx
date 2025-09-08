'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Reply, 
  Heart, 
  ThumbsUp, 
  ThumbsDown, 
  Flag, 
  Edit, 
  Trash2, 
  Pin, 
  Clock, 
  Search,
  Filter,
  MoreHorizontal,
  User,
  Send,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VideoComment {
  id: string;
  content: string;
  timestamp?: number;
  isEdited: boolean;
  isModerated: boolean;
  isPinned: boolean;
  isHighlighted: boolean;
  likeCount: number;
  dislikeCount: number;
  replyCount: number;
  status: 'active' | 'hidden' | 'deleted' | 'flagged';
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  replies?: VideoComment[];
  userReaction?: string;
  metadata?: {
    reactionCounts?: { [emoji: string]: number };
    mentions?: string[];
    attachments?: Array<{
      type: 'image' | 'link' | 'file';
      url: string;
      name?: string;
    }>;
  };
}

interface DiscussionThread {
  id: string;
  title: string;
  content: string;
  timestamp?: number;
  isPinned: boolean;
  isLocked: boolean;
  isResolved: boolean;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  type: 'question' | 'discussion' | 'announcement' | 'feedback';
  tags: string[];
  createdAt: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

interface VideoCommentsProps {
  videoId: string;
  currentTime?: number;
  userId?: string;
  onTimestampClick?: (timestamp: number) => void;
}

export function VideoComments({ 
  videoId, 
  currentTime = 0, 
  userId,
  onTimestampClick 
}: VideoCommentsProps) {
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('comments');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular' | 'timestamp'>('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTimestampComments, setShowTimestampComments] = useState(false);
  const [timestampComments, setTimestampComments] = useState<VideoComment[]>([]);
  
  // New comment state
  const [newComment, setNewComment] = useState('');
  const [newCommentTimestamp, setNewCommentTimestamp] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  
  // Thread state
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [newThread, setNewThread] = useState({
    title: '',
    content: '',
    type: 'discussion' as const,
    timestamp: null as number | null,
  });

  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadComments();
    loadThreads();
  }, [videoId, sortBy]);

  useEffect(() => {
    if (showTimestampComments) {
      loadTimestampComments();
    }
  }, [currentTime, showTimestampComments]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/videos/${videoId}/comments?sortBy=${sortBy}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadThreads = async () => {
    try {
      const response = await fetch(
        `/api/videos/${videoId}/comments/threads?sortBy=${sortBy}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setThreads(data.threads || []);
      }
    } catch (error) {
      console.error('Failed to load threads:', error);
    }
  };

  const loadTimestampComments = async () => {
    try {
      const response = await fetch(
        `/api/videos/${videoId}/comments/timestamp/${currentTime}?tolerance=10`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTimestampComments(data);
      }
    } catch (error) {
      console.error('Failed to load timestamp comments:', error);
    }
  };

  const createComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          content: newComment,
          timestamp: newCommentTimestamp,
        }),
      });

      if (response.ok) {
        const comment = await response.json();
        setComments(prev => [comment, ...prev]);
        setNewComment('');
        setNewCommentTimestamp(null);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create comment');
      }
    } catch (error) {
      console.error('Failed to create comment:', error);
      alert('Failed to create comment');
    }
  };

  const createReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    try {
      const response = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          content: replyContent,
          parentId,
        }),
      });

      if (response.ok) {
        const reply = await response.json();
        
        // Add reply to the parent comment
        setComments(prev => prev.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), reply],
              replyCount: comment.replyCount + 1,
            };
          }
          return comment;
        }));
        
        setReplyContent('');
        setReplyingTo(null);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create reply');
      }
    } catch (error) {
      console.error('Failed to create reply:', error);
      alert('Failed to create reply');
    }
  };

  const reactToComment = async (commentId: string, reactionType: string) => {
    try {
      const response = await fetch(
        `/api/videos/${videoId}/comments/${commentId}/reactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ type: reactionType }),
        }
      );

      if (response.ok) {
        // Update local state
        setComments(prev => prev.map(comment => {
          if (comment.id === commentId) {
            const newLikeCount = reactionType === 'like' ? 
              (comment.userReaction === 'like' ? comment.likeCount - 1 : comment.likeCount + 1) :
              (comment.userReaction === 'like' ? comment.likeCount - 1 : comment.likeCount);
            
            const newDislikeCount = reactionType === 'dislike' ? 
              (comment.userReaction === 'dislike' ? comment.dislikeCount - 1 : comment.dislikeCount + 1) :
              (comment.userReaction === 'dislike' ? comment.dislikeCount - 1 : comment.dislikeCount);

            return {
              ...comment,
              likeCount: newLikeCount,
              dislikeCount: newDislikeCount,
              userReaction: comment.userReaction === reactionType ? undefined : reactionType,
            };
          }
          return comment;
        }));
      }
    } catch (error) {
      console.error('Failed to react to comment:', error);
    }
  };

  const formatTimestamp = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const CommentItem = ({ comment, isReply = false }: { comment: VideoComment; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-8 pl-4 border-l-2 border-gray-200' : ''} space-y-3`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
          {comment.author.firstName[0]}{comment.author.lastName[0]}
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">
              {comment.author.firstName} {comment.author.lastName}
            </span>
            <span className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
            {comment.isEdited && (
              <Badge variant="outline" className="text-xs">edited</Badge>
            )}
            {comment.isPinned && (
              <Badge className="text-xs bg-blue-100 text-blue-800">
                <Pin className="h-3 w-3 mr-1" />
                Pinned
              </Badge>
            )}
            {comment.isHighlighted && (
              <Badge className="text-xs bg-yellow-100 text-yellow-800">
                Highlighted
              </Badge>
            )}
            {comment.timestamp && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTimestampClick?.(comment.timestamp!)}
                className="text-xs text-blue-600 hover:text-blue-800 p-1 h-auto"
              >
                <Clock className="h-3 w-3 mr-1" />
                {formatTimestamp(comment.timestamp)}
              </Button>
            )}
          </div>

          <p className="text-gray-800 text-sm whitespace-pre-wrap">{comment.content}</p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reactToComment(comment.id, 'like')}
                className={`p-1 h-auto ${comment.userReaction === 'like' ? 'text-blue-600' : 'text-gray-500'}`}
              >
                <ThumbsUp className="h-4 w-4" />
                <span className="ml-1 text-xs">{comment.likeCount}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reactToComment(comment.id, 'dislike')}
                className={`p-1 h-auto ${comment.userReaction === 'dislike' ? 'text-red-600' : 'text-gray-500'}`}
              >
                <ThumbsDown className="h-4 w-4" />
                <span className="ml-1 text-xs">{comment.dislikeCount}</span>
              </Button>
            </div>

            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(comment.id)}
                className="p-1 h-auto text-gray-500 hover:text-gray-700"
              >
                <Reply className="h-4 w-4" />
                <span className="ml-1 text-xs">Reply</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-auto text-gray-500 hover:text-red-600"
            >
              <Flag className="h-4 w-4" />
              <span className="ml-1 text-xs">Report</span>
            </Button>

            {comment.author.id === userId && (
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-gray-500 hover:text-gray-700"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Reply Form */}
          {replyingTo === comment.id && (
            <div className="mt-3 space-y-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="text-sm"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => createReply(comment.id)}
                  disabled={!replyContent.trim()}
                >
                  Reply
                </Button>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-3 mt-4">
              {comment.replies.map(reply => (
                <CommentItem key={reply.id} comment={reply} isReply={true} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const ThreadItem = ({ thread }: { thread: DiscussionThread }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {thread.isPinned && <Pin className="h-4 w-4 text-blue-600" />}
              <CardTitle className="text-base">{thread.title}</CardTitle>
              {thread.isLocked && <Badge variant="outline" className="text-xs">Locked</Badge>}
              {thread.isResolved && <Badge className="text-xs bg-green-100 text-green-800">Resolved</Badge>}
            </div>
            
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {thread.creator.firstName} {thread.creator.lastName}
              </span>
              <span>{formatTimeAgo(thread.createdAt)}</span>
              <span>{thread.commentCount} replies</span>
              <span>{thread.viewCount} views</span>
              {thread.timestamp && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTimestampClick?.(thread.timestamp!)}
                  className="text-xs text-blue-600 hover:text-blue-800 p-1 h-auto"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTimestamp(thread.timestamp)}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {thread.type}
              </Badge>
              {thread.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs bg-gray-50">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-blue-600"
            >
              <ThumbsUp className="h-4 w-4" />
              <span className="ml-1 text-xs">{thread.likeCount}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-gray-700 text-sm mb-3 line-clamp-3">{thread.content}</p>
        <Button variant="outline" size="sm" className="w-full">
          View Discussion
        </Button>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments & Discussions
        </h3>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTimestampComments(!showTimestampComments)}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            {showTimestampComments ? 'Hide' : 'Show'} Current Time
          </Button>
          
          <Select value={sortBy} onValueChange={setSortBy as any}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="timestamp">Timeline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timestamp Comments Overlay */}
      {showTimestampComments && timestampComments.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Comments at {formatTimestamp(currentTime)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {timestampComments.map(comment => (
                <div key={comment.id} className="text-sm">
                  <span className="font-medium">{comment.author.firstName}:</span>
                  <span className="ml-2">{comment.content}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="comments">
            Comments ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="threads">
            Discussions ({threads.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comments" className="space-y-4">
          {/* New Comment Form */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <Textarea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewCommentTimestamp(currentTime)}
                      className="flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      Add timestamp ({formatTimestamp(currentTime)})
                    </Button>
                    
                    {newCommentTimestamp !== null && (
                      <Badge variant="outline" className="text-xs">
                        @ {formatTimestamp(newCommentTimestamp)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNewCommentTimestamp(null)}
                          className="ml-1 p-0 h-auto"
                        >
                          ×
                        </Button>
                      </Badge>
                    )}
                  </div>

                  <Button
                    onClick={createComment}
                    disabled={!newComment.trim()}
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Comment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              comments.map(comment => (
                <Card key={comment.id}>
                  <CardContent className="p-4">
                    <CommentItem comment={comment} />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="threads" className="space-y-4">
          {/* Create Thread Button */}
          <Button
            onClick={() => setShowCreateThread(true)}
            className="w-full flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Start New Discussion
          </Button>

          {/* Threads List */}
          <div className="space-y-4">
            {threads.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No discussions yet. Start the conversation!</p>
              </div>
            ) : (
              threads.map(thread => (
                <ThreadItem key={thread.id} thread={thread} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Thread Modal */}
      {showCreateThread && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Start New Discussion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={newThread.title}
                  onChange={(e) => setNewThread(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What would you like to discuss?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Content</label>
                <Textarea
                  value={newThread.content}
                  onChange={(e) => setNewThread(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Provide more details..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <Select
                    value={newThread.type}
                    onValueChange={(value: any) => setNewThread(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="question">Question</SelectItem>
                      <SelectItem value="discussion">Discussion</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Timestamp</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewThread(prev => ({ 
                      ...prev, 
                      timestamp: prev.timestamp ? null : currentTime 
                    }))}
                    className="w-full"
                  >
                    {newThread.timestamp ? 
                      formatTimestamp(newThread.timestamp) : 
                      'Add current time'
                    }
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateThread(false);
                    setNewThread({
                      title: '',
                      content: '',
                      type: 'discussion',
                      timestamp: null,
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!newThread.title.trim() || !newThread.content.trim()}
                >
                  Create Discussion
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}