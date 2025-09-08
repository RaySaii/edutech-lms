'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Shield,
  Mail,
  Calendar,
  MoreVertical,
  Download,
  RefreshCw,
  Eye,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  joinedAt: string;
  coursesEnrolled?: number;
  coursesCreated?: number;
  avatar?: string;
  verified: boolean;
  organization?: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  suspendedUsers: number;
  studentCount: number;
  teacherCount: number;
  adminCount: number;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    suspendedUsers: 0,
    studentCount: 0,
    teacherCount: 0,
    adminCount: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, [searchQuery, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Mock user data - replace with API call
      const mockUsers: User[] = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          role: 'student',
          status: 'active',
          lastLogin: '2024-08-25T14:30:00Z',
          joinedAt: '2024-01-15T10:00:00Z',
          coursesEnrolled: 5,
          verified: true
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          role: 'teacher',
          status: 'active',
          lastLogin: '2024-08-24T16:45:00Z',
          joinedAt: '2024-02-01T09:15:00Z',
          coursesCreated: 3,
          verified: true
        },
        {
          id: '3',
          firstName: 'Michael',
          lastName: 'Johnson',
          email: 'michael.j@example.com',
          role: 'admin',
          status: 'active',
          lastLogin: '2024-08-26T08:20:00Z',
          joinedAt: '2023-12-01T10:30:00Z',
          verified: true
        },
        {
          id: '4',
          firstName: 'Sarah',
          lastName: 'Wilson',
          email: 'sarah.wilson@example.com',
          role: 'student',
          status: 'suspended',
          lastLogin: '2024-08-20T12:15:00Z',
          joinedAt: '2024-03-10T14:20:00Z',
          coursesEnrolled: 2,
          verified: false
        },
        {
          id: '5',
          firstName: 'David',
          lastName: 'Brown',
          email: 'david.brown@example.com',
          role: 'teacher',
          status: 'inactive',
          lastLogin: '2024-07-15T09:30:00Z',
          joinedAt: '2024-01-20T11:00:00Z',
          coursesCreated: 1,
          verified: true
        }
      ];

      setUsers(mockUsers);
      
      // Calculate stats
      setStats({
        totalUsers: mockUsers.length,
        activeUsers: mockUsers.filter(u => u.status === 'active').length,
        newUsersThisMonth: mockUsers.filter(u => new Date(u.joinedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        suspendedUsers: mockUsers.filter(u => u.status === 'suspended').length,
        studentCount: mockUsers.filter(u => u.role === 'student').length,
        teacherCount: mockUsers.filter(u => u.role === 'teacher').length,
        adminCount: mockUsers.filter(u => u.role === 'admin').length
      });
      
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: 'activate' | 'suspend' | 'delete') => {
    try {
      if (action === 'delete' && !window.confirm('Are you sure you want to delete this user?')) {
        return;
      }
      
      if (action === 'delete') {
        setUsers(prev => prev.filter(user => user.id !== userId));
      } else {
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, status: action === 'activate' ? 'active' : 'suspended' }
            : user
        ));
      }
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      teacher: 'bg-blue-100 text-blue-800',
      student: 'bg-green-100 text-green-800'
    };
    return colors[role as keyof typeof colors] || colors.student;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                <p className="text-gray-600">Total Users</p>
                <p className="text-sm text-green-600">+{stats.newUsersThisMonth} this month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
                <p className="text-gray-600">Active Users</p>
                <p className="text-sm text-blue-600">{stats.studentCount} students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.teacherCount}</p>
                <p className="text-gray-600">Teachers</p>
                <p className="text-sm text-gray-500">{stats.adminCount} admins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.suspendedUsers}</p>
                <p className="text-gray-600">Suspended</p>
                <p className="text-sm text-orange-600">Need attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
                <option value="admin">Admins</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button onClick={loadUsers} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setShowUserModal(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Users ({filteredUsers.length})
            </CardTitle>
            {selectedUsers.length > 0 && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Mail className="h-4 w-4 mr-1" />
                  Message ({selectedUsers.length})
                </Button>
                <Button size="sm" variant="outline">
                  <Lock className="h-4 w-4 mr-1" />
                  Suspend
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading users...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="divide-y">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(prev => [...prev, user.id]);
                          } else {
                            setSelectedUsers(prev => prev.filter(id => id !== user.id));
                          }
                        }}
                        className="rounded"
                      />
                      
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </span>
                          {!user.verified && (
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                              Unverified
                            </Badge>
                          )}
                          <Badge className={getRoleBadge(user.role)}>
                            {user.role}
                          </Badge>
                          <Badge className={getStatusBadge(user.status)}>
                            {user.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-500 mt-1">
                          <span>{user.email}</span>
                          <span>Last login: {formatDate(user.lastLogin)}</span>
                          <span>Joined: {formatDate(user.joinedAt)}</span>
                          {user.coursesEnrolled && (
                            <span>{user.coursesEnrolled} courses enrolled</span>
                          )}
                          {user.coursesCreated && (
                            <span>{user.coursesCreated} courses created</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingUser(user);
                          setShowUserModal(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Mail className="h-4 w-4" />
                      </Button>
                      {user.status === 'active' ? (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleUserAction(user.id, 'suspend')}
                        >
                          <Lock className="h-4 w-4 text-orange-500" />
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleUserAction(user.id, 'activate')}
                        >
                          <Unlock className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleUserAction(user.id, 'delete')}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No users have been added yet'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
              >
                ×
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <Input 
                  placeholder="Enter first name"
                  defaultValue={editingUser?.firstName || ''}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <Input 
                  placeholder="Enter last name"
                  defaultValue={editingUser?.lastName || ''}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <Input 
                  type="email"
                  placeholder="Enter email address"
                  defaultValue={editingUser?.email || ''}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={editingUser?.role || 'student'}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue={editingUser?.status || 'active'}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => {
                setShowUserModal(false);
                setEditingUser(null);
                loadUsers();
              }}>
                {editingUser ? 'Update User' : 'Create User'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}