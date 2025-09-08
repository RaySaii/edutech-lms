import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const query = body?.query ?? '';

  const results = [
    {
      id: 'course-1',
      type: 'course',
      title: 'JavaScript Fundamentals',
      description: 'Learn the basics of JavaScript with hands-on examples.',
      url: '/courses/js-fundamentals',
      thumbnail: '',
      score: 0.95,
      metadata: {
        category: 'programming',
        author: 'Jane Doe',
        rating: 4.7,
        difficulty: 'beginner',
        duration: 120,
        price: 0,
      },
    },
    {
      id: 'course-2',
      type: 'course',
      title: 'Advanced JavaScript Patterns',
      description: 'Deep dive into advanced patterns and best practices.',
      url: '/courses/js-advanced-patterns',
      thumbnail: '',
      score: 0.88,
      metadata: {
        category: 'programming',
        author: 'John Smith',
        rating: 4.8,
        difficulty: 'intermediate',
        duration: 180,
        price: 99.99,
      },
    },
  ];

  return NextResponse.json({
    query,
    total: results.length,
    took: 12,
    results,
    pagination: { current: 1, size: 20, total: results.length, pages: 1 },
    suggestions: ['javascript basics', 'advanced javascript', 'web development'],
  });
}

