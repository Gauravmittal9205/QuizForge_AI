import { motion } from 'framer-motion';
import { Clock, Target, TrendingUp } from 'lucide-react';

interface AIUsageProps {
  userData: {
    practiceAttempts: number;
    weeklyAttempts: number;
    bestAccuracy: number;
    studyStreakDays: number;
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
        <h2 className="text-lg font-semibold text-gray-900">Practice Insights</h2>
        <div className="flex items-center text-sm text-gray-500">
          <Clock size={14} className="mr-1.5" />
          Last 7 days
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-50 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-indigo-900">Attempts (7d)</span>
              <TrendingUp size={18} className="text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-indigo-800">{userData.weeklyAttempts}</p>
            <p className="text-xs text-indigo-600 mt-1">Practice sessions in last week</p>
          </div>

          <div className="bg-purple-50 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-900">Best accuracy</span>
              <Target size={18} className="text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-800">{userData.bestAccuracy}%</p>
            <p className="text-xs text-purple-600 mt-1">Across all attempts</p>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">Study streak</span>
              <Clock size={18} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-800">{userData.studyStreakDays}d</p>
            <p className="text-xs text-blue-600 mt-1">Consecutive active days</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">Total attempts</div>
              <div className="text-xs text-gray-600 mt-1">Saved locally on this device</div>
            </div>
            <div className="text-2xl font-extrabold text-gray-900">{userData.practiceAttempts}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AIUsage;
