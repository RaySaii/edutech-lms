import { NextResponse } from 'next/server';

export async function GET() {
  const data = {
    recommendations: [
      {
        id: 'rec-1',
        contentId: 'content-1',
        courseId: 'course-1',
        title: 'Recommended: JavaScript Deep Dive',
        description: 'A curated path to master JS concepts.',
        type: 'hybrid',
        confidenceScore: 0.82,
        relevanceScore: 0.9,
        reasoning: {
          primaryFactors: ['history', 'interest'],
          explanation: 'Based on your recent activity and saved topics.',
        },
        metadata: {
          duration: 95,
          difficulty: 'intermediate',
          skillsLearned: ['closures', 'async', 'patterns'],
          completionRate: 0.76,
          rating: 4.6,
        },
      },
    ],
    metadata: {
      totalAvailable: 1,
      algorithmUsed: 'mock',
      personalizationLevel: 0.7,
      diversityScore: 0.5,
      responseTime: 5,
    },
  };

  return NextResponse.json({ data });
}

