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

export async function GET() {
  return NextResponse.json({ success: true, data: devUser, meta: { timestamp: new Date().toISOString() } });
}

