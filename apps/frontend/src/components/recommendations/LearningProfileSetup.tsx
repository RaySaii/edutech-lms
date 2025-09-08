'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Brain,
  Target,
  BookOpen,
  Clock,
  Award,
  TrendingUp,
  Lightbulb,
  Settings,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface LearningProfile {
  interests: {
    topics: string[];
    categories: string[];
    skills: string[];
    career_goals: string[];
  };
  learningStyle: string;
  preferences: {
    content_types: string[];
    duration_preference: string;
    difficulty_preference: string;
    language: string;
    timezone: string;
    available_hours: {
      weekday: number;
      weekend: number;
    };
  };
  careerPath?: {
    current_role: string;
    target_role: string;
    industry: string;
    experience_years: number;
    required_skills: string[];
    skill_gaps?: string[];
  };
  profileCompleteness: number;
}

interface UserAnalysis {
  interests: string[];
  skillLevels: Record<string, { level: string; confidence: number }>;
  learningStyle: string;
  preferences: any;
  behavior: any;
  recommendations: {
    skillGaps: string[];
    careerAlignment: string[];
    contentSuggestions: string[];
  };
}

const CONTENT_TYPES = [
  { id: 'video', label: 'Video Lectures', icon: '🎥' },
  { id: 'text', label: 'Text Articles', icon: '📄' },
  { id: 'interactive', label: 'Interactive Exercises', icon: '💻' },
  { id: 'audio', label: 'Podcasts/Audio', icon: '🎧' },
  { id: 'hands_on', label: 'Hands-on Projects', icon: '🔧' },
  { id: 'quiz', label: 'Quizzes & Tests', icon: '📝' },
];

const LEARNING_STYLES = [
  { id: 'visual', label: 'Visual', description: 'Learn best with images, diagrams, and visual aids' },
  { id: 'auditory', label: 'Auditory', description: 'Prefer lectures, discussions, and audio content' },
  { id: 'reading', label: 'Reading/Writing', description: 'Learn through reading and writing activities' },
  { id: 'kinesthetic', label: 'Kinesthetic', description: 'Hands-on learning and practical exercises' },
  { id: 'mixed', label: 'Mixed', description: 'Combination of multiple learning styles' },
];

const SKILL_CATEGORIES = [
  'Programming', 'Data Science', 'Design', 'Marketing', 'Business',
  'Leadership', 'Project Management', 'Communication', 'Analytics',
  'Cloud Computing', 'Cybersecurity', 'Mobile Development'
];

