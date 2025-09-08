import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from auth header or query
      const token = this.extractTokenFromClient(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub || payload.id;
      client.userEmail = payload.email;
      client.userRole = payload.role;

      // Track connected user
      if (!this.connectedUsers.has(client.userId)) {
        this.connectedUsers.set(client.userId, new Set());
      }
      this.connectedUsers.get(client.userId)!.add(client.id);

      // Join user-specific room
      await client.join(`user:${client.userId}`);
      
      // Join role-specific room
      if (client.userRole) {
        await client.join(`role:${client.userRole}`);
      }

      this.logger.log(`User ${client.userEmail} (${client.userId}) connected via socket ${client.id}`);
      
      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to notification service',
        userId: client.userId,
        timestamp: new Date().toISOString(),
      });

      // Send any pending notifications
      await this.sendPendingNotifications(client);
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
      client.emit('auth-error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.connectedUsers.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(client.userId);
        }
      }
      this.logger.log(`User ${client.userEmail} (${client.userId}) disconnected from socket ${client.id}`);
    } else {
      this.logger.log(`Unauthenticated client ${client.id} disconnected`);
    }
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;
    
    const allowedRooms = [
      `user:${client.userId}`,
      `role:${client.userRole}`,
      `organization:${data.room}`,
      'global',
    ];
    
    if (allowedRooms.some(room => data.room.startsWith(room.split(':')[0]))) {
      client.join(data.room);
      this.logger.log(`User ${client.userId} joined room: ${data.room}`);
      client.emit('room-joined', { room: data.room });
    } else {
      client.emit('error', { message: 'Not authorized to join this room' });
    }
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client.leave(data.room);
    this.logger.log(`User ${client.userId} left room: ${data.room}`);
    client.emit('room-left', { room: data.room });
  }

  @SubscribeMessage('mark-notification-read')
  handleMarkNotificationRead(
    @MessageBody() data: { notificationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    // Emit to all user's connected devices
    this.server
      .to(`user:${client.userId}`)
      .emit('notification-read', {
        notificationId: data.notificationId,
        userId: client.userId,
        timestamp: new Date().toISOString(),
      });
  }

  @SubscribeMessage('request-unread-count')
  async handleRequestUnreadCount(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) return;

    try {
      // TODO: Get actual unread count from database
      const unreadCount = await this.getUnreadCount(client.userId);
      
      client.emit('unread-count-update', {
        count: unreadCount,
        userId: client.userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to fetch unread count' });
    }
  }

  // Public methods for sending notifications
  async sendNotificationToUser(userId: string, notification: any) {
    const room = `user:${userId}`;
    this.server.to(room).emit('new-notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Sent notification to user ${userId}: ${notification.title}`);
  }

  async sendNotificationToRole(role: string, notification: any) {
    const room = `role:${role}`;
    this.server.to(room).emit('new-notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Sent notification to role ${role}: ${notification.title}`);
  }

  async broadcastNotification(notification: any) {
    this.server.emit('new-notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Broadcasted notification: ${notification.title}`);
  }

  async updateUnreadCount(userId: string, count: number) {
    const room = `user:${userId}`;
    this.server.to(room).emit('unread-count-update', {
      count,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  async sendSystemAlert(level: 'info' | 'warning' | 'error', message: string) {
    this.server.emit('system-alert', {
      level,
      message,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.log(`Sent system alert (${level}): ${message}`);
  }

  // Helper methods
  private extractTokenFromClient(client: Socket): string | null {
    // Try to get token from auth header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Try to get token from query params
    const token = client.handshake.query.token as string;
    if (token) {
      return token;
    }
    
    return null;
  }

  private async sendPendingNotifications(client: AuthenticatedSocket) {
    try {
      // TODO: Fetch pending notifications from database
      const pendingNotifications = await this.getPendingNotifications(client.userId!);
      
      for (const notification of pendingNotifications) {
        client.emit('new-notification', notification);
      }
      
      if (pendingNotifications.length > 0) {
        this.logger.log(`Sent ${pendingNotifications.length} pending notifications to user ${client.userId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send pending notifications to user ${client.userId}:`, error);
    }
  }

  private async getPendingNotifications(userId: string): Promise<any[]> {
    // Mock implementation - replace with actual database query
    return [];
  }

  private async getUnreadCount(userId: string): Promise<number> {
    // Mock implementation - replace with actual database query
    return Math.floor(Math.random() * 10);
  }

  // Health check method
  getConnectionStats() {
    const totalConnections = Array.from(this.connectedUsers.values())
      .reduce((sum, sockets) => sum + sockets.size, 0);
    
    return {
      totalUsers: this.connectedUsers.size,
      totalConnections,
      averageConnectionsPerUser: totalConnections / (this.connectedUsers.size || 1),
      connectedUsers: Array.from(this.connectedUsers.keys()),
    };
  }
}