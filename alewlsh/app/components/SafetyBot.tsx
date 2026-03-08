// components/SafetyBot.tsx
"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { FaRobot, FaTimes, FaPaperPlane, FaLightbulb } from 'react-icons/fa';
import { RiWomenLine } from 'react-icons/ri'; // Feminine bot icon

interface SafetyBotProps {
  location?: { lat: number; lng: number };
  isPremium: boolean;
}

export default function SafetyBot({ location, isPremium }: SafetyBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{role: 'user' | 'bot', content: string}>>([
    {
      role: 'bot',
      content: "Hi love 💜 I'm here to help you stay safe. What's on your mind?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const examplePrompts = [
    "Is it safe to walk alone at night in Bole?",
    "What should I do if I feel followed?",
    "How can I share my location with family?",
    "What's the safest route to [location]?",
  ];

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      // Call your AI endpoint (create this next)
      const response = await fetch('/api/safety/bot-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          location: location,
          isPremium: isPremium
        })
      });
      
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'bot', content: data.reply }]);
      
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: "I'm having trouble connecting right now. Please try again, or use the SOS button if you're in immediate danger. 💜" 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Bot Icon */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-2xl border-2 border-pink-300/50 hover:scale-105 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <RiWomenLine className="w-7 h-7" />
      </motion.button>

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 right-6 z-50 w-80 md:w-96 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-pink-500/30 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-pink-500/20">
              <div className="flex items-center gap-2">
                <RiWomenLine className="w-6 h-6 text-pink-400" />
                <span className="font-bold text-white">Safety Sister</span>
                {!isPremium && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">Premium</span>
                )}
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="h-64 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-pink-600 text-white rounded-br-none' 
                      : 'bg-gray-800 text-gray-200 rounded-bl-none'
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 text-gray-400 px-4 py-3 rounded-2xl rounded-bl-none text-sm">
                    Thinking... 💭
                  </div>
                </div>
              )}
            </div>

            {/* Example Prompts */}
            {!loading && messages.length <= 2 && (
              <div className="px-4 pb-2">
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                  <FaLightbulb className="w-3 h-3" />
                  <span>Try asking:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {examplePrompts.slice(0, 3).map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prompt)}
                      className="text-xs bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 px-3 py-1.5 rounded-full border border-gray-600 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-pink-500/20 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about safety..."
                className="flex-1 bg-gray-800 text-white text-sm px-4 py-2 rounded-xl border border-gray-600 focus:outline-none focus:border-pink-500"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="p-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-xl transition-colors"
              >
                <FaPaperPlane className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}