const LearningProfileSetup: React.FC = () => {
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [analysis, setAnalysis] = useState<UserAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('interests');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [careerPath, setCareerPath] = useState({
    current_role: '',
    target_role: '',
    industry: '',
    experience_years: 0,
    required_skills: [] as string[],
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    
    try {
      const [profileResponse, analysisResponse] = await Promise.all([
        fetch('/api/ai-recommendations/profile'),
        fetch('/api/ai-recommendations/profile').then(r => r.ok ? r.json() : null)
      ]);

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfile(profileData.data);
        
        // Pre-populate form data
        if (profileData.data) {
          setSelectedTopics(profileData.data.interests?.topics || []);
          setSelectedSkills(profileData.data.interests?.skills || []);
          setSelectedContentTypes(profileData.data.preferences?.content_types || []);
          setCareerPath(profileData.data.careerPath || {
            current_role: '',
            target_role: '',
            industry: '',
            experience_years: 0,
            required_skills: [],
          });
        }
      }

      if (analysisResponse) {
        setAnalysis(analysisResponse.data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);

    try {
      const updatedProfile = {
        interests: {
          topics: selectedTopics,
          categories: [...new Set(selectedTopics.map(t => getCategoryForTopic(t)))],
          skills: selectedSkills,
          career_goals: careerPath.target_role ? [careerPath.target_role] : [],
        },
        preferences: {
          ...profile?.preferences,
          content_types: selectedContentTypes,
        },
        careerPath: careerPath.current_role || careerPath.target_role ? careerPath : undefined,
      };

      const response = await fetch('/api/ai-recommendations/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProfile),
      });

      if (response.ok) {
        await fetchProfile(); // Refresh profile
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const getCategoryForTopic = (topic: string): string => {
    // Simple categorization - in practice, use a proper mapping
    const categoryMap: Record<string, string> = {
      'javascript': 'Programming',
      'python': 'Programming',
      'react': 'Programming',
      'machine learning': 'Data Science',
      'data analysis': 'Data Science',
      'marketing': 'Marketing',
      'leadership': 'Leadership',
      'design': 'Design',
    };

    return categoryMap[topic.toLowerCase()] || 'General';
  };

  const getCompletionColor = (completeness: number) => {
    if (completeness < 0.3) return 'text-red-500';
    if (completeness < 0.7) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Brain className="mx-auto h-12 w-12 animate-pulse text-muted-foreground mb-4" />
          <p>Analyzing your learning profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Learning Profile Setup</h1>
        <p className="text-muted-foreground">
          Help us understand your learning preferences to provide better recommendations
        </p>
        {profile && (
          <div className="flex items-center justify-center space-x-2">
            <Progress 
              value={profile.profileCompleteness * 100} 
              className="w-32 h-2"
            />
            <span className={`text-sm font-medium ${getCompletionColor(profile.profileCompleteness)}`}>
              {Math.round(profile.profileCompleteness * 100)}% Complete
            </span>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="interests" className="flex items-center space-x-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Interests</span>
          </TabsTrigger>
          <TabsTrigger value="learning-style" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Style</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="career" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Career</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Analysis</span>
          </TabsTrigger>
        </TabsList>

        {/* Interests Tab */}
        <TabsContent value="interests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>What interests you?</span>
              </CardTitle>
              <CardDescription>
                Select topics and skills you're interested in learning about
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Topics */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Topics of Interest</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {SKILL_CATEGORIES.map((category) => (
                    <div
                      key={category}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTopics.includes(category)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted border-border'
                      }`}
                      onClick={() => {
                        setSelectedTopics(prev =>
                          prev.includes(category)
                            ? prev.filter(t => t !== category)
                            : [...prev, category]
                        );
                      }}
                    >
                      <div className="text-sm font-medium text-center">{category}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Topics */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Add Custom Topics</Label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter a topic (e.g., Machine Learning)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (value && !selectedTopics.includes(value)) {
                          setSelectedTopics(prev => [...prev, value]);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const input = document.querySelector('input[placeholder*="Enter a topic"]') as HTMLInputElement;
                      const value = input.value.trim();
                      if (value && !selectedTopics.includes(value)) {
                        setSelectedTopics(prev => [...prev, value]);
                        input.value = '';
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                
                {/* Selected Topics */}
                {selectedTopics.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTopics.map((topic) => (
                      <Badge
                        key={topic}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => setSelectedTopics(prev => prev.filter(t => t !== topic))}
                      >
                        {topic} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Style Tab */}
        <TabsContent value="learning-style" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>How do you learn best?</span>
              </CardTitle>
              <CardDescription>
                Choose your preferred learning style to get content that matches your preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {LEARNING_STYLES.map((style) => (
                <div
                  key={style.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    profile?.learningStyle === style.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted border-border'
                  }`}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await fetch('/api/ai-recommendations/profile', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ learningStyle: style.id }),
                      });
                      await fetchProfile();
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{style.label}</h3>
                      <p className="text-sm opacity-80 mt-1">{style.description}</p>
                    </div>
                    {profile?.learningStyle === style.id && (
                      <CheckCircle className="h-5 w-5" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Content Preferences</span>
              </CardTitle>
              <CardDescription>
                Tell us about your preferred content types and learning schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Content Types */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Preferred Content Types</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {CONTENT_TYPES.map((type) => (
                    <div
                      key={type.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedContentTypes.includes(type.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted border-border'
                      }`}
                      onClick={() => {
                        setSelectedContentTypes(prev =>
                          prev.includes(type.id)
                            ? prev.filter(t => t !== type.id)
                            : [...prev, type.id]
                        );
                      }}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-1">{type.icon}</div>
                        <div className="text-sm font-medium">{type.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration Preference */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Session Duration Preference</Label>
                <Select
                  value={profile?.preferences?.duration_preference}
                  onValueChange={async (value) => {
                    setSaving(true);
                    try {
                      await fetch('/api/ai-recommendations/profile', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          preferences: { duration_preference: value }
                        }),
                      });
                      await fetchProfile();
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select preferred session length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (5-15 minutes)</SelectItem>
                    <SelectItem value="medium">Medium (15-45 minutes)</SelectItem>
                    <SelectItem value="long">Long (45+ minutes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Available Hours */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Available Learning Hours per Day</Label>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Weekdays</span>
                      <span className="text-sm font-medium">
                        {profile?.preferences?.available_hours?.weekday || 1} hours
                      </span>
                    </div>
                    <Slider
                      value={[profile?.preferences?.available_hours?.weekday || 1]}
                      onValueChange={async ([value]) => {
                        setSaving(true);
                        try {
                          await fetch('/api/ai-recommendations/profile', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              preferences: {
                                available_hours: {
                                  weekday: value,
                                  weekend: profile?.preferences?.available_hours?.weekend || 2
                                }
                              }
                            }),
                          });
                          await fetchProfile();
                        } finally {
                          setSaving(false);
                        }
                      }}
                      max={8}
                      min={0.5}
                      step={0.5}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Weekends</span>
                      <span className="text-sm font-medium">
                        {profile?.preferences?.available_hours?.weekend || 2} hours
                      </span>
                    </div>
                    <Slider
                      value={[profile?.preferences?.available_hours?.weekend || 2]}
                      onValueChange={async ([value]) => {
                        setSaving(true);
                        try {
                          await fetch('/api/ai-recommendations/profile', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              preferences: {
                                available_hours: {
                                  weekday: profile?.preferences?.available_hours?.weekday || 1,
                                  weekend: value
                                }
                              }
                            }),
                          });
                          await fetchProfile();
                        } finally {
                          setSaving(false);
                        }
                      }}
                      max={8}
                      min={0.5}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Career Tab */}
        <TabsContent value="career" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Career Goals</span>
              </CardTitle>
              <CardDescription>
                Help us recommend content that aligns with your career objectives
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Role</Label>
                  <Input
                    value={careerPath.current_role}
                    onChange={(e) => setCareerPath(prev => ({ ...prev, current_role: e.target.value }))}
                    placeholder="e.g., Frontend Developer"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Target Role</Label>
                  <Input
                    value={careerPath.target_role}
                    onChange={(e) => setCareerPath(prev => ({ ...prev, target_role: e.target.value }))}
                    placeholder="e.g., Full Stack Developer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input
                    value={careerPath.industry}
                    onChange={(e) => setCareerPath(prev => ({ ...prev, industry: e.target.value }))}
                    placeholder="e.g., Technology, Healthcare"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Years of Experience</Label>
                  <Input
                    type="number"
                    value={careerPath.experience_years}
                    onChange={(e) => setCareerPath(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Skills Required for Target Role</Label>
                <Textarea
                  value={careerPath.required_skills.join(', ')}
                  onChange={(e) => setCareerPath(prev => ({ 
                    ...prev, 
                    required_skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  }))}
                  placeholder="e.g., React, Node.js, TypeScript, GraphQL"
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  Separate skills with commas
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          {analysis ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5" />
                    <span>Skill Gaps</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysis.recommendations.skillGaps.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.recommendations.skillGaps.map((gap) => (
                        <Badge key={gap} variant="outline" className="mr-2 mb-2">
                          {gap}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No significant skill gaps identified</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Career Alignment</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysis.recommendations.careerAlignment.map((recommendation) => (
                      <div key={recommendation} className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5" />
                    <span>Content Suggestions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {analysis.recommendations.contentSuggestions.map((suggestion) => (
                      <div key={suggestion} className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Complete your profile to get personalized analysis
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-center">
        <Button onClick={saveProfile} disabled={saving} size="lg">
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
};

export default LearningProfileSetup;