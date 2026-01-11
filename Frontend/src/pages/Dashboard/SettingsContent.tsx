import React, { useState, useEffect } from 'react';
import {
  User,
  Bell,
  BookOpen,
  Palette,
  Shield,
  Save,
  Download,
  Upload,
  RefreshCw,
  ChevronRight,
  LogOut,
  UserPlus,
  Key,
  Database,
  Settings as SettingsIcon,
} from 'lucide-react';

type Props = {
  currentUser?: any;
};

type UserSettings = {
  profile: {
    displayName: string;
    email: string;
    avatar?: string;
    bio?: string;
    timezone: string;
    language: string;
  };
  notifications: {
    email: boolean;
    push: boolean;
    studyReminders: boolean;
    achievements: boolean;
    deadlines: boolean;
    social: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  study: {
    defaultStudyHours: number;
    breakDuration: number;
    pomodoroEnabled: boolean;
    autoSaveProgress: boolean;
    showProgress: boolean;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    accentColor: string;
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    animations: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    showProgress: boolean;
    showAchievements: boolean;
    dataSharing: boolean;
  };
  account: {
    twoFactorEnabled: boolean;
    lastLogin: string;
    storageUsed: number;
    storageLimit: number;
  };
};

const SETTINGS_KEY = 'user_settings_v1';

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

const defaultSettings: UserSettings = {
  profile: {
    displayName: '',
    email: '',
    avatar: '',
    bio: '',
    timezone: 'UTC',
    language: 'en',
  },
  notifications: {
    email: true,
    push: true,
    studyReminders: true,
    achievements: true,
    deadlines: true,
    social: false,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  },
  study: {
    defaultStudyHours: 6,
    breakDuration: 15,
    pomodoroEnabled: false,
    autoSaveProgress: true,
    showProgress: true,
    difficulty: 'intermediate',
  },
  appearance: {
    theme: 'dark',
    accentColor: '#8b5cf6',
    fontSize: 'medium',
    compactMode: false,
    animations: true,
  },
  privacy: {
    profileVisibility: 'private',
    showProgress: true,
    showAchievements: true,
    dataSharing: false,
  },
  account: {
    twoFactorEnabled: false,
    lastLogin: new Date().toISOString(),
    storageUsed: 0,
    storageLimit: 1024, // MB
  },
};

const SettingsContent: React.FC<Props> = () => {
  const [settings, setSettings] = useState<UserSettings>(() =>
    readLocalJson(SETTINGS_KEY, defaultSettings)
  );
  const [activeSection, setActiveSection] = useState<string>('profile');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    writeLocalJson(SETTINGS_KEY, settings);
  }, [settings]);

  const updateSetting = (section: keyof UserSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      writeLocalJson(SETTINGS_KEY, settings);
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setSettings(defaultSettings);
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportLink = document.createElement('a');
    exportLink.setAttribute('href', dataUri);
    exportLink.setAttribute('download', 'quizforge-settings.json');
    document.body.appendChild(exportLink);
    exportLink.click();
    document.body.removeChild(exportLink);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setSettings({ ...defaultSettings, ...imported });
        } catch {
          alert('Invalid settings file');
        }
      };
      reader.readAsText(file);
    }
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: <User size={20} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={20} /> },
    { id: 'study', label: 'Study Preferences', icon: <BookOpen size={20} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={20} /> },
    { id: 'privacy', label: 'Privacy & Security', icon: <Shield size={20} /> },
    { id: 'account', label: 'Account', icon: <Database size={20} /> },
  ];

  const accentColors = [
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Pink', value: '#ec4899' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SettingsIcon className="text-purple-400" size={24} />
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Settings</h2>
              <p className="text-sm text-gray-400 mt-1">Customize your QuizForge experience</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportSettings}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 border border-gray-600"
            >
              <Download size={14} className="inline mr-1" />
              Export
            </button>
            <label className="px-3 py-2 text-xs font-bold rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 border border-gray-600 cursor-pointer">
              <Upload size={14} className="inline mr-1" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                className="hidden"
              />
            </label>
            <button
              onClick={resetSettings}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-red-500/15 hover:bg-red-500/20 text-red-300 border border-red-500/30"
            >
              <RefreshCw size={14} className="inline mr-1" />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-4">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                      : 'hover:bg-gray-700/30 text-gray-300 border border-transparent'
                  }`}
                >
                  {section.icon}
                  <span className="text-sm font-medium">{section.label}</span>
                  <ChevronRight size={16} className="ml-auto opacity-50" />
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-6">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-xl font-extrabold text-white mb-6 flex items-center gap-2">
                  <User size={20} className="text-purple-400" />
                  Profile Settings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                    <input
                      type="text"
                      value={settings.profile.displayName}
                      onChange={(e) => updateSetting('profile', 'displayName', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                      placeholder="Enter your display name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={settings.profile.email}
                      onChange={(e) => updateSetting('profile', 'email', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                    <select
                      value={settings.profile.timezone}
                      onChange={(e) => updateSetting('profile', 'timezone', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900/30 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="UTC">UTC</option>
                      <option value="EST">Eastern Time</option>
                      <option value="PST">Pacific Time</option>
                      <option value="IST">India Standard Time</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
                    <select
                      value={settings.profile.language}
                      onChange={(e) => updateSetting('profile', 'language', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900/30 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="en">English</option>
                      <option value="hi">हिंदी</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                  <textarea
                    value={settings.profile.bio}
                    onChange={(e) => updateSetting('profile', 'bio', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-900/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-xl font-extrabold text-white mb-6 flex items-center gap-2">
                  <Bell size={20} className="text-purple-400" />
                  Notification Preferences
                </h3>

                <div className="space-y-4">
                  {[
                    { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
                    { key: 'push', label: 'Push Notifications', desc: 'Browser push notifications' },
                    { key: 'studyReminders', label: 'Study Reminders', desc: 'Remind me about study sessions' },
                    { key: 'achievements', label: 'Achievement Alerts', desc: 'Celebrate your milestones' },
                    { key: 'deadlines', label: 'Deadline Alerts', desc: 'Important deadline notifications' },
                    { key: 'social', label: 'Social Updates', desc: 'Friend activity and leaderboards' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                      <div>
                        <div className="text-white font-medium">{label}</div>
                        <div className="text-xs text-gray-400">{desc}</div>
                      </div>
                      <button
                        onClick={() => updateSetting('notifications', key, !settings.notifications[key as keyof typeof settings.notifications])}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.notifications[key as keyof typeof settings.notifications]
                            ? 'bg-purple-600'
                            : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.notifications[key as keyof typeof settings.notifications]
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}

                  <div className="p-3 bg-gray-900/30 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-white font-medium">Quiet Hours</div>
                        <div className="text-xs text-gray-400">Silence notifications during specific times</div>
                      </div>
                      <button
                        onClick={() => updateSetting('notifications', 'quietHours', { ...settings.notifications.quietHours, enabled: !settings.notifications.quietHours.enabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.notifications.quietHours.enabled ? 'bg-purple-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.notifications.quietHours.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    {settings.notifications.quietHours.enabled && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-300">From:</label>
                          <input
                            type="time"
                            value={settings.notifications.quietHours.start}
                            onChange={(e) => updateSetting('notifications', 'quietHours', { ...settings.notifications.quietHours, start: e.target.value })}
                            className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-300">To:</label>
                          <input
                            type="time"
                            value={settings.notifications.quietHours.end}
                            onChange={(e) => updateSetting('notifications', 'quietHours', { ...settings.notifications.quietHours, end: e.target.value })}
                            className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Study Preferences Section */}
            {activeSection === 'study' && (
              <div className="space-y-6">
                <h3 className="text-xl font-extrabold text-white mb-6 flex items-center gap-2">
                  <BookOpen size={20} className="text-purple-400" />
                  Study Preferences
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Default Study Hours</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={settings.study.defaultStudyHours}
                      onChange={(e) => updateSetting('study', 'defaultStudyHours', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-900/30 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Break Duration (minutes)</label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={settings.study.breakDuration}
                      onChange={(e) => updateSetting('study', 'breakDuration', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-900/30 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty Level</label>
                    <select
                      value={settings.study.difficulty}
                      onChange={(e) => updateSetting('study', 'difficulty', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900/30 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { key: 'pomodoroEnabled', label: 'Pomodoro Timer', desc: 'Use focused study sessions with breaks' },
                    { key: 'autoSaveProgress', label: 'Auto-save Progress', desc: 'Automatically save study progress' },
                    { key: 'showProgress', label: 'Show Progress', desc: 'Display progress indicators' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                      <div>
                        <div className="text-white font-medium">{label}</div>
                        <div className="text-xs text-gray-400">{desc}</div>
                      </div>
                      <button
                        onClick={() => updateSetting('study', key, !settings.study[key as keyof typeof settings.study])}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.study[key as keyof typeof settings.study] ? 'bg-purple-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.study[key as keyof typeof settings.study] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Appearance Section */}
            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <h3 className="text-xl font-extrabold text-white mb-6 flex items-center gap-2">
                  <Palette size={20} className="text-purple-400" />
                  Appearance Settings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
                    <select
                      value={settings.appearance.theme}
                      onChange={(e) => updateSetting('appearance', 'theme', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900/30 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Font Size</label>
                    <select
                      value={settings.appearance.fontSize}
                      onChange={(e) => updateSetting('appearance', 'fontSize', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900/30 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Accent Color</label>
                  <div className="flex gap-2">
                    {accentColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => updateSetting('appearance', 'accentColor', color.value)}
                        className={`w-8 h-8 rounded-lg border-2 ${
                          settings.appearance.accentColor === color.value
                            ? 'border-white'
                            : 'border-gray-600'
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { key: 'compactMode', label: 'Compact Mode', desc: 'Reduce spacing and element sizes' },
                    { key: 'animations', label: 'Animations', desc: 'Enable interface animations' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                      <div>
                        <div className="text-white font-medium">{label}</div>
                        <div className="text-xs text-gray-400">{desc}</div>
                      </div>
                      <button
                        onClick={() => updateSetting('appearance', key, !settings.appearance[key as keyof typeof settings.appearance])}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.appearance[key as keyof typeof settings.appearance] ? 'bg-purple-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.appearance[key as keyof typeof settings.appearance] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy & Security Section */}
            {activeSection === 'privacy' && (
              <div className="space-y-6">
                <h3 className="text-xl font-extrabold text-white mb-6 flex items-center gap-2">
                  <Shield size={20} className="text-purple-400" />
                  Privacy & Security
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Profile Visibility</label>
                    <select
                      value={settings.privacy.profileVisibility}
                      onChange={(e) => updateSetting('privacy', 'profileVisibility', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900/30 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  {[
                    { key: 'showProgress', label: 'Show Progress', desc: 'Display your progress to others' },
                    { key: 'showAchievements', label: 'Show Achievements', desc: 'Display your achievements publicly' },
                    { key: 'dataSharing', label: 'Data Sharing', desc: 'Share anonymous usage data' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                      <div>
                        <div className="text-white font-medium">{label}</div>
                        <div className="text-xs text-gray-400">{desc}</div>
                      </div>
                      <button
                        onClick={() => updateSetting('privacy', key, !settings.privacy[key as keyof typeof settings.privacy])}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.privacy[key as keyof typeof settings.privacy] ? 'bg-purple-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.privacy[key as keyof typeof settings.privacy] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Account Section */}
            {activeSection === 'account' && (
              <div className="space-y-6">
                <h3 className="text-xl font-extrabold text-white mb-6 flex items-center gap-2">
                  <Database size={20} className="text-purple-400" />
                  Account Management
                </h3>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-900/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-white font-medium">Storage Usage</div>
                      <div className="text-sm text-gray-400">
                        {Math.round((settings.account.storageUsed / settings.account.storageLimit) * 100)}%
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${(settings.account.storageUsed / settings.account.storageLimit) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {settings.account.storageUsed} MB of {settings.account.storageLimit} MB used
                    </div>
                  </div>

                  <div className="p-4 bg-gray-900/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">Two-Factor Authentication</div>
                        <div className="text-xs text-gray-400">Add an extra layer of security</div>
                      </div>
                      <button
                        onClick={() => updateSetting('account', 'twoFactorEnabled', !settings.account.twoFactorEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.account.twoFactorEnabled ? 'bg-purple-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.account.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="text-sm text-gray-400">
                    Last login: {new Date(settings.account.lastLogin).toLocaleString()}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-2 text-xs font-bold rounded-lg bg-blue-500/15 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      <Key size={14} className="inline mr-1" />
                      Change Password
                    </button>
                    <button className="px-3 py-2 text-xs font-bold rounded-lg bg-green-500/15 hover:bg-green-500/20 text-green-300 border border-green-500/30">
                      <UserPlus size={14} className="inline mr-1" />
                      Invite Friends
                    </button>
                    <button className="px-3 py-2 text-xs font-bold rounded-lg bg-red-500/15 hover:bg-red-500/20 text-red-300 border border-red-500/30">
                      <LogOut size={14} className="inline mr-1" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-3 rounded-xl font-extrabold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SettingsContent;
