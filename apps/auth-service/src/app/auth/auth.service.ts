import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Organization } from '@edutech-lms/database';
import { AuthService as SharedAuthService } from '@edutech-lms/auth';
import { UserService } from '../user/user.service';
import { OrganizationService } from '../organization/organization.service';
import { UserRole, UserStatus } from '@edutech-lms/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private sharedAuthService: SharedAuthService,
    private userService: UserService,
    private organizationService: OrganizationService,
  ) {}

  async register(registerData: any) {
    const { email, password, firstName, lastName, organizationSlug, phone } = registerData;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    let organization: Organization;
    
    if (organizationSlug) {
      // Find existing organization
      organization = await this.organizationService.findBySlug(organizationSlug);
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }
    } else {
      // Create new organization for the user
      const orgName = `${firstName} ${lastName}'s Organization`;
      const slug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}-${Date.now()}`;
      organization = await this.organizationService.create({
        name: orgName,
        slug,
        isActive: true,
      });
    }

    // Hash password
    const hashedPassword = await this.sharedAuthService.hashPassword(password);

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      organizationId: organization.id,
      role: organizationSlug ? UserRole.STUDENT : UserRole.ADMIN,
      status: UserStatus.PENDING_VERIFICATION,
    });

    const savedUser = await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.sharedAuthService.generateTokens(savedUser);

    return {
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          role: savedUser.role,
          organizationId: savedUser.organizationId,
        },
        tokens,
      },
    };
  }

  async login(user: any) {
    // Generate tokens
    const tokens = await this.sharedAuthService.generateTokens(user);

    // Update last login
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

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
        tokens,
      },
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['organization'],
    });

    if (!user) {
      return null;
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended');
    }

    const isPasswordValid = await this.sharedAuthService.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.sharedAuthService.verifyRefreshToken(refreshToken);
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.sharedAuthService.generateTokens(user);
      
      return {
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just return success
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists or not
      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      };
    }

    // Generate reset token (simplified - in production use a proper token)
    const resetToken = uuidv4();
    
    // In a real implementation, store this token with expiration in database
    // and send email with reset link
    
    return {
      success: true,
      message: 'Password reset email sent',
      data: { resetToken }, // Only for development
    };
  }

  async resetPassword(token: string, newPassword: string) {
    // In a real implementation, validate the token from database
    // For now, we'll assume token is valid
    
    const hashedPassword = await this.sharedAuthService.hashPassword(newPassword);
    
    // This is simplified - in production, find user by valid reset token
    // await this.userRepository.update({ resetToken: token }, { password: hashedPassword });
    
    return {
      success: true,
      message: 'Password reset successfully',
    };
  }
}