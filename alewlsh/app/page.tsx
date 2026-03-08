'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function HomeHero() {
  return (
    <section
      id="home-hero"
      style={{ backgroundColor: '#FFECFC' }}
      className="pt-44 pb-20 px-6 md:px-12 w-full"
    >
      <div className="flex flex-col md:flex-row items-center gap-20 md:gap-32 lg:gap-40">
        
        {/* Left Text */}
        <motion.div 
          className="flex-1 text-left space-y-6"
          initial={{ opacity: 0, x: -50, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.h1
            style={{ color: '#653126' }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight"
          >
            Keeping You Safe, Wherever You Go.
          </motion.h1>

          <motion.p
            style={{ color: '#653126' }}
            className="text-lg md:text-xl leading-relaxed"
          >
            We bring the highest level of safety to every step you take. 
            Come experience protection, support, and peace of mind.
          </motion.p>

          <div className="flex flex-wrap gap-4">
            <button
              style={{ 
                backgroundColor: '#9E199A', 
                color: '#FFECFC',
                borderRadius: '12px 2px 12px 2px'
              }}
              className="px-6 py-3 font-semibold hover:opacity-90"
            >
              Ask for Help
            </button>

            <button
              style={{ 
                backgroundColor: '#9E199A', 
                color: '#FFECFC',
                borderRadius: '12px 2px 12px 2px'
              }}
              className="px-6 py-3 font-semibold hover:opacity-90"
            >
              Learn More
            </button>
          </div>
        </motion.div>

        {/* Image */}
        <motion.div 
          className="flex-1 flex justify-center"
        >
          <div className="w-full max-w-md rounded-xl overflow-hidden">
            <Image
              src="/home.jpeg"
              alt="Safety illustration"
              width={500}
              height={400}
              className="w-full h-auto"
            />
          </div>
        </motion.div>

      </div>
    </section>
  );
}