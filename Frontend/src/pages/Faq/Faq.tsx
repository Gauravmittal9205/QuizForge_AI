import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from '../../components/Navbar';

type FaqItem = {
  question: string;
  answer: string;
  isOpen: boolean;
};

const FaqPage = () => {
  const [faqs, setFaqs] = useState<FaqItem[]>([
    {
      question: 'How does the video quiz generator work?',
      answer: 'Our AI analyzes your video content, identifies key concepts, and generates relevant quiz questions automatically. You can then customize the questions as needed.',
      isOpen: false,
    },
    {
      question: 'What video formats do you support?',
      answer: 'We support all major video formats including MP4, MOV, AVI, and WebM. The maximum file size is 1GB per video.',
      isOpen: false,
    },
    {
      question: 'Can I customize the quiz questions?',
      answer: 'Yes, you can edit any auto-generated question, add new ones, or remove questions that don\'t fit your needs before finalizing your quiz.',
      isOpen: false,
    },
    {
      question: 'Is there a limit to video length?',
      answer: 'You can upload videos up to 2 hours long. For optimal performance, we recommend keeping videos under 1 hour.',
      isOpen: false,
    },
    {
      question: 'How do I share my quizzes?',
      answer: 'You can share quizzes via direct link, embed them in your website, or export them to popular learning management systems (LMS).',
      isOpen: false,
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, we take data security seriously. All video and quiz data is encrypted both in transit and at rest.',
      isOpen: false,
    },
  ]);

  const toggleFaq = (index: number) => {
    setFaqs(faqs.map((faq, i) => ({
      ...faq,
      isOpen: i === index ? !faq.isOpen : false,
    })));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl mb-4">
            Frequently Asked <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">Questions</span>
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Find answers to common questions about EduTrack AI and how to get the most out of our platform.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <button
                className="w-full px-6 py-5 text-left focus:outline-none"
                onClick={() => toggleFaq(index)}
                aria-expanded={faq.isOpen}
                aria-controls={`faq-${index}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    {faq.question}
                  </h3>
                  {faq.isOpen ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>
              {faq.isOpen && (
                <div 
                  id={`faq-${index}`}
                  className="px-6 pb-5 pt-0 text-gray-600"
                  aria-hidden={!faq.isOpen}
                >
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Still have questions?</h2>
          <p className="text-gray-600 mb-6">
            Can't find the answer you're looking for? Our support team is here to help.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-sm hover:shadow-md transition-all duration-200"
          >
            Contact Support
          </a>
        </div>
      </div>
      </div>
    </div>
  );
};

export default FaqPage;
