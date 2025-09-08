import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const TENANT_KEY = 'tenant';
export const TENANT_REQUIRED_KEY = 'tenant-required';
export const TENANT_ROLES_KEY = 'tenant-roles';
export const TENANT_PERMISSIONS_KEY = 'tenant-permissions';

/**
 * Extract tenant information from the request
 * Can be used as a parameter decorator to inject tenant data
 */
export const CurrentTenant = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request.tenant;

    return data ? tenant?.[data] : tenant;
  },
);

/**
 * Extract tenant context (tenant + user role/permissions) from the request
 */
export const TenantContext = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContext = request.tenantContext;

    return data ? tenantContext?.[data] : tenantContext;
  },
);

/**
 * Mark a route as requiring tenant context
 */
export const RequireTenant = (required: boolean = true) =>
  SetMetadata(TENANT_REQUIRED_KEY, required);

/**
 * Require specific tenant role(s)
 */
export const RequireTenantRole = (...roles: string[]) =>
  SetMetadata(TENANT_ROLES_KEY, roles);

/**
 * Require specific tenant permissions
 */
export const RequireTenantPermissions = (...permissions: string[]) =>
  SetMetadata(TENANT_PERMISSIONS_KEY, permissions);

/**
 * Combined decorator for tenant access control
 */
export const TenantAccess = (options: {
  required?: boolean;
  roles?: string[];
  permissions?: string[];
}) => {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (options.required !== undefined) {
      SetMetadata(TENANT_REQUIRED_KEY, options.required)(target, propertyKey, descriptor);
    }
    if (options.roles) {
      SetMetadata(TENANT_ROLES_KEY, options.roles)(target, propertyKey, descriptor);
    }
    if (options.permissions) {
      SetMetadata(TENANT_PERMISSIONS_KEY, options.permissions)(target, propertyKey, descriptor);
    }
  };
};

/**
 * Decorator for tenant admin access
 */
export const TenantAdmin = () =>
  TenantAccess({ required: true, roles: ['admin', 'owner'] });

/**
 * Decorator for tenant owner access
 */
export const TenantOwner = () =>
  TenantAccess({ required: true, roles: ['owner'] });

/**
 * Decorator for tenant manager access
 */
export const TenantManager = () =>
  TenantAccess({ required: true, roles: ['manager', 'admin', 'owner'] });

/**
 * Decorator for tenant teacher access
 */
export const TenantTeacher = () =>
  TenantAccess({ required: true, roles: ['teacher', 'manager', 'admin', 'owner'] });

/**
 * Get tenant metadata from reflector
 */
export const getTenantMetadata = (
  reflector: Reflector,
  context: ExecutionContext
) => {
  return {
    required: reflector.get<boolean>(TENANT_REQUIRED_KEY, context.getHandler()) ||
              reflector.get<boolean>(TENANT_REQUIRED_KEY, context.getClass()),
    roles: reflector.get<string[]>(TENANT_ROLES_KEY, context.getHandler()) ||
           reflector.get<string[]>(TENANT_ROLES_KEY, context.getClass()),
    permissions: reflector.get<string[]>(TENANT_PERMISSIONS_KEY, context.getHandler()) ||
                 reflector.get<string[]>(TENANT_PERMISSIONS_KEY, context.getClass()),
  };
};