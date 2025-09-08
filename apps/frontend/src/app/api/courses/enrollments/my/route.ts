import { NextResponse } from 'next/server';
import { mockEnrollments } from '../../../data';

export async function GET() {
  return NextResponse.json({ success: true, data: mockEnrollments });
}

