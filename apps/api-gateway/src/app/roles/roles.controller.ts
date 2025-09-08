import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, PermissionsGuard, RequirePermissions, Roles } from '@edutech-lms/auth';
import { Permission, UserRole, ROLE_PERMISSIONS } from '@edutech-lms/common';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  @Get('permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all available permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  async getPermissions() {
    return {
      success: true,
      data: {
        permissions: Object.values(Permission),
        rolePermissions: ROLE_PERMISSIONS,
      },
    };
  }

  @Get('user/permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user permissions' })
  @ApiResponse({ status: 200, description: 'User permissions retrieved successfully' })
  async getUserPermissions(@Request() req) {
    const userRole = req.user.role;
    const permissions = ROLE_PERMISSIONS[userRole] || [];

    return {
      success: true,
      data: {
        role: userRole,
        permissions,
        hasTeacherAccess: false, // No teacher roles in self-learning system
        hasAdminAccess: [UserRole.ADMIN].includes(userRole),
      },
    };
  }

  @Get('hierarchy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get role hierarchy information' })
  @ApiResponse({ status: 200, description: 'Role hierarchy retrieved successfully' })
  async getRoleHierarchy() {
    return {
      success: true,
      data: {
        roles: Object.values(UserRole),
        hierarchy: {
          [UserRole.ADMIN]: {
            level: 2,
            description: 'System administration and course management',
            canManage: [UserRole.STUDENT],
          },
          [UserRole.STUDENT]: {
            level: 1,
            description: 'Self-learning and course enrollment',
            canManage: [],
          },
        },
      },
    };
  }

  @Post('validate-permission')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate if user has specific permission' })
  @ApiResponse({ status: 200, description: 'Permission validation result' })
  async validatePermission(
    @Body() body: { permission: Permission },
    @Request() req,
  ) {
    const userRole = req.user.role;
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];
    const hasPermission = userPermissions.includes(body.permission);

    return {
      success: true,
      data: {
        permission: body.permission,
        hasPermission,
        userRole,
        message: hasPermission
          ? 'User has the required permission'
          : 'User does not have the required permission',
      },
    };
  }

  @Put('switch-to-teacher')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ADMIN_SYSTEM)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch user context to teacher mode (for dual-role users)' })
  @ApiResponse({ status: 200, description: 'Switched to teacher mode successfully' })
  @ApiResponse({ status: 403, description: 'User does not have teacher permissions' })
  async switchToTeacherMode(@Request() req) {
    // This endpoint could be used for users who have both student and teacher capabilities
    // For now, it just validates that they have teacher permissions
    return {
      success: true,
      message: 'Teacher mode activated',
      data: {
        role: req.user.role,
        teacherPermissions: ROLE_PERMISSIONS[req.user.role]?.filter(p => 
          p.startsWith('instructor:') || p.startsWith('course:create') || p.startsWith('course:update')
        ) || [],
      },
    };
  }

  // Admin-only endpoints
  @Get('users/:userId/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user role information (Admin only)' })
  @ApiResponse({ status: 200, description: 'User role retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions - admin access required' })
  async getUserRole(@Param('userId', ParseUUIDPipe) userId: string) {
    // This would typically fetch from user service
    return {
      success: true,
      message: 'This endpoint would fetch user role from user service',
      note: 'Implementation depends on user service integration',
    };
  }
}