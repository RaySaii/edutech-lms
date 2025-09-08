'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy,
  Star,
  Flame,
  Target,
  Award,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  Medal,
  Crown,
  Zap,
  Gift,
  ChevronRight,
  Plus,
} from 'lucide-react';

interface UserGameProfile {
  points: {
    current: number;
    lifetime: number;
    level: number;
    pointsToNextLevel: number;
    levelBenefits: any;
  };
  achievements: {
    total: number;
    recent: Achievement[];
    inProgress: UserAchievement[];
    completionRate: number;
  };
  badges: {
    total: number;
    displayed: Badge[];
    recent: Badge[];
    categories: Record<string, number>;
  };
  streaks: {
    daily: number;
    learning: number;
    longestEver: number;
    isActive: boolean;
  };
  quests: {
    available: number;
    inProgress: number;
    completed: number;
    currentQuests: Quest[];
  };
  leaderboards: {
    globalRank: number;
    weeklyRank: number;
    topSkills: Array<{ skill: string; rank: number }>;
  };
  titles: {
    current: string;
    available: UserTitle[];
  };
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  rarity: string;
  pointsValue: number;
}

interface UserAchievement {
  id: string;
  achievement: Achievement;
  progress: number;
  isCompleted: boolean;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  category: string;
  color?: string;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedDays: number;
  objectives: Array<{
    id: string;
    description: string;
    completed: boolean;
  }>;
  rewards: {
    points: number;
    experience: number;
  };
}

interface UserTitle {
  id: string;
  title: string;
  description?: string;
  earnedAt: Date;
  isActive: boolean;
}

export default function GamificationDashboard() {
  const [profile, setProfile] = useState<UserGameProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchGamificationProfile();
  }, []);

  const fetchGamificationProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gamification/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch gamification profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'legendary': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
      case 'epic': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'rare': return 'bg-blue-500 text-white';
      case 'uncommon': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'epic': return 'text-red-600 bg-red-100';
      case 'hard': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'easy': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Gamification Data</h3>
            <p className="text-gray-600">Start learning to begin your gamification journey!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Gamification Hub
          </h1>
          <p className="text-gray-600 mt-1">Track your progress and achievements</p>
        </div>
        {profile.titles.current && (
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Crown className="h-4 w-4 mr-2" />
            {profile.titles.current}
          </Badge>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="user-level">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Level</p>
                <p className="text-2xl font-bold">{profile.points.level}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4" data-testid="level-progress">
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Progress to Level {profile.points.level + 1}</span>
                <span>{profile.points.current} / {profile.points.current + profile.points.pointsToNextLevel}</span>
              </div>
              <div role="progressbar" aria-valuenow={Math.round((profile.points.current / (profile.points.current + profile.points.pointsToNextLevel)) * 100)} aria-valuemin={0} aria-valuemax={100}>
                <Progress 
                  value={(profile.points.current / (profile.points.current + profile.points.pointsToNextLevel)) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="current-streak">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Streak</p>
                <p className="text-2xl font-bold">{profile.streaks.daily} days</p>
              </div>
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                profile.streaks.isActive ? 'bg-orange-100' : 'bg-gray-100'
              }`}>
                <Flame className={`h-6 w-6 ${
                  profile.streaks.isActive ? 'text-orange-600' : 'text-gray-600'
                }`} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Longest: {profile.streaks.longestEver} days
            </p>
          </CardContent>
        </Card>

        <Card data-testid="achievements-count">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Achievements</p>
                <p className="text-2xl font-bold">{profile.achievements.total}</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {profile.achievements.completionRate.toFixed(1)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card data-testid="total-points">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Global Rank</p>
                <p className="text-2xl font-bold">#{profile.leaderboards.globalRank || 'Unranked'}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Weekly: #{profile.leaderboards.weeklyRank || 'Unranked'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="quests">Quests</TabsTrigger>
          <TabsTrigger value="leaderboards">Leaderboards</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Achievements */}
            <Card data-testid="achievements-grid">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.achievements.recent.slice(0, 3).map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="h-10 w-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{achievement.name}</h4>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                    </div>
                    <Badge className={getRarityColor(achievement.rarity)}>
                      {achievement.rarity}
                    </Badge>
                  </div>
                ))}
                {profile.achievements.recent.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No recent achievements</p>
                )}
              </CardContent>
            </Card>

            {/* Active Quests */}
            <Card data-testid="available-quests">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Active Quests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.quests.currentQuests.slice(0, 3).map((quest) => (
                  <div key={quest.id} className="p-3 bg-gray-50 rounded-lg" data-testid="quest-item">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{quest.title}</h4>
                      <Badge className={getDifficultyColor(quest.difficulty)}>
                        {quest.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{quest.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {quest.estimatedDays} days
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {quest.rewards.points} points
                      </span>
                    </div>
                  </div>
                ))}
                {profile.quests.currentQuests.length === 0 && (
                  <div className="text-center py-6">
                    <Target className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">No active quests</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Browse Quests
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Progress Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <Star className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold">{profile.points.lifetime.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Points Earned</p>
                </div>
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-3">
                    <Medal className="h-8 w-8 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold">{profile.badges.total}</p>
                  <p className="text-sm text-gray-600">Badges Collected</p>
                </div>
                <div className="text-center">
                  <div className="h-16 w-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <Target className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold">{profile.quests.completed}</p>
                  <p className="text-sm text-gray-600">Quests Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Achievements</h2>
              <p className="text-gray-600">{profile.achievements.total} unlocked • {profile.achievements.completionRate.toFixed(1)}% completion</p>
            </div>
          </div>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.achievements.recent.map((achievement) => (
                  <div key={achievement.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <Trophy className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{achievement.name}</h3>
                        <Badge className={getRarityColor(achievement.rarity)} size="sm">
                          {achievement.rarity}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {achievement.pointsValue} points
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* In Progress Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profile.achievements.inProgress.map((userAchievement) => (
                  <div key={userAchievement.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Trophy className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{userAchievement.achievement.name}</h3>
                          <p className="text-sm text-gray-600">{userAchievement.achievement.description}</p>
                        </div>
                      </div>
                      <Badge className={getRarityColor(userAchievement.achievement.rarity)} size="sm">
                        {userAchievement.achievement.rarity}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{userAchievement.progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={userAchievement.progress} className="h-2" />
                    </div>
                  </div>
                ))}
                {profile.achievements.inProgress.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No achievements in progress</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs would continue with similar detailed implementations */}
        <TabsContent value="badges">
          <Card data-testid="badges-collection">
            <CardContent className="p-6 text-center">
              <Medal className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Badges Section</h3>
              <p className="text-gray-600">Detailed badges implementation coming soon!</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quests">
          <Card data-testid="available-quests">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Available Quests</h3>
                <Button variant="outline" size="sm">Start Quest</Button>
              </div>
              <div className="space-y-3">
                {profile.quests.currentQuests.map((quest) => (
                  <div key={quest.id} className="p-3 border rounded-md" data-testid="quest-item">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{quest.title}</h4>
                        <p className="text-sm text-gray-600">{quest.description}</p>
                      </div>
                      <Badge className={getDifficultyColor(quest.difficulty)}>{quest.difficulty}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">{quest.estimatedDays} days • {quest.rewards.points} pts</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboards">
          <Card data-testid="leaderboard-table">
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Leaderboards Section</h3>
              <p className="text-gray-600">Detailed leaderboards implementation coming soon!</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
