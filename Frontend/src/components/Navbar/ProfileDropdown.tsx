import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  LayoutDashboard, 
  CreditCard, 
  Settings, 
  HelpCircle, 
  MessageSquare, 
  LogOut,
  ChevronDown
} from 'lucide-react';

interface ProfileDropdownProps {
  user: any;
  onSignOut: () => void;
}

const ProfileDropdown = ({ user, onSignOut }: ProfileDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const menuItems = [
    {
      label: 'My Profile',
      icon: <User size={18} className="mr-2 text-indigo-600" />,
      path: '/profile',
      onClick: () => navigate('/profile')
    },
    {
      label: 'My Dashboard',
      icon: <LayoutDashboard size={18} className="mr-2 text-blue-600" />,
      path: '/dashboard',
      onClick: () => navigate('/dashboard')
    },
    {
      label: 'Billing/Subscription',
      icon: <CreditCard size={18} className="mr-2 text-green-600" />,
      path: '/pricing',
      onClick: () => navigate('/pricing')
    },
    {
      label: 'Settings',
      icon: <Settings size={18} className="mr-2 text-gray-600" />,
      path: '/settings',
      onClick: () => navigate('/settings')
    },
    {
      label: 'Help/Support',
      icon: <HelpCircle size={18} className="mr-2 text-purple-600" />,
      path: '/help',
      onClick: () => navigate('/help')
    },
    {
      label: 'Feedback',
      icon: <MessageSquare size={18} className="mr-2 text-amber-600" />,
      path: '/feedback',
      onClick: () => navigate('/feedback')
    }
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (item: { path: string; onClick?: () => void }) => {
    if (item.onClick) {
      item.onClick();
    } else {
      navigate(item.path);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 focus:outline-none"
      >
        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
          <User size={18} />
        </div>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1 z-50">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium text-gray-700">
              {user.displayName || user.email?.split('@')[0]}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
              </button>
            ))}
            
            <button
              onClick={onSignOut}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center border-t border-gray-100 mt-2"
            >
              <LogOut size={18} className="mr-2 text-red-600" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
