import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCircle,
  Clock,
  AlertCircle,
  Trophy,
  Calendar,
  BookOpen,
  Target,
  Settings,
  Trash2,
  Check,
  X,
  Filter,
  Search,
  ChevronDown,
  User,
  Star,
  Zap,
  Award,
  TrendingUp,
  Archive,
  Eye,
  EyeOff,
} from 'lucide-react';

type Props = {
  currentUser?: any;
};

type Notification = {
  id: string;
  type: 'study_reminder' | 'achievement' | 'deadline' | 'milestone' | 'system' | 'social';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionText?: string;
  metadata?: {
    subject?: string;
    topic?: string;
    score?: number;
    deadline?: string;
    achievement?: string;
  };
};

type NotificationSettings = {
  studyReminders: boolean;
  achievements: boolean;
  deadlines: boolean;
  milestones: boolean;
  systemUpdates: boolean;
  socialUpdates: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
};

const NOTIFICATIONS_KEY = 'notifications_v1';
const NOTIFICATION_SETTINGS_KEY = 'notification_settings_v1';

const readLocalJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeLocalJson = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: new Date(timestamp).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
};

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'study_reminder':
      return <Clock className="text-blue-400" size={20} />;
    case 'achievement':
      return <Trophy className="text-yellow-400" size={20} />;
    case 'deadline':
      return <AlertCircle className="text-red-400" size={20} />;
    case 'milestone':
      return <Star className="text-purple-400" size={20} />;
    case 'system':
      return <Settings className="text-gray-400" size={20} />;
    case 'social':
      return <User className="text-green-400" size={20} />;
    default:
      return <Bell className="text-gray-400" size={20} />;
  }
};

const getNotificationColor = (priority: Notification['priority']) => {
  switch (priority) {
    case 'urgent':
      return 'border-red-500/30 bg-red-500/10';
    case 'high':
      return 'border-orange-500/30 bg-orange-500/10';
    case 'medium':
      return 'border-yellow-500/30 bg-yellow-500/10';
    case 'low':
      return 'border-gray-500/30 bg-gray-500/10';
    default:
      return 'border-gray-500/30 bg-gray-500/10';
  }
};

