import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { LoginDto, RegisterDto } from './dto';
import {
  ResponseUtil,
  ErrorUtil,
  LoggerUtil,
  ValidationUtil
} from '@edutech-lms/common';

@Injectable()
export class AuthService {
  private readonly logger = LoggerUtil.createLogger(AuthService.name);

  constructor(
    @Inject('AUTH_SERVICE') private authClient: ClientProxy,
  ) {}


  async login(loginDto: LoginDto) {
    ValidationUtil.validateRequired(loginDto, ['email', 'password']);
    ValidationUtil.validateEmail(loginDto.email);
    
    return await ErrorUtil.handleAsync(
      async () => {
        LoggerUtil.logWithData(this.logger, 'log', 'Login request', { email: loginDto.email });

        const result = await firstValueFrom(
          this.authClient.send({ cmd: 'login' }, loginDto)
        );

        LoggerUtil.logWithData(this.logger, 'debug', 'Auth service response received', { success: result.success });

        // Handle error responses from auth service
        if (result.success === false || (result.statusCode && result.statusCode >= 400)) {
          this.handleAuthServiceError(result);
        }

        LoggerUtil.logWithData(this.logger, 'log', 'Login successful', { email: loginDto.email });
        return result;
      },
      'login',
      this.logger,
      'Unable to sign in right now. Please try again in a moment.'
    );
  }
  
  private handleAuthServiceError(result: any): never {
    switch (result.statusCode) {
      case 404:
        ErrorUtil.throwNotFound('User');
        break;
      case 401:
        ErrorUtil.throwUnauthorized(result.message || 'Invalid credentials');
        break;
      case 400:
        ErrorUtil.throwBadRequest(result.message || 'Invalid request');
        break;
      case 500:
        ErrorUtil.throwBadRequest('We\'re experiencing technical difficulties. Please try again in a moment.');
        break;
      default:
        ErrorUtil.throwBadRequest(result.message || 'Unable to process request');
    }
  }

  async register(registerDto: RegisterDto) {
    ValidationUtil.validateRequired(registerDto, ['email', 'password', 'firstName', 'lastName']);
    ValidationUtil.validateEmail(registerDto.email);
    
    return await ErrorUtil.handleAsync(
      async () => {
        LoggerUtil.logWithData(this.logger, 'log', 'Registration request', { email: registerDto.email });

        const result = await firstValueFrom(
          this.authClient.send({ cmd: 'register' }, registerDto)
        );

        LoggerUtil.logWithData(this.logger, 'log', 'Registration successful', { email: registerDto.email });
        return result;
      },
      'registration',
      this.logger,
      'Registration failed'
    );
  }

