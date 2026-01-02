import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sparkles, CreditCard, HelpCircle, MessageSquare } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', path: '/features', icon: <Sparkles size={18} className="mr-2" /> },
    { name: 'Pricing', path: '/pricing', icon: <CreditCard size={18} className="mr-2" /> },
    { name: 'FAQ', path: '/faq', icon: <MessageSquare size={18} className="mr-2" /> },
    { name: 'Help', path: '/help', icon: <HelpCircle size={18} className="mr-2" /> },
  ];

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled || isAuthPage ? 'bg-white shadow-md' : 'bg-transparent'
      }`}
    >
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isAuthPage ? 'bg-white' : ''}`}>
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center">
              <Sparkles className="h-6 w-6 text-indigo-600" />
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                QuizForge AI
              </span>
            </Link>
          </div>

          {/* Center - Desktop Navigation */}
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

          {/* Right side - Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/login"
              className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/pricing"
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
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
              className="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-md"
              onClick={() => setIsOpen(false)}
            >
              {link.icon}
              {link.name}
            </Link>
          ))}
          <div className="pt-4 pb-2 border-t border-gray-200">
            <Link
              to="/login"
              className="block w-full mb-2 px-4 py-2 text-sm font-medium text-center text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => setIsOpen(false)}
            >
              Login
            </Link>
            <Link
              to="/get-started"
              className="block w-full px-4 py-2 text-sm font-medium text-center text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-md hover:opacity-90"
              onClick={() => setIsOpen(false)}
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
