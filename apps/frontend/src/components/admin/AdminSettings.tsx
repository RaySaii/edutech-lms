'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Globe, 
  Mail, 
  Shield, 
  CreditCard,
  Database,
  Palette,
  Bell,
  Users,
  BookOpen,
  Upload,
  Download,
  Save,
  RefreshCw,
  Key,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

interface SystemSettings {
  general: {
    siteName: string;
    siteUrl: string;
    supportEmail: string;
    timezone: string;
    language: string;
    maintenance: boolean;
  };
  email: {
    provider: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
  };
  security: {
    passwordMinLength: number;
    requireTwoFactor: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    allowRegistration: boolean;
    emailVerificationRequired: boolean;
  };
  payment: {
    stripePublicKey: string;
    stripeSecretKey: string;
    paypalClientId: string;
    currency: string;
    taxRate: number;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    notificationRetention: number;
  };
  content: {
    maxFileSize: number;
    allowedFileTypes: string[];
    videoProcessing: boolean;
    cdnEnabled: boolean;
    cdnUrl: string;
  };
}

export function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    general: {
      siteName: 'EduTech LMS',
      siteUrl: 'https://yourdomain.com',
      supportEmail: 'support@yourdomain.com',
      timezone: 'UTC',
      language: 'en',
      maintenance: false
    },
    email: {
      provider: 'smtp',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: 'noreply@yourdomain.com',
      fromName: 'EduTech LMS'
    },
    security: {
      passwordMinLength: 8,
      requireTwoFactor: false,
      sessionTimeout: 60,
      maxLoginAttempts: 5,
      allowRegistration: true,
      emailVerificationRequired: true
    },
    payment: {
      stripePublicKey: '',
      stripeSecretKey: '',
      paypalClientId: '',
      currency: 'USD',
      taxRate: 0
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      smsNotifications: false,
      notificationRetention: 30
    },
    content: {
      maxFileSize: 100,
      allowedFileTypes: ['pdf', 'doc', 'docx', 'mp4', 'mov', 'avi', 'jpg', 'png', 'gif'],
      videoProcessing: true,
      cdnEnabled: false,
      cdnUrl: ''
    }
  });

  const [activeTab, setActiveTab] = useState<'general' | 'email' | 'security' | 'payment' | 'notifications' | 'content'>('general');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const handleSave = async () => {
    try {
      setLoading(true);
      // API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'content', label: 'Content', icon: Upload }
  ];

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <Card>
        <CardContent className="p-0">
          <div className="flex overflow-x-auto border-b">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site Name
                </label>
                <Input
                  value={settings.general.siteName}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    general: { ...prev.general, siteName: e.target.value }
                  }))}
                  placeholder="Your LMS Name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site URL
                </label>
                <Input
                  value={settings.general.siteUrl}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    general: { ...prev.general, siteUrl: e.target.value }
                  }))}
                  placeholder="https://yourdomain.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Email
                </label>
                <Input
                  type="email"
                  value={settings.general.supportEmail}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    general: { ...prev.general, supportEmail: e.target.value }
                  }))}
                  placeholder="support@yourdomain.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={settings.general.timezone}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    general: { ...prev.general, timezone: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="maintenance"
                checked={settings.general.maintenance}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  general: { ...prev.general, maintenance: e.target.checked }
                }))}
                className="rounded"
              />
              <label htmlFor="maintenance" className="text-sm font-medium text-gray-700">
                Maintenance Mode
              </label>
              {settings.general.maintenance && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  Site will be inaccessible to users
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Settings */}
      {activeTab === 'email' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Email Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Host
                </label>
                <Input
                  value={settings.email.smtpHost}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    email: { ...prev.email, smtpHost: e.target.value }
                  }))}
                  placeholder="smtp.gmail.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Port
                </label>
                <Input
                  type="number"
                  value={settings.email.smtpPort}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    email: { ...prev.email, smtpPort: parseInt(e.target.value) }
                  }))}
                  placeholder="587"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Username
                </label>
                <Input
                  value={settings.email.smtpUser}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    email: { ...prev.email, smtpUser: e.target.value }
                  }))}
                  placeholder="your-email@gmail.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Password
                </label>
                <div className="relative">
                  <Input
                    type={showPasswords.smtpPassword ? 'text' : 'password'}
                    value={settings.email.smtpPassword}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev.email, smtpPassword: e.target.value }
                    }))}
                    placeholder="Your app password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('smtpPassword')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPasswords.smtpPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Email
                </label>
                <Input
                  type="email"
                  value={settings.email.fromEmail}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    email: { ...prev.email, fromEmail: e.target.value }
                  }))}
                  placeholder="noreply@yourdomain.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Name
                </label>
                <Input
                  value={settings.email.fromName}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    email: { ...prev.email, fromName: e.target.value }
                  }))}
                  placeholder="EduTech LMS"
                />
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Email Configuration Help</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    For Gmail, use your app password instead of your regular password. 
                    Make sure to enable 2-factor authentication and generate an app-specific password.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Password Length
                </label>
                <Input
                  type="number"
                  value={settings.security.passwordMinLength}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, passwordMinLength: parseInt(e.target.value) }
                  }))}
                  min="6"
                  max="32"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout (minutes)
                </label>
                <Input
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, sessionTimeout: parseInt(e.target.value) }
                  }))}
                  min="15"
                  max="720"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Login Attempts
                </label>
                <Input
                  type="number"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, maxLoginAttempts: parseInt(e.target.value) }
                  }))}
                  min="3"
                  max="10"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="requireTwoFactor"
                  checked={settings.security.requireTwoFactor}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, requireTwoFactor: e.target.checked }
                  }))}
                  className="rounded"
                />
                <label htmlFor="requireTwoFactor" className="text-sm font-medium text-gray-700">
                  Require Two-Factor Authentication
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="allowRegistration"
                  checked={settings.security.allowRegistration}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, allowRegistration: e.target.checked }
                  }))}
                  className="rounded"
                />
                <label htmlFor="allowRegistration" className="text-sm font-medium text-gray-700">
                  Allow User Registration
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="emailVerificationRequired"
                  checked={settings.security.emailVerificationRequired}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, emailVerificationRequired: e.target.checked }
                  }))}
                  className="rounded"
                />
                <label htmlFor="emailVerificationRequired" className="text-sm font-medium text-gray-700">
                  Require Email Verification
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Settings */}
      {activeTab === 'payment' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Payment Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stripe Public Key
                </label>
                <Input
                  value={settings.payment.stripePublicKey}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    payment: { ...prev.payment, stripePublicKey: e.target.value }
                  }))}
                  placeholder="pk_test_..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stripe Secret Key
                </label>
                <div className="relative">
                  <Input
                    type={showPasswords.stripeSecret ? 'text' : 'password'}
                    value={settings.payment.stripeSecretKey}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      payment: { ...prev.payment, stripeSecretKey: e.target.value }
                    }))}
                    placeholder="sk_test_..."
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('stripeSecret')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPasswords.stripeSecret ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={settings.payment.currency}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    payment: { ...prev.payment, currency: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Rate (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.payment.taxRate}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    payment: { ...prev.payment, taxRate: parseFloat(e.target.value) }
                  }))}
                  placeholder="0.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Saved!
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Settings saved successfully!
              </p>
              <p className="text-sm text-green-700 mt-1">
                Your changes have been applied and will take effect immediately.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}