'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Trophy, 
  Target, 
  BookOpen,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Lightbulb,
  Eye,
  EyeOff,
  Flag,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface Assessment {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'knowledge_check' | 'interactive' | 'survey';
  isRequired: boolean;
  triggerTime?: number;
  timing: 'during' | 'after' | 'before';
  timeLimit?: number;
  maxAttempts: number;
  passingScore?: number;
  showResults: boolean;
  showCorrectAnswers: boolean;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  questions: Question[];
  userAttempts?: Attempt[];
  settings: {
    allowPause: boolean;
    showProgress: boolean;
    allowBacktrack: boolean;
    showHints: boolean;
    autoSubmit: boolean;
    lockVideoProgress: boolean;
  };
}

interface Question {
  id: string;
  order: number;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'matching' | 'ordering';
  question: string;
  explanation?: string;
  hint?: string;
  points: number;
  isRequired: boolean;
  timeLimit?: number;
  options?: Array<{
    id: string;
    text: string;
    isCorrect?: boolean;
    explanation?: string;
  }>;
  correctAnswer?: any;
  metadata?: {
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
    videoTimestamp?: number;
  };
}

interface Attempt {
  id: string;
  attemptNumber: number;
  status: 'in_progress' | 'completed' | 'abandoned' | 'expired';
  score?: number;
  maxPossibleScore: number;
  correctAnswers?: number;
  totalQuestions: number;
  timeSpent?: number;
  isPassed: boolean;
  startedAt: string;
  completedAt?: string;
  expiresAt?: string;
}

interface VideoAssessmentProps {
  videoId: string;
  currentTime?: number;
  onAssessmentComplete?: (assessmentId: string, passed: boolean) => void;
  onAssessmentTrigger?: (assessment: Assessment) => void;
}

