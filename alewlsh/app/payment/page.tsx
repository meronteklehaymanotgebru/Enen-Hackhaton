// app/payment/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, ShieldCheck, Sparkles } from 'lucide-react';

export default function PaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: 99,
    email: '',
    first_name: '',
    last_name: '',
    plan: 'monthly'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePayment = async () => {
    // Validate required fields
    if (!formData.email || !formData.first_name || !formData.last_name) {
      alert('Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      console.log('💰 Sending to Safaricom Ethiopia:', formData);

      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('📥 Safaricom Ethiopia response:', data);

      // Check the response format from Safaricom Ethiopia
      if (data.status === 'success' && data.data?.checkout_url) {
        // Redirect to Safaricom Ethiopia payment page
        window.location.href = data.data.checkout_url;
      } else {
        alert(data.message || 'Payment failed. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      alert('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        />
      </div>

      <motion.div 
        className="max-w-md w-full relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >

        {/* Payment Card */}
        <motion.div 
          className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/20 rounded-full border border-pink-500/30 mb-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span className="text-sm font-medium text-pink-300">Premium Upgrade</span>
            </motion.div>
            
            <h1 className="text-2xl font-black text-white mb-2 drop-shadow-lg">
              Complete Your Upgrade
            </h1>
            <p className="text-gray-400 text-sm">
              Unlock AI safety insights, unlimited contacts & more
            </p>
          </div>

          {/* Premium Benefits Preview */}
          <motion.div 
            className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-white text-sm font-medium">You&apos;re getting:</p>
                <ul className="text-gray-400 text-xs mt-1 space-y-1">
                  <li>• Safe path routing and risky areas heat maps</li>
                  <li>• AI-powered Safe Path planning</li>
                  <li>• Unlimited emergency contacts</li>
                  <li>• 5km helper notification radius</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Form */}
          <div className="space-y-4">
            {/* Email */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all backdrop-blur-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">We&apos;ll send payment confirmation here</p>
            </motion.div>

            {/* First Name */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <label className="block text-sm font-medium text-gray-300 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                placeholder="Enter your first name"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all backdrop-blur-sm"
                required
              />
            </motion.div>

            {/* Last Name */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                placeholder="Enter your last name"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all backdrop-blur-sm"
                required
              />
            </motion.div>

            {/* Amount Display */}
            <motion.div 
              className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 p-4 rounded-2xl border border-pink-500/20"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Total Amount:</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-white drop-shadow-lg">ETB {formData.amount}</span>
                  <p className="text-xs text-pink-300/80">/ {formData.plan}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Less than one macchiato ☕
              </p>
            </motion.div>

            {/* Pay Button */}
            <motion.button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg transition-all mt-6 relative overflow-hidden group"
              style={{ 
                background: 'linear-gradient(135deg, #8B1487 0%, #EC4899 100%)',
                boxShadow: '0 10px 40px rgba(139, 20, 135, 0.4)'
              }}
              whileHover={{ scale: loading ? 1 : 1.02, boxShadow: '0 15px 50px rgba(139, 20, 135, 0.6)' }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              {/* Button Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Pay Securely with Safaricom Ethiopia</span>
                </>
              )}
            </motion.button>

            {/* Security Note */}
            <motion.p 
              className="text-xs text-center text-gray-500 mt-4 flex items-center justify-center gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              🔒 Encrypted payment powered by Safaricom Ethiopia
            </motion.p>
          </div>
        </motion.div>

        {/* Footer Note */}
        <motion.p 
          className="text-center text-gray-500 text-xs mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          Questions? Contact <span className="text-pink-400">support@alewlsh.eth</span>
        </motion.p>
      </motion.div>
    </div>
  );
}