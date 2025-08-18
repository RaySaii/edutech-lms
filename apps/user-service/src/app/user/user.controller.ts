import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { UserRole } from '@edutech-lms/common';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern({ cmd: 'get_profile' })
  async getProfile(@Payload() data: { userId: string }) {
    return this.userService.getProfile(data.userId);
  }

  @MessagePattern({ cmd: 'update_profile' })
  async updateProfile(@Payload() data: any) {
    const { userId, ...updateData } = data;
    return this.userService.updateProfile(userId, updateData);
  }

  @MessagePattern({ cmd: 'get_user_by_id' })
  async getUserById(@Payload() data: { id: string }) {
    return this.userService.getUserById(data.id);
  }

  @MessagePattern({ cmd: 'get_organization_members' })
  async getOrganizationMembers(@Payload() data: { organizationId: string }) {
    return this.userService.getOrganizationMembers(data.organizationId);
  }

  @MessagePattern({ cmd: 'update_user_role' })
  async updateUserRole(@Payload() data: { userId: string; role: UserRole; adminId: string }) {
    return this.userService.updateUserRole(data.userId, data.role, data.adminId);
  }

  @MessagePattern({ cmd: 'deactivate_user' })
  async deactivateUser(@Payload() data: { userId: string; adminId: string }) {
    return this.userService.deactivateUser(data.userId, data.adminId);
  }
}