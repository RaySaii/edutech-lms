'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Video,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search
} from 'lucide-react';

interface ScheduledSession {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  type: 'live_session' | 'office_hours' | 'workshop' | 'exam';
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  location?: string;
  isOnline: boolean;
  maxStudents?: number;
  enrolledStudents: number;
  description?: string;
  meetingLink?: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
}

interface ScheduleModuleProps {
  courses?: any[];
}

const ScheduleModule: React.FC<ScheduleModuleProps> = ({ courses = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'list'>('week');
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ScheduledSession | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'live_session' | 'office_hours' | 'workshop' | 'exam'>('all');

  // Mock data for demonstration
  useEffect(() => {
    const mockSessions: ScheduledSession[] = [
      {
        id: '1',
        title: 'Git Fundamentals - Live Session',
        courseId: 'git-course',
        courseName: 'Complete Git and GitHub Mastery',
        type: 'live_session',
        date: '2024-08-26',
        startTime: '10:00',
        endTime: '11:30',
        duration: 90,
        isOnline: true,
        maxStudents: 30,
        enrolledStudents: 15,
        description: 'Interactive session covering Git basics and best practices',
        meetingLink: 'https://zoom.us/j/123456789',
        status: 'scheduled'
      },
      {
        id: '2',
        title: 'Docker Workshop',
        courseId: 'docker-course',
        courseName: 'Docker Containerization Complete Guide',
        type: 'workshop',
        date: '2024-08-27',
        startTime: '14:00',
        endTime: '16:00',
        duration: 120,
        isOnline: true,
        maxStudents: 20,
        enrolledStudents: 18,
        description: 'Hands-on Docker containerization workshop',
        meetingLink: 'https://zoom.us/j/987654321',
        status: 'scheduled'
      },
      {
        id: '3',
        title: 'Python Office Hours',
        courseId: 'python-course',
        courseName: 'Python Data Science with Pandas and NumPy',
        type: 'office_hours',
        date: '2024-08-28',
        startTime: '15:00',
        endTime: '16:00',
        duration: 60,
        isOnline: true,
        maxStudents: 10,
        enrolledStudents: 7,
        description: 'Q&A session for Python data science questions',
        status: 'scheduled'
      }
    ];
    setSessions(mockSessions);
  }, []);

  const getSessionTypeColor = (type: string) => {
    const colors = {
      live_session: 'bg-blue-100 text-blue-800 border-blue-200',
      office_hours: 'bg-green-100 text-green-800 border-green-200',
      workshop: 'bg-purple-100 text-purple-800 border-purple-200',
      exam: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[type as keyof typeof colors] || colors.live_session;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: 'bg-yellow-100 text-yellow-800',
      live: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors.scheduled;
  };

  const filteredSessions = filterType === 'all' 
    ? sessions 
    : sessions.filter(session => session.type === filterType);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule</h2>
          <p className="text-gray-600">Manage your course sessions and events</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Session
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          {(['week', 'month', 'list'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === mode 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Filter by Type */}
        <div className="flex items-center space-x-2">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="live_session">Live Sessions</option>
            <option value="office_hours">Office Hours</option>
            <option value="workshop">Workshops</option>
            <option value="exam">Exams</option>
          </select>
        </div>
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">This Week</p>
              <p className="text-2xl font-bold text-blue-900">{filteredSessions.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Total Students</p>
              <p className="text-2xl font-bold text-green-900">
                {filteredSessions.reduce((sum, s) => sum + s.enrolledStudents, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Hours Scheduled</p>
              <p className="text-2xl font-bold text-purple-900">
                {Math.round(filteredSessions.reduce((sum, s) => sum + s.duration, 0) / 60)}h
              </p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center">
            <Video className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-600">Online Sessions</p>
              <p className="text-2xl font-bold text-yellow-900">
                {filteredSessions.filter(s => s.isOnline).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Sessions</h3>
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No sessions scheduled</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Schedule Your First Session
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredSessions.map((session) => (
              <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{session.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{session.courseName}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(session.date)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatTime(session.startTime)} - {formatTime(session.endTime)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSessionTypeColor(session.type)}`}>
                      {session.type.replace('_', ' ')}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {session.enrolledStudents}/{session.maxStudents || '∞'} students
                    </div>
                    {session.isOnline && (
                      <div className="flex items-center">
                        <Video className="h-4 w-4 mr-1 text-blue-500" />
                        Online
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setSelectedSession(session)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {session.description && (
                  <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">
                    {session.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleModule;