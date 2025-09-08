import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@edutech-lms/database';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
    browser: string;
    os: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
  };
  location: {
    ip: string;
    country?: string;
    city?: string;
    timezone?: string;
  };
  isActive: boolean;
  lastActivityAt: Date;
  expiresAt: Date;
  createdAt: Date;
  metadata?: {
    loginMethod: 'password' | 'oauth' | 'sso' | 'magic-link';
    isTrustedDevice: boolean;
    requiresMfa: boolean;
    mfaVerified: boolean;
  };
}

export interface SessionActivity {
  id: string;
  sessionId: string;
  userId: string;
  action: string;
  resource?: string;
  resourceId?: string;
  timestamp: Date;
  ip: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class SessionManagementService {
  private readonly logger = new Logger(SessionManagementService.name);
  private readonly sessions = new Map<string, UserSession>();
  private readonly sessionActivities = new Map<string, SessionActivity[]>();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async createSession(
    userId: string,
    deviceInfo: UserSession['deviceInfo'],
    location: UserSession['location'],
    metadata: UserSession['metadata']
  ): Promise<{ session: UserSession; tokens: { accessToken: string; refreshToken: string } }> {
    const sessionId = crypto.randomUUID();
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    const session: UserSession = {
      id: sessionId,
      userId,
      sessionToken: await bcrypt.hash(sessionToken, 10),
      deviceInfo,
      location,
      isActive: true,
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date(),
      metadata,
    };

    this.sessions.set(sessionId, session);
    this.sessionActivities.set(sessionId, []);

    // Generate JWT tokens
    const payload = {
      sub: userId,
      sessionId,
      deviceId: this.generateDeviceId(deviceInfo),
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES', '15m'),
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES', '7d'),
      }
    );

    await this.logActivity(sessionId, userId, 'session_created', location.ip);

    this.logger.log(`Session created for user ${userId}: ${sessionId}`);
    return {
      session,
      tokens: { accessToken, refreshToken },
    };
  }

  async validateSession(sessionId: string, sessionToken?: string): Promise<UserSession | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return null;
    }

    // Check expiration
    if (session.expiresAt < new Date()) {
      await this.invalidateSession(sessionId);
      return null;
    }

    // Validate session token if provided
    if (sessionToken && !await bcrypt.compare(sessionToken, session.sessionToken)) {
      return null;
    }

    // Update last activity
    session.lastActivityAt = new Date();
    this.sessions.set(sessionId, session);

    return session;
  }

  async refreshTokens(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const session = await this.validateSession(payload.sessionId);
      if (!session) {
        throw new UnauthorizedException('Session invalid or expired');
      }

      // Generate new tokens
      const newPayload = {
        sub: payload.sub,
        sessionId: payload.sessionId,
        deviceId: payload.deviceId,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES', '15m'),
      });

      const newRefreshToken = this.jwtService.sign(
        { ...newPayload, type: 'refresh' },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES', '7d'),
        }
      );

      await this.logActivity(payload.sessionId, payload.sub, 'tokens_refreshed', session.location.ip);

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      return null;
    }
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    return Array.from(this.sessions.values()).filter(
      session => session.userId === userId && session.isActive
    );
  }

  async invalidateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessions.set(sessionId, session);
      await this.logActivity(sessionId, session.userId, 'session_invalidated', session.location.ip);
      this.logger.log(`Session invalidated: ${sessionId}`);
    }
  }

  async invalidateAllUserSessions(userId: string, excludeSessionId?: string): Promise<number> {
    let invalidatedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId && session.isActive && sessionId !== excludeSessionId) {
        await this.invalidateSession(sessionId);
        invalidatedCount++;
      }
    }

    this.logger.log(`Invalidated ${invalidatedCount} sessions for user ${userId}`);
    return invalidatedCount;
  }

  async invalidateExpiredSessions(): Promise<number> {
    let expiredCount = 0;
    const now = new Date();
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.isActive && session.expiresAt < now) {
        await this.invalidateSession(sessionId);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.logger.log(`Cleaned up ${expiredCount} expired sessions`);
    }
    
    return expiredCount;
  }

  async logActivity(
    sessionId: string,
    userId: string,
    action: string,
    ip: string,
    resource?: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const activity: SessionActivity = {
      id: crypto.randomUUID(),
      sessionId,
      userId,
      action,
      resource,
      resourceId,
      timestamp: new Date(),
      ip,
      metadata,
    };

    const sessionActivities = this.sessionActivities.get(sessionId) || [];
    sessionActivities.push(activity);
    
    // Keep only last 100 activities per session
    if (sessionActivities.length > 100) {
      sessionActivities.splice(0, sessionActivities.length - 100);
    }
    
    this.sessionActivities.set(sessionId, sessionActivities);
  }

  async getSessionActivity(
    sessionId: string,
    limit: number = 50
  ): Promise<SessionActivity[]> {
    const activities = this.sessionActivities.get(sessionId) || [];
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getUserActivity(
    userId: string,
    limit: number = 100
  ): Promise<SessionActivity[]> {
    const allActivities: SessionActivity[] = [];
    
    for (const activities of this.sessionActivities.values()) {
      allActivities.push(...activities.filter(a => a.userId === userId));
    }

    return allActivities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getSecuritySummary(userId: string): Promise<{
    activeSessions: number;
    totalSessions: number;
    lastLoginAt: Date | null;
    uniqueDevices: number;
    uniqueLocations: number;
    suspiciousActivity: {
      multipleLocations: boolean;
      unusualDevices: boolean;
      failedLogins: number;
    };
  }> {
    const userSessions = Array.from(this.sessions.values()).filter(
      session => session.userId === userId
    );

    const activeSessions = userSessions.filter(s => s.isActive).length;
    const uniqueDevices = new Set(userSessions.map(s => this.generateDeviceId(s.deviceInfo))).size;
    const uniqueLocations = new Set(userSessions.map(s => `${s.location.country}-${s.location.city}`)).size;
    
    const lastLoginAt = userSessions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt || null;

    // Analyze suspicious activity
    const recentSessions = userSessions.filter(
      s => s.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const multipleLocations = new Set(
      recentSessions.map(s => s.location.country)
    ).size > 1;

    const knownDevices = await this.getTrustedDevices(userId);
    const unusualDevices = recentSessions.some(
      s => !knownDevices.includes(this.generateDeviceId(s.deviceInfo))
    );

    return {
      activeSessions,
      totalSessions: userSessions.length,
      lastLoginAt,
      uniqueDevices,
      uniqueLocations,
      suspiciousActivity: {
        multipleLocations,
        unusualDevices,
        failedLogins: 0, // Would track from failed login attempts
      },
    };
  }

  private generateDeviceId(deviceInfo: UserSession['deviceInfo']): string {
    const deviceString = `${deviceInfo.platform}-${deviceInfo.browser}-${deviceInfo.os}`;
    return crypto.createHash('sha256').update(deviceString).digest('hex').substring(0, 16);
  }

  private async getTrustedDevices(userId: string): Promise<string[]> {
    // In a real implementation, this would query a database of trusted devices
    return [];
  }

  async markDeviceAsTrusted(userId: string, deviceInfo: UserSession['deviceInfo']): Promise<void> {
    const deviceId = this.generateDeviceId(deviceInfo);
    // In a real implementation, store this in the database
    this.logger.log(`Device marked as trusted for user ${userId}: ${deviceId}`);
  }

  async revokeDeviceTrust(userId: string, deviceId: string): Promise<void> {
    // In a real implementation, remove from database and invalidate related sessions
    this.logger.log(`Device trust revoked for user ${userId}: ${deviceId}`);
  }
}