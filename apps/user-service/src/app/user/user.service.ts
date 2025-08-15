import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Organization } from '@edutech-lms/database';
import { UserRole, UserStatus } from '@edutech-lms/common';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['organization'],
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'avatar', 'phone', 'emailVerifiedAt', 'lastLoginAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      data: user,
    };
  }

  async updateProfile(userId: string, updateData: Partial<User>) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only allow updating certain fields
    const allowedFields = ['firstName', 'lastName', 'phone', 'avatar'];
    const filteredData = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    await this.userRepository.update(userId, filteredData);
    const updatedUser = await this.getProfile(userId);

    return {
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser.data,
    };
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['organization'],
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'avatar', 'organizationId'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      data: user,
    };
  }

  async getOrganizationMembers(organizationId: string) {
    const users = await this.userRepository.find({
      where: { organizationId },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'lastLoginAt'],
      order: { createdAt: 'DESC' },
    });

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    return {
      success: true,
      data: {
        organization: organization?.name,
        members: users,
        total: users.length,
      },
    };
  }

  async updateUserRole(userId: string, role: UserRole, adminId: string) {
    // Verify admin has permission
    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update user roles');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Can't change role across organizations
    if (user.organizationId !== admin.organizationId) {
      throw new ForbiddenException('Cannot update users from different organizations');
    }

    await this.userRepository.update(userId, { role });

    return {
      success: true,
      message: 'User role updated successfully',
    };
  }

  async deactivateUser(userId: string, adminId: string) {
    // Verify admin has permission
    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can deactivate users');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Can't deactivate users from different organizations
    if (user.organizationId !== admin.organizationId) {
      throw new ForbiddenException('Cannot deactivate users from different organizations');
    }

    // Can't deactivate yourself
    if (userId === adminId) {
      throw new ForbiddenException('Cannot deactivate yourself');
    }

    await this.userRepository.update(userId, { status: UserStatus.SUSPENDED });

    return {
      success: true,
      message: 'User deactivated successfully',
    };
  }
}