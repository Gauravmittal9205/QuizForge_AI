import { motion } from 'framer-motion';
import { Zap, Clock } from 'lucide-react';

interface AIUsageProps {
  userData: {
    aiCredits: number;
    totalCredits: number;
    videosProcessed: number;
    quizzesGenerated: number;
    avgProcessingTime: string;
  };
}

const AIUsage = ({ userData }: AIUsageProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-2xl shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">AI Usage & Limits</h2>
        <div className="flex items-center text-sm text-gray-500">
          <Clock size={14} className="mr-1.5" />
          Resets in 15 days
        </div>
      </div>
      
      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">AI Credits</span>
            <span className="font-mono">{userData.aiCredits}/{userData.totalCredits}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full" 
              style={{ width: `${(userData.aiCredits / userData.totalCredits) * 100}%` }}
            ></div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {userData.totalCredits - userData.aiCredits} credits remaining this month
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-50 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-indigo-900">Videos Processed</span>
              <Zap size={18} className="text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-indigo-800">{userData.videosProcessed}</p>
            <p className="text-xs text-indigo-600 mt-1">+2 this week</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-900">Quizzes Generated</span>
              <Zap size={18} className="text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-800">{userData.quizzesGenerated}</p>
            <p className="text-xs text-purple-600 mt-1">+3 this week</p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">Avg. Processing</span>
              <Clock size={18} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-800">{userData.avgProcessingTime}s</p>
            <p className="text-xs text-blue-600 mt-1">per video</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AIUsage;
