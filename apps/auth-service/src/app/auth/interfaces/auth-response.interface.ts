import { User } from '@edutech-lms/database';
import { UserRole, UserStatus } from '@edutech-lms/common';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse {
  success?: boolean;
  message?: string;
  statusCode?: number;
  error?: string;
  user?: UserProfile;
  tokens?: TokenPair | null;
  data?: {
    user: UserProfile;
    tokens: TokenPair | null;
  };
  requiresTwoFactor?: boolean;
  requiresEmailVerification?: boolean;
  backupCodes?: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  organizationId: string;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  twoFactorEnabled: boolean;
  avatar?: string;
  phone?: string;
}

export interface TwoFactorSetupResponse {
  success: boolean;
  data?: {
    qrCodeUrl: string;
    secret: string;
    backupCodes: string[];
  };
  message: string;
}