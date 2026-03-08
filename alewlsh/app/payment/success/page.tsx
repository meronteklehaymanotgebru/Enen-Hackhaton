// app/payment/success/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function PaymentSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status] = useState('success');
  const [showConfetti] = useState(true);

  // Generate confetti positions once (in state)
  const [confettiPositions] = useState<{ left: string; x: number; duration: number; delay: number }[]>(
    () =>
      Array.from({ length: 20 }, () => ({
        left: `${Math.random() * 100}%`,
        x: Math.random() * 100 - 50,
        duration: 2 + Math.random() * 2,
        delay: Math.random() * 0.5,
      }))
  );

  // Auto-redirect after 5 seconds (optional)
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/safety');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/3 left-1/3 w-80 h-80 bg-green-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        {showConfetti && (
          <>
            {confettiPositions.map((pos, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#EC4899', '#8B1487', '#22C55E', '#F59E0B'][i % 4],
                  left: pos.left,
                  top: '-10px'
                }}
                animate={{
                  y: ['0vh', '100vh'],
                  x: [0, pos.x],
                  opacity: [1, 0]
                }}
                transition={{
                  duration: pos.duration,
                  delay: pos.delay,
                  ease: 'easeOut'
                }}
              />
            ))}
          </>
        )}
      </div>

      <motion.div 
        className="max-w-md w-full relative z-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        {/* Success Card */}
        <motion.div 
          className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl text-center"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Success Icon */}
          <motion.div 
            className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/30"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          >
            <CheckCircle className="w-10 h-10 text-green-400" />
          </motion.div>
          
          {/* Premium Badge */}
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full border border-pink-500/30 mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-sm font-medium text-pink-300">Premium Active</span>
          </motion.div>
          
          <h1 className="text-2xl font-black text-white mb-3 drop-shadow-lg">
            Payment Successful!
          </h1>
          <p className="text-gray-400 mb-8">
            Welcome to Alewlsh Premium. Your safety just got smarter. 💜
          </p>
          
          {/* What's Unlocked */}
          <motion.div 
            className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/10 text-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-white text-sm font-medium mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              Now unlocked:
            </p>
            <ul className="text-gray-400 text-xs space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                AI-powered Safe Path with real-time risk analysis
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                Unlimited emergency contacts with continuous tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                5km helper notification radius
              </li>
            </ul>
          </motion.div>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Link
                href="/safety"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl font-semibold hover:from-pink-500 hover:to-purple-500 transition-all shadow-lg"
              >
                <Sparkles className="w-5 h-5" />
                Explore Safe Path
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Link
                href="/emergency"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl font-medium hover:bg-white/20 transition-all border border-white/20"
              >
                Go to Emergency Page
              </Link>
            </motion.div>
          </div>
          
          {/* Receipt Note */}
          <motion.p 
            className="text-xs text-gray-500 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Receipt sent to your email • Transaction ID: {searchParams.get('tx_ref')?.slice(0, 12)}...
          </motion.p>
        </motion.div>
        
        {/* Support Link */}
        <motion.p 
          className="text-center text-gray-500 text-xs mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          Need help? <Link href="/support" className="text-pink-400 hover:underline">Contact support</Link>
        </motion.p>
      </motion.div>
    </div>
  );
}