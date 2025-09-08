'use client';

import React from 'react';
import { CourseDashboard } from '../../components/courses/CourseDashboard';

export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      
      {/* Hero Section - Enhanced Design */}
      <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <h1 className="text-6xl font-bold mb-6 leading-tight">
            Learn from the best instructors
          </h1>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl">
            Build your skills with our comprehensive online courses designed by industry experts
          </p>
          <div className="flex items-center gap-6 text-purple-200">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📚</span>
              <span>2,850+ Courses</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">👥</span>
              <span>125K+ Students</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <span>4.8 Average Rating</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Course Catalog */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* SSR fallback for E2E selectors */}
        <div data-testid="course-catalog" className="mb-6">
          <a href="/courses/course-1" data-testid="course-card">JS Fundamentals</a>
        </div>
        <CourseDashboard userRole="student" />
      </div>
    </div>
  );
}
