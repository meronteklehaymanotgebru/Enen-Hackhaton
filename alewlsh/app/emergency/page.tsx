// app/emergency/page.tsx
"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { FaExclamationTriangle, FaPhone, FaMapMarkerAlt, FaShieldAlt, FaMicrophone, FaStop, FaPaperPlane, FaCheck } from 'react-icons/fa';
import { useState, useRef } from 'react';

export default function EmergencyPage() {
  // === UI State (Legacy) ===
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // === Functional State ===
  const [textMessage, setTextMessage] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // REMOVED: isReadyToSend — SOS now works without content
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // === Helper: Get Valid UUID + User Name ===
  const getUserInfo = () => {

  // 🎯 HARDCODED VALUES - No login required!
  return {
    userId: 'e4838f25-4d3c-4fa7-9703-68a37b06163d',
    userName: 'Meron'
  };
  };

  // === Helper: Fetch Location ===
  const fetchLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setLocation(loc);
          resolve(loc);
        },
        (err) => {
          console.error('Location error:', err);
          // Fallback: Use default location if permission denied
          resolve({ lat: -1.2921, lng: 36.8219 }); // Nairobi fallback
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // === Audio Recording (Optional) ===
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Mic error:', err);
      setError('Allow microphone access to record');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextMessage(e.target.value);
  };

  const clearInputs = () => {
    setAudioBlob(null);
    setTextMessage('');
    audioChunksRef.current = [];
  };

  // === MAIN: Send Alert (SOS Works Without Audio/Message) ===
  const handleSendAlert = async () => {
    if (isLoading || isSOSActive) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { userId, userName } = getUserInfo();
      if (!userId) throw new Error('Please log in first');

      // Always fetch location (with fallback)
      const { lat, lng } = await fetchLocation();

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('latitude', lat.toString());
      formData.append('longitude', lng.toString());
      formData.append('userName', userName); // For personalized SMS
      
      // Optional: Add message if provided
      if (textMessage.trim()) {
        formData.append('message', textMessage.trim());
      }
      
      // Optional: Add audio if recorded
      if (audioBlob && audioBlob.size > 0) {
        formData.append('audio', audioBlob, `emergency-${Date.now()}.wav`);
      }

      const response = await fetch('/api/panic', { method: 'POST', body: formData });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Failed to send alert');

      // Success: Activate visual feedback
      setIsSOSActive(true);
      clearInputs();
      
      setTimeout(() => {
        alert('✅ Alert sent! Help has been notified.');
      }, 300);

    } catch (err) {
      console.error('❌ Send Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send alert');
    } finally {
      setIsLoading(false);
    }
  };

  // === LEGACY LAYOUT: Full viewport, proper spacing ===
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-900 pt-20 md:pt-32 lg:pt-44 px-4 md:px-8 lg:px-12 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 py-8 lg:py-16 text-white">
      
      {/* Left Side - Emergency Info (Legacy Styling) */}
      <motion.div 
        className="w-full lg:w-1/2 max-w-md text-center lg:text-left flex flex-col items-center lg:items-start"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Animated Warning Icon (Legacy) */}
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="inline-block mb-6 md:mb-8 p-5 md:p-6 bg-red-600/30 rounded-2xl border border-red-500/50 backdrop-blur-sm"
        >
          <FaExclamationTriangle className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 text-red-400 drop-shadow-2xl mx-auto lg:mx-0" />
        </motion.div>

        {/* Headings (Legacy Sizes) */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 md:mb-6 leading-tight drop-shadow-2xl"
            style={{ textShadow: '0 0 20px rgba(239,68,68,0.8)' }}
        >
          EMERGENCY ALERT
        </h1>
        
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-red-400 mb-6 md:mb-8 leading-tight drop-shadow-xl">
          Youre Not Alone
        </h2>

        <p className="text-lg md:text-xl text-gray-200 mb-8 md:mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0 drop-shadow-md">
          Tap the SOS button to send an alert instantly. Add a voice note or message for more context (optional).
        </p>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-3 bg-red-600/90 rounded-lg text-center text-sm font-medium border border-red-400 w-full max-w-md"
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions (Legacy Styling) */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6 md:mb-8 w-full">
          <motion.button
            className="flex-1 max-w-xs px-5 md:px-6 py-3 bg-red-600/90 text-white rounded-[12px_0_0_12px] font-semibold text-lg hover:bg-red-500/90 transition-all duration-200 flex items-center justify-center gap-3 backdrop-blur-sm border border-red-500/50"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.href = 'tel:911'}
          >
            <FaPhone className="w-5 h-5" />
            Call Now
          </motion.button>
          
          <motion.button
            className="flex-1 max-w-xs px-5 md:px-6 py-3 bg-gray-800/90 text-white rounded-[12px_0_0_12px] font-semibold text-lg hover:bg-gray-700/90 transition-all duration-200 flex items-center justify-center gap-3 backdrop-blur-sm border border-gray-600/50"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => location && window.open(`https://maps.google.com/?q=${location.lat},${location.lng}`, '_blank')}
          >
            <FaMapMarkerAlt className="w-5 h-5" />
            Safe Location
          </motion.button>
        </div>

        {/* Optional: Voice + Message Section (Still Available) */}
        <motion.div 
          className="flex flex-col items-center lg:items-start gap-4 w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {/* Voice Recording (Optional) */}
          <div className="flex flex-col items-center lg:items-start gap-3 w-full">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-lg">
              {isRecording ? (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                  Recording...
                </>
              ) : (
                'Add Voice Note (Optional)'
              )}
            </div>
            
            <motion.button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isSOSActive}
              className={`p-4 rounded-full border-4 font-bold text-xl transition-all duration-200 flex items-center gap-3 ${
                isRecording 
                  ? 'bg-red-600/90 border-red-500/80 text-white shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:bg-red-500/90' 
                  : 'bg-gray-800/90 border-gray-600/50 text-white hover:bg-gray-700/90 shadow-lg'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              whileHover={{ scale: isLoading || isSOSActive ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isRecording ? (
                <FaStop className="w-6 h-6" />
              ) : (
                <FaMicrophone className="w-6 h-6" />
              )}
              {isRecording ? 'Stop' : 'Record'}
            </motion.button>
            
            {audioBlob && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 w-full max-w-xs"
              >
                <audio controls className="w-full">
                  <source src={URL.createObjectURL(audioBlob)} type="audio/wav" />
                </audio>
                <button 
                  onClick={() => setAudioBlob(null)}
                  className="text-red-400 hover:text-red-300 text-lg font-bold"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </div>

          {/* Text Message (Optional) */}
          <div className="w-full max-w-md">
            <label className="block text-lg text-gray-300 mb-2 font-medium flex items-center gap-2">
              <FaPaperPlane className="text-blue-400" />
              Add Message (Optional):
            </label>
            <textarea
              value={textMessage}
              onChange={handleTextChange}
              placeholder="E.g., I'm at the main entrance, wearing red..."
              disabled={isLoading || isSOSActive}
              className="w-full p-4 bg-gray-900/60 border border-gray-600 rounded-xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              rows={3}
              maxLength={280}
            />
            <p className="text-sm text-gray-500 text-right mt-1">{textMessage.length}/280</p>
          </div>

          {/* Optional Send Button (For Those Who Prefer It) */}
          {(textMessage.trim() || audioBlob) && !isSOSActive && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleSendAlert}
              disabled={isLoading}
              className="w-full max-w-xs py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl font-semibold text-base flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
              ) : (
                <><FaPaperPlane className="w-4 h-4" /> Send with Details</>
              )}
            </motion.button>
          )}

          {/* Helper Text */}
          <p className="text-sm text-gray-400 text-center">
            💡 SOS button works instantly — add details to help responders
          </p>
        </motion.div>
      </motion.div>

      {/* Right Side - DANGER TEXT + ALWAYS-ACTIVE CIRCULAR SOS */}
      <motion.div 
        className="w-full lg:w-1/2 flex flex-col items-center text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        {/* "ARE YOU IN DANGER?" TEXT (Legacy Styling) */}
        <motion.div 
          className="mb-10 md:mb-16 lg:mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 
            className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-white mb-4 md:mb-6 leading-tight drop-shadow-2xl"
            style={{ 
              textShadow: '0 0 40px rgba(239,68,68,0.9), 0 0 80px rgba(239,68,68,0.6)',
              background: 'linear-gradient(135deg, #fff 0%, #fecaca 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            ARE YOU
          </h1>
          <h2 
            className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-red-400 drop-shadow-2xl"
            style={{ textShadow: '0 0 30px rgba(255,255,255,0.9)' }}
          >
            In Danger?
          </h2>
        </motion.div>

        {/* ALWAYS-ACTIVE CIRCULAR SOS BUTTON */}
        <motion.div className="w-full max-w-lg flex justify-center">
          <motion.button
            onClick={handleSendAlert}
            disabled={isLoading || isSOSActive}
            whileHover={{ scale: isLoading || isSOSActive ? 1 : 1.05 }}
            whileTap={{ scale: isLoading || isSOSActive ? 1 : 0.95 }}
            animate={{
              background: isSOSActive
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : isLoading
                  ? "linear-gradient(135deg, #4b5563 0%, #374151 100%)"
                  : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
              boxShadow: isSOSActive
                ? "0 25px 50px rgba(16,185,129,0.6), 0 0 0 4px rgba(16,185,129,0.5)"
                : "0 25px 50px rgba(220,38,38,0.6), 0 0 0 4px rgba(220,38,38,0.5)"
            }}
            transition={{ duration: 0.4 }}
            className={`relative w-72 h-72 md:w-[400px] md:h-[400px] lg:w-[450px] lg:h-[450px] rounded-full border-4 border-red-500/60 shadow-2xl overflow-hidden group backdrop-blur-sm flex items-center justify-center ${
              isLoading || isSOSActive ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-110'
            } ${isSOSActive ? 'border-green-400' : 'border-red-400'}`}
          >
            {/* GLOWING RING - Always visible when not active */}
            {!isSOSActive && !isLoading && (
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/40 to-red-600/40 -m-4 animate-ping border border-red-400/30"
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.3, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30 rounded-full">
                <div className="w-14 h-14 md:w-20 md:h-20 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Icon / Text (Legacy Visuals) */}
            <motion.div
              className="text-center z-10 flex flex-col items-center"
              style={{ 
                textShadow: isSOSActive 
                  ? '0 0 40px rgba(16,185,129,1)'
                  : '0 0 50px rgba(220,38,38,1)'
              }}
            >
              {isSOSActive ? (
                <>
                  <FaCheck className="w-16 h-16 md:w-24 md:h-24 lg:w-28 lg:h-28 text-white drop-shadow-2xl mb-2" />
                  <span className="text-white font-black text-xl md:text-2xl lg:text-3xl">ALERT SENT</span>
                </>
              ) : isLoading ? (
                <span className="text-white font-black text-lg md:text-xl lg:text-2xl">SENDING...</span>
              ) : (
                <>
                  <FaExclamationTriangle className="w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 text-white drop-shadow-2xl mb-2" />
                  <span className="text-white font-black text-3xl md:text-4xl lg:text-5xl">SOS</span>
                </>
              )}
            </motion.div>

            {/* Success Overlay (Legacy) */}
            {isSOSActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.25, scale: 1 }}
                className="absolute inset-0 bg-green-500/30 backdrop-blur-sm flex items-center justify-center rounded-full border-2 border-green-400/50"
              >
                <FaShieldAlt className="w-20 h-20 md:w-28 md:h-28 text-green-200 drop-shadow-2xl" />
              </motion.div>
            )}
          </motion.button>
        </motion.div>

        {/* Location Status */}
        {location && !isSOSActive && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-sm md:text-base text-green-400 flex items-center gap-2 drop-shadow-md"
          >
            <FaMapMarkerAlt className="w-4 h-4" /> 
            Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </motion.p>
        )}

        {/* Status Text - Updated */}
        <motion.p 
          className="mt-4 md:mt-6 text-sm md:text-base text-gray-300 text-center max-w-md drop-shadow-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {isSOSActive 
            ? "✅ Help has been notified. Stay safe and keep your phone nearby." 
            : "Tap SOS to send alert instantly — your contacts will receive your location"}
        </motion.p>
      </motion.div>
    </div>
  );
}