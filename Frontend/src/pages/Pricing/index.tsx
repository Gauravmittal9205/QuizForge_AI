import React, { useState, ReactElement } from 'react';
import { Check, Zap, Star, Shield, Award, BarChart2, ZapOff } from 'lucide-react';
import Navbar from '../../components/Navbar';
import SubscriptionCheckout from '../../components/SubscriptionCheckout';

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: Array<{ text: string; icon: ReactElement }>;
  cta: string;
  popular: boolean;
  featured: boolean;
}


const Pricing: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentClose = () => {
    setShowPayment(false);
    setSelectedPlan(null);
  };
  const plans = [
    {
      name: 'Starter',
      price: 'Free',
      period: 'forever',
      description: 'Perfect for individuals getting started',
      features: [
        { text: '5 quizzes per month', icon: <ZapOff className="w-5 h-5 text-green-500" /> },
        { text: 'Basic question types', icon: <Check className="w-5 h-5 text-green-500" /> },
        { text: 'Community support', icon: <Check className="w-5 h-5 text-green-500" /> },
        { text: 'Email support', icon: <Check className="w-5 h-5 text-green-500" /> },
        { text: 'Basic analytics', icon: <BarChart2 className="w-5 h-5 text-green-500" /> },
        { text: 'Watermark on quizzes', icon: <Check className="w-5 h-5 text-green-500" /> }
      ],
      cta: 'Get Started',
      featured: false,
      popular: false
    },
    {
      name: 'Pro',
      price: '$19',
      period: 'per month',
      description: 'For professionals and small teams',
      features: [
        { text: '100 quizzes per month', icon: <Zap className="w-5 h-5 text-yellow-500" /> },
        { text: 'All question types', icon: <Check className="w-5 h-5 text-green-500" /> },
        { text: 'Priority support', icon: <Shield className="w-5 h-5 text-green-500" /> },
        { text: 'Advanced analytics', icon: <BarChart2 className="w-5 h-5 text-green-500" /> },
        { text: 'Custom branding', icon: <Award className="w-5 h-5 text-green-500" /> },
        { text: 'No watermark', icon: <Check className="w-5 h-5 text-green-500" /> },
        { text: 'API access (limited)', icon: <Check className="w-5 h-5 text-green-500" /> }
      ],
      cta: 'Start 14-Day Free Trial',
      featured: true,
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'tailored to your needs',
      description: 'For organizations with advanced requirements',
      features: [
        { text: 'Unlimited quizzes', icon: <Zap className="w-5 h-5 text-purple-500" /> },
        { text: 'All Pro features included', icon: <Star className="w-5 h-5 text-yellow-500" /> },
        { text: 'Dedicated account manager', icon: <Check className="w-5 h-5 text-green-500" /> },
        { text: 'Full API access', icon: <Check className="w-5 h-5 text-green-500" /> },
        { text: 'SLA & SSO', icon: <Shield className="w-5 h-5 text-green-500" /> },
        { text: 'Custom integrations', icon: <Check className="w-5 h-5 text-green-500" /> },
        { text: 'Onboarding & training', icon: <Check className="w-5 h-5 text-green-500" /> }
      ],
      cta: 'Contact Sales',
      featured: false,
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="pt-24 px-4 sm:px-6 lg:px-8">
        {showPayment && selectedPlan && (
          <SubscriptionCheckout 
            planName={selectedPlan.name}
            price={selectedPlan.price}
            onClose={handlePaymentClose}
          />
        )}
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl mb-4">
              Simple, Flexible <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">Pricing</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the perfect plan that fits your needs. No hidden fees, cancel anytime.
            </p>
            
            {/* Toggle Switch for Annual/Monthly Billing - Will be functional in next update */}
            <div className="mt-8 flex items-center justify-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Monthly</span>
              <div className="relative inline-block w-14 align-middle select-none">
                <input type="checkbox" name="toggle" id="toggle" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" />
                <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700">Annual</span>
                <span className="ml-2 px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Save 20%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div 
                key={index}
                className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  plan.popular 
                    ? 'border-cyan-500 transform scale-105 z-10 shadow-xl' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                )}
                
                <div className="p-8">
                  <h3 className={`text-2xl font-bold mb-1 ${
                    plan.popular ? 'text-cyan-600' : 'text-gray-900'
                  }`}>
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  
                  <div className="mb-8">
                    <span className="text-5xl font-extrabold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-gray-500 ml-2">
                      {plan.price !== 'Free' && <span className="text-2xl">$</span>}
                      {plan.period && <span className="text-base ml-1">/ {plan.period}</span>}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handlePlanSelect(plan)}
                    className={`w-full py-3 px-6 text-center rounded-lg font-semibold transition-all ${
                      plan.popular
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:-translate-y-0.5'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
                
                <div className="border-t border-gray-200 px-8 py-6 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    What's included
                  </h4>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <span className="flex-shrink-0 mt-0.5">
                          {feature.icon}
                        </span>
                        <span className="ml-3 text-gray-700">{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <div className="inline-flex items-center bg-white rounded-full px-6 py-3 shadow-sm">
              <Shield className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-gray-700">
                <span className="font-semibold">30-day money-back guarantee</span> on all paid plans
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Pricing;
