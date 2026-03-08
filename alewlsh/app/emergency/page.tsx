// app/emergency/page.tsx
"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { FaExclamationTriangle, FaPhone, FaMapMarkerAlt, FaShieldAlt, FaMicrophone, FaStop, FaPaperPlane, FaCheck } from 'react-icons/fa';
import { useState, useRef, useEffect } from 'react';
import { AutoIntervalRecorder } from '@/utils/audioRecorder';
import { useLanguage } from '@/contexts/LanguageContext';

export default function EmergencyPage() {
  const { t } = useLanguage(); // ✅ Add translation hook
  
  // === UI State ===
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // === Functional State ===
  const [textMessage, setTextMessage] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // === Recording State ===
  const [recorder, setRecorder] = useState<AutoIntervalRecorder | null>(null);
  const [currentAlertId, setCurrentAlertId] = useState<string | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'stopped'>('idle');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // === Ambient Effects ===
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  // === Cleanup on unmount ===
  useEffect(() => {
    return () => {
      if (recorder?.isRunning()) {
        recorder.stop();
      }
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop());
      }
    };
  }, [recorder]);

  // === Helper: Get User Info (Hardcoded for Demo) ===
  const getUserInfo = () => {
    return {
      userId: 'e4838f25-4d3c-4fa7-9703-68a37b06163d',
      userName: 'Meron'
    };
  };

  // === Helper: Fetch Location ===
  const fetchLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error(t('emergency.geolocation_not_supported') || 'Geolocation not supported'));
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
          resolve({ lat: -1.2921, lng: 36.8219 }); // Fallback
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // === Audio Recording (Optional One-Time) ===
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
      setError(t('emergency.mic_error') || 'Allow microphone access to record');
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

  // === Resolve Alert Handler ===
  const handleResolveAlert = async () => {
    if (!currentAlertId) return;
    
    try {
      const { userId } = getUserInfo();
      
      const response = await fetch(`/api/alerts/${currentAlertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, resolvedBy: 'user' })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        if (recorder?.isRunning()) {
          recorder.stop();
          setRecorder(null);
        }
        
        setIsSOSActive(false);
        setCurrentAlertId(null);
        setRecordingStatus('stopped');
        
        alert(t('emergency.alert_resolved') || '✅ Alert resolved. Thank you for staying safe.');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Resolve error:', error);
      alert(t('emergency.resolve_failed') || 'Failed to resolve alert. Please try again.');
    }
  };

  // === MAIN: Send Alert + Start Interval Recording ===
  const handleSendAlert = async () => {
    if (isLoading || isSOSActive) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { userId, userName } = getUserInfo();
      if (!userId) throw new Error(t('validation.login_required') || 'Please log in first');

      const { lat, lng } = await fetchLocation();

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('latitude', lat.toString());
      formData.append('longitude', lng.toString());
      formData.append('userName', userName);
      
      if (textMessage.trim()) {
        formData.append('message', textMessage.trim());
      }
      
      if (audioBlob && audioBlob.size > 0) {
        formData.append('audio', audioBlob, `emergency-${Date.now()}.wav`);
      }

      const response = await fetch('/api/panic', { method: 'POST', body: formData });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || t('emergency.send_failed') || 'Failed to send alert');

      if (result.recordingActive && result.alertId) {
        setCurrentAlertId(result.alertId);
        setRecordingStatus('recording');
        
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          const intervalRecorder = new AutoIntervalRecorder(
            {
              intervalSeconds: 15,
              maxDurationMinutes: 30,
              onClipSaved: (idx, path) => {
                console.log(`✅ Clip ${idx} saved: ${path}`);
              },
              onError: (err) => {
                console.error('❌ Recording error:', err);
              },
              onStopped: () => {
                console.log('🎙️ Interval recording stopped');
                setRecordingStatus('stopped');
              }
            },
            userId,
            result.alertId
          );
          
          await intervalRecorder.start(stream);
          setRecorder(intervalRecorder);
          
        } catch (micError) {
          console.warn('Microphone access denied for interval recording:', micError);
        }
      }

      setIsSOSActive(true);
      clearInputs();
      
      setTimeout(() => {
        alert(t('emergency.alert_sent_recording') || '✅ Alert sent! Help notified. Recording continues until resolved.');
      }, 300);

    } catch (err) {
      console.error('❌ Send Error:', err);
      setError(err instanceof Error ? err.message : t('emergency.send_failed') || 'Failed to send alert');
      
      if (recorder?.isRunning()) {
        recorder.stop();
        setRecorder(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-900 pt-20 md:pt-32 lg:pt-44 px-4 md:px-8 lg:px-12 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 py-8 lg:py-16 text-white">
      
      {/* === LEFT SIDE === */}
      <motion.div 
        className="w-full lg:w-1/2 max-w-md flex flex-col items-center lg:items-start"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Header: Icon + Title Side-by-Side */}
        <motion.div 
          className="flex items-center gap-4 mb-6 md:mb-8 w-full"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div 
            animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="p-4 md:p-5 bg-red-600/30 rounded-2xl border border-red-500/50 backdrop-blur-sm flex-shrink-0"
          >
            <FaExclamationTriangle className="w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 text-red-400 drop-shadow-2xl" />
          </motion.div>

          <div className="text-left">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow-2xl"
                style={{ textShadow: '0 0 20px rgba(239,68,68,0.8)' }}
            >
              {t('emergency.page_title')}
            </h1>
            <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-red-400 mt-1 drop-shadow-xl">
              {t('emergency.page_subtitle')}
            </h2>
          </div>
        </motion.div>

        {/* Description */}
        <p className="text-lg md:text-xl text-gray-200 mb-8 md:mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0 drop-shadow-md">
          {t('emergency.description')}
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

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6 md:mb-8 w-full">
          <motion.button
            className="flex-1 max-w-xs px-5 md:px-6 py-3 bg-red-600/90 text-white rounded-[12px_0_0_12px] font-semibold text-lg hover:bg-red-500/90 transition-all duration-200 flex items-center justify-center gap-3 backdrop-blur-sm border border-red-500/50"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.href = 'tel:911'}
          >
            <FaPhone className="w-5 h-5" />
            {t('emergency.call_button')}
          </motion.button>
          
          <motion.button
            className="flex-1 max-w-xs px-5 md:px-6 py-3 bg-gray-800/90 text-white rounded-[12px_0_0_12px] font-semibold text-lg hover:bg-gray-700/90 transition-all duration-200 flex items-center justify-center gap-3 backdrop-blur-sm border border-gray-600/50"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => location && window.open(`https://maps.google.com/?q=${location.lat},${location.lng}`, '_blank')}
          >
            <FaMapMarkerAlt className="w-5 h-5" />
            {t('emergency.location_button')}
          </motion.button>
        </div>

        {/* Voice + Message Section */}
        <motion.div 
          className="flex flex-col items-center lg:items-start gap-4 w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {/* Voice Recording */}
          <div className="flex flex-col items-center lg:items-start gap-3 w-full">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-lg">
              {isRecording ? (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                  {t('emergency.recording')}
                </>
              ) : (
                t('emergency.voice_title')
              )}
            </div>
            
            <motion.button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isSOSActive || recordingStatus === 'recording'}
              className={`p-4 rounded-full border-4 font-bold text-xl transition-all duration-200 flex items-center gap-3 ${
                isRecording 
                  ? 'bg-red-600/90 border-red-500/80 text-white shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:bg-red-500/90' 
                  : 'bg-gray-800/90 border-gray-600/50 text-white hover:bg-gray-700/90 shadow-lg'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              whileHover={{ scale: isLoading || isSOSActive || recordingStatus === 'recording' ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isRecording ? (
                <FaStop className="w-6 h-6" />
              ) : (
                <FaMicrophone className="w-6 h-6" />
              )}
              {isRecording ? t('emergency.stop') : t('emergency.record')}
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
                  aria-label={t('emergency.remove_audio') || 'Remove audio'}
                >
                  ✕
                </button>
              </motion.div>
            )}
          </div>

          {/* Text Message */}
          <div className="w-full max-w-md">
            <label className="block text-lg text-gray-300 mb-2 font-medium flex items-center gap-2">
              <FaPaperPlane className="text-blue-400" />
              {t('emergency.message_label')}
            </label>
            <textarea
              value={textMessage}
              onChange={handleTextChange}
              placeholder={t('emergency.message_placeholder')}
              disabled={isLoading || isSOSActive || recordingStatus === 'recording'}
              className="w-full p-4 bg-gray-900/60 border border-gray-600 rounded-xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              rows={3}
              maxLength={280}
            />
            <p className="text-sm text-gray-500 text-right mt-1">{textMessage.length}{t('emergency.char_count')}</p>
          </div>

          {/* Optional Send Button */}
          {(textMessage.trim() || audioBlob) && !isSOSActive && recordingStatus !== 'recording' && (
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
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t('emergency.sending')}</>
              ) : (
                <><FaPaperPlane className="w-4 h-4" /> {t('emergency.send_with_details')}</>
              )}
            </motion.button>
          )}

          {/* Recording Status Indicator */}
          {recordingStatus === 'recording' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xs py-2 px-4 bg-red-500/20 border border-red-500/40 rounded-lg text-center"
            >
              <div className="flex items-center justify-center gap-2 text-red-300 text-sm">
                <motion.div 
                  className="w-2 h-2 bg-red-500 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                {t('emergency.recording_indicator')}
              </div>
            </motion.div>
          )}

          {/* Helper Text */}
          <p className="text-sm text-gray-400 text-center">
            {t('emergency.sos_instruction')}
          </p>
        </motion.div>
      </motion.div>

      {/* === RIGHT SIDE === */}
      <motion.div 
        className="w-full lg:w-1/2 flex flex-col items-center text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        {/* "ARE YOU IN DANGER?" */}
        <motion.div 
          className="mb-6 md:mb-10 lg:mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 
            className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white mb-3 md:mb-4 leading-tight drop-shadow-2xl"
            style={{ 
              textShadow: '0 0 40px rgba(239,68,68,0.9), 0 0 80px rgba(239,68,68,0.6)',
              background: 'linear-gradient(135deg, #fff 0%, #fecaca 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {t('emergency.sos_prompt_1')}
          </h1>
          <h2 
            className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-red-400 drop-shadow-2xl"
            style={{ textShadow: '0 0 30px rgba(255,255,255,0.9)' }}
          >
            {t('emergency.sos_prompt_2')}
          </h2>
        </motion.div>

        {/* SOS BUTTON */}
        <motion.div className="w-full max-w-lg flex justify-center">
          <motion.button
            onClick={handleSendAlert}
            disabled={isLoading || isSOSActive || recordingStatus === 'recording'}
            whileHover={{ scale: isLoading || isSOSActive || recordingStatus === 'recording' ? 1 : 1.05 }}
            whileTap={{ scale: isLoading || isSOSActive || recordingStatus === 'recording' ? 1 : 0.95 }}
            animate={{
              background: isSOSActive
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : isLoading || recordingStatus === 'recording'
                  ? "linear-gradient(135deg, #4b5563 0%, #374151 100%)"
                  : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
              boxShadow: isSOSActive
                ? "0 25px 50px rgba(16,185,129,0.6), 0 0 0 4px rgba(16,185,129,0.5)"
                : "0 25px 50px rgba(220,38,38,0.6), 0 0 0 4px rgba(220,38,38,0.5)"
            }}
            transition={{ duration: 0.4 }}
            className={`relative w-72 h-72 md:w-[400px] md:h-[400px] lg:w-[450px] lg:h-[450px] rounded-full border-4 border-red-500/60 shadow-2xl overflow-hidden group backdrop-blur-sm flex items-center justify-center ${
              isLoading || isSOSActive || recordingStatus === 'recording' ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-110'
            } ${isSOSActive ? 'border-green-400' : 'border-red-400'}`}
          >
            {/* GLOWING RING */}
            {!isSOSActive && !isLoading && recordingStatus !== 'recording' && (
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/40 to-red-600/40 -m-4 animate-ping border border-red-400/30"
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.3, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            {/* Loading/Recording Overlay */}
            {(isLoading || recordingStatus === 'recording') && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30 rounded-full">
                <div className="w-14 h-14 md:w-20 md:h-20 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Icon / Text */}
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
                  <span className="text-white font-black text-xl md:text-2xl lg:text-3xl">{t('emergency.alert_sent')}</span>
                </>
              ) : isLoading || recordingStatus === 'recording' ? (
                <span className="text-white font-black text-lg md:text-xl lg:text-2xl">
                  {recordingStatus === 'recording' ? t('emergency.recording_status') : t('emergency.sending_status')}
                </span>
              ) : (
                <>
                  <FaExclamationTriangle className="w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 text-white drop-shadow-2xl mb-2" />
                  <span className="text-white font-black text-3xl md:text-4xl lg:text-5xl">{t('emergency.sos_button')}</span>
                </>
              )}
            </motion.div>

            {/* Success Overlay */}
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
            className="mt-4 md:mt-6 text-sm md:text-base text-green-400 flex items-center gap-2 drop-shadow-md"
          >
            <FaMapMarkerAlt className="w-4 h-4" /> 
            {t('emergency.location_status')} {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </motion.p>
        )}

        {/* Status Text */}
        <motion.p 
          className="mt-3 md:mt-4 text-sm md:text-base text-gray-300 text-center max-w-md drop-shadow-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {isSOSActive 
            ? recordingStatus === 'recording'
              ? t('emergency.status_recording')
              : t('emergency.help_notified')
            : t('emergency.sos_instruction_alt')}
        </motion.p>
      </motion.div>
    </div>
  );
}