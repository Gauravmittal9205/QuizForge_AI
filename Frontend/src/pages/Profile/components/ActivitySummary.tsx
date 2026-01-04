import { motion } from 'framer-motion';
import { FileVideo, Clock, FileText } from 'lucide-react';

interface ActivitySummaryProps {
  userData: {
    lastQuizDate: string;
    mostUsedSource: string;
    drafts: number;
    quizzesGenerated: number;
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
      <h2 className="text-lg font-semibold text-gray-900 mb-6">My Activity Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Total Quizzes</span>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <FileText size={18} className="text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{userData.quizzesGenerated}</p>
          <p className="text-xs text-gray-500 mt-1">Created so far</p>
        </div>
        
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Last Activity</span>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Clock size={18} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {new Date(userData.lastQuizDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
          <p className="text-xs text-gray-500 mt-1">Last quiz created</p>
        </div>
        
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Most Used Source</span>
            <div className="p-2 bg-green-50 rounded-lg">
              <FileVideo size={18} className="text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{userData.mostUsedSource}</p>
          <p className="text-xs text-gray-500 mt-1">Primary content source</p>
        </div>
        
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Drafts</span>
            <div className="p-2 bg-amber-50 rounded-lg">
              <FileText size={18} className="text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{userData.drafts}</p>
          <p className="text-xs text-gray-500 mt-1">Incomplete quizzes</p>
        </div>
      </div>
    </motion.div>
  );
};

export default ActivitySummary;
