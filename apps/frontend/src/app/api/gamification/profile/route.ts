import { NextResponse } from 'next/server';

export async function GET() {
  const profile = {
    points: { current: 120, lifetime: 1500, level: 5, pointsToNextLevel: 80, levelBenefits: {} },
    achievements: { total: 12, recent: [], inProgress: [], completionRate: 42.5 },
    badges: { total: 6, displayed: [], recent: [], categories: {} },
    streaks: { daily: 7, learning: 7, longestEver: 21, isActive: true },
    quests: { available: 2, inProgress: 1, completed: 5, currentQuests: [
      { id: 'q1', title: 'Complete JS Module', description: 'Finish the JS module', difficulty: 'medium', estimatedDays: 3, objectives: [], rewards: { points: 50, experience: 100 } }
    ] },
    leaderboards: { globalRank: 1234, weeklyRank: 120, topSkills: [] },
    titles: { current: 'Rising Star', available: [] },
  };
  return NextResponse.json(profile);
}

