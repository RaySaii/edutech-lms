'use client';

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ScheduleModule from '../../components/schedule/ScheduleModule';
import { useTeacherCourses } from '../../hooks/useTeacherCourses';

export default function SchedulePage() {
  const { user } = useAuth();
  const { courses, loading } = useTeacherCourses();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading schedule...</p>
        </div>
      </div>
    );
  }

  // Redirect students to appropriate page
  if (user.role === 'student') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h1>
          <p className="text-gray-600 mb-6">Schedule management is available for teachers only.</p>
          <a 
            href="/dashboard" 
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ScheduleModule courses={courses} />
      </div>
    </div>
  );
}