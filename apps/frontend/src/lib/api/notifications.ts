import { api } from './base';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'system' | 'email' | 'sms' | 'push' | 'in_app';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  metadata?: any;
  scheduledFor?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  clickedAt?: string;
  failureReason?: string;
  retryCount: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  category: string;
  type: string;
  enabled: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
  customSettings?: {
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
    maxPerDay?: number;
    keywords?: string[];
    excludeKeywords?: string[];
    minPriority?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  type?: string;
  unreadOnly?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    unreadCount: number;
  };
}

export interface CreateNotificationDto {
  title: string;
  message: string;
  type?: string;
  priority?: string;
  category: string;
  metadata?: any;
  scheduledFor?: string;
}

export interface UpdateNotificationPreferenceDto {
  enabled?: boolean;
  frequency?: string;
  customSettings?: any;
}

export interface BulkNotificationUpdate {
  category: string;
  type: string;
  updates: UpdateNotificationPreferenceDto;
}

export const notificationsAPI = {
  // Get user notifications with filtering and pagination
  getNotifications: async (query: NotificationQuery = {}): Promise<NotificationsResponse> => {
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
    
    const queryString = searchParams.toString();
    const url = queryString ? `/notifications?${queryString}` : '/notifications';
    
    return api.get(url);
  },

  // Get count of unread notifications
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    return api.get('/notifications/unread-count');
  },

  // Get user notification preferences
  getPreferences: async (): Promise<{ success: boolean; data: NotificationPreference[] }> => {
    return api.get('/notifications/preferences');
  },

  // Update notification preferences
  updatePreferences: async (preferences: BulkNotificationUpdate[]): Promise<{ success: boolean; message: string }> => {
    return api.put('/notifications/preferences', preferences);
  },

  // Mark notification as read
  markAsRead: async (notificationId: string): Promise<{ success: boolean; message: string }> => {
    return api.put(`/notifications/${notificationId}/read`);
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<{ success: boolean; message: string }> => {
    return api.put('/notifications/mark-all-read');
  },

  // Delete notification
  deleteNotification: async (notificationId: string): Promise<{ success: boolean; message: string }> => {
    return api.delete(`/notifications/${notificationId}`);
  },

  // Delete all notifications
  deleteAllNotifications: async (): Promise<{ success: boolean; message: string }> => {
    return api.delete('/notifications');
  },

  // Admin endpoints
  // Send broadcast notification (Admin only)
  broadcastNotification: async (notificationData: CreateNotificationDto): Promise<{ success: boolean; message: string }> => {
    return api.post('/notifications/broadcast', notificationData);
  },

  // Send notification to specific users (Admin only)
  sendToUsers: async (data: {
    userIds: string[];
    notification: CreateNotificationDto;
  }): Promise<{ success: boolean; message: string }> => {
    return api.post('/notifications/send-to-users', data);
  },

  // Get notification templates (Admin only)
  getTemplates: async (query: { category?: string; locale?: string } = {}): Promise<{ success: boolean; data: any[] }> => {
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    });
    
    const queryString = searchParams.toString();
    const url = queryString ? `/notifications/templates?${queryString}` : '/notifications/templates';
    
    return api.get(url);
  },

  // Create notification template (Admin only)
  createTemplate: async (templateData: any): Promise<{ success: boolean; data: any; message: string }> => {
    return api.post('/notifications/templates', templateData);
  },

  // Update notification template (Admin only)
  updateTemplate: async (templateId: string, templateData: any): Promise<{ success: boolean; data: any; message: string }> => {
    return api.put(`/notifications/templates/${templateId}`, templateData);
  },

  // Get notification analytics (Admin only)
  getAnalytics: async (query: {
    startDate?: string;
    endDate?: string;
    organizationId?: string;
    category?: string;
    type?: string;
  } = {}): Promise<{ success: boolean; data: any }> => {
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    });
    
    const queryString = searchParams.toString();
    const url = queryString ? `/notifications/analytics?${queryString}` : '/notifications/analytics';
    
    return api.get(url);
  },

  // Send test notification (Development only)
  sendTestNotification: async (testData: { type: string; userId?: string }): Promise<{ success: boolean; message: string }> => {
    return api.post('/notifications/test', testData);
  },
};