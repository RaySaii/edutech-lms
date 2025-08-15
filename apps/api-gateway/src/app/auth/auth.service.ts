import { Injectable } from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  // Mock implementation for testing - replace with real microservice calls later
  private mockUsers = [
    {
      id: '1',
      email: 'test@example.com',
      password: 'TestPassword123!', // In real app, this would be hashed
      firstName: 'Test',
      lastName: 'User',
      role: 'student',
      organizationId: '1'
    }
  ];

  async login(loginDto: LoginDto) {
    try {
      // Mock user validation
      const user = this.mockUsers.find(u => 
        u.email === loginDto.email && u.password === loginDto.password
      );

      if (!user) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Mock token generation
      const mockTokens = {
        accessToken: 'mock-access-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
        expiresIn: 3600
      };

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            organizationId: user.organizationId,
          },
          tokens: mockTokens,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Login failed',
        error: error.message
      };
    }
  }

  async register(registerDto: RegisterDto) {
    try {
      // Check if user already exists
      const existingUser = this.mockUsers.find(u => u.email === registerDto.email);
      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists'
        };
      }

      // Create new user
      const newUser = {
        id: String(this.mockUsers.length + 1),
        email: registerDto.email,
        password: registerDto.password, // In real app, this would be hashed
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: 'student',
        organizationId: '1'
      };

      this.mockUsers.push(newUser);

      // Mock token generation
      const mockTokens = {
        accessToken: 'mock-access-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
        expiresIn: 3600
      };

      return {
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            role: newUser.role,
            organizationId: newUser.organizationId,
          },
          tokens: mockTokens,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Registration failed',
        error: error.message
      };
    }
  }

  async refreshToken(refreshToken: string) {
    // Mock refresh token validation
    const mockTokens = {
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      expiresIn: 3600
    };

    return {
      success: true,
      message: 'Token refreshed successfully',
      data: { tokens: mockTokens },
    };
  }

  async logout(userId: string) {
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async forgotPassword(email: string) {
    return {
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  async resetPassword(token: string, password: string) {
    return {
      success: true,
      message: 'Password reset successfully',
    };
  }
}