  async refreshToken(refreshToken: string) {
    try {
      this.logger.log('Token refresh request');

      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'refresh' }, { refreshToken })
      );

      this.logger.log(`Token refresh ${result.success ? 'successful' : 'failed'}`);
      return result;
    } catch (error) {
      this.logger.error('Token refresh error:', error.message);
      return {
        success: false,
        message: 'Token refresh failed',
        error: error.message
      };
    }
  }

  async logout(userId: string) {
    try {
      this.logger.log(`Logout request for user: ${userId}`);

      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'logout' }, { userId })
      );

      this.logger.log(`Logout ${result.success ? 'successful' : 'failed'} for user: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`Logout error for user: ${userId}`, error.message);
      return {
        success: false,
        message: 'Logout failed',
        error: error.message
      };
    }
  }

  async forgotPassword(email: string) {
    try {
      this.logger.log(`Password reset request for email: ${email}`);

      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'forgot_password' }, { email })
      );

      this.logger.log(`Password reset request processed for email: ${email}`);
      return result;
    } catch (error) {
      this.logger.error(`Password reset error for email: ${email}`, error.message);
      return {
        success: true, // Always return success for security
        message: 'If the email exists, a password reset link has been sent',
      };
    }
  }

  async resetPassword(token: string, password: string) {
    try {
      this.logger.log(`Password reset attempt with token: ${token.substring(0, 8)}...`);

      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'reset_password' }, { token, password })
      );

      this.logger.log(`Password reset ${result.success ? 'successful' : 'failed'}`);
      return result;
    } catch (error) {
      this.logger.error('Password reset error:', error.message);
      return {
        success: false,
        message: 'Password reset failed',
        error: error.message
      };
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      this.logger.log(`Password change request for user: ${userId}`);

      const result = await firstValueFrom(
        this.authClient.send(
          { cmd: 'change_password' },
          { userId, changePasswordDto: { currentPassword, newPassword } }
        )
      );

      this.logger.log(`Password change ${result.success ? 'successful' : 'failed'} for user: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`Password change error for user: ${userId}`, error.message);
      return {
        success: false,
        message: 'Password change failed',
        error: error.message
      };
    }
  }

  async verifyEmail(token: string) {
    try {
      this.logger.log(`Email verification attempt with token: ${token.substring(0, 8)}...`);

      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'verify_email' }, { token })
      );

      this.logger.log(`Email verification ${result.success ? 'successful' : 'failed'}`);
      return result;
    } catch (error) {
      this.logger.error('Email verification error:', error.message);
      return {
        success: false,
        message: 'Email verification failed',
        error: error.message
      };
    }
  }

  async getUserProfile(userId: string) {
    ValidationUtil.validateUUID(userId, 'User ID');
    
    return await ErrorUtil.handleAsync(
      async () => {
        LoggerUtil.logWithData(this.logger, 'log', 'Profile request', { userId });

        const result = await firstValueFrom(
          this.authClient.send({ cmd: 'get_user_profile' }, { userId })
        );

        LoggerUtil.logWithData(this.logger, 'log', 'Profile retrieved successfully', { userId });
        return result;
      },
      'get user profile',
      this.logger,
      'Profile retrieval failed'
    );
  }

  async setup2FA(userId: string) {
    try {
      this.logger.log(`2FA setup request for user: ${userId}`);

      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'setup_2fa' }, { userId })
      );

      this.logger.log(`2FA setup ${result.success ? 'successful' : 'failed'} for user: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`2FA setup error for user: ${userId}`, error.message);
      return {
        success: false,
        message: '2FA setup failed',
        error: error.message
      };
    }
  }

  async enable2FA(userId: string, code: string) {
    try {
      this.logger.log(`2FA enable request for user: ${userId}`);

      const result = await firstValueFrom(
        this.authClient.send(
          { cmd: 'enable_2fa' },
          { userId, enable2FADto: { code } }
        )
      );

      this.logger.log(`2FA enable ${result.success ? 'successful' : 'failed'} for user: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`2FA enable error for user: ${userId}`, error.message);
      return {
        success: false,
        message: '2FA enable failed',
        error: error.message
      };
    }
  }

  async disable2FA(userId: string, currentPassword: string) {
    try {
      this.logger.log(`2FA disable request for user: ${userId}`);

      const result = await firstValueFrom(
        this.authClient.send(
          { cmd: 'disable_2fa' },
          { userId, currentPassword }
        )
      );

      this.logger.log(`2FA disable ${result.success ? 'successful' : 'failed'} for user: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`2FA disable error for user: ${userId}`, error.message);
      return {
        success: false,
        message: '2FA disable failed',
        error: error.message
      };
    }
  }

  async getAllUsers() {
    try {
      this.logger.log('Get all users request (Admin)');

      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'get_all_users' }, {})
      );

      this.logger.log('All users retrieved successfully');
      return result;
    } catch (error) {
      this.logger.error('Get all users error:', error.message);
      return {
        success: false,
        message: 'Failed to retrieve users',
        error: error.message
      };
    }
  }

  async updateUserStatus(userId: string, status: string) {
    try {
      this.logger.log(`Update user status request for user: ${userId} to ${status}`);

      const result = await firstValueFrom(
        this.authClient.send(
          { cmd: 'update_user_status' },
          { userId, status }
        )
      );

      this.logger.log(`User status update ${result.success ? 'successful' : 'failed'} for user: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`User status update error for user: ${userId}`, error.message);
      return {
        success: false,
        message: 'User status update failed',
        error: error.message
      };
    }
  }

  async checkEmailAvailability(email: string) {
    ValidationUtil.validateEmail(email);
    
    return await ErrorUtil.handleAsync(
      async () => {
        LoggerUtil.logWithData(this.logger, 'log', 'Email availability check', { email });

        const result = await firstValueFrom(
          this.authClient.send({ cmd: 'check_email_availability' }, { email })
        );

        LoggerUtil.logWithData(this.logger, 'log', 'Email availability check completed', { email, available: result.available });
        return result;
      },
      'check email availability',
      this.logger,
      'Unable to check email availability'
    );
  }
}
