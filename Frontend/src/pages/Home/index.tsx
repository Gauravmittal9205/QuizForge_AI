import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="text-center max-w-4xl">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Welcome to EduTrack AI</h1>
          <p className="text-xl text-gray-600 mb-8">Transform your videos into interactive quizzes with AI</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
            <Link
              to="/how-it-works"
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
