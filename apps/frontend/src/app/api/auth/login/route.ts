import { NextResponse } from 'next/server';
import { UserRole, UserStatus } from '@/types/auth';

const devUser = {
  id: 'user-1',
  email: '309406931@qq.com',
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.STUDENT,
  status: UserStatus.ACTIVE,
  organizationId: 'org-1',
  twoFactorEnabled: false,
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const tokens = { accessToken: 'dev-access-token', refreshToken: 'dev-refresh-token' };
  return NextResponse.json({
    success: true,
    data: {
      user: { ...devUser, email: body.email || devUser.email },
      tokens,
    },
    meta: { timestamp: new Date().toISOString() },
  });
}

