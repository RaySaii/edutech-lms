import { Injectable, Inject, Logger, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('AUTH_SERVICE') private authClient: ClientProxy,
  ) {}


  async login(loginDto: LoginDto) {
    try {
      this.logger.log(`Login request for email: ${loginDto.email}`);

      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'login' }, loginDto)
      );

      // Debug: Log the result from auth service
      this.logger.debug(`Auth service response:`, JSON.stringify(result));

      // Check if the response indicates an error
      if (result.success === false || (result.statusCode && result.statusCode >= 400)) {
        if (result.statusCode === 404) {
          throw new NotFoundException(result.message || 'User not found');
        } else if (result.statusCode === 401) {
          throw new UnauthorizedException(result.message || 'Invalid credentials');
        } else if (result.statusCode === 400) {
          throw new BadRequestException(result.message || 'Bad request');
        } else {
          throw new BadRequestException(result.message || 'Login failed');
        }
      }

      this.logger.log(`Login successful for email: ${loginDto.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Login error for email: ${loginDto.email}`, error.message);

      // Re-throw HTTP exceptions
      if (error instanceof NotFoundException || error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      // For other errors, throw generic bad request
      throw new BadRequestException('Login failed');
    }
  }

  async register(registerDto: RegisterDto) {
    try {
      this.logger.log(`Registration request for email: ${registerDto.email}`);

      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'register' }, registerDto)
      );

      this.logger.log(`Registration successful for email: ${registerDto.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Registration error for email: ${registerDto.email}`, error.message);

      // Re-throw the error with proper HTTP status codes
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        throw new BadRequestException('Email already registered');
      } else {
        throw new BadRequestException('Registration failed');
      }
    }
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
    try {
      this.logger.log(`Profile request for user: ${userId}`);

      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'get_user_profile' }, { userId })
      );

      this.logger.log(`Profile retrieved for user: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`Profile retrieval error for user: ${userId}`, error.message);
      return {
        success: false,
        message: 'Profile retrieval failed',
        error: error.message
      };
    }
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
    try {
      this.logger.log(`Email availability check for: ${email}`);

      const result = await firstValueFrom(
        this.authClient.send({ cmd: 'check_email_availability' }, { email })
      );

      this.logger.log(`Email availability check completed for: ${email}`);
      return result;
    } catch (error) {
      this.logger.error(`Email availability check error for: ${email}`, error.message);
      return {
        available: true,
        message: 'Unable to check email availability'
      };
    }
  }
}
