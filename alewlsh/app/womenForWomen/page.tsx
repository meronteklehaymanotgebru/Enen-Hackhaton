// app/helpers/active-alerts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMapMarkerAlt, FaMicrophone, FaComment, FaCheck, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import Link from 'next/link';

// Type definitions
interface ActiveAlert {
  id: string;
  userId: string;
  nickname: string;
  latitude: number;
  longitude: number;
  message: string | null;
  hasAudio: boolean;
  audioUrl: string | null;
  status: string;
  createdAt: string;
  recordingActive: boolean;
}

export default function ActiveAlertsPage() {
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Helper ID (replace with real auth logic)
  const HELPER_ID = 'e4838f25-4d3c-4fa7-9703-68a37b06163d'; // Demo user ID

  // Fetch active alerts on mount + poll every 30 seconds
  useEffect(() => {
    fetchActiveAlerts();
    const interval = setInterval(fetchActiveAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/panic/active');
      const data = await response.json();
      
      if (response.ok) {
        setAlerts(data.alerts || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch alerts');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAlert = async (alertId: string) => {
    try {
      setAcceptingId(alertId);
      
      const response = await fetch('/api/panic/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panicId: alertId, helperId: HELPER_ID })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Remove accepted alert from list
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
        alert('✅ You accepted this alert. Help is on the way!');
      } else {
        alert(result.error || 'Failed to accept alert');
      }
    } catch (err) {
      console.error('Accept error:', err);
      alert('Network error. Please try again.');
    } finally {
      setAcceptingId(null);
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading active alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 pt-20 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
            Active Emergency Alerts
          </h1>
          <p className="text-gray-400">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''} needing help right now
          </p>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div 
            className="mb-6 p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            ⚠️ {error}
            <button 
              onClick={fetchActiveAlerts}
              className="ml-2 underline hover:text-red-100"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Alerts List */}
        <div className="space-y-4">
          <AnimatePresence>
            {alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 hover:border-pink-500/40 transition-all"
              >
                {/* Alert Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <FaExclamationTriangle className="text-red-400" />
                      {alert.nickname}
                      {alert.recordingActive && (
                        <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full animate-pulse">
                          Recording
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                      <FaClock className="w-3 h-3" />
                      {formatTimeAgo(alert.createdAt)}
                    </p>
                  </div>
                  
                  {/* Audio/Message Indicators */}
                  <div className="flex items-center gap-2">
                    {alert.hasAudio && (
                      <span className="flex items-center gap-1 text-xs text-pink-300 bg-pink-500/20 px-2 py-1 rounded-lg">
                        <FaMicrophone className="w-3 h-3" />
                        Audio
                      </span>
                    )}
                    {alert.message && (
                      <span className="flex items-center gap-1 text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded-lg">
                        <FaComment className="w-3 h-3" />
                        Message
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Preview */}
                {alert.message && (
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                    &quot;{alert.message}&quot;
                  </p>
                )}

                {/* Location + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Location Link */}
                  <Link
                    href={`https://maps.google.com/?q=${alert.latitude},${alert.longitude}`}
                    target="_blank"
                    className="flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200 transition-colors"
                  >
                    <FaMapMarkerAlt className="w-4 h-4" />
                    View Location
                  </Link>

                  {/* Accept Button */}
                  <motion.button
                    onClick={() => handleAcceptAlert(alert.id)}
                    disabled={acceptingId === alert.id}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                    whileHover={{ scale: acceptingId === alert.id ? 1 : 1.02 }}
                    whileTap={{ scale: acceptingId === alert.id ? 1 : 0.98 }}
                  >
                    {acceptingId === alert.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <FaCheck className="w-4 h-4" />
                        Accept Alert
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {alerts.length === 0 && !loading && !error && (
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaCheck className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">All Clear!</h3>
            <p className="text-gray-400">No active emergency alerts at the moment.</p>
            <p className="text-gray-500 text-sm mt-2">Check back soon or become a helper to get notified instantly.</p>
          </motion.div>
        )}

        {/* Refresh Button */}
        <div className="text-center mt-8">
          <motion.button
            onClick={fetchActiveAlerts}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all border border-white/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            🔄 Refresh Alerts
          </motion.button>
        </div>
      </div>
    </div>
  );
}