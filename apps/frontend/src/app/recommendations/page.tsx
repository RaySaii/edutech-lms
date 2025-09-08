import React from 'react';
import { Metadata } from 'next';
import PersonalizedRecommendations from '@/components/recommendations/PersonalizedRecommendations';

export const metadata: Metadata = {
  title: 'AI Recommendations | EduTech LMS',
  description: 'Get personalized learning recommendations powered by artificial intelligence',
};

export default function RecommendationsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 data-testid="recommendations-header" className="text-3xl font-bold mb-4">Personalized Recommendations</h1>
      <div data-testid="personalized-courses">
        <PersonalizedRecommendations />
      </div>
    </div>
  );
}
