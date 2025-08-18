import { Injectable, CanActivate, ExecutionContext, Logger, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const REQUIRE_EMAIL_VERIFICATION_KEY = 'requireEmailVerification';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  private readonly logger = new Logger(EmailVerifiedGuard.name);
  
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireVerification = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_EMAIL_VERIFICATION_KEY,
      [context.getHandler(), context.getClass()],
    );
    
    if (!requireVerification) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      this.logger.warn('Access denied: No user found in request');
      return false;
    }
    
    if (!user.emailVerifiedAt) {
      this.logger.warn(`Access denied: User ${user.email} email not verified`);
      throw new ForbiddenException('Email verification required to access this resource');
    }
    
    return true;
  }
}