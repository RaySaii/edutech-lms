import { NextResponse } from 'next/server';
import { findCourse, mockEnrollments } from '../../../data';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const course = findCourse(params.id);
  if (!course) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  mockEnrollments.push({
    id: `enr-${Date.now()}`,
    enrolledAt: new Date().toISOString(),
    progress: 0,
    course: {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      instructor: { firstName: course.instructor.firstName, lastName: course.instructor.lastName },
    },
  });
  return NextResponse.json({ success: true, message: 'Enrolled' });
}

