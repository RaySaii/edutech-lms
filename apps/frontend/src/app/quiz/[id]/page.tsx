'use client';

import React from 'react';
import { QuizPlayer } from '../../../components/assessment/QuizPlayer';
import { useRouter } from 'next/navigation';

interface QuizPageProps {
  params: Promise<{ id: string; }>;
}

export default function QuizPage({ params }: QuizPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const quizId = resolvedParams.id;

  const handleQuizComplete = (score: number, passed: boolean) => {
    // Handle quiz completion (save to database, update progress, etc.)
    console.log(`Quiz completed: Score ${score}%, Passed: ${passed}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <QuizPlayer 
        quizId={quizId} 
        onComplete={handleQuizComplete}
      />
    </div>
  );
}