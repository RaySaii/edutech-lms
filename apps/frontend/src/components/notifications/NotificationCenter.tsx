'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  BookOpen, 
  User, 
  MessageSquare, 
  AlertCircle,
  Calendar,
  Award,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface Notification {
  id: string;
  type: 'course_update' | 'assignment_due' | 'message' | 'achievement' | 'system' | 'enrollment';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: any;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Mock notification data - replace with API call
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'course_update',
          title: 'New Lesson Available',
          message: 'A new lesson "Advanced JavaScript Concepts" has been added to your course.',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          isRead: false,
          actionUrl: '/courses/js-fundamentals',
          metadata: { courseId: 'js-fundamentals', lessonId: 'advanced-concepts' }
        },
        {
          id: '2',
          type: 'assignment_due',
          title: 'Assignment Due Soon',
          message: 'Your assignment "JavaScript Functions Quiz" is due in 2 hours.',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          isRead: false,
          actionUrl: '/quiz/js-functions-quiz',
          metadata: { dueDate: new Date(Date.now() + 7200000).toISOString() }
        },
        {
          id: '3',
          type: 'achievement',
          title: 'Achievement Unlocked!',
          message: 'You have completed your first course! Keep up the great work.',
          timestamp: new Date(Date.now() - 14400000).toISOString(),
          isRead: true,
          metadata: { achievement: 'first_completion' }
        },
        {
          id: '4',
          type: 'message',
          title: 'New Message from Instructor',
          message: 'John Doe: "Great job on the recent assignment! Here is some additional feedback..."',
          timestamp: new Date(Date.now() - 21600000).toISOString(),
          isRead: false,
          actionUrl: '/messages/instructor-feedback',
          metadata: { from: 'John Doe', messageId: 'msg-123' }
        },
        {
          id: '5',
          type: 'enrollment',
          title: 'Course Enrollment Confirmed',
          message: 'You have been successfully enrolled in React Advanced Patterns.',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          isRead: true,
          actionUrl: '/courses/react-advanced',
          metadata: { courseId: 'react-advanced' }
        },
        {
          id: '6',
          type: 'system',
          title: 'System Maintenance Notice',
          message: 'The platform will be under maintenance on Sunday from 2 AM to 4 AM.',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          isRead: true,
          metadata: { maintenanceWindow: '2024-01-15T02:00:00Z' }
        }
      ];

      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // API call to mark notification as read
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // API call to mark all notifications as read
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // API call to delete notification
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'course_update':
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case 'assignment_due':
        return <Calendar className="h-5 w-5 text-orange-500" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case 'achievement':
        return <Award className="h-5 w-5 text-yellow-500" />;
      case 'system':
        return <Settings className="h-5 w-5 text-gray-500" />;
      case 'enrollment':
        return <User className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notification =>
    filter === 'all' || !notification.isRead
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pointer-events-none">
      <Card className="w-96 max-h-[600px] pointer-events-auto shadow-xl border bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex space-x-1 mt-3">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-sm text-gray-500">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length > 0 ? (
              <div className="divide-y">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${
                            !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-1 ml-2">
                            {!notification.isRead && (
                              <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          
                          <div className="flex space-x-2">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs h-6 px-2"
                              >
                                Mark read
                              </Button>
                            )}
                            {notification.actionUrl && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  markAsRead(notification.id);
                                  window.location.href = notification.actionUrl!;
                                }}
                                className="text-xs h-6 px-2"
                              >
                                View
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </p>
              </div>
            )}
          </div>
          
          {filteredNotifications.length > 0 && (
            <div className="p-4 border-t bg-gray-50">
              <Button variant="outline" size="sm" className="w-full">
                View All Notifications
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}