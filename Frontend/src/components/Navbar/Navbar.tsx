import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Sparkles, 
  CreditCard, 
  HelpCircle, 
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ProfileDropdown from './ProfileDropdown';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, signOut } = useAuth();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isProfilePage = location.pathname === '/profile';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to sign out', error);
    }
  };

  const navLinks = [
    { name: 'Features', path: '/features', icon: <Sparkles size={18} className="mr-2" /> },
    { name: 'Pricing', path: '/pricing', icon: <CreditCard size={18} className="mr-2" /> },
    { name: 'FAQ', path: '/faq', icon: <MessageSquare size={18} className="mr-2" /> },
    { name: 'Help', path: '/help', icon: <HelpCircle size={18} className="mr-2" /> },
  ];

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled || isAuthPage || isProfilePage ? 'bg-white shadow-md' : 'bg-transparent'
      }`}
    >
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isAuthPage ? 'bg-white' : ''}`}>
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center">
              <Sparkles className="h-6 w-6 text-indigo-600" />
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                EduTrack AI
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center justify-center flex-1">
            <div className="flex space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  {link.icon}
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {currentUser ? (
              <ProfileDropdown user={currentUser} onSignOut={handleSignOut} />
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-indigo-600 hover:bg-gray-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center text-gray-700 hover:text-indigo-600 hover:bg-gray-100 px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              {link.icon}
              {link.name}
            </Link>
          ))}
          {currentUser ? (
            <div className="border-t border-gray-100">
              <ProfileDropdown 
                user={currentUser} 
                onSignOut={() => {
                  handleSignOut();
                  setIsOpen(false);
                }} 
              />
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="block text-gray-700 hover:text-indigo-600 hover:bg-gray-100 px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/pricing"
                className="block text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-md text-base font-medium hover:opacity-90 transition-opacity"
                onClick={() => setIsOpen(false)}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;