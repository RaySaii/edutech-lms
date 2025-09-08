import { NextResponse } from 'next/server';
import { mockCourses } from './data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get('search') || searchParams.get('q') || '').toLowerCase();
  const page = Number(searchParams.get('page') || 1);
  const limit = Number(searchParams.get('limit') || 12);

  let filtered = mockCourses;
  if (search) {
    filtered = filtered.filter((c) => c.title.toLowerCase().includes(search) || c.description.toLowerCase().includes(search));
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

export async function POST(request: Request) {
  const body = await request.json();
  const id = `course-${Date.now()}`;
  const now = new Date().toISOString();
  const course = {
    id,
    slug: (body.title || 'new-course').toLowerCase().replace(/\s+/g, '-'),
    title: body.title || 'New Course',
    description: body.description || '',
    price: Number(body.price || 0),
    status: 'draft' as const,
    level: body.level || 'beginner',
    category: body.category || 'programming',
    enrollmentCount: 0,
    rating: 0,
    reviewCount: 0,
    instructorId: 'inst-1',
    instructor: { id: 'inst-1', firstName: 'Jane', lastName: 'Doe' },
    createdAt: now,
    updatedAt: now,
  };
  // push to in-memory list
  // @ts-ignore
  ;(await import('./data')).mockCourses.push(course);
  return NextResponse.json({ success: true, data: course, message: 'Course created successfully' });
}

