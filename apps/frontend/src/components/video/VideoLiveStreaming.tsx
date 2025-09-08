'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Users, 
  MessageSquare, 
  Settings, 
  Play, 
  Square, 
  Mic, 
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Send,
  AlertCircle,
  Clock,
  Eye,
  Heart,
  ThumbsUp,
  Star,
  Calendar,
  Copy,
  Share,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import io, { Socket } from 'socket.io-client';

interface LiveStream {
  id: string;
  title: string;
  description: string;
  streamerId: string;
  courseId?: string;
  scheduledStartTime?: string;
  actualStartTime?: string;
  endTime?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  streamKey: string;
  rtmpUrl: string;
  playbackUrl: string;
  maxViewers?: number;
  currentViewers: number;
  totalViews: number;
  isRecorded: boolean;
  recordingUrl?: string;
  settings: {
    allowChat: boolean;
    allowQuestions: boolean;
    moderationEnabled: boolean;
    isPublic: boolean;
    requireAuth: boolean;
    enableScreenShare: boolean;
    enableWhiteboard: boolean;
  };
  metadata: {
    tags: string[];
    category: string;
    difficulty: string;
    language: string;
    estimatedDuration?: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface StreamMessage {
  id: string;
  streamId: string;
  userId: string;
  type: 'chat' | 'question' | 'announcement' | 'system';
  content: string;
  timestamp: string;
  isModerated: boolean;
  isHighlighted: boolean;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  metadata?: {
    reactions?: { [emoji: string]: number };
    isAnswered?: boolean;
    isSticky?: boolean;
  };
}

interface VideoLiveStreamingProps {
  userId?: string;
  streamId?: string;
  isCreator?: boolean;
  courseId?: string;
  onStreamEnd?: (streamId: string) => void;
}

export function VideoLiveStreaming({
  userId,
  streamId,
  isCreator = false,
  courseId,
  onStreamEnd
}: VideoLiveStreamingProps) {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [currentStream, setCurrentStream] = useState<LiveStream | null>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'chat' | 'question'>('chat');
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  
  // Stream creation form
  const [streamForm, setStreamForm] = useState({
    title: '',
    description: '',
    scheduledStartTime: '',
    isRecorded: true,
    allowChat: true,
    allowQuestions: true,
    isPublic: true,
    estimatedDuration: 60,
  });

  // WebSocket connection
  const [socket, setSocket] = useState<Socket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStreams();
    
    if (streamId) {
      loadStreamDetails();
      initializeSocket();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [streamId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadStreams = async () => {
    try {
      setLoading(true);
      let url = '/api/livestreams';
      
      if (courseId) {
        url = `/api/livestreams/course/${courseId}/streams`;
      } else if (isCreator) {
        url = '/api/livestreams/my-streams';
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStreams(data.streams || data);
      }
    } catch (error) {
      console.error('Failed to load streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStreamDetails = async () => {
    if (!streamId) return;

    try {
      const response = await fetch(`/api/livestreams/${streamId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const stream = await response.json();
        setCurrentStream(stream);
        setViewerCount(stream.currentViewers);
      }
    } catch (error) {
      console.error('Failed to load stream details:', error);
    }
  };

  const initializeSocket = () => {
    const newSocket = io('/livestream', {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    newSocket.on('connect', () => {
      if (streamId && userId) {
        newSocket.emit('join-stream', { streamId, userId });
      }
    });

    newSocket.on('stream-joined', (data) => {
      setCurrentStream(data.stream);
      setMessages(data.recentMessages);
      setViewerCount(data.stream.currentViewers);
    });

    newSocket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('viewer-joined', (data) => {
      setViewerCount(data.currentViewers);
    });

    newSocket.on('viewer-left', (data) => {
      setViewerCount(data.currentViewers);
    });

    newSocket.on('stream-started', (data) => {
      if (currentStream) {
        setCurrentStream(prev => prev ? { ...prev, status: 'live' } : null);
      }
    });

    newSocket.on('stream-ended', (data) => {
      if (currentStream) {
        setCurrentStream(prev => prev ? { ...prev, status: 'ended' } : null);
        onStreamEnd?.(data.streamId);
      }
    });

    newSocket.on('settings-updated', (data) => {
      if (currentStream) {
        setCurrentStream(prev => prev ? { ...prev, settings: data.settings } : null);
      }
    });

    setSocket(newSocket);
  };

  const createStream = async () => {
    try {
      const response = await fetch('/api/livestreams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...streamForm,
          courseId,
          scheduledStartTime: streamForm.scheduledStartTime ? 
            new Date(streamForm.scheduledStartTime).toISOString() : undefined,
          settings: {
            allowChat: streamForm.allowChat,
            allowQuestions: streamForm.allowQuestions,
            isPublic: streamForm.isPublic,
          },
          metadata: {
            estimatedDuration: streamForm.estimatedDuration,
          },
        }),
      });

      if (response.ok) {
        const stream = await response.json();
        setStreams(prev => [stream, ...prev]);
        setShowCreateForm(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create stream');
      }
    } catch (error) {
      console.error('Failed to create stream:', error);
      alert('Failed to create stream');
    }
  };

  const startStream = async (streamId: string) => {
    try {
      const response = await fetch(`/api/livestreams/${streamId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const updatedStream = await response.json();
        setCurrentStream(updatedStream);
        setIsStreaming(true);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to start stream');
      }
    } catch (error) {
      console.error('Failed to start stream:', error);
      alert('Failed to start stream');
    }
  };

  const endStream = async (streamId: string) => {
    try {
      const response = await fetch(`/api/livestreams/${streamId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const updatedStream = await response.json();
        setCurrentStream(updatedStream);
        setIsStreaming(false);
        onStreamEnd?.(streamId);
      }
    } catch (error) {
      console.error('Failed to end stream:', error);
    }
  };

  const sendMessage = () => {
    if (!socket || !newMessage.trim() || !streamId) return;

    socket.emit('send-message', {
      streamId,
      userId,
      content: newMessage,
      type: messageType,
    });

    setNewMessage('');
  };

  const resetForm = () => {
    setStreamForm({
      title: '',
      description: '',
      scheduledStartTime: '',
      isRecorded: true,
      allowChat: true,
      allowQuestions: true,
      isPublic: true,
      estimatedDuration: 60,
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live': return <Radio className="h-4 w-4 animate-pulse" />;
      case 'scheduled': return <Calendar className="h-4 w-4" />;
      case 'ended': return <Square className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
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

  // Stream Viewer Interface
  if (streamId && currentStream && !isCreator) {
    return (
      <div className="space-y-4">
        {/* Stream Player */}
        <Card>
          <CardContent className="p-0">
            <div className="aspect-video bg-black rounded-t-lg relative overflow-hidden">
              {currentStream.status === 'live' ? (
                <video
                  ref={videoRef}
                  className="w-full h-full"
                  controls
                  autoPlay
                  src={currentStream.playbackUrl}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <Radio className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">
                      {currentStream.status === 'scheduled' ? 'Stream Starting Soon' : 'Stream Ended'}
                    </h3>
                    <p className="text-gray-300">
                      {currentStream.status === 'scheduled' && currentStream.scheduledStartTime && 
                        `Scheduled for ${new Date(currentStream.scheduledStartTime).toLocaleString()}`
                      }
                      {currentStream.status === 'ended' && currentStream.recordingUrl && 
                        'Recording will be available soon'
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Live indicator */}
              {currentStream.status === 'live' && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  LIVE
                </div>
              )}

              {/* Viewer count */}
              <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{viewerCount}</span>
              </div>
            </div>

            <div className="p-4">
              <h1 className="text-xl font-bold mb-2">{currentStream.title}</h1>
              <p className="text-gray-600 mb-3">{currentStream.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{currentStream.totalViews} total views</span>
                </div>
                {currentStream.metadata.estimatedDuration && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(currentStream.metadata.estimatedDuration)}</span>
                  </div>
                )}
                {currentStream.isRecorded && (
                  <Badge variant="outline" className="text-xs">
                    Recording enabled
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat and Questions */}
        {(currentStream.settings.allowChat || currentStream.settings.allowQuestions) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              {/* Stream content area - could include whiteboard, screen share, etc. */}
            </div>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Live Chat
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-0">
                {/* Messages */}
                <div className="h-64 overflow-y-auto p-4 space-y-2 border-b">
                  {messages.map(message => (
                    <div 
                      key={message.id} 
                      className={`text-sm ${
                        message.type === 'announcement' ? 'bg-blue-50 p-2 rounded' :
                        message.type === 'question' ? 'bg-yellow-50 p-2 rounded' :
                        ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-xs">
                          {message.author?.firstName} {message.author?.lastName}
                        </span>
                        {message.type === 'question' && (
                          <Badge variant="outline" className="text-xs">Q</Badge>
                        )}
                        {message.isHighlighted && (
                          <Star className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-gray-800">{message.content}</p>
                      
                      {message.metadata?.reactions && (
                        <div className="flex items-center gap-1 mt-1">
                          {Object.entries(message.metadata.reactions).map(([emoji, count]) => (
                            <Button
                              key={emoji}
                              variant="ghost"
                              size="sm"
                              className="text-xs p-1 h-auto"
                            >
                              {emoji} {count}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {currentStream.status === 'live' && (
                  <div className="p-4 space-y-3">
                    {currentStream.settings.allowQuestions && (
                      <Select 
                        value={messageType} 
                        onValueChange={setMessageType as any}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chat">💬 Chat</SelectItem>
                          <SelectItem value="question">❓ Question</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={messageType === 'question' ? 'Ask a question...' : 'Type a message...'}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        className="text-sm"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        size="sm"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Stream Creator Interface
  if (isCreator && currentStream) {
    return (
      <div className="space-y-6">
        {/* Stream Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5" />
                {currentStream.title}
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(currentStream.status)}>
                  {getStatusIcon(currentStream.status)}
                  <span className="ml-1 capitalize">{currentStream.status}</span>
                </Badge>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Eye className="h-4 w-4" />
                  <span>{viewerCount} viewers</span>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* RTMP Info */}
            <div className="bg-gray-50 p-4 rounded space-y-2">
              <h4 className="font-medium text-sm">Streaming Setup</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-gray-600">RTMP URL:</label>
                  <div className="flex items-center gap-2">
                    <code className="bg-white p-1 rounded text-xs flex-1 truncate">
                      {currentStream.rtmpUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(currentStream.rtmpUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-gray-600">Stream Key:</label>
                  <div className="flex items-center gap-2">
                    <code className="bg-white p-1 rounded text-xs flex-1 truncate">
                      {currentStream.streamKey}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(currentStream.streamKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stream Controls */}
            <div className="flex items-center gap-3">
              {currentStream.status === 'scheduled' && (
                <Button
                  onClick={() => startStream(currentStream.id)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                >
                  <Play className="h-4 w-4" />
                  Go Live
                </Button>
              )}
              
              {currentStream.status === 'live' && (
                <Button
                  onClick={() => endStream(currentStream.id)}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  End Stream
                </Button>
              )}

              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              
              <Button variant="outline" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
              
              <Button variant="outline" className="flex items-center gap-2">
                <Share className="h-4 w-4" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Messages and Moderation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-y-auto space-y-2 text-sm">
                {messages.filter(m => m.type === 'chat').map(message => (
                  <div key={message.id} className="flex items-start gap-2">
                    <span className="font-semibold text-xs">
                      {message.author?.firstName}:
                    </span>
                    <span className="flex-1">{message.content}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-y-auto space-y-2 text-sm">
                {messages.filter(m => m.type === 'question').map(message => (
                  <div key={message.id} className="bg-yellow-50 p-2 rounded">
                    <div className="font-semibold text-xs mb-1">
                      {message.author?.firstName} {message.author?.lastName}
                    </div>
                    <p>{message.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="sm" variant="outline" className="text-xs">
                        Answer
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs">
                        <Star className="h-3 w-3" />
                        Highlight
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Stream Browser Interface
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Radio className="h-6 w-6" />
          Live Streaming
        </h2>
        
        {isCreator && (
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Radio className="h-4 w-4" />
            Create Stream
          </Button>
        )}
      </div>

      {/* Live Streams Grid */}
      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">🔴 Live Now</TabsTrigger>
          <TabsTrigger value="scheduled">📅 Scheduled</TabsTrigger>
          <TabsTrigger value="ended">📼 Past Streams</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          {streams.filter(s => s.status === 'live').length === 0 ? (
            <div className="text-center py-12">
              <Radio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No live streams</h3>
              <p className="text-gray-600">Check back later for live content</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {streams.filter(s => s.status === 'live').map(stream => (
                <Card key={stream.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge className={getStatusColor(stream.status)}>
                          {getStatusIcon(stream.status)}
                          <span className="ml-1">LIVE</span>
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Eye className="h-4 w-4" />
                          <span>{stream.currentViewers}</span>
                        </div>
                      </div>

                      <h3 className="font-semibold">{stream.title}</h3>
                      <p className="text-gray-600 text-sm line-clamp-2">{stream.description}</p>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {stream.metadata.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {stream.metadata.difficulty}
                        </Badge>
                      </div>

                      <Button className="w-full flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        Watch Live
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {streams.filter(s => s.status === 'scheduled').map(stream => (
              <Card key={stream.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <Badge className={getStatusColor(stream.status)}>
                      {getStatusIcon(stream.status)}
                      <span className="ml-1">Scheduled</span>
                    </Badge>

                    <h3 className="font-semibold">{stream.title}</h3>
                    <p className="text-gray-600 text-sm">{stream.description}</p>

                    {stream.scheduledStartTime && (
                      <div className="text-sm text-gray-600">
                        <Clock className="h-4 w-4 inline mr-1" />
                        {new Date(stream.scheduledStartTime).toLocaleString()}
                      </div>
                    )}

                    <Button variant="outline" className="w-full">
                      Set Reminder
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ended">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {streams.filter(s => s.status === 'ended').map(stream => (
              <Card key={stream.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <Badge className={getStatusColor(stream.status)}>
                      {getStatusIcon(stream.status)}
                      <span className="ml-1">Ended</span>
                    </Badge>

                    <h3 className="font-semibold">{stream.title}</h3>
                    <p className="text-gray-600 text-sm">{stream.description}</p>

                    <div className="text-sm text-gray-600">
                      <span>{stream.totalViews} views</span>
                      {stream.endTime && (
                        <span className="ml-2">
                          Ended {new Date(stream.endTime).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {stream.recordingUrl ? (
                      <Button className="w-full flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        Watch Recording
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        Recording Processing...
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Stream Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create Live Stream</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={streamForm.title}
                  onChange={(e) => setStreamForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter stream title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={streamForm.description}
                  onChange={(e) => setStreamForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your stream"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Scheduled Start (Optional)</label>
                <Input
                  type="datetime-local"
                  value={streamForm.scheduledStartTime}
                  onChange={(e) => setStreamForm(prev => ({ ...prev, scheduledStartTime: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Estimated Duration (minutes)</label>
                <Input
                  type="number"
                  value={streamForm.estimatedDuration}
                  onChange={(e) => setStreamForm(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) }))}
                  min="5"
                  max="480"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isRecorded"
                    checked={streamForm.isRecorded}
                    onCheckedChange={(checked) => 
                      setStreamForm(prev => ({ ...prev, isRecorded: checked as boolean }))
                    }
                  />
                  <label htmlFor="isRecorded" className="text-sm">Record stream</label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="allowChat"
                    checked={streamForm.allowChat}
                    onCheckedChange={(checked) => 
                      setStreamForm(prev => ({ ...prev, allowChat: checked as boolean }))
                    }
                  />
                  <label htmlFor="allowChat" className="text-sm">Allow chat</label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="allowQuestions"
                    checked={streamForm.allowQuestions}
                    onCheckedChange={(checked) => 
                      setStreamForm(prev => ({ ...prev, allowQuestions: checked as boolean }))
                    }
                  />
                  <label htmlFor="allowQuestions" className="text-sm">Allow questions</label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isPublic"
                    checked={streamForm.isPublic}
                    onCheckedChange={(checked) => 
                      setStreamForm(prev => ({ ...prev, isPublic: checked as boolean }))
                    }
                  />
                  <label htmlFor="isPublic" className="text-sm">Public stream</label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createStream}
                  disabled={!streamForm.title.trim() || !streamForm.description.trim()}
                >
                  Create Stream
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}