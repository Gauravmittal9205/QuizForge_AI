import React from 'react';
import { X } from 'lucide-react';

interface SubscriptionCheckoutProps {
  planName: string;
  price: string;
  onClose: () => void;
}

const SubscriptionCheckout: React.FC<SubscriptionCheckoutProps> = ({ planName, price, onClose }) => {
  // Format price with INR symbol
  const formatPrice = (amount: string) => {
    const price = parseFloat(amount.replace(/[^0-9.]/g, ''));
    return isNaN(price) ? '₹0.00' : `₹${price.toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold">VideoQuiz AI</h1>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-10 p-6">
          {/* LEFT SIDE */}
          <div>
            <h2 className="text-gray-600 text-sm mb-1">Subscribe to {planName} Plan</h2>
            <p className="text-4xl font-semibold mb-4">
              {formatPrice(price)} <span className="text-base font-normal">per month</span>
            </p>

            <div className="border-t pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span>{planName} Subscription</span>
                <span>{formatPrice(price)}</span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{formatPrice(price)}</span>
              </div>

              <div className="flex justify-between text-gray-500">
                <span>Tax</span>
                <span>Enter address to calculate</span>
              </div>

              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Total due today</span>
                <span>{formatPrice(price)}</span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="border rounded-lg p-6 shadow-sm">
            <h3 className="font-medium mb-4">Contact information</h3>

            <input
              type="email"
              placeholder="Email address"
              className="w-full border rounded-md px-3 py-2 mb-6 text-sm"
            />

            <h3 className="font-medium mb-3">Payment method</h3>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 border p-3 rounded-md cursor-pointer">
                <input type="radio" name="payment" defaultChecked className="text-blue-600" />
                <span className="font-medium">Card</span>
                <div className="ml-auto flex gap-2">
                  <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-6" />
                  <img src="https://img.icons8.com/color/48/mastercard.png" alt="Mastercard" className="h-6" />
                  <img src="https://img.icons8.com/color/48/amex.png" alt="Amex" className="h-6" />
                </div>
              </label>

              <label className="flex items-center gap-3 border p-3 rounded-md cursor-pointer">
                <input type="radio" name="payment" className="text-blue-600" />
                <span>UPI</span>
              </label>

              <label className="flex items-center gap-3 border p-3 rounded-md cursor-pointer">
                <input type="radio" name="payment" className="text-blue-600" />
                <span>Net Banking</span>
              </label>
            </div>

            <label className="flex items-start gap-2 text-sm mb-4">
              <input type="checkbox" className="mt-1" />
              <span>Save my information for faster checkout.</span>
            </label>

            <p className="text-xs text-gray-500 mb-4">
              By subscribing, you agree to our Terms of Use and Privacy Policy.
            </p>

            <button className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-md font-semibold hover:opacity-90 transition">
              Subscribe Now
            </button>

            <p className="text-xs text-center text-gray-400 mt-4">
              Secure payment powered by Razorpay
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCheckout;
