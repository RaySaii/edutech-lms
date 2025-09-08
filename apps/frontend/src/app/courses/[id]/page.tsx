'use client';

import React from 'react';
import { CourseDetailView } from '../../../components/courses/CourseDetailView';

interface CourseDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const resolvedParams = React.use(params);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <CourseDetailView courseId={resolvedParams.id} />
    </div>
  );
}