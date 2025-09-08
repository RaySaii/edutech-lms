import { NextResponse } from 'next/server';
import { mockCourses } from '../../data';

export async function GET() {
  // Return all courses as "my courses" for simplicity
  return NextResponse.json({
    success: true,
    data: {
      courses: mockCourses,
      pagination: {
        page: 1,
        limit: mockCourses.length,
        total: mockCourses.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    },
  });
}

