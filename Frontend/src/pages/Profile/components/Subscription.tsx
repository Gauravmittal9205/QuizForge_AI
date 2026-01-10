import { motion } from 'framer-motion';
import { BookOpen, Target, Zap } from 'lucide-react';

interface SubscriptionProps {
  userData: {
    syllabusSubjects: number;
    syllabusProgress: number;
    syllabusTopicsCompleted: number;
    syllabusTopicsTotal: number;
    studyStreakDays: number;
  };
}

const Subscription = ({ userData }: SubscriptionProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl shadow-sm p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Syllabus Progress</h2>
      
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-5 rounded-xl border border-indigo-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center mb-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white mr-3">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Overall progress</p>
                  <p className="text-xl font-bold text-gray-900">{userData.syllabusProgress}%</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2.5 rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, userData.syllabusProgress))}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-3">
                {userData.syllabusTopicsCompleted}/{userData.syllabusTopicsTotal} topics completed • {userData.syllabusSubjects} subjects
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 min-w-[120px] text-center border border-gray-100 shadow-sm">
              <div className="text-xs text-gray-500">Streak</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{userData.studyStreakDays}d</div>
              <div className="text-xs text-gray-500 mt-1">active</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Subjects</div>
                <div className="text-xl font-extrabold text-gray-900 mt-1">{userData.syllabusSubjects}</div>
              </div>
              <Target size={18} className="text-indigo-600" />
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Topics left</div>
                <div className="text-xl font-extrabold text-gray-900 mt-1">{Math.max(0, (userData.syllabusTopicsTotal || 0) - (userData.syllabusTopicsCompleted || 0))}</div>
              </div>
              <Zap size={18} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Subscription;
