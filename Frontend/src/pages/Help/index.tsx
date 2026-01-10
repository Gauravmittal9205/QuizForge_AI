import { useState } from 'react';
import { Search, Mail, MessageSquare, Video, FileText, CreditCard, User, Settings } from 'lucide-react';
import Layout from '../../components/Layout';

const Help = () => {
  const [activeTab, setActiveTab] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Contact form submitted:', contactForm);
    alert('Thank you for contacting us! We\'ll get back to you soon.');
    setContactForm({ name: '', email: '', subject: '', message: '' });
  };

  const helpCategories = [
    { id: 'getting-started', name: 'Getting Started', icon: <User className="w-5 h-5" /> },
    { id: 'account', name: 'Account & Billing', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'videos', name: 'Video Processing', icon: <Video className="w-5 h-5" /> },
    { id: 'quizzes', name: 'Creating Quizzes', icon: <FileText className="w-5 h-5" /> },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: <Settings className="w-5 h-5" /> },
  ];

  const allFaqs = [
    // Getting Started
    {
      id: 'getting-started',
      question: 'How do I create my first quiz?',
      answer: 'To create your first quiz, sign up for an account, click on "Create New Quiz", upload your video or paste a YouTube URL, and our AI will generate questions for you.',
      category: 'getting-started'
    },
    {
      id: 'supported-formats',
      question: 'What video formats are supported?',
      answer: 'We support MP4, MOV, AVI, and WebM video formats. You can also use YouTube links directly.',
      category: 'getting-started'
    },

    // Account & Billing
    {
      id: 'subscription-plans',
      question: 'What subscription plans are available?',
      answer: 'We offer Free, Basic, and Pro plans. Free users can create up to 5 quizzes per month, Basic users up to 50, and Pro users have unlimited quiz creation.',
      category: 'account'
    },
    {
      id: 'billing-cycle',
      question: 'Can I change my billing cycle?',
      answer: 'Yes, you can switch between monthly and annual billing in your account settings. Annual plans come with a 20% discount.',
      category: 'account'
    },

    // Video Processing
    {
      id: 'video-length',
      question: 'Is there a limit to video length?',
      answer: 'Free users can process videos up to 10 minutes long. Basic users can process videos up to 1 hour, and Pro users can process videos up to 4 hours long.',
      category: 'videos'
    },

    // Creating Quizzes
    {
      id: 'customize-questions',
      question: 'Can I customize the generated questions?',
      answer: 'Yes, you can edit any generated question, add new ones, or remove questions you don\'t need before finalizing your quiz.',
      category: 'quizzes'
    },
    {
      id: 'question-types',
      question: 'What types of questions can be generated?',
      answer: 'Our AI can generate multiple-choice, true/false, and short-answer questions based on your video content.',
      category: 'quizzes'
    },

    // Troubleshooting
    {
      id: 'video-processing-issues',
      question: 'My video is not processing. What should I do?',
      answer: 'Try these steps: 1) Check your internet connection 2) Make sure the video format is supported 3) Try a shorter video 4) Clear your browser cache and try again. If the issue persists, contact support.',
      category: 'troubleshooting'
    }
  ];

  const filteredFaqs = allFaqs.filter(faq =>
    (activeTab === 'all' || faq.category === activeTab) &&
    (faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">How can we help you?</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Find answers to common questions or get in touch with our support team.
          </p>

          <div className="mt-8 max-w-2xl mx-auto relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-6">
              <h3 className="font-medium text-gray-900 mb-4">Help Topics</h3>
              <nav className="space-y-1">
                {helpCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveTab(category.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === category.id
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    <span className="mr-3">{category.icon}</span>
                    {category.name}
                  </button>
                ))}
              </nav>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-4">Need more help?</h3>
                <button
                  onClick={() => setActiveTab('contact')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contact Support
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab !== 'contact' ? (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {helpCategories.find(c => c.id === activeTab)?.name || 'All Help Topics'}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {filteredFaqs.length} {filteredFaqs.length === 1 ? 'article' : 'articles'} found
                    {searchQuery && ` for "${searchQuery}"`}
                  </p>
                </div>

                <div className="divide-y divide-gray-200">
                  {filteredFaqs.length > 0 ? (
                    filteredFaqs.map((faq) => (
                      <div key={faq.id} className="p-6 hover:bg-gray-50">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{faq.question}</h3>
                        <p className="text-gray-600">{faq.answer}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <Search className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-lg font-medium text-gray-900">No results found</h3>
                      <p className="mt-1 text-gray-500">
                        We couldn't find any help articles matching your search. Try different keywords or contact support.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div id="contact" className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-semibold text-gray-900">Contact Support</h2>
                  <p className="text-gray-600 mt-1">
                    Our team is here to help. We'll get back to you as soon as possible.
                  </p>
                </div>

                <form onSubmit={handleContactSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Your Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                      How can we help you?
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Send Message
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Help;
