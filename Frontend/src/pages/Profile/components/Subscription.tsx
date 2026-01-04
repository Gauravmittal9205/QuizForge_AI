import { motion } from 'framer-motion';
import { CreditCard, Zap } from 'lucide-react';

interface SubscriptionProps {
  userData: {
    subscriptionPlan: string;
    renewalDate: string;
    quizzesGenerated: number;
    videosProcessed: number;
  };
}

const Subscription = ({ userData }: SubscriptionProps) => {
  const getPlanColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'pro':
        return 'from-blue-500 to-blue-600';
      case 'team':
        return 'from-purple-500 to-purple-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl shadow-sm p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Subscription & Billing</h2>
      
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-5 rounded-xl border border-indigo-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center mb-2">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${getPlanColor(userData.subscriptionPlan)} text-white mr-3`}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Current Plan</p>
                  <p className="text-xl font-bold text-gray-900">
                    {userData.subscriptionPlan} Plan
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mt-3">
                {userData.subscriptionPlan === 'Free' ? (
                  'Upgrade to unlock all features and remove limits'
                ) : (
                  `Next billing date: ${new Date(userData.renewalDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}`
                )}
              </p>
            </div>
            
            <button className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              {userData.subscriptionPlan === 'Free' ? 'Upgrade Plan' : 'Manage Subscription'}
              <Zap size={16} className="ml-2" />
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Plan Benefits</h3>
          <ul className="space-y-2">
            <li className="flex items-center text-sm text-gray-600">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {userData.quizzesGenerated} quizzes generated this month
            </li>
            <li className="flex items-center text-sm text-gray-600">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {userData.videosProcessed} videos processed
            </li>
            <li className="flex items-center text-sm text-gray-600">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {userData.subscriptionPlan === 'Free' ? 'Limited' : 'Unlimited'} AI credits
            </li>
          </ul>
        </div>
        
        <div className="pt-4 border-t border-gray-100">
          <a 
            href="/billing" 
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            View billing history and receipts →
          </a>
        </div>
      </div>
    </motion.div>
  );
};

export default Subscription;