export function VideoAssessment({ 
  videoId, 
  currentTime = 0,
  onAssessmentComplete,
  onAssessmentTrigger 
}: VideoAssessmentProps) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<Attempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadAssessments();
  }, [videoId]);

  useEffect(() => {
    checkAssessmentTriggers();
  }, [currentTime, assessments]);

  useEffect(() => {
    if (currentAttempt?.expiresAt) {
      startTimer();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentAttempt]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/videos/${videoId}/assessments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssessments(data);
      }
    } catch (error) {
      console.error('Failed to load assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAssessmentTriggers = () => {
    if (!assessments || assessments.length === 0) return;

    for (const assessment of assessments) {
      if (assessment.timing === 'during' && 
          assessment.triggerTime && 
          Math.abs(currentTime - assessment.triggerTime) < 1) {
        onAssessmentTrigger?.(assessment);
        break;
      }
    }
  };

  const startAssessment = async (assessment: Assessment) => {
    try {
      const response = await fetch(`/api/videos/${videoId}/assessments/${assessment.id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          userAgent: navigator.userAgent,
          videoCurrentTime: currentTime,
        }),
      });

      if (response.ok) {
        const attempt = await response.json();
        setActiveAssessment(assessment);
        setCurrentAttempt(attempt);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setShowResults(false);
        setShowHint(false);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to start assessment');
      }
    } catch (error) {
      console.error('Failed to start assessment:', error);
      alert('Failed to start assessment');
    }
  };

  const submitAnswer = async (questionId: string, answer: any) => {
    if (!currentAttempt) return;

    try {
      const response = await fetch(
        `/api/videos/${videoId}/assessments/${activeAssessment.id}/attempts/${currentAttempt.id}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            questionId,
            answer,
            timeSpent: 30, // Track actual time spent
          }),
        }
      );

      if (response.ok) {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const completeAssessment = async () => {
    if (!currentAttempt || !activeAssessment) return;

    try {
      setSubmitting(true);
      const response = await fetch(
        `/api/videos/${videoId}/assessments/${activeAssessment.id}/attempts/${currentAttempt.id}/complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const completedAttempt = await response.json();
        setCurrentAttempt(completedAttempt);
        setShowResults(true);
        onAssessmentComplete?.(activeAssessment.id, completedAttempt.isPassed);
      }
    } catch (error) {
      console.error('Failed to complete assessment:', error);
      alert('Failed to complete assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const startTimer = () => {
    if (!currentAttempt?.expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(currentAttempt.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
      
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        completeAssessment();
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestion = (question: Question) => {
    const answer = answers[question.id];

    switch (question.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            <RadioGroup
              value={answer}
              onValueChange={(value) => {
                setAnswers(prev => ({ ...prev, [question.id]: value }));
                submitAnswer(question.id, value);
              }}
            >
              {question.options?.map((option) => (
                <div key={option.id} className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <label htmlFor={option.id} className="flex-1 cursor-pointer">
                    {option.text}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'true_false':
        return (
          <RadioGroup
            value={answer?.toString()}
            onValueChange={(value) => {
              const boolValue = value === 'true';
              setAnswers(prev => ({ ...prev, [question.id]: boolValue }));
              submitAnswer(question.id, boolValue);
            }}
          >
            <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
              <RadioGroupItem value="true" id="true" />
              <label htmlFor="true" className="cursor-pointer">True</label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
              <RadioGroupItem value="false" id="false" />
              <label htmlFor="false" className="cursor-pointer">False</label>
            </div>
          </RadioGroup>
        );

      case 'short_answer':
        return (
          <Input
            value={answer || ''}
            onChange={(e) => {
              setAnswers(prev => ({ ...prev, [question.id]: e.target.value }));
            }}
            onBlur={() => submitAnswer(question.id, answer)}
            placeholder="Enter your answer..."
            className="w-full"
          />
        );

      case 'essay':
        return (
          <Textarea
            value={answer || ''}
            onChange={(e) => {
              setAnswers(prev => ({ ...prev, [question.id]: e.target.value }));
            }}
            onBlur={() => submitAnswer(question.id, answer)}
            placeholder="Write your detailed answer..."
            className="w-full min-h-32"
          />
        );

      default:
        return <div>Question type not supported yet</div>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeAssessment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <p className="text-gray-600">No assessments available for this video.</p>
          ) : (
            <div className="space-y-3">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{assessment.title}</h3>
                    <div className="flex items-center gap-2">
                      {assessment.isRequired && (
                        <Badge className="bg-red-100 text-red-800">Required</Badge>
                      )}
                      <Badge variant="outline">{assessment.type}</Badge>
                    </div>
                  </div>
                  
                  {assessment.description && (
                    <p className="text-gray-600 text-sm mb-3">{assessment.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{assessment.questions?.length || 0} questions</span>
                      {assessment.timeLimit && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {Math.floor(assessment.timeLimit / 60)} min
                        </span>
                      )}
                      {assessment.passingScore && (
                        <span>Pass: {assessment.passingScore}%</span>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => startAssessment(assessment)}
                      className="flex items-center gap-2"
                      size="sm"
                    >
                      <BookOpen className="h-4 w-4" />
                      Start Assessment
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (showResults && currentAttempt) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentAttempt.isPassed ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            Assessment Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Summary */}
          <div className="text-center space-y-4">
            <div className="text-4xl font-bold">
              <span className={getScoreColor(currentAttempt.score || 0)}>
                {(currentAttempt.score || 0).toFixed(1)}%
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-semibold text-green-600">
                  {currentAttempt.correctAnswers}
                </div>
                <div className="text-sm text-gray-600">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-red-600">
                  {currentAttempt.totalQuestions - (currentAttempt.correctAnswers || 0)}
                </div>
                <div className="text-sm text-gray-600">Incorrect</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-blue-600">
                  {currentAttempt.timeSpent ? Math.floor(currentAttempt.timeSpent / 60) : 0}
                </div>
                <div className="text-sm text-gray-600">Minutes</div>
              </div>
            </div>

            {currentAttempt.isPassed ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <Trophy className="h-5 w-5" />
                  <span className="font-semibold">Congratulations! You passed!</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  You've successfully completed this assessment.
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">Assessment not passed</span>
                </div>
                <p className="text-red-700 text-sm mt-1">
                  You need {activeAssessment.passingScore}% to pass. 
                  {activeAssessment.maxAttempts > currentAttempt.attemptNumber && 
                    ` You have ${activeAssessment.maxAttempts - currentAttempt.attemptNumber} attempts remaining.`
                  }
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setActiveAssessment(null);
                setCurrentAttempt(null);
                setShowResults(false);
              }}
            >
              Close
            </Button>
            
            {!currentAttempt.isPassed && 
             activeAssessment.maxAttempts > currentAttempt.attemptNumber && (
              <Button
                onClick={() => startAssessment(activeAssessment)}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeAssessment || !currentAttempt) {
    return null;
  }

  const currentQuestion = activeAssessment.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / activeAssessment.questions.length) * 100;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {activeAssessment.title}
          </CardTitle>
          
          <div className="flex items-center gap-4">
            {timeRemaining !== null && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className={timeRemaining < 300 ? 'text-red-600 font-semibold' : ''}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
            
            <Badge variant="outline">
              {currentQuestionIndex + 1} of {activeAssessment.questions.length}
            </Badge>
          </div>
        </div>

        {activeAssessment.settings.showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {currentQuestion && (
          <>
            {/* Question */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">
                    Question {currentQuestionIndex + 1}
                    {currentQuestion.isRequired && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </h3>
                  <p className="text-gray-800">{currentQuestion.question}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${
                    currentQuestion.metadata?.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    currentQuestion.metadata?.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {currentQuestion.metadata?.difficulty || 'medium'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {currentQuestion.points} pts
                  </Badge>
                </div>
              </div>

              {/* Video Timestamp Link */}
              {currentQuestion.metadata?.videoTimestamp && (
                <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  💡 This question relates to content at {formatTime(currentQuestion.metadata.videoTimestamp)}
                </div>
              )}

              {/* Hint */}
              {currentQuestion.hint && activeAssessment.settings.showHints && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHint(!showHint)}
                    className="flex items-center gap-2"
                  >
                    <Lightbulb className="h-4 w-4" />
                    {showHint ? 'Hide' : 'Show'} Hint
                  </Button>
                  {showHint && (
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                      <p className="text-yellow-800 text-sm">{currentQuestion.hint}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Answer Input */}
            <div className="space-y-4">
              {renderQuestion(currentQuestion)}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0 || !activeAssessment.settings.allowBacktrack}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {currentQuestion.isRequired && !answers[currentQuestion.id] && (
                  <span className="text-red-600 text-sm">Answer required</span>
                )}
              </div>

              {currentQuestionIndex < activeAssessment.questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  disabled={currentQuestion.isRequired && !answers[currentQuestion.id]}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={completeAssessment}
                  disabled={submitting || (currentQuestion.isRequired && !answers[currentQuestion.id])}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Flag className="h-4 w-4" />
                      Complete Assessment
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}