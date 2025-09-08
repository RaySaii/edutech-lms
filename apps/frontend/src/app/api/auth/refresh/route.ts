import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: true,
    data: { tokens: { accessToken: 'dev-access-token', refreshToken: 'dev-refresh-token' } },
    meta: { timestamp: new Date().toISOString() },
  });
}

