'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  AlertCircle,
  Trophy,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';

interface Answer {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  question: string;
  answers: Answer[];
  explanation?: string;
  points: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  timeLimit?: number; // in minutes
  questions: Question[];
  passingScore: number;
  maxAttempts: number;
  showCorrectAnswers: boolean;
}

interface QuizPlayerProps {
  quizId: string;
  onComplete?: (score: number, passed: boolean) => void;
}

interface QuizAttempt {
  answers: Record<string, string[]>;
  startTime: Date;
  timeRemaining?: number;
}

export function QuizPlayer({ quizId, onComplete }: QuizPlayerProps) {
  const router = useRouter();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startTime] = useState(new Date());

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  useEffect(() => {
    if (quiz?.timeLimit && timeRemaining !== null && timeRemaining > 0 && !isSubmitted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quiz, timeRemaining, isSubmitted]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      
      // Mock quiz data - replace with API call
      const mockQuiz: Quiz = {
        id: quizId,
        title: "JavaScript Fundamentals Quiz",
        description: "Test your knowledge of JavaScript basics",
        timeLimit: 30, // 30 minutes
        passingScore: 70,
        maxAttempts: 3,
        showCorrectAnswers: true,
        questions: [
          {
            id: "q1",
            type: "multiple-choice",
            question: "What is the correct way to declare a variable in JavaScript?",
            points: 10,
            answers: [
              { id: "a1", text: "var myVariable;", isCorrect: true },
              { id: "a2", text: "variable myVariable;", isCorrect: false },
              { id: "a3", text: "v myVariable;", isCorrect: false },
              { id: "a4", text: "declare myVariable;", isCorrect: false }
            ],
            explanation: "In JavaScript, variables are declared using 'var', 'let', or 'const' keywords."
          },
          {
            id: "q2",
            type: "true-false",
            question: "JavaScript is a case-sensitive language.",
            points: 10,
            answers: [
              { id: "a1", text: "True", isCorrect: true },
              { id: "a2", text: "False", isCorrect: false }
            ],
            explanation: "JavaScript is indeed case-sensitive. 'myVariable' and 'MyVariable' are different identifiers."
          },
          {
            id: "q3",
            type: "multiple-choice",
            question: "Which of the following is NOT a JavaScript data type?",
            points: 10,
            answers: [
              { id: "a1", text: "string", isCorrect: false },
              { id: "a2", text: "boolean", isCorrect: false },
              { id: "a3", text: "integer", isCorrect: true },
              { id: "a4", text: "undefined", isCorrect: false }
            ],
            explanation: "JavaScript has number, string, boolean, undefined, null, object, and symbol data types. There is no separate 'integer' type."
          },
          {
            id: "q4",
            type: "multiple-choice",
            question: "What does '===' operator do in JavaScript?",
            points: 10,
            answers: [
              { id: "a1", text: "Assigns a value", isCorrect: false },
              { id: "a2", text: "Compares values only", isCorrect: false },
              { id: "a3", text: "Compares values and types", isCorrect: true },
              { id: "a4", text: "Creates a new variable", isCorrect: false }
            ],
            explanation: "The '===' operator performs strict equality comparison, checking both value and type."
          },
          {
            id: "q5",
            type: "short-answer",
            question: "What is the output of: console.log(typeof null)?",
            points: 20,
            answers: [
              { id: "a1", text: "object", isCorrect: true }
            ],
            explanation: "Due to a historical bug in JavaScript, typeof null returns 'object' instead of 'null'."
          }
        ]
      };

      setQuiz(mockQuiz);
      if (mockQuiz.timeLimit) {
        setTimeRemaining(mockQuiz.timeLimit * 60); // Convert to seconds
      }
    } catch (error) {
      console.error('Failed to load quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, answerId: string) => {
    const question = quiz?.questions.find(q => q.id === questionId);
    if (!question) return;

    setAnswers(prev => {
      const newAnswers = { ...prev };
      
      if (question.type === 'multiple-choice' || question.type === 'true-false') {
        // Single selection
        newAnswers[questionId] = [answerId];
      } else {
        // For short-answer, answerId is actually the answer text
        newAnswers[questionId] = [answerId];
      }
      
      return newAnswers;
    });
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    
    let totalPoints = 0;
    let earnedPoints = 0;
    
    quiz.questions.forEach(question => {
      totalPoints += question.points;
      const userAnswers = answers[question.id] || [];
      
      if (question.type === 'short-answer') {
        // For short answer, check if any correct answer matches (case insensitive)
        const correctAnswers = question.answers.filter(a => a.isCorrect).map(a => a.text.toLowerCase());
        const userAnswer = userAnswers[0]?.toLowerCase() || '';
        if (correctAnswers.some(correct => correct === userAnswer)) {
          earnedPoints += question.points;
        }
      } else {
        // For multiple choice and true/false
        const correctAnswerIds = question.answers.filter(a => a.isCorrect).map(a => a.id);
        const userAnswerIds = userAnswers;
        
        if (userAnswerIds.length === correctAnswerIds.length && 
            userAnswerIds.every(id => correctAnswerIds.includes(id))) {
          earnedPoints += question.points;
        }
      }
    });
    
    return Math.round((earnedPoints / totalPoints) * 100);
  };

  const handleSubmitQuiz = () => {
    const finalScore = calculateScore();
    const passed = finalScore >= (quiz?.passingScore || 70);
    
    setScore(finalScore);
    setIsSubmitted(true);
    setShowResults(true);
    
    onComplete?.(finalScore, passed);
  };

  const handleNextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getQuestionStatus = (questionIndex: number) => {
    const question = quiz?.questions[questionIndex];
    if (!question) return 'unanswered';
    
    const hasAnswer = answers[question.id] && answers[question.id].length > 0;
    return hasAnswer ? 'answered' : 'unanswered';
  };

  const renderQuestion = (question: Question) => {
    const userAnswers = answers[question.id] || [];
    
    if (question.type === 'short-answer') {
      return (
        <div className="space-y-4">
          <textarea
            value={userAnswers[0] || ''}
            onChange={(e) => handleAnswerSelect(question.id, e.target.value)}
            placeholder="Enter your answer here..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitted}
          />
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {question.answers.map((answer) => (
          <label
            key={answer.id}
            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
              userAnswers.includes(answer.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            } ${isSubmitted ? 'cursor-not-allowed' : ''}`}
          >
            <input
              type={question.type === 'multiple-choice' ? 'radio' : 'radio'}
              name={question.id}
              value={answer.id}
              checked={userAnswers.includes(answer.id)}
              onChange={() => handleAnswerSelect(question.id, answer.id)}
              className="mr-3"
              disabled={isSubmitted}
            />
            <span className="text-gray-900">{answer.text}</span>
            {isSubmitted && quiz?.showCorrectAnswers && (
              <span className="ml-auto">
                {answer.isCorrect ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : userAnswers.includes(answer.id) ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : null}
              </span>
            )}
          </label>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Quiz Not Found</h1>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (showResults) {
    const passed = score >= quiz.passingScore;
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4">
              {passed ? (
                <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
              ) : (
                <RefreshCw className="h-16 w-16 text-gray-400 mx-auto" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {passed ? 'Congratulations!' : 'Quiz Completed'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">{score}%</div>
              <p className="text-gray-600">
                {passed ? 'You passed!' : `You need ${quiz.passingScore}% to pass`}
              </p>
            </div>
            
            <Badge variant={passed ? "default" : "secondary"} className="text-lg px-4 py-2">
              {passed ? 'PASSED' : 'NOT PASSED'}
            </Badge>
            
            <div className="pt-6 space-x-4">
              <Button onClick={() => router.back()}>
                Return to Course
              </Button>
              {!passed && (
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Retake Quiz
                </Button>
              )}
              {quiz.showCorrectAnswers && (
                <Button variant="outline" onClick={() => setShowResults(false)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Review Answers
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
            <p className="text-gray-600">{quiz.description}</p>
          </div>
          
          {timeRemaining !== null && (
            <div className="text-right">
              <div className={`text-2xl font-bold ${
                timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'
              }`}>
                <Clock className="h-5 w-5 inline mr-2" />
                {formatTime(timeRemaining)}
              </div>
              <p className="text-sm text-gray-600">Time remaining</p>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
          <span>{currentQuestion.points} points</span>
        </div>
        
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Navigation */}
      <div className="mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`flex-shrink-0 w-10 h-10 rounded-lg border-2 font-medium ${
                index === currentQuestionIndex
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : getQuestionStatus(index) === 'answered'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Current Question */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg leading-relaxed">
            {currentQuestion.question}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderQuestion(currentQuestion)}
          
          {isSubmitted && quiz.showCorrectAnswers && currentQuestion.explanation && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">Explanation</p>
                  <p className="text-blue-800">{currentQuestion.explanation}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex space-x-4">
          {!isSubmitted && (
            <Button
              onClick={handleSubmitQuiz}
              className="bg-green-600 hover:bg-green-700"
            >
              Submit Quiz
            </Button>
          )}
          
          <Button
            onClick={handleNextQuestion}
            disabled={currentQuestionIndex === quiz.questions.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}