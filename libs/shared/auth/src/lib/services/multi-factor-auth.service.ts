import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '@edutech-lms/database';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

export interface MfaSecret {
  id: string;
  userId: string;
  secret: string;
  backupCodes: string[];
  isVerified: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
  recoveryEmail?: string;
  recoveryPhone?: string;
}

export interface MfaMethod {
  type: 'totp' | 'sms' | 'email' | 'backup_code';
  isEnabled: boolean;
  isVerified: boolean;
  metadata?: Record<string, any>;
}

export interface MfaChallenge {
  id: string;
  userId: string;
  method: string;
  challenge: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  isUsed: boolean;
  createdAt: Date;
}

@Injectable()
export class MultiFactorAuthService {
  private readonly logger = new Logger(MultiFactorAuthService.name);
  private readonly mfaSecrets = new Map<string, MfaSecret>();
  private readonly mfaChallenges = new Map<string, MfaChallenge>();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async setupTotp(userId: string): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `${user.email} (EduTech LMS)`,
      issuer: 'EduTech LMS',
      length: 32,
    });

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store MFA secret
    const mfaSecret: MfaSecret = {
      id: crypto.randomUUID(),
      userId,
      secret: secret.base32,
      backupCodes: await this.hashBackupCodes(backupCodes),
      isVerified: false,
      createdAt: new Date(),
    };

    this.mfaSecrets.set(userId, mfaSecret);

    // Generate QR code
    const qrCodeUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: user.email,
      issuer: 'EduTech LMS',
      encoding: 'base32',
    });

    const qrCode = await QRCode.toDataURL(qrCodeUrl);

    this.logger.log(`TOTP setup initiated for user ${userId}`);

    return {
      secret: secret.base32,
      qrCode,
      backupCodes, // Return unhashed codes for user to save
    };
  }

  async verifyTotpSetup(userId: string, token: string): Promise<boolean> {
    const mfaSecret = this.mfaSecrets.get(userId);
    if (!mfaSecret) {
      throw new BadRequestException('MFA setup not found');
    }

    const verified = speakeasy.totp.verify({
      secret: mfaSecret.secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps tolerance
    });

    if (verified) {
      mfaSecret.isVerified = true;
      mfaSecret.lastUsedAt = new Date();
      this.mfaSecrets.set(userId, mfaSecret);

      // Enable MFA for user
      await this.userRepository.update(userId, {
        mfaEnabled: true,
        mfaSecret: mfaSecret.secret,
      });

      this.logger.log(`TOTP setup completed for user ${userId}`);
    }

    return verified;
  }

  async generateMfaChallenge(
    userId: string,
    method: 'totp' | 'sms' | 'email' = 'totp'
  ): Promise<MfaChallenge> {
    const challengeId = crypto.randomUUID();
    
    let challenge = '';
    let expiresIn = 300000; // 5 minutes default

    switch (method) {
      case 'totp':
        challenge = 'Enter your authenticator app code';
        break;
      case 'sms':
        challenge = this.generateSmsCode();
        await this.sendSmsCode(userId, challenge);
        expiresIn = 600000; // 10 minutes for SMS
        break;
      case 'email':
        challenge = this.generateEmailCode();
        await this.sendEmailCode(userId, challenge);
        expiresIn = 900000; // 15 minutes for email
        break;
    }

    const mfaChallenge: MfaChallenge = {
      id: challengeId,
      userId,
      method,
      challenge,
      expiresAt: new Date(Date.now() + expiresIn),
      attempts: 0,
      maxAttempts: 3,
      isUsed: false,
      createdAt: new Date(),
    };

    this.mfaChallenges.set(challengeId, mfaChallenge);

    this.logger.log(`MFA challenge created for user ${userId} using method ${method}`);
    return mfaChallenge;
  }

  async verifyMfaChallenge(
    challengeId: string,
    code: string,
    userId?: string
  ): Promise<boolean> {
    const challenge = this.mfaChallenges.get(challengeId);
    if (!challenge) {
      throw new BadRequestException('Challenge not found');
    }

    if (userId && challenge.userId !== userId) {
      throw new UnauthorizedException('Challenge does not belong to user');
    }

    if (challenge.isUsed) {
      throw new BadRequestException('Challenge already used');
    }

    if (challenge.expiresAt < new Date()) {
      throw new BadRequestException('Challenge expired');
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      throw new BadRequestException('Too many attempts');
    }

    // Increment attempts
    challenge.attempts++;
    this.mfaChallenges.set(challengeId, challenge);

    let isValid = false;

    switch (challenge.method) {
      case 'totp':
        isValid = await this.verifyTotpCode(challenge.userId, code);
        break;
      case 'sms':
      case 'email':
        isValid = challenge.challenge === code;
        break;
      default:
        throw new BadRequestException('Invalid challenge method');
    }

    if (isValid) {
      challenge.isUsed = true;
      this.mfaChallenges.set(challengeId, challenge);

      // Update last used timestamp
      const mfaSecret = this.mfaSecrets.get(challenge.userId);
      if (mfaSecret) {
        mfaSecret.lastUsedAt = new Date();
        this.mfaSecrets.set(challenge.userId, mfaSecret);
      }

      this.logger.log(`MFA challenge verified for user ${challenge.userId}`);
    }

    return isValid;
  }

  async verifyTotpCode(userId: string, code: string): Promise<boolean> {
    const mfaSecret = this.mfaSecrets.get(userId);
    if (!mfaSecret || !mfaSecret.isVerified) {
      return false;
    }

    const verified = speakeasy.totp.verify({
      secret: mfaSecret.secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    return verified;
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const mfaSecret = this.mfaSecrets.get(userId);
    if (!mfaSecret) {
      return false;
    }

    // Check if code matches any backup code
    for (let i = 0; i < mfaSecret.backupCodes.length; i++) {
      const isMatch = await this.verifyBackupCodeHash(code, mfaSecret.backupCodes[i]);
      if (isMatch) {
        // Remove used backup code
        mfaSecret.backupCodes.splice(i, 1);
        this.mfaSecrets.set(userId, mfaSecret);
        
        this.logger.log(`Backup code used for user ${userId}`);
        return true;
      }
    }

    return false;
  }

  async generateNewBackupCodes(userId: string): Promise<string[]> {
    const mfaSecret = this.mfaSecrets.get(userId);
    if (!mfaSecret) {
      throw new BadRequestException('MFA not configured');
    }

    const newBackupCodes = this.generateBackupCodes();
    mfaSecret.backupCodes = await this.hashBackupCodes(newBackupCodes);
    this.mfaSecrets.set(userId, mfaSecret);

    this.logger.log(`New backup codes generated for user ${userId}`);
    return newBackupCodes;
  }

  async disableMfa(userId: string, verificationCode?: string): Promise<void> {
    if (verificationCode) {
      const isValid = await this.verifyTotpCode(userId, verificationCode);
      if (!isValid) {
        throw new BadRequestException('Invalid verification code');
      }
    }

    // Remove MFA secret
    this.mfaSecrets.delete(userId);

    // Update user record
    await this.userRepository.update(userId, {
      mfaEnabled: false,
      mfaSecret: null,
    });

    this.logger.log(`MFA disabled for user ${userId}`);
  }

  async getMfaStatus(userId: string): Promise<{
    isEnabled: boolean;
    methods: MfaMethod[];
    backupCodesRemaining: number;
    lastUsedAt?: Date;
  }> {
    const mfaSecret = this.mfaSecrets.get(userId);
    
    if (!mfaSecret) {
      return {
        isEnabled: false,
        methods: [],
        backupCodesRemaining: 0,
      };
    }

    const methods: MfaMethod[] = [
      {
        type: 'totp',
        isEnabled: mfaSecret.isVerified,
        isVerified: mfaSecret.isVerified,
      },
    ];

    // Add SMS/Email methods if configured
    if (mfaSecret.recoveryPhone) {
      methods.push({
        type: 'sms',
        isEnabled: true,
        isVerified: true,
        metadata: { phone: this.maskPhone(mfaSecret.recoveryPhone) },
      });
    }

    if (mfaSecret.recoveryEmail) {
      methods.push({
        type: 'email',
        isEnabled: true,
        isVerified: true,
        metadata: { email: this.maskEmail(mfaSecret.recoveryEmail) },
      });
    }

    return {
      isEnabled: mfaSecret.isVerified,
      methods,
      backupCodesRemaining: mfaSecret.backupCodes.length,
      lastUsedAt: mfaSecret.lastUsedAt,
    };
  }

  async addRecoveryMethod(
    userId: string,
    method: 'email' | 'phone',
    value: string
  ): Promise<void> {
    const mfaSecret = this.mfaSecrets.get(userId);
    if (!mfaSecret) {
      throw new BadRequestException('MFA not configured');
    }

    if (method === 'email') {
      mfaSecret.recoveryEmail = value;
    } else if (method === 'phone') {
      mfaSecret.recoveryPhone = value;
    }

    this.mfaSecrets.set(userId, mfaSecret);
    this.logger.log(`Recovery method added for user ${userId}: ${method}`);
  }

  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.substring(0, 4)}-${code.substring(4, 8)}`);
    }
    return codes;
  }

  private async hashBackupCodes(codes: string[]): Promise<string[]> {
    const bcrypt = require('bcrypt');
    const hashedCodes = [];
    for (const code of codes) {
      const hash = await bcrypt.hash(code, 10);
      hashedCodes.push(hash);
    }
    return hashedCodes;
  }

  private async verifyBackupCodeHash(code: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcrypt');
    return bcrypt.compare(code, hash);
  }

  private generateSmsCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateEmailCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendSmsCode(userId: string, code: string): Promise<void> {
    // In a real implementation, integrate with SMS service like Twilio
    this.logger.log(`SMS code sent to user ${userId}: ${code}`);
  }

  private async sendEmailCode(userId: string, code: string): Promise<void> {
    // In a real implementation, send email with code
    this.logger.log(`Email code sent to user ${userId}: ${code}`);
  }

  private maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    const maskedUsername = username.substring(0, 2) + '*'.repeat(username.length - 2);
    return `${maskedUsername}@${domain}`;
  }

  private maskPhone(phone: string): string {
    return phone.substring(0, 3) + '*'.repeat(phone.length - 6) + phone.substring(phone.length - 3);
  }

  async cleanupExpiredChallenges(): Promise<number> {
    let cleanedCount = 0;
    const now = new Date();

    for (const [challengeId, challenge] of this.mfaChallenges.entries()) {
      if (challenge.expiresAt < now) {
        this.mfaChallenges.delete(challengeId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired MFA challenges`);
    }

    return cleanedCount;
  }
}