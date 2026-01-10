import { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, useAnimation, useInView, Variants } from 'framer-motion';
import { 
  Sparkles, 
  ArrowRight, 
  FileVideo, 
  Brain, 
  BarChart3, 
  Upload, 
  Github, 
  Twitter, 
  Mail
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Features from './pages/Features';
import HowItWorks from './pages/HowItWorks';
import Pricing from './pages/Pricing';
import Help from './pages/Help';
import Faq from './pages/Faq';
import Login from './pages/Login';
import Signup from './pages/Signup';

const Home = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<number | null>(null);

  const handleSubmit = () => {
    if (isLoading) return;

    setIsLoading(true);
    setProgress(0);

    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = window.setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 5, 100);

        if (next === 100) {
          if (progressIntervalRef.current) {
            window.clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }

          window.setTimeout(() => {
            setIsLoading(false);
            alert('Syllabus tracking coming soon!');
            setProgress(0);
          }, 300);
        }

        return next;
      });
    }, 100);
  };

  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const item: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 10
      }
    }
  };

  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(6,182,212,0.08),transparent_50%)]"></div>

      <div className="relative z-10 pt-16 md:pt-20">
        <main className="container mx-auto px-6 py-16 md:py-24">
          <motion.div 
            ref={ref}
            variants={container}
            initial="hidden"
            animate={controls}
            className="max-w-5xl mx-auto text-center space-y-12"
          >
            <motion.div className="space-y-8">
              <motion.h1 
                className="text-5xl md:text-7xl font-bold leading-tight text-gray-900 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                AI-Powered Syllabus Tracker
                <motion.span 
                  className="block bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent mt-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  for Smart Students
                </motion.span>
              </motion.h1>
              <motion.p 
                className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                Upload your syllabus. Study with AI. Track every chapter.
            
                
              </motion.p>
            </motion.div>

            <motion.div 
              className="relative group"
              variants={item}
              whileHover={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <div className="space-y-6">
                <div className="space-y-4">
                
                  <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-center gap-3">
                    <div className="px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-gray-800 text-sm font-medium">
                      Upload your syllabus
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 transform rotate-90 md:rotate-0" />
                    <div className="px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-gray-800 text-sm font-medium">
                      Add notes / PDFs
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 transform rotate-90 md:rotate-0" />
                    <div className="px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-gray-800 text-sm font-medium">
                      Track what you’ve studied
                    </div>
                  </div>
                </div>

                <motion.button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className={`group relative w-full md:w-auto px-8 py-4 rounded-xl font-medium text-white overflow-hidden ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:shadow-lg'
                  }`}
                  whileTap={{ scale: 0.98 }}
                  whileHover={!isLoading ? {
                    scale: 1.02,
                    boxShadow: '0 10px 25px -5px rgba(14, 165, 233, 0.4)',
                  } : {}}
                >
                  <motion.span 
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    animate={isLoading ? {
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    } : {}}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    style={{
                      backgroundSize: '200% 200%',
                    }}
                  />
                  <span className="relative z-10 flex items-center justify-center">
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Progress {progress}%
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                        <span>✅ Start Tracking My Syllabus</span>
                        <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </motion.button>

                {isLoading && (
                  <div className="w-full max-w-md mx-auto">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                      <span>Loading</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-600 text-center">
                  🎯 Perfect for students, exam aspirants, and self-learners
                </p>
              </div>
            </motion.div>
          </motion.div>
        </main>

        <section id="features" className="container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Powerful <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">Features</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to turn your syllabus into a smart AI study system
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Sparkles,
                title: 'AI Study Plan Generator',
                description: 'Convert your syllabus into a personalized chapter-wise plan',
                explanation: 'EduTrack AI reads your syllabus and creates a structured roadmap with chapters, priorities, and suggested study flow.'
              },
              {
                icon: FileVideo,
                title: 'Syllabus Upload & Parsing',
                description: 'Upload syllabus and organize topics automatically',
                explanation: 'Upload your syllabus file and let the system break it into chapters/topics so you can track progress clearly.'
              },
              {
                icon: Brain,
                title: 'AI Learning Assistant',
                description: 'Get explanations, notes, and smart study guidance',
                explanation: 'Ask doubts, generate quick notes, and get help understanding difficult topics—aligned with your syllabus.'
              },
              {
                icon: BarChart3,
                title: 'Chapter Progress Tracking',
                description: 'Track what’s done, what’s pending, and what’s next',
                explanation: 'Mark chapters complete, monitor consistency, and stay on track with a clear syllabus progress view.'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-xl blur opacity-15 group-hover:opacity-25 transition duration-300"></div>
                <div className="relative bg-white backdrop-blur-xl border border-gray-200 rounded-xl p-6 h-full hover:border-cyan-400 transition-colors shadow-sm">
                  <div className="transform transition-transform duration-300 group-hover:rotate-12">
                    <feature.icon className="w-10 h-10 text-cyan-600 mb-4" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto text-center mb-16">
            
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How It <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">Works</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Turn your syllabus into an AI-powered study plan in a few simple steps
            </p>
          </div>
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  step: '01',
                  icon: <Upload className="w-6 h-6" />,
                  title: 'Upload Your Syllabus',
                  description: 'Upload your syllabus (or paste a link) to get started',
                  gradient: 'from-purple-500 to-indigo-600'
                },
                {
                  step: '02',
                  icon: <Brain className="w-6 h-6" />,
                  title: 'AI Understands Topics',
                  description: 'EduTrack AI extracts chapters/topics and builds a structured roadmap',
                  gradient: 'from-blue-500 to-cyan-600'
                },
                {
                  step: '03',
                  icon: <FileVideo className="w-6 h-6" />,
                  title: 'Add Notes & PDFs',
                  description: 'Attach your notes, PDFs, and resources chapter-wise',
                  gradient: 'from-cyan-500 to-teal-500'
                },
                {
                  step: '04',
                  icon: <Sparkles className="w-6 h-6" />,
                  title: 'Generate Study Plan',
                  description: 'Get a personalized plan with priorities and suggested order',
                  gradient: 'from-teal-500 to-emerald-500'
                },
                {
                  step: '05',
                  icon: <BarChart3 className="w-6 h-6" />,
                  title: 'Track Your Progress',
                  description: 'Mark chapters complete and see what’s pending at a glance',
                  gradient: 'from-emerald-500 to-green-500'
                },
                {
                  step: '06',
                  icon: <ArrowRight className="w-6 h-6" />,
                  title: 'Study Smarter Daily',
                  description: 'Use AI help to revise, clarify concepts, and stay consistent',
                  gradient: 'from-green-500 to-lime-500'
                }
              ].map((item, index) => (
                <div key={index} className="relative group">
                  <div className={`h-full p-6 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:rotate-1`}>
                    <div className={`w-12 h-12 rounded-lg mb-4 flex items-center justify-center text-white bg-gradient-to-br ${item.gradient} shadow-md`}>
                      {item.icon}
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-500">Step {item.step}</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer id="footer" className="bg-gray-900 text-gray-300">
          <div className="container mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {/* Brand Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 group">
                  <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg transform group-hover:rotate-12 transition-transform">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">EduTrack AI</span>
                </div>
                <p className="text-gray-400 text-sm">Transform your videos into engaging quizzes with AI-powered precision.</p>
                <div className="flex gap-4 pt-2">
                  {[
                    { icon: <Github className="w-5 h-5" />, label: 'GitHub', url: '#' },
                    { icon: <Twitter className="w-5 h-5" />, label: 'Twitter', url: '#' },
                    { icon: <Mail className="w-5 h-5" />, label: 'Email', url: 'mailto:contact@edutrackai.com' }
                  ].map((social, index) => (
                    <a 
                      key={index}
                      href={social.url}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-all duration-300"
                      aria-label={social.label}
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
                <ul className="space-y-3">
                  {[
                    { name: 'Features', href: '#features' },
                    { name: 'How It Works', href: '#how-it-works' },
                    { name: 'Pricing', href: '/pricing' },
                    { name: 'Help Center', href: '/help' }
                  ].map((item, index) => (
                    <li key={index}>
                      <a 
                        href={item.href}
                        className="text-gray-400 hover:text-cyan-400 transition-colors group flex items-center"
                      >
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full opacity-0 group-hover:opacity-100 mr-2 transition-opacity"></span>
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Resources</h3>
                <ul className="space-y-3">
                  {[
                    { name: 'Blog', href: '#' },
                    { name: 'Documentation', href: '#' },
                    { name: 'API Reference', href: '#' },
                    { name: 'Tutorials', href: '#' }
                  ].map((item, index) => (
                    <li key={index}>
                      <a 
                        href={item.href}
                        className="text-gray-400 hover:text-cyan-400 transition-colors group flex items-center"
                      >
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full opacity-0 group-hover:opacity-100 mr-2 transition-opacity"></span>
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Newsletter */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Stay Updated</h3>
                <p className="text-gray-400 text-sm mb-4">Subscribe to our newsletter for the latest updates and features.</p>
                <div className="flex">
                  <input 
                    type="email" 
                    placeholder="Your email" 
                    className="px-4 py-2 w-full rounded-l-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-gray-500"
                  />
                  <button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 rounded-r-lg hover:opacity-90 transition-opacity">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-500 text-sm mb-4 md:mb-0">
                &copy; {new Date().getFullYear()} EduTrack AI. All rights reserved.
              </div>
              <div className="flex gap-6">
                <a href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">Terms</a>
                <a href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">Privacy</a>
                <a href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">Cookies</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';

const AppContent = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  
  // Check if current route is a dashboard route
  const isDashboardRoute = location.pathname.startsWith('/dashboard');
  
  return (
    <div className="min-h-screen bg-gray-50">
      {!isDashboardRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/help" element={<Help />} />
        <Route path="/faq" element={<Faq />} />
        <Route 
          path="/login" 
          element={currentUser ? <Navigate to="/" replace /> : <Login />} 
        />
        <Route 
          path="/signup" 
          element={currentUser ? <Navigate to="/" replace /> : <Signup />} 
        />
        <Route 
          path="/profile" 
          element={currentUser ? <Profile /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/dashboard/*" 
          element={currentUser ? <Dashboard /> : <Navigate to="/login" replace />} 
        />
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
              <p className="text-gray-600 mb-6">The page you're looking for doesn't exist or has been moved.</p>
              <a href="/" className="text-blue-600 hover:underline">
                Go back home
              </a>
            </div>
          </div>
        } />
      </Routes>
    </div>
  );
};

// Remove StrictMode to prevent double rendering in development
const App = () => (
  <Router>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </Router>
);

export default App;