'use client';

import React from 'react';
import { CourseForm } from '../../../../components/courses/CourseForm';

interface EditCoursePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const { id } = await params;
  return <CourseForm courseId={id} mode="edit" />;
}