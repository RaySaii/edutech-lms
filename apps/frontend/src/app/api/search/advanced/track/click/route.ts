import { NextResponse } from 'next/server';

export async function POST() {
  // Accept and ignore in mock
  return NextResponse.json({ success: true });
}

