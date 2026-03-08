// app/payment/upgrade/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Check, X, Loader2, Zap } from 'lucide-react';

// === Tier Configuration ===
interface Tier {
  name: string;
  price: string;
  priceNote: string;
  description: string;
  features: Array<{ name: string; included: boolean; premiumOnly?: boolean }>;
  cta: string;
  popular?: boolean;
  gradient: string;
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '0 ETB',
    priceNote: 'forever',
    description: 'Essential safety tools for everyone',
    features: [
      { name: 'SOS panic button with auto-recording', included: true },
      { name: '2 emergency contacts', included: true },
      { name: '500m helper notification radius', included: true },
      { name: 'Police alert integration', included: true },
      { name: 'AI-powered Safety Path', included: false, premiumOnly: true },
      { name: 'Unlimited emergency contacts', included: false, premiumOnly: true },
      { name: '5km helper notification radius', included: false, premiumOnly: true },
      { name: 'Continuous location tracking (60s)', included: false, premiumOnly: true },
      { name: 'AI risk heatmap with real-time updates', included: false, premiumOnly: true },
      { name: 'Safety Sister AI chat', included: false, premiumOnly: true },
      { name: 'Holiday/crowd risk analysis', included: false, premiumOnly: true },
    ],
    cta: 'Continue with Free',
    gradient: 'from-gray-600 to-gray-800'
  },
  {
    name: 'Premium',
    price: '99 ETB',
    priceNote: '/ month',
    description: 'AI-powered safety intelligence for peace of mind',
    features: [
      { name: 'SOS panic button with auto-recording', included: true },
      { name: '5 emergency contacts', included: true },
      { name: '2k helper notification radius', included: true },
      { name: 'Police alert integration', included: true },
      { name: 'AI-powered Safety Path', included: true },
      { name: 'Unlimited emergency contacts', included: true },
      { name: '5km helper notification radius', included: true },
      { name: 'Continuous location tracking (60s)', included: true },
      { name: 'AI risk heatmap with real-time updates', included: true },
      { name: 'Safety Sister AI chat', included: true },
      { name: 'Holiday/crowd risk analysis', included: true },
    ],
    cta: 'Upgrade to Premium',
    popular: true,
    gradient: 'from-pink-600 to-purple-600'
  }
];

export default function UpgradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'free' | 'premium'>('premium');

  const returnTo = searchParams.get('returnTo') || '/safety';

  const handleContinue = () => {
    if (selectedTier === 'free') {
      router.push(returnTo);
      return;
    }
    handleUpgrade();
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const paymentUrl = `/payment?plan=premium&amount=99&returnTo=${encodeURIComponent(returnTo)}`;
      router.push(paymentUrl);
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
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
        className="max-w-5xl w-full relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-10">

          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/20 rounded-full border border-pink-500/30 mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-sm font-medium text-pink-300">Choose Your Safety Plan</span>
          </motion.div>
          
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3 drop-shadow-lg">
            Unlock Smarter Safety
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Core safety is free forever. Upgrade for AI-powered insights and extended protection.
          </p>
        </div>

        {/* Tier Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {TIERS.map((tier, index) => (
            <motion.div
              key={tier.name}
              className={`relative bg-white/10 backdrop-blur-xl rounded-3xl p-6 border transition-all cursor-pointer ${
                selectedTier === tier.name.toLowerCase() 
                  ? `border-2 border-pink-500/50 shadow-lg shadow-pink-500/20` 
                  : 'border-white/20 hover:border-white/40'
              } ${tier.popular ? 'md:scale-105 md:z-10' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedTier(tier.name.toLowerCase() as 'free' | 'premium')}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <motion.div 
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full text-white text-xs font-bold shadow-lg"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  MOST POPULAR
                </motion.div>
              )}

              {/* Tier Header */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-3xl font-black text-white">{tier.price}</span>
                  <span className="text-gray-400 text-sm">{tier.priceNote}</span>
                </div>
                <p className="text-gray-400 text-sm">{tier.description}</p>
              </div>

              {/* Features List */}
              <div className="space-y-3 mb-6">
                {tier.features.map((feature, i) => (
                  <motion.div 
                    key={i}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + (i * 0.03) }}
                  >
                    {feature.included ? (
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${feature.included ? 'text-gray-300' : 'text-gray-600'}`}>
                      {feature.name}
                      {feature.premiumOnly && (
                        <span className="ml-1 text-xs text-pink-400/80">(Premium)</span>
                      )}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Select Button */}
              <motion.button
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  selectedTier === tier.name.toLowerCase()
                    ? `bg-gradient-to-r ${tier.gradient} text-white shadow-lg`
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {selectedTier === tier.name.toLowerCase() ? 'Selected' : 'Select Plan'}
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Action Button (Below Cards) */}
        <motion.div 
          className="mt-10 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            onClick={handleContinue}
            disabled={loading}
            className={`px-12 py-4 rounded-2xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg transition-all relative overflow-hidden group ${
              selectedTier === 'premium'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {selectedTier === 'premium' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            )}
            
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Processing...</span>
              </>
            ) : selectedTier === 'premium' ? (
              <>
                <Zap className="w-5 h-5" />
                <span>Upgrade Now</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Continue with Free</span>
              </>
            )}
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}