const NotificationContent: React.FC<Props> = ({ currentUser }) => {
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    readLocalJson(NOTIFICATIONS_KEY, [])
  );
  const [settings, setSettings] = useState<NotificationSettings>(() =>
    readLocalJson(NOTIFICATION_SETTINGS_KEY, {
      studyReminders: true,
      achievements: true,
      deadlines: true,
      milestones: true,
      systemUpdates: true,
      socialUpdates: false,
      emailNotifications: true,
      pushNotifications: true,
      soundEnabled: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
    })
  );

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'settings'>('all');
  const [filterType, setFilterType] = useState<Notification['type'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    writeLocalJson(NOTIFICATIONS_KEY, notifications);
  }, [notifications]);

  useEffect(() => {
    writeLocalJson(NOTIFICATION_SETTINGS_KEY, settings);
  }, [settings]);

  // Generate sample notifications for demo
  useEffect(() => {
    if (notifications.length === 0) {
      const sampleNotifications: Notification[] = [
        {
          id: '1',
          type: 'study_reminder',
          title: 'Time to study Physics!',
          message: 'You have a study session scheduled for Laws of Motion in 30 minutes.',
          timestamp: Date.now() - 1800000,
          read: false,
          priority: 'high',
          actionUrl: '/dashboard/revision',
          actionText: 'Start Session',
          metadata: {
            subject: 'Physics',
            topic: 'Laws of Motion',
          },
        },
        {
          id: '2',
          type: 'achievement',
          title: '🎉 Achievement Unlocked!',
          message: 'You\'ve completed 10 practice quizzes with 85% average accuracy!',
          timestamp: Date.now() - 3600000,
          read: false,
          priority: 'medium',
          metadata: {
            achievement: 'Quiz Master',
            score: 85,
          },
        },
        {
          id: '3',
          type: 'deadline',
          title: '⚠️ Deadline Approaching',
          message: 'Mathematics syllabus completion deadline is in 3 days.',
          timestamp: Date.now() - 7200000,
          read: true,
          priority: 'urgent',
          actionUrl: '/dashboard/syllabus',
          actionText: 'View Progress',
          metadata: {
            subject: 'Mathematics',
            deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
        {
          id: '4',
          type: 'milestone',
          title: '🌟 Milestone Reached!',
          message: 'You\'ve studied for 7 days straight! Keep up the great work!',
          timestamp: Date.now() - 86400000,
          read: true,
          priority: 'medium',
          metadata: {
            achievement: 'Week Warrior',
          },
        },
        {
          id: '5',
          type: 'system',
          title: '📚 New Study Material Available',
          message: 'New practice questions have been added to Chemistry syllabus.',
          timestamp: Date.now() - 172800000,
          read: true,
          priority: 'low',
          actionUrl: '/dashboard/materials',
          actionText: 'View Materials',
          metadata: {
            subject: 'Chemistry',
          },
        },
      ];
      setNotifications(sampleNotifications);
    }
  }, []);

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Filter by tab
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.read);
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType);
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [notifications, activeTab, filterType, searchQuery]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllRead = () => {
    setNotifications(prev => prev.filter(n => !n.read));
  };

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const notificationTypes: { value: Notification['type'] | 'all'; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All Notifications', icon: <Bell size={16} /> },
    { value: 'study_reminder', label: 'Study Reminders', icon: <Clock size={16} /> },
    { value: 'achievement', label: 'Achievements', icon: <Trophy size={16} /> },
    { value: 'deadline', label: 'Deadlines', icon: <AlertCircle size={16} /> },
    { value: 'milestone', label: 'Milestones', icon: <Star size={16} /> },
    { value: 'system', label: 'System', icon: <Settings size={16} /> },
    { value: 'social', label: 'Social', icon: <User size={16} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="text-purple-400" size={24} />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Notifications</h2>
              <p className="text-sm text-gray-400 mt-1">Stay updated with your learning progress</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {['all', 'unread', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-transparent text-white'
                    : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'unread' && unreadCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 rounded-full text-xs">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-6">
            <h3 className="text-xl font-extrabold text-white mb-6 flex items-center gap-2">
              <Settings size={20} className="text-purple-400" />
              Notification Preferences
            </h3>

            <div className="space-y-6">
              {/* Notification Types */}
              <div>
                <h4 className="text-lg font-bold text-white mb-4">Notification Types</h4>
                <div className="space-y-3">
                  {[
                    { key: 'studyReminders', label: 'Study Reminders', desc: 'Remind me about scheduled study sessions' },
                    { key: 'achievements', label: 'Achievements', desc: 'Celebrate my learning milestones' },
                    { key: 'deadlines', label: 'Deadline Alerts', desc: 'Notify me about upcoming deadlines' },
                    { key: 'milestones', label: 'Milestones', desc: 'Track my learning progress' },
                    { key: 'systemUpdates', label: 'System Updates', desc: 'Important app updates and announcements' },
                    { key: 'socialUpdates', label: 'Social Updates', desc: 'Friend activities and leaderboards' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                      <div>
                        <div className="text-white font-medium">{label}</div>
                        <div className="text-xs text-gray-400">{desc}</div>
                      </div>
                      <button
                        onClick={() => updateSetting(key as keyof NotificationSettings, !settings[key as keyof NotificationSettings])}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings[key as keyof NotificationSettings] ? 'bg-purple-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings[key as keyof NotificationSettings] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Methods */}
              <div>
                <h4 className="text-lg font-bold text-white mb-4">Delivery Methods</h4>
                <div className="space-y-3">
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
                    { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser push notifications' },
                    { key: 'soundEnabled', label: 'Sound Effects', desc: 'Play sound for new notifications' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                      <div>
                        <div className="text-white font-medium">{label}</div>
                        <div className="text-xs text-gray-400">{desc}</div>
                      </div>
                      <button
                        onClick={() => updateSetting(key as keyof NotificationSettings, !settings[key as keyof NotificationSettings])}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings[key as keyof NotificationSettings] ? 'bg-purple-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings[key as keyof NotificationSettings] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quiet Hours */}
              <div>
                <h4 className="text-lg font-bold text-white mb-4">Quiet Hours</h4>
                <div className="p-3 bg-gray-900/30 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-white font-medium">Enable Quiet Hours</div>
                      <div className="text-xs text-gray-400">Silence notifications during specific times</div>
                    </div>
                    <button
                      onClick={() => updateSetting('quietHours', { ...settings.quietHours, enabled: !settings.quietHours.enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.quietHours.enabled ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.quietHours.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {settings.quietHours.enabled && (
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-300">From:</label>
                        <input
                          type="time"
                          value={settings.quietHours.start}
                          onChange={(e) => updateSetting('quietHours', { ...settings.quietHours, start: e.target.value })}
                          className="px-2 py-1 text-sm rounded border border-white/10 bg-white/5 text-gray-200"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-300">To:</label>
                        <input
                          type="time"
                          value={settings.quietHours.end}
                          onChange={(e) => updateSetting('quietHours', { ...settings.quietHours, end: e.target.value })}
                          className="px-2 py-1 text-sm rounded border border-white/10 bg-white/5 text-gray-200"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      {activeTab !== 'settings' && (
        <div className="space-y-6">
          {/* Filters and Search */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900/30 border border-gray-800 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Type Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900/30 border border-gray-800 rounded-lg text-white hover:bg-gray-900/50"
                >
                  <Filter size={16} />
                  <span className="text-sm">
                    {notificationTypes.find(t => t.value === filterType)?.label || 'All Types'}
                  </span>
                  <ChevronDown size={16} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                {showFilters && (
                  <div className="absolute top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
                    {notificationTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => {
                          setFilterType(type.value as any);
                          setShowFilters(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-700 transition-colors"
                      >
                        {type.icon}
                        <span className="text-sm text-gray-200">{type.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {activeTab === 'all' && (
                  <button
                    onClick={markAllAsRead}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-green-500/15 hover:bg-green-500/20 text-green-200 border border-green-500/30"
                  >
                    <Check size={14} className="inline mr-1" />
                    Mark All Read
                  </button>
                )}
                <button
                  onClick={clearAllRead}
                  className="px-3 py-2 text-xs font-bold rounded-lg bg-red-500/15 hover:bg-red-500/20 text-red-200 border border-red-500/30"
                >
                  <Trash2 size={14} className="inline mr-1" />
                  Clear Read
                </button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/30 border border-gray-700 rounded-2xl">
                <Bell className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-300 mb-2">
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications'}
                </h3>
                <p className="text-sm text-gray-500">
                  {activeTab === 'unread' ? 'All caught up! Great job staying on top of things.' : 'You\'re all caught up! New notifications will appear here.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-xl transition-all hover:bg-gray-800/50 ${
                    notification.read ? 'opacity-75' : ''
                  } ${getNotificationColor(notification.priority)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className={`font-semibold ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          )}
                          <span className="text-xs text-gray-400">{formatTimeAgo(notification.timestamp)}</span>
                        </div>
                      </div>
                      <p className={`text-sm mb-3 ${notification.read ? 'text-gray-400' : 'text-gray-200'}`}>
                        {notification.message}
                      </p>
                      {notification.metadata && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {notification.metadata.subject && (
                            <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {notification.metadata.subject}
                            </span>
                          )}
                          {notification.metadata.topic && (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              {notification.metadata.topic}
                            </span>
                          )}
                          {notification.metadata.achievement && (
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                              {notification.metadata.achievement}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {notification.actionUrl && (
                          <button
                            className="px-3 py-1 text-xs font-bold rounded bg-purple-500/15 hover:bg-purple-500/20 text-purple-200 border border-purple-500/30"
                          >
                            {notification.actionText || 'View'}
                          </button>
                        )}
                        {!notification.read ? (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="px-3 py-1 text-xs font-bold rounded bg-gray-500/15 hover:bg-gray-500/20 text-gray-200 border border-gray-500/30"
                          >
                            <Check size={12} className="inline mr-1" />
                            Mark as Read
                          </button>
                        ) : (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="px-3 py-1 text-xs font-bold rounded bg-gray-500/15 hover:bg-gray-500/20 text-gray-200 border border-gray-500/30"
                          >
                            <EyeOff size={12} className="inline mr-1" />
                            Mark as Unread
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="px-3 py-1 text-xs font-bold rounded bg-red-500/15 hover:bg-red-500/20 text-red-200 border border-red-500/30"
                        >
                          <Trash2 size={12} className="inline mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationContent;
