import { NextResponse } from 'next/server';
import { findCourse } from '../../data';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const course = findCourse(params.id);
  if (!course) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: course });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  // Accept update and echo back
  const course = findCourse(params.id);
  if (!course) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  Object.assign(course, body, { updatedAt: new Date().toISOString() });
  return NextResponse.json({ success: true, data: course, message: 'Updated' });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const mod = await import('../../data');
  const idx = mod.mockCourses.findIndex((c) => c.id === params.id);
  if (idx >= 0) mod.mockCourses.splice(idx, 1);
  return NextResponse.json({ success: true, message: 'Deleted' });
}

