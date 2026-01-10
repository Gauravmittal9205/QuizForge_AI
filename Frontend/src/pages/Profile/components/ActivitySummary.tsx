import { motion } from 'framer-motion';
import { Calendar, ClipboardList, Target, TrendingUp } from 'lucide-react';

interface ActivitySummaryProps {
  userData: {
    practiceAttempts: number;
    lastAttemptLabel: string;
    weeklyAttempts: number;
    bestAccuracy: number;
    recentAttempts: Array<{
      id: string;
      createdAt: number;
      subjectName?: string;
      topicName: string;
      difficulty: string;
      timeMode: string;
      questionCount: number;
      score: { total: number; correct: number; accuracy: number };
    }>;
  };
}

const ActivitySummary = ({ userData }: ActivitySummaryProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl shadow-sm p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Activity Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Total Attempts</span>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <ClipboardList size={18} className="text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{userData.practiceAttempts}</p>
          <p className="text-xs text-gray-500 mt-1">Saved on this device</p>
        </div>
        
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Last Attempt</span>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar size={18} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{userData.lastAttemptLabel}</p>
          <p className="text-xs text-gray-500 mt-1">Most recent practice</p>
        </div>
        
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Attempts (7d)</span>
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp size={18} className="text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{userData.weeklyAttempts}</p>
          <p className="text-xs text-gray-500 mt-1">This week</p>
        </div>
        
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Best Accuracy</span>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Target size={18} className="text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{userData.bestAccuracy}%</p>
          <p className="text-xs text-gray-500 mt-1">Highest score</p>
        </div>
      </div>

      {userData.recentAttempts?.length ? (
        <div className="mt-6">
          <div className="text-sm font-semibold text-gray-900 mb-3">Recent Attempts</div>
          <div className="space-y-2">
            {userData.recentAttempts.map((a) => (
              <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="text-gray-900 font-semibold">
                      {(a.subjectName || 'Subject')} • {a.topicName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(a.createdAt).toLocaleString()} • {a.difficulty} • {a.timeMode} • {a.questionCount} Q
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {a.score.correct}/{a.score.total} <span className="text-gray-500 font-medium">({a.score.accuracy}%)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
};

export default ActivitySummary;
