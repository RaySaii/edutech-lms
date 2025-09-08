'use client';

import React from 'react';
import { CoursePlayer } from '../../../../../components/courses/CoursePlayer';

interface CoursePlayerPageProps {
  params: Promise<{
    id: string;
    lessonId: string;
  }>;
}

export default function CoursePlayerPage({ params }: CoursePlayerPageProps) {
  const resolvedParams = React.use(params);
  
  return (
    <CoursePlayer 
      courseId={resolvedParams.id} 
      lessonId={resolvedParams.lessonId}
    />
  );
}