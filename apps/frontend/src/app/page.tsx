'use client';

import { useRouter } from 'next/navigation';
import { BookOpen, Users, Award, BarChart3 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/login');
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            EduTech LMS
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A comprehensive Learning Management System built with modern technologies
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <BookOpen className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Course Management</h3>
            <p className="text-gray-600">Create and manage courses with rich content</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <Users className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">User Management</h3>
            <p className="text-gray-600">Multi-tenant support with role-based access</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <Award className="h-12 w-12 text-purple-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Assessments</h3>
            <p className="text-gray-600">Comprehensive testing and evaluation tools</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <BarChart3 className="h-12 w-12 text-orange-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Analytics</h3>
            <p className="text-gray-600">Track progress and performance metrics</p>
          </div>
        </div>

        <div className="text-center">
          <button 
            onClick={handleGetStarted}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  )
}
