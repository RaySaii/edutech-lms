import { Injectable, Inject, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { User, Organization } from '@edutech-lms/database';
import { AuthService as SharedAuthService } from '@edutech-lms/auth';
import { UserService } from '../user/user.service';
import { OrganizationService } from '../organization/organization.service';
import { 
  UserRole, 
  UserStatus,
  ResponseUtil,
  ErrorUtil,
  LoggerUtil,
  ValidationUtil
} from '@edutech-lms/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto, Enable2FADto } from './dto';
import { AuthResponse, UserProfile, TwoFactorSetupResponse } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  private readonly logger = LoggerUtil.createLogger(AuthService.name);
  private readonly resetTokenCache = new Map<string, { userId: string; expires: Date }>();
  private readonly emailVerificationCache = new Map<string, { userId: string; expires: Date }>();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private sharedAuthService: SharedAuthService,
    private userService: UserService,
    private organizationService: OrganizationService,
    private configService: ConfigService,
    @Inject('NOTIFICATION_SERVICE') private notificationClient: ClientProxy,
  ) {
    // Clean expired tokens every hour
    setInterval(() => this.cleanExpiredTokens(), 3600000);
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, firstName, lastName, organizationSlug, phone, role } = registerDto;

    // Validate input
    ValidationUtil.validateRequired(registerDto, ['email', 'password', 'firstName', 'lastName']);
    ValidationUtil.validateEmail(email);
    ValidationUtil.validatePassword(password);
    ValidationUtil.validateStringLength(firstName, 'First name', 1, 50);
    ValidationUtil.validateStringLength(lastName, 'Last name', 1, 50);
    
    if (phone) {
      ValidationUtil.validatePhone(phone);
    }

    LoggerUtil.logWithData(this.logger, 'log', 'Registration attempt', { email, role: role || UserRole.STUDENT });

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() }
    });
    if (existingUser) {
      LoggerUtil.logWithData(this.logger, 'warn', 'Registration failed - email exists', { email });
      ErrorUtil.throwConflict('User with this email already exists');
    }

    let organization: Organization;

    if (organizationSlug) {
      ValidationUtil.validateStringLength(organizationSlug, 'Organization slug', 2, 100);
      // Find existing organization
      organization = await this.organizationService.findBySlug(organizationSlug);
      ErrorUtil.checkExists(organization, 'Organization');
    } else {
      // Create new organization for the user
      const orgName = `${ValidationUtil.sanitizeString(firstName)} ${ValidationUtil.sanitizeString(lastName)}'s Organization`;
      const slug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}-${Date.now()}`;
      organization = await this.organizationService.create({
        name: orgName,
        slug,
        isActive: true,
      });
    }

    // Hash password
    const hashedPassword = await this.sharedAuthService.hashPassword(password);

    // Create user - default to student for self-learning platform
    try {
      const user = this.userRepository.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: ValidationUtil.sanitizeString(firstName),
        lastName: ValidationUtil.sanitizeString(lastName),
        phone,
        organizationId: organization.id,
        role: role || UserRole.STUDENT,
        status: UserStatus.PENDING_VERIFICATION,
      });

      const savedUser = await this.userRepository.save(user);
      LoggerUtil.logWithData(this.logger, 'log', 'User registered successfully', { userId: savedUser.id, email: savedUser.email });
      
      return await this.handleRegistrationSuccess(savedUser);
    } catch (error) {
      ErrorUtil.handleRepositoryError(error, 'User', this.logger);
    }
  }

  private async handleRegistrationSuccess(savedUser: User): Promise<AuthResponse> {

    const emailVerificationToken = this.generateSecureToken();
    this.emailVerificationCache.set(emailVerificationToken, {
      userId: savedUser.id,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Generate tokens only if email verification is not required
    const requireEmailVerification = this.configService.get<boolean>('REQUIRE_EMAIL_VERIFICATION', true);

    if (!requireEmailVerification) {
      const tokens = await this.sharedAuthService.generateTokens(savedUser);
      return {
        user: this.sanitizeUser(savedUser),
        tokens,
      };
    }

    // Send email verification email
    await this.sendEmailVerificationEmail(savedUser.email, emailVerificationToken, savedUser.firstName);

    // Return 202 Accepted - registration successful but requires email verification
    return {
      user: this.sanitizeUser(savedUser),
      tokens: null,
      requiresEmailVerification: true,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password, twoFactorCode, rememberMe } = loginDto;

    this.logger.log(`Login attempt for email: ${email}`);

    try {
      // First check if user exists
      let userExists;
      try {
        userExists = await this.userRepository.findOne({
          where: { email: email.toLowerCase() },
        });
      } catch (dbError) {
        this.logger.error(`Database error during user lookup for ${email}:`, dbError.message);
        return {
          success: false,
          message: 'Database connection error',
          statusCode: 500,
          error: 'DATABASE_ERROR'
        };
      }

      if (!userExists) {
        this.logger.warn(`Login failed: User not found for ${email}`);
        return {
          success: false,
          message: 'Invalid email or password. Please try again.',
          statusCode: 401,
          error: 'INVALID_CREDENTIALS'
        };
      }

      const user = await this.validateUser(email, password);
      if (!user) {
        // Check if it's a status issue or invalid password
        const userForStatusCheck = await this.userRepository.findOne({
          where: { email: email.toLowerCase() }
        });

        if (userForStatusCheck) {
          if (userForStatusCheck.status === UserStatus.SUSPENDED) {
            this.logger.warn(`Login failed: Account suspended for ${email}`);
            return {
              success: false,
              message: 'Your account has been suspended. Please contact support.',
              statusCode: 403,
              error: 'ACCOUNT_SUSPENDED'
            };
          }

          if (userForStatusCheck.status === UserStatus.INACTIVE) {
            this.logger.warn(`Login failed: Account deactivated for ${email}`);
            return {
              success: false,
              message: 'Your account has been deactivated. Please contact support.',
              statusCode: 403,
              error: 'ACCOUNT_DEACTIVATED'
            };
          }

          if (userForStatusCheck.status === UserStatus.PENDING_VERIFICATION) {
            this.logger.warn(`Login failed: Account pending verification for ${email}`);
            return {
              success: false,
              message: 'Please verify your email address before logging in. Check your inbox for the verification link.',
              statusCode: 403,
              error: 'EMAIL_VERIFICATION_REQUIRED'
            };
          }
        }

        this.logger.warn(`Login failed: Invalid password for ${email}`);
        return {
          success: false,
          message: 'Invalid email or password. Please try again.',
          statusCode: 401,
          error: 'UNAUTHORIZED'
        };
      }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return {
          success: false,
          message: 'Two-factor authentication code required',
          statusCode: 400,
          error: 'TWO_FACTOR_REQUIRED',
          requiresTwoFactor: true,
        };
      }

      const isValidTwoFactor = this.verifyTwoFactorCode(user.totpSecret, twoFactorCode);
      if (!isValidTwoFactor) {
        this.logger.warn(`Login failed: Invalid 2FA code for ${email}`);
        return {
          success: false,
          message: 'Invalid two-factor authentication code',
          statusCode: 401,
          error: 'INVALID_TWO_FACTOR'
        };
      }
    }

    // Generate tokens with rememberMe option
    const tokens = await this.sharedAuthService.generateTokens(user, rememberMe);

    // Update last login
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

      this.logger.log(`Login successful for user: ${user.email}`);

      return {
        success: true,
        data: {
          user: this.sanitizeUser(user),
          tokens,
        }
      };
    } catch (error) {
      this.logger.error(`Login error for user: ${email}`, error.message);

      // Return error response instead of throwing
      return {
        success: false,
        message: 'We\'re experiencing technical difficulties. Please try again in a moment.',
        statusCode: 500,
        error: 'INTERNAL_ERROR'
      };
    }
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['organization'],
    });

    if (!user) {
      return null;
    }

    if (user.status === UserStatus.SUSPENDED) {
      return null; // Let login method handle the error response
    }

    if (user.status === UserStatus.INACTIVE) {
      return null; // Let login method handle the error response
    }

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      return null; // Let login method handle the error response
    }

    const isPasswordValid = await this.sharedAuthService.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    try {
      this.logger.log('Token refresh attempt');

      const payload = await this.sharedAuthService.verifyRefreshToken(refreshToken);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['organization']
      });

      if (!user) {
        this.logger.warn('Token refresh failed: User not found');
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.INACTIVE) {
        this.logger.warn(`Token refresh failed: User ${user.email} account suspended/inactive`);
        throw new UnauthorizedException('Account suspended or inactive');
      }

      // Determine if this was a "remember me" token by checking the original expiration time
      // Compare the token's total lifetime against standard vs remember-me durations
      const tokenExp = payload.exp * 1000; // Convert to milliseconds
      const tokenIat = payload.iat * 1000; // Convert to milliseconds
      const tokenLifetime = tokenExp - tokenIat;
      
      // Standard refresh token lifetime is 7 days (604800000ms)
      // Remember me refresh token lifetime is 30 days (2592000000ms)
      const standardLifetime = 7 * 24 * 60 * 60 * 1000;
      const rememberMeLifetime = 30 * 24 * 60 * 60 * 1000;
      
      // If the token lifetime is closer to remember me duration, treat as remember me
      const rememberMe = Math.abs(tokenLifetime - rememberMeLifetime) < Math.abs(tokenLifetime - standardLifetime);

      const tokens = await this.sharedAuthService.generateTokens(user, rememberMe);

      this.logger.log(`Token refreshed successfully for user: ${user.email} (rememberMe: ${rememberMe})`);

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: this.sanitizeUser(user),
          tokens
        },
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error.message);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<AuthResponse> {
    this.logger.log(`Logout request for user: ${userId}`);

    // TODO: Implement token blacklisting in Redis
    // await this.redisService.blacklistToken(token);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<AuthResponse> {
    const { email } = forgotPasswordDto;

    this.logger.log(`Password reset request for email: ${email}`);

    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() }
    });

    // Always return success to prevent user enumeration
    const response = {
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    };

    if (user) {
      const resetToken = this.generateSecureToken();

      // Store reset token with expiration (15 minutes)
      this.resetTokenCache.set(resetToken, {
        userId: user.id,
        expires: new Date(Date.now() + 15 * 60 * 1000),
      });

      // Send password reset email
      await this.sendPasswordResetEmail(user.email, resetToken);

      this.logger.log(`Password reset token generated for user: ${user.email}`);
    }

    return response;
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<AuthResponse> {
    const { token, password } = resetPasswordDto;

    this.logger.log(`Password reset attempt with token: ${token.substring(0, 8)}...`);

    const tokenData = this.resetTokenCache.get(token);
    if (!tokenData || tokenData.expires < new Date()) {
      this.logger.warn(`Invalid or expired reset token: ${token.substring(0, 8)}...`);
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.userRepository.findOne({
      where: { id: tokenData.userId }
    });

    if (!user) {
      this.logger.error(`User not found for reset token: ${token.substring(0, 8)}...`);
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await this.sharedAuthService.hashPassword(password);

    await this.userRepository.update(user.id, {
      password: hashedPassword,
    });

    // Remove used token
    this.resetTokenCache.delete(token);

    this.logger.log(`Password reset successful for user: ${user.email}`);

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<AuthResponse> {
    const { currentPassword, newPassword } = changePasswordDto;

    ValidationUtil.validateUUID(userId, 'User ID');
    ValidationUtil.validateRequired(changePasswordDto, ['currentPassword', 'newPassword']);
    ValidationUtil.validatePassword(newPassword);

    LoggerUtil.logWithData(this.logger, 'log', 'Password change request', { userId });

    const user = await this.userRepository.findOne({ where: { id: userId } });
    ErrorUtil.checkExists(user, 'User', userId);

    const isCurrentPasswordValid = await this.sharedAuthService.comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      LoggerUtil.logWithData(this.logger, 'warn', 'Password change failed - invalid current password', { userId });
      ErrorUtil.throwUnauthorized('Current password is incorrect');
    }

    try {
      const hashedNewPassword = await this.sharedAuthService.hashPassword(newPassword);
      await this.userRepository.update(userId, { password: hashedNewPassword });
      LoggerUtil.logWithData(this.logger, 'log', 'Password changed successfully', { userId });
      return ResponseUtil.success(null, 'Password changed successfully');
    } catch (error) {
      ErrorUtil.handleRepositoryError(error, 'User', this.logger);
    }
  }

  async verifyEmail(token: string): Promise<AuthResponse> {
    this.logger.log(`Email verification attempt with token: ${token.substring(0, 8)}...`);

    const tokenData = this.emailVerificationCache.get(token);
    if (!tokenData || tokenData.expires < new Date()) {
      this.logger.warn(`Invalid or expired verification token: ${token.substring(0, 8)}...`);
      throw new BadRequestException('Invalid or expired verification token');
    }

    const user = await this.userRepository.findOne({
      where: { id: tokenData.userId }
    });

    if (!user) {
      this.logger.error(`User not found for verification token: ${token.substring(0, 8)}...`);
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(user.id, {
      emailVerifiedAt: new Date(),
      status: UserStatus.ACTIVE,
    });

    // Remove used token
    this.emailVerificationCache.delete(token);

    this.logger.log(`Email verified successfully for user: ${user.email}`);

    const tokens = await this.sharedAuthService.generateTokens(user);

    return {
      success: true,
      message: 'Email verified successfully',
      data: {
        user: this.sanitizeUser({ ...user, emailVerifiedAt: new Date(), status: UserStatus.ACTIVE }),
        tokens,
      },
    };
  }

  async setupTwoFactor(userId: string): Promise<TwoFactorSetupResponse> {
    this.logger.log(`2FA setup request for user: ${userId}`);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const secret = speakeasy.generateSecret({
      name: `EduTech LMS (${user.email})`,
      issuer: 'EduTech LMS',
      length: 32,
    });

    const qrCodeUrl = `otpauth://totp/EduTech%20LMS:${encodeURIComponent(user.email)}?secret=${secret.base32}&issuer=EduTech%20LMS`;

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store the secret temporarily (user needs to verify before enabling)
    await this.userRepository.update(userId, {
      totpSecret: secret.base32,
      backupCodes,
    });

    this.logger.log(`2FA setup initiated for user: ${user.email}`);

    return {
      success: true,
      message: '2FA setup initiated. Please verify the code to enable.',
      data: {
        qrCodeUrl,
        secret: secret.base32,
        backupCodes,
      },
    };
  }

  async enableTwoFactor(userId: string, enable2FADto: Enable2FADto): Promise<AuthResponse> {
    const { code } = enable2FADto;

    this.logger.log(`2FA enable request for user: ${userId}`);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.totpSecret) {
      throw new BadRequestException('Two-factor authentication setup not initiated');
    }

    const isValidCode = this.verifyTwoFactorCode(user.totpSecret, code);
    if (!isValidCode) {
      this.logger.warn(`2FA enable failed: Invalid code for user ${userId}`);
      throw new BadRequestException('Invalid verification code');
    }

    await this.userRepository.update(userId, {
      twoFactorEnabled: true,
    });

    this.logger.log(`2FA enabled successfully for user: ${user.email}`);

    return {
      success: true,
      message: 'Two-factor authentication enabled successfully',
      data: {
        user: this.sanitizeUser({ ...user, twoFactorEnabled: true }),
        tokens: null,
      },
      backupCodes: user.backupCodes,
    };
  }

  async disableTwoFactor(userId: string, currentPassword: string): Promise<AuthResponse> {
    this.logger.log(`2FA disable request for user: ${userId}`);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await this.sharedAuthService.comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`2FA disable failed: Invalid password for user ${userId}`);
      throw new UnauthorizedException('Invalid password');
    }

    await this.userRepository.update(userId, {
      twoFactorEnabled: false,
      totpSecret: null,
      backupCodes: null,
    });

    this.logger.log(`2FA disabled successfully for user: ${user.email}`);

    return {
      success: true,
      message: 'Two-factor authentication disabled successfully',
    };
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    ValidationUtil.validateUUID(userId, 'User ID');
    
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['organization'],
    });

    ErrorUtil.checkExists(user, 'User', userId);
    return this.sanitizeUser(user);
  }

  async checkEmailAvailability(email: string): Promise<{ available: boolean; message: string }> {
    this.logger.log(`Email availability check for: ${email}`);

    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return {
        available: false,
        message: 'Email is already registered'
      };
    }

    return {
      available: true,
      message: 'Email is available'
    };
  }

  // Utility methods
  private sanitizeUser(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      organizationId: user.organizationId,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      twoFactorEnabled: user.twoFactorEnabled,
      avatar: user.avatar,
      phone: user.phone,
    };
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private verifyTwoFactorCode(secret: string, code: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2, // Allow 2 time steps forward/backward
    });
  }

  private cleanExpiredTokens(): void {
    const now = new Date();

    // Clean reset tokens
    for (const [token, data] of this.resetTokenCache.entries()) {
      if (data.expires < now) {
        this.resetTokenCache.delete(token);
      }
    }

    // Clean email verification tokens
    for (const [token, data] of this.emailVerificationCache.entries()) {
      if (data.expires < now) {
        this.emailVerificationCache.delete(token);
      }
    }

    this.logger.debug('Expired tokens cleaned up');
  }

  private async sendEmailVerificationEmail(email: string, verificationToken: string, firstName: string): Promise<void> {
    try {
      this.logger.log(`Sending email verification email to ${email}`);

      // Direct email sending with nodemailer for development
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025, // MailHog SMTP port
        secure: false,
        auth: undefined,
      });

      const verificationUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:4200')}/verify-email?token=${verificationToken}`;
      
      const mailOptions = {
        from: 'noreply@edutech-lms.com',
        to: email,
        subject: 'Verify Your Email - EduTech LMS',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to EduTech LMS!</h2>
            <p>Hi ${firstName},</p>
            <p>Thank you for registering with EduTech LMS. Please verify your email address to activate your account:</p>
            <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">Verify Email Address</a>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
            <p>Best regards,<br>The EduTech LMS Team</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #3b82f6;">${verificationUrl}</a>
            </p>
          </div>
        `,
        text: `Hi ${firstName}, Welcome to EduTech LMS! Please verify your email: ${verificationUrl} (expires in 24 hours)`
      };

      const result = await transporter.sendMail(mailOptions);
      this.logger.log(`Email verification email sent successfully to ${email}, messageId: ${result.messageId}`);
      
    } catch (error) {
      this.logger.error(`Failed to send email verification email to ${email}:`, error.message);
      // Don't throw error - registration should still succeed even if email fails
    }
  }

  private async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { email: email.toLowerCase() } });
      if (!user) {
        this.logger.warn(`Cannot send password reset email: User not found for ${email}`);
        return;
      }

      this.logger.log(`Sending password reset email directly for ${user.email}`);

      // Direct email sending with nodemailer for now
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025,
        secure: false,
        auth: undefined,
      });

      const resetUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: 'noreply@edutech-lms.com',
        to: user.email,
        subject: 'Reset Your Password - EduTech LMS',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hi ${user.firstName},</p>
            <p>You requested to reset your password. Click the button below to create a new password:</p>
            <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">Reset Password</a>
            <p>This link will expire in 15 minutes.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>Best regards,<br>The EduTech LMS Team</p>
          </div>
        `,
        text: `Hi ${user.firstName}, Reset your password: ${resetUrl} (expires in 15 minutes)`
      };

      const result = await transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent successfully to ${user.email}, messageId: ${result.messageId}`);
      
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error.message);
      throw error;
    }
  }
}
