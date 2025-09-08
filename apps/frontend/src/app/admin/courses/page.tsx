'use client';

import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { CourseApprovalSystem } from '../../../components/admin/CourseApprovalSystem';

export default function AdminCoursesPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Review, approve, and manage courses across the platform
          </p>
        </div>
        
        <CourseApprovalSystem />
      </div>
    </div>
  );
}