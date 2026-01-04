import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  Plus, 
  FileText, 
  FolderOpen,
  Settings,
  HelpCircle,
  ChevronDown,
  User,
  Sparkles,
  Zap,
  LogOut,
  Crown,
  Share2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  name: string;
  icon: React.ReactNode;
  path: string;
}

const DashboardLayout = () => {
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, signOut } = useAuth();
  const createDropdownRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (createDropdownRef.current && !createDropdownRef.current.contains(event.target as Node)) {
        setCreateDropdownOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: NavItem[] = [
    { 
      name: 'Summarize Content', 
      icon: <Sparkles size={20} />, 
      path: '/dashboard' 
    },
    { 
      name: 'Summaries', 
      icon: <FileText size={20} />, 
      path: '/dashboard/summaries' 
    },
    { 
      name: 'Channels', 
      icon: <FolderOpen size={20} />, 
      path: '/dashboard/channels' 
    },
    { 
      name: 'Collections', 
      icon: <FolderOpen size={20} />, 
      path: '/dashboard/collections' 
    },
    { 
      name: 'Settings', 
      icon: <Settings size={20} />, 
      path: '/dashboard/settings' 
    },
  ];

  const createOptions = [
    { name: 'Video → Quiz', icon: <FileText size={18} />, path: '/dashboard/create/quiz' },
    { name: 'Video → Notes', icon: <FileText size={18} />, path: '/dashboard/create/notes' },
    { name: 'Video → Practice', icon: <Zap size={18} />, path: '/dashboard/create/practice' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || 
           (location.pathname.startsWith(path) && path !== '/dashboard');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#111111] border-r border-gray-800 flex flex-col">
        {/* Top Profile Section */}
        <div className="p-4 border-b border-gray-800">
          <div 
            ref={profileMenuRef}
            className="relative"
          >
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-800/50 transition-colors group"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                    {currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'U'}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111111]"></div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-100 truncate">
                    {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {currentUser?.email || 'user@example.com'}
                  </p>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`text-gray-400 flex-shrink-0 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} 
                />
              </div>
            </button>
            
            {profileMenuOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-[#1a1a1a] border border-gray-800 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                  >
                    <User size={16} className="mr-3" />
                    My Profile
                  </Link>
                  <Link
                    to="/dashboard/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                  >
                    <Settings size={16} className="mr-3" />
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors border-t border-gray-800"
                  >
                    <LogOut size={16} className="mr-3" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Menu */}
        <nav className="flex-1 overflow-y-visible py-4 px-3">
          <div className="mb-4">
            <Link
              to="/dashboard"
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive('/dashboard') && location.pathname === '/dashboard'
                  ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <LayoutGrid size={20} />
              <span className="text-sm font-medium">Overview</span>
            </Link>
          </div>

          {/* Create Button with Dropdown */}
          <div className="mb-4 relative" ref={createDropdownRef}>
            <button
              onClick={() => setCreateDropdownOpen(!createDropdownOpen)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 group active:scale-[0.98]"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              <span>Create</span>
              <ChevronDown 
                size={16} 
                className={`transition-transform duration-200 ${createDropdownOpen ? 'rotate-180' : ''}`} 
              />
            </button>
            
            {createDropdownOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-[#1a1a1a] border border-gray-800 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {createOptions.map((option, index) => (
                  <Link
                    key={index}
                    to={option.path}
                    onClick={() => setCreateDropdownOpen(false)}
                    className="flex items-center px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 transition-colors group/item"
                  >
                    <span className="mr-3 text-gray-400 group-hover/item:text-purple-400 transition-colors">
                      {option.icon}
                    </span>
                    <span>{option.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all group ${
                  isActive(item.path)
                    ? 'bg-gray-800/50 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <span className={isActive(item.path) ? 'text-purple-400' : ''}>
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-800 space-y-3">
          {/* Upgrade Card */}
          <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <Crown size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <Link
                to="/pricing"
                className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
              >
                Upgrade
              </Link>
            </div>
            <p className="text-xs font-medium text-gray-200 mb-1">Unlock Unlimited</p>
            <p className="text-xs text-gray-400">Get unlimited access to all features</p>
          </div>

          {/* Credits */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-800/30 rounded-lg">
            <span className="text-xs text-gray-400">Credits left</span>
            <span className="text-sm font-semibold text-white">1,234</span>
          </div>

          {/* Help & Support */}
          <div className="space-y-1">
            <Link
              to="/help"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all group"
            >
              <HelpCircle size={18} />
              <span className="text-sm font-medium">Help & Support</span>
            </Link>
            <Link
              to="/feedback"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all group"
            >
              <Share2 size={18} />
              <span className="text-sm font-medium">Share Feedback</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;

