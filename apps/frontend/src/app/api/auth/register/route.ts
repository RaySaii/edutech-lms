import { NextResponse } from 'next/server';
import { UserRole, UserStatus } from '@/types/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const user = {
    id: `user-${Date.now()}`,
    email: body.email || 'user@example.com',
    firstName: body.firstName || 'New',
    lastName: body.lastName || 'User',
    role: body.role || UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    organizationId: 'org-1',
    twoFactorEnabled: false,
  };
  return NextResponse.json({
    success: true,
    data: { user, tokens: { accessToken: 'dev-access-token', refreshToken: 'dev-refresh-token' } },
    meta: { timestamp: new Date().toISOString() },
  });
}

