'use client';

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  MessageSquare, 
  Search, 
  Send, 
  Filter,
  Clock,
  Star,
  Reply,
  MoreHorizontal,
  User
} from 'lucide-react';

interface Message {
  id: string;
  subject: string;
  sender: {
    name: string;
    email: string;
    role: 'student' | 'instructor' | 'admin';
  };
  preview: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  courseId?: string;
  courseName?: string;
  hasAttachment: boolean;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'starred'>('all');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // Mock messages data
  const messages: Message[] = [
    {
      id: '1',
      subject: 'Question about JavaScript Fundamentals Assignment',
      sender: {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@example.com',
        role: 'student'
      },
      preview: 'Hi Professor, I have a question about the array methods assignment...',
      timestamp: '2 hours ago',
      isRead: false,
      isStarred: true,
      courseId: 'js-fundamentals',
      courseName: 'JavaScript Fundamentals',
      hasAttachment: false
    },
    {
      id: '2',
      subject: 'Feedback on React Course Structure',
      sender: {
        name: 'Mike Chen',
        email: 'mike.chen@example.com',
        role: 'student'
      },
      preview: 'Thank you for the excellent React course! I particularly enjoyed the hooks section...',
      timestamp: '1 day ago',
      isRead: true,
      isStarred: false,
      courseId: 'react-advanced',
      courseName: 'Advanced React Patterns',
      hasAttachment: false
    },
    {
      id: '3',
      subject: 'Request for Course Extension',
      sender: {
        name: 'Emma Davis',
        email: 'emma.davis@example.com',
        role: 'student'
      },
      preview: 'Dear instructor, due to personal circumstances, I would like to request...',
      timestamp: '2 days ago',
      isRead: false,
      isStarred: false,
      courseId: 'python-basics',
      courseName: 'Python Programming Basics',
      hasAttachment: true
    }
  ];

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         message.sender.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         message.preview.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'unread' && !message.isRead) ||
                         (filterType === 'starred' && message.isStarred);
    
    return matchesSearch && matchesFilter;
  });

  const unreadCount = messages.filter(m => !m.isRead).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="mt-1 text-sm text-gray-600">
            Communicate with your students and manage course-related discussions
          </p>
        </div>

        <div className="bg-white rounded-lg shadow">
          {/* Header with search and filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('unread')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    filterType === 'unread'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  onClick={() => setFilterType('starred')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    filterType === 'starred'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Starred
                </button>
              </div>
            </div>
          </div>

          {/* Messages list */}
          <div className="divide-y divide-gray-200">
            {filteredMessages.length > 0 ? (
              filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !message.isRead ? 'bg-blue-50/30' : ''
                  }`}
                  onClick={() => setSelectedMessage(message)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-purple-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className={`text-sm font-medium ${!message.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                              {message.sender.name}
                            </p>
                            {message.courseName && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                {message.courseName}
                              </span>
                            )}
                            {!message.isRead && (
                              <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                            )}
                          </div>
                          <p className={`text-sm mt-1 ${!message.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                            {message.subject}
                          </p>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {message.preview}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {message.isStarred && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                      {message.hasAttachment && (
                        <div className="h-4 w-4 text-gray-400">📎</div>
                      )}
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{message.timestamp}</span>
                      </div>
                      <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No messages found</p>
                <p className="text-sm text-gray-400">
                  {searchQuery ? 'Try adjusting your search terms' : 'Messages from students will appear here'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-lg font-medium text-gray-900">Total Messages</p>
                <p className="text-2xl font-bold text-blue-600">{messages.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <div className="h-3 w-3 bg-orange-600 rounded-full"></div>
              </div>
              <div className="ml-4">
                <p className="text-lg font-medium text-gray-900">Unread</p>
                <p className="text-2xl font-bold text-orange-600">{unreadCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-lg font-medium text-gray-900">Starred</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {messages.filter(m => m.isStarred).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}