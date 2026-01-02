import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';

const HowItWorks = () => {
  const steps = [
    {
      number: '01',
      title: 'Upload Your Video',
      description: 'Simply upload your video file or paste a YouTube URL.'
    },
    {
      number: '02',
      title: 'AI Processes Content',
      description: 'Our AI analyzes the video and generates relevant quiz questions.'
    },
    {
      number: '03',
      title: 'Review & Customize',
      description: 'Edit the generated questions or add your own.'
    },
    {
      number: '04',
      title: 'Share & Analyze',
      description: 'Share your quiz and track performance with detailed analytics.'
    }
  ];

  return (
    <Layout>
      <h1 className="text-4xl font-bold mb-2">How It Works</h1>
      <p className="text-lg text-gray-700 mb-12">
        Create amazing quizzes in just a few simple steps.
      </p>
      
      <div className="space-y-8 max-w-3xl mx-auto">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
              {step.number}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{step.title}</h3>
              <p className="text-gray-600 mt-1">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <Link to="/" className="text-blue-600 hover:underline flex items-center">
          <span className="mr-1">←</span> Back to Home
        </Link>
      </div>
    </Layout>
  );
};

export default HowItWorks;
