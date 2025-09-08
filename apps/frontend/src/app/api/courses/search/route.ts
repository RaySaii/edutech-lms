import { NextResponse } from 'next/server';
import { mockCourses } from '../../data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').toLowerCase();
  const page = Number(searchParams.get('page') || 1);
  const limit = Number(searchParams.get('limit') || 10);

  let filtered = mockCourses;
  if (q) {
    filtered = filtered.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }
  const start = (page - 1) * limit;
  const end = start + limit;
  const slice = filtered.slice(start, end);

  return NextResponse.json({
    success: true,
    data: {
      courses: slice,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
        hasNext: end < filtered.length,
        hasPrev: start > 0,
      },
    },
  });
}

