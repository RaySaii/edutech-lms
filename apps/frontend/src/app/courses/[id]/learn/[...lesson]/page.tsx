'use client';

import React from 'react';
import { CoursePlayer } from '../../../../../components/courses/CoursePlayer';

interface LessonPageProps {
  params: Promise<{ 
    id: string; 
    lesson: string[];
  }>;
}

export default function LessonPage({ params }: LessonPageProps) {
  const resolvedParams = React.use(params);
  const courseId = resolvedParams.id;
  const lessonPath = resolvedParams.lesson;
  
  // Parse lesson path (e.g., ['1-1'] becomes section 1, lesson 1)
  const [sectionId, lessonId] = lessonPath[0]?.split('-').map(Number) || [1, 1];

  return (
    <div className="min-h-screen bg-gray-900">
      <CoursePlayer 
        courseId={courseId}
        lessonId={`${sectionId}-${lessonId}`}
      />
    </div>
  );
}