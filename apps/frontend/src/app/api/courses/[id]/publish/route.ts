import { NextResponse } from 'next/server';
import { findCourse } from '../../../data';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const course = findCourse(params.id);
  if (!course) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  course.status = 'published';
  course.updatedAt = new Date().toISOString();
  return NextResponse.json({ success: true, message: 'Published' });
}

