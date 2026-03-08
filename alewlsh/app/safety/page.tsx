// app/safe-path/page.tsx
"use client";
export const dynamic = 'force-dynamic'
import { useRef } from 'react'; 
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, ReactNode } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L, { LatLngExpression, LeafletMouseEvent, DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaShieldAlt, FaExclamationTriangle, FaRoute, FaMapMarkerAlt, FaRedo, FaTimes, FaPaperPlane, FaLightbulb } from 'react-icons/fa';
import { RiWomenLine } from 'react-icons/ri';
import { useUserStore } from '@/utils/userStore';
import { getSafeRoute, RouteSegment } from '@/services/routing';

// Fix Leaflet default marker icons (type-safe)
const defaultIcon = L.Icon.Default.prototype as { _getIconUrl?: () => string | null };
delete defaultIcon._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// === Types ===
interface RiskData {
  risk: number;
  color: 'green' | 'orange' | 'red';
  nearestZone?: string;
  aiMultiplier?: number;
  aiReason?: string;
  aiConfidence?: number;
  aiSafetyTip?: string;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  risk: number;
}

interface PathPoint {
  lat: number;
  lng: number;
  label?: string;
  risk?: RiskData;
}

interface KnownZone {
  pos: [number, number];
  name: string;
  risk: number;
  type: 'safe' | 'caution' | 'danger';
}

interface CircleMarkerProps {
  center: LatLngExpression;
  radius: number;
  color: string;
  fillColor: string;
  fillOpacity: number;
  weight: number;
  children?: ReactNode;
}

// === Helper: Calculate Risk Color ===
const getRiskColor = (risk: number): string => {
  if (risk >= 4) return 'bg-red-500';
  if (risk >= 2) return 'bg-orange-500';
  return 'bg-green-500';
};

const getRiskTextColor = (risk: number): string => {
  if (risk >= 4) return 'text-red-400';
  if (risk >= 2) return 'text-orange-400';
  return 'text-green-400';
};

// === Helper: Haversine Distance (km) ===
const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// === Component: Map Click Handler (FIXED) ===
interface LocationSelectorProps {
  onLocationSelect: (lat: number, lng: number, type: 'start' | 'end') => void;
  selectionMode: 'start' | 'end' | null;
}

const LocationSelector = ({ 
  onLocationSelect, 
  selectionMode 
}: LocationSelectorProps): null => {
  
  useMapEvents({
    click: (e: LeafletMouseEvent) => {
      if (!selectionMode) return;
      
      // Small delay to ensure state sync
      setTimeout(() => {
        onLocationSelect(e.latlng.lat, e.latlng.lng, selectionMode);
      }, 50);
      
      return null;
    }
  });

  return null;
};

// === Component: Fit Map to Markers ===
interface FitMapToBoundsProps {
  points: PathPoint[];
}

const FitMapToBounds = ({ points }: FitMapToBoundsProps): null => {
  const map = useMap();
  
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng] as LatLngExpression));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  
  return null;
};

// === Component: Type-Safe Circle Marker for Heatmap ===
const CircleMarker = ({ 
  center, 
  radius, 
  color, 
  fillColor, 
  fillOpacity, 
  weight,
  children 
}: CircleMarkerProps) => {
  const customIcon: DivIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: ${fillColor};
      width: ${radius * 2}px;
      height: ${radius * 2}px;
      border-radius: 50%;
      border: ${weight}px solid ${color};
      opacity: ${fillOpacity};
      pointer-events: all;
    "></div>`,
    iconSize: [radius * 2, radius * 2],
    iconAnchor: [radius, radius]
  });

  return (
    <Marker position={center} icon={customIcon}>
      {children}
    </Marker>
  );
};
// === Component: Safety Sister Bot Chat (Enhanced) ===
// === Component: Safety Sister Bot Chat (Properly Positioned) ===
interface SafetyBotProps {
  location?: { lat: number; lng: number };
  isPremium: boolean;
}

const SafetyBot = ({ location, isPremium }: SafetyBotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [messages, setMessages] = useState<Array<{role: 'user' | 'bot', content: string}>>([
    { 
      role: 'bot', 
      content: isPremium 
        ? "Hi love 💜 I'm Safety Sister, your AI companion. I'm always here to help you stay safe. What's on your mind?" 
        : "Hi love 💜 I'm Safety Sister. Upgrade to Premium for personalized, AI-powered safety advice. For now, I'm here to listen. What's on your mind?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Context-aware suggested prompts for Safe Path page
  const examplePrompts = [
    "Is this route safe right now?",
    "What's the risk level at my location?",
    "How is risk score calculated?",
    "Should I avoid this area?",
    "What if I feel followed?",
    "Can you suggest a safer alternative?",
  ];

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Tooltip visibility logic
  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false);
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    } else {
      setShowTooltip(true);
      tooltipTimeoutRef.current = setTimeout(() => setShowTooltip(false), 10000);
    }
    return () => { if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current); };
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);
    setShowTooltip(false);

    try {
      const response = await fetch('/api/safety/bot-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, location, isPremium })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'bot', content: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: "I'm having trouble connecting right now 💜 If you're in immediate danger, please use the SOS button. I'm always here for you when you need me. ✨" 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* === BOT ICON WITH TOOLTIP (Bottom-Right Corner) === */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
        
        {/* ✅ Tooltip: "Safety Sister always here for you 💜" */}
        <AnimatePresence>
          {showTooltip && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mb-3 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-medium rounded-2xl shadow-xl whitespace-nowrap pointer-events-auto border border-pink-400/40"
              style={{ 
                boxShadow: '0 8px 32px rgba(139, 20, 135, 0.4)',
                minWidth: '200px',
                maxWidth: '240px'
              }}
            >
              Safety Sister always here for you 💜
              
              {/* ✅ Arrow pointing DOWN to bot icon */}
              <div 
                className="absolute bottom-[-8px] right-5 w-4 h-4 bg-gradient-to-br from-pink-600 to-purple-600 rotate-45 border-r border-b border-pink-400/40"
                style={{ 
                  boxShadow: '4px 4px 12px rgba(0,0,0,0.2)',
                  borderBottomRightRadius: '4px'
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ✅ Bot Icon Button (pointer-events: auto so it's clickable) */}
        <motion.button
          onClick={() => {
            setIsOpen(true);
            setShowTooltip(false);
          }}
          className="pointer-events-auto w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-2xl border-2 border-pink-300/60 hover:scale-110 active:scale-95 transition-transform"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Open Safety Sister chat"
        >
          <RiWomenLine className="w-7 h-7 drop-shadow-lg" />
        </motion.button>
      </div>

      {/* === CHAT MODAL (Opens Above Bot) === */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-50 w-80 md:w-96 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-pink-500/40 shadow-2xl overflow-hidden flex flex-col"
            style={{ 
              maxHeight: '70vh',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(236, 72, 153, 0.2)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-pink-500/30 flex-shrink-0 bg-gradient-to-r from-pink-600/10 to-purple-600/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                  <RiWomenLine className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-white">Safety Sister</span>
                {!isPremium && (
                  <span className="text-[10px] bg-yellow-500/25 text-yellow-200 px-2 py-0.5 rounded-full border border-yellow-500/40">Premium</span>
                )}
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                aria-label="Close chat"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/20">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-br-none shadow-lg' 
                      : 'bg-gray-800/80 text-gray-100 rounded-bl-none border border-gray-700/50'
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              
              {/* Animated Typing Indicator */}
              {loading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-800/80 text-gray-400 px-4 py-3 rounded-2xl rounded-bl-none text-sm flex items-center gap-1.5 border border-gray-700/50">
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <motion.div 
                        key={i}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Example Prompts */}
            {!loading && messages.length <= 2 && (
              <div className="px-4 pb-3 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2.5">
                  <FaLightbulb className="w-3 h-3 text-yellow-400" />
                  <span>Ask about your route:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {examplePrompts.slice(0, 4).map((prompt, i) => (
                    <motion.button
                      key={i}
                      onClick={() => {
                        setInput(prompt);
                        setShowTooltip(false);
                      }}
                      className="text-[11px] bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 text-pink-200 px-3 py-1.5 rounded-full border border-pink-500/40 transition-all hover:scale-105 active:scale-95"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 border-t border-pink-500/30 flex gap-2.5 flex-shrink-0 bg-black/30">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about safety..."
                className="flex-1 bg-gray-800/80 text-white text-sm px-4 py-2.5 rounded-xl border border-gray-700/60 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/30 transition-all placeholder-gray-500"
                disabled={loading}
              />
              <motion.button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="p-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 disabled:hover:from-pink-600 disabled:hover:to-purple-600 text-white rounded-xl transition-all shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Send message"
              >
                <FaPaperPlane className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
// === Main Component ===
export default function SafePathPage() {
  const { user } = useUserStore();

  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [startPoint, setStartPoint] = useState<PathPoint | null>(null);
  const [endPoint, setEndPoint] = useState<PathPoint | null>(null);
  const [safePath, setSafePath] = useState<PathPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pathLoading, setPathLoading] = useState<boolean>(false);
  const [selectionMode, setSelectionMode] = useState<'start' | 'end' | null>(null);
  const [startRisk, setStartRisk] = useState<RiskData | null>(null);
  const [endRisk, setEndRisk] = useState<RiskData | null>(null);

  const DEFAULT_CENTER: [number, number] = [9.03, 38.74];

  const knownZones: KnownZone[] = [
    { pos: [9.017, 38.825], name: 'Megenagna', risk: 4, type: 'danger' },
    { pos: [9.032, 38.746], name: 'Piassa', risk: 3, type: 'caution' },
    { pos: [8.997, 38.794], name: 'Bole', risk: 2, type: 'safe' },
    { pos: [9.027, 38.752], name: 'Mexico', risk: 5, type: 'danger' },
    { pos: [9.005, 38.763], name: 'Kazanchis', risk: 1, type: 'safe' },
  ];

  // Fetch Heatmap Data on Mount
  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const res = await fetch('/api/safety/heat-map');
        const data: { heatmap?: HeatmapPoint[] } = await res.json();
        if (data.heatmap) setHeatmapData(data.heatmap);
      } catch (err) {
        console.error('Heatmap fetch failed:', err);
      }
    };
    fetchHeatmap();
  }, []);

  // Check Risk for a Location (with AI enhancement)
  const checkRisk = useCallback(async (lat: number, lng: number, type: 'start' | 'end') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/safety/risk-score?lat=${lat}&lng=${lng}&premium=${user?.isPremium}`);
      const data: RiskData = await res.json();
      if (type === 'start') {
        setStartRisk(data);
      } else {
        setEndRisk(data);
      }
      setRiskData(data);
    } catch (err) {
      console.error('Risk check failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.isPremium]);

  // Premium Check - render paywall if not premium
  if (!user?.isPremium) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <FaShieldAlt className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h1 className="text-2xl font-bold mb-2">Premium Feature</h1>
          <p className="mb-4 text-gray-300">Upgrade to premium to access Safe Pass with AI risk analysis, real-time routing, and Safety Sister chat.</p>
          <ul className="text-left text-sm text-gray-400 mb-6 space-y-2">
            <li>• AI-powered risk insights with confidence scores</li>
            <li>• Real road-based route planning</li>
            <li>• Safety Sister chat for personalized advice</li>
            <li>• Unlimited emergency contacts</li>
          </ul>
          <button className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-xl font-semibold transition-colors">
            Upgrade for 99 ETB/month
          </button>
          <p className="text-xs text-gray-500 mt-3">Core safety features (SOS, alerts) remain free forever.</p>
        </div>
      </div>
    );
  }

  // Handle Location Selection
  const handleLocationSelect = (lat: number, lng: number, type: 'start' | 'end') => {
    if (type === 'start') {
      setStartPoint({ lat, lng, label: 'Start' });
      checkRisk(lat, lng, 'start');
    } else {
      setEndPoint({ lat, lng, label: 'Destination' });
      checkRisk(lat, lng, 'end');
    }
    setSelectionMode(null);
  };

  // Calculate Safe Path with Real Routing
  const calculateSafePath = async () => {
    if (!startPoint || !endPoint) return;
    
    setPathLoading(true);
    
    try {
      const route = await getSafeRoute(
        [startPoint.lat, startPoint.lng],
        [endPoint.lat, endPoint.lng],
        heatmapData,
        true // avoidHighRisk
      );
      
      // Enrich path with risk data
      const enrichedPath: PathPoint[] = await Promise.all(route.map(async (point) => {
        try {
          const res = await fetch(`/api/safety/risk-score?lat=${point.lat}&lng=${point.lng}&premium=${user?.isPremium}`);
          const risk: RiskData = await res.json();
          return { lat: point.lat, lng: point.lng, risk };
        } catch {
          return { lat: point.lat, lng: point.lng };
        }
      }));
      
      setSafePath(enrichedPath);
      
    } catch (err) {
      console.error('Path calculation failed:', err);
      // Fallback to simple path
      const fallback: PathPoint[] = [];
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        fallback.push({
          lat: startPoint.lat + (endPoint.lat - startPoint.lat) * t,
          lng: startPoint.lng + (endPoint.lng - startPoint.lng) * t
        });
      }
      setSafePath(fallback);
    } finally {
      setPathLoading(false);
    }
  };

  // Reset
  const resetPath = () => {
    setStartPoint(null);
    setEndPoint(null);
    setSafePath([]);
    setRiskData(null);
    setStartRisk(null);
    setEndRisk(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900 pt-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <motion.div 
          className="text-center mb-8 md:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black bg-gradient-to-r from-purple-400 via-fuchsia-500 to-indigo-600 bg-clip-text text-transparent mb-4 drop-shadow-2xl">
            Safe Path Planner
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            Plan your route avoiding high-risk areas. Click map to set start & destination.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* LEFT: Controls & Status */}
          <motion.section 
            className="lg:col-span-1 bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 space-y-6"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Selection Mode */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FaMapMarkerAlt className="text-blue-400" /> Set Route
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  onClick={() => setSelectionMode('start')}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    selectionMode === 'start' 
                      ? 'bg-blue-600/90 border-blue-400 text-white' 
                      : startPoint 
                        ? 'bg-green-600/30 border-green-400/50 text-green-300' 
                        : 'bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">A</span>
                    </div>
                    <span className="text-sm font-medium">Start</span>
                  </div>
                </motion.button>
                
                <motion.button
                  onClick={() => setSelectionMode('end')}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    selectionMode === 'end' 
                      ? 'bg-red-600/90 border-red-400 text-white' 
                      : endPoint 
                        ? 'bg-green-600/30 border-green-400/50 text-green-300' 
                        : 'bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">B</span>
                    </div>
                    <span className="text-sm font-medium">End</span>
                  </div>
                </motion.button>
              </div>
              
              {selectionMode && (
                <motion.p 
                  className="text-sm text-yellow-300 text-center bg-yellow-500/20 p-2 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  👆 Click on map to set {selectionMode} point
                </motion.p>
              )}
            </div>

            {/* Selected Points */}
            {(startPoint || endPoint) && (
              <div className="space-y-3 p-4 bg-black/20 rounded-2xl">
                {startPoint && (
                  <div className="flex items-center gap-3 text-white">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">A</div>
                    <span className="text-sm">Start: {startPoint.lat.toFixed(4)}, {startPoint.lng.toFixed(4)}</span>
                  </div>
                )}
                {endPoint && (
                  <div className="flex items-center gap-3 text-white">
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs font-bold">B</div>
                    <span className="text-sm">End: {endPoint.lat.toFixed(4)}, {endPoint.lng.toFixed(4)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Calculate Path Button */}
            {startPoint && endPoint && (
              <motion.button
                onClick={calculateSafePath}
                disabled={pathLoading}
                className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {pathLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <FaRoute className="w-5 h-5" />
                    Find Safe Path
                  </>
                )}
              </motion.button>
            )}

            {/* Risk Status Card */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FaShieldAlt className={riskData ? getRiskTextColor(riskData.risk) : 'text-gray-400'} />
                Area Safety
              </h3>
              
              {loading ? (
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                  Checking...
                </div>
              ) : riskData ? (
                <div className="space-y-3">
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/30 ${getRiskColor(riskData.risk)}`}>
                    {riskData.color === 'green' ? (
                      <FaShieldAlt className="w-8 h-8 text-white" />
                    ) : (
                      <FaExclamationTriangle className="w-8 h-8 text-white animate-pulse" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-black capitalize ${getRiskTextColor(riskData.risk)}`}>
                      {riskData.color === 'green' ? 'Safe' : 
                       riskData.color === 'orange' ? 'Caution' : 'Danger'}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">Risk Score: {riskData.risk}/5</p>
                  </div>
                  
                  {/* AI Reasoning Section (Premium only) */}
                  {riskData.aiMultiplier && riskData.aiMultiplier !== 1 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-blue-400">🤖</span>
                        <span className="text-sm font-medium text-blue-300">AI Insight</span>
                        <span className="text-xs text-blue-400/70">
                          Confidence: {(riskData.aiConfidence! * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{riskData.aiReason}</p>
                      {riskData.aiSafetyTip && (
                        <p className="text-xs text-green-400 italic">💡 {riskData.aiSafetyTip}</p>
                      )}
                    </motion.div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center">Select a location to check safety</p>
              )}
            </div>

            {/* Reset Button */}
            {(startPoint || endPoint || safePath.length > 0) && (
              <motion.button
                onClick={resetPath}
                className="w-full py-3 px-6 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FaRedo className="w-4 h-4" />
                Reset Route
              </motion.button>
            )}

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-black/20 rounded-xl text-white text-xs">
              <div className="flex items-center gap-2 p-2 bg-green-500/20 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Safe</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-orange-500/20 rounded-lg">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Caution</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-red-500/20 rounded-lg">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Danger</span>
              </div>
            </div>
          </motion.section>

          {/* RIGHT: Map */}
          <motion.section 
            className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-3xl p-4 border border-white/20 overflow-hidden"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="h-[400px] md:h-[600px] rounded-2xl overflow-hidden shadow-2xl">
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={12}
                style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
                className="rounded-2xl"
                preferCanvas={true}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* LocationSelector - MUST be inside MapContainer */}
                <LocationSelector 
                  onLocationSelect={handleLocationSelect}
                  selectionMode={selectionMode}
                />
                
                {/* Selection Mode Hint */}
                {selectionMode && (
                  <Popup position={DEFAULT_CENTER} autoClose={false} closeOnClick={false}>
                    <div className="text-center text-sm">
                      👆 Click anywhere to set <strong>{selectionMode}</strong> point
                    </div>
                  </Popup>
                )}
                
                {/* Fit Map to Points */}
                {(startPoint || endPoint) && (
                  <FitMapToBounds points={[startPoint, endPoint].filter(Boolean) as PathPoint[]} />
                )}

                {/* Start Marker */}
                {startPoint && (
                  <Marker position={[startPoint.lat, startPoint.lng] as LatLngExpression}>
                    <Popup className="font-bold">
                      <div className="text-center p-2">
                        <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">A</div>
                        <p className="text-sm">Start Point</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* End Marker */}
                {endPoint && (
                  <Marker position={[endPoint.lat, endPoint.lng] as LatLngExpression}>
                    <Popup className="font-bold">
                      <div className="text-center p-2">
                        <div className="w-6 h-6 mx-auto mb-1 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">B</div>
                        <p className="text-sm">Destination</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Safe Path Line - Risk-colored segments */}
                {safePath.length > 1 && (
                  <>
                    {safePath.slice(0, -1).map((point, i) => {
                      const nextPoint = safePath[i + 1];
                      const segmentRisk = point.risk?.risk || 0;
                      const color = segmentRisk >= 4 ? '#ef4444' : segmentRisk >= 2 ? '#f97316' : '#22c55e';
                      
                      return (
                        <Polyline
                          key={i}
                          positions={[[point.lat, point.lng], [nextPoint.lat, nextPoint.lng]] as [LatLngExpression, LatLngExpression]}
                          color={color}
                          weight={4}
                          opacity={0.9}
                          dashArray={segmentRisk >= 4 ? "2, 4" : undefined}
                        />
                      );
                    })}
                  </>
                )}

                {/* Heatmap Points */}
                {heatmapData.map((point: HeatmapPoint, i: number) => (
                  <CircleMarker
                    key={i}
                    center={[point.lat, point.lng] as LatLngExpression}
                    radius={8}
                    color={point.risk >= 4 ? '#ef4444' : point.risk >= 2 ? '#f97316' : '#22c55e'}
                    fillColor={point.risk >= 4 ? '#ef4444' : point.risk >= 2 ? '#f97316' : '#22c55e'}
                    fillOpacity={0.4}
                    weight={1}
                  >
                    <Popup>
                      <p className="font-bold">Risk Level: {point.risk}/5</p>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* Known Zones */}
                {knownZones.map((zone: KnownZone, i: number) => (
                  <Marker key={i} position={zone.pos as LatLngExpression}>
                    <Popup className={`font-bold min-w-[180px] ${zone.type === 'danger' ? 'bg-red-50/90' : zone.type === 'caution' ? 'bg-orange-50/90' : 'bg-green-50/90'} border-2 ${zone.type === 'danger' ? 'border-red-200' : zone.type === 'caution' ? 'border-orange-200' : 'border-green-200'}`}>
                      <div className="text-center p-3">
                        <h3 className={`text-lg font-black mb-2 ${zone.type === 'danger' ? 'text-red-600' : zone.type === 'caution' ? 'text-orange-600' : 'text-green-600'}`}>
                          {zone.name}
                        </h3>
                        <div className={`w-5 h-5 mx-auto rounded-full mb-2 ${getRiskColor(zone.risk)}`}></div>
                        <p className="text-sm">Risk: {zone.risk}/5</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Start Point with Risk Color */}
                {startPoint && startRisk && (
                  <Marker position={[startPoint.lat, startPoint.lng] as LatLngExpression} icon={L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background-color: ${startRisk.color === 'red' ? '#ef4444' : startRisk.color === 'orange' ? '#f97316' : '#22c55e'}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                  })}>
                    <Popup>
                      <p className="font-bold">Start Point</p>
                      <p>Risk: {startRisk.risk}/5 ({startRisk.color})</p>
                      {startRisk.aiReason && <p className="text-xs mt-1">🤖 {startRisk.aiReason}</p>}
                    </Popup>
                  </Marker>
                )}

                {/* End Point with Risk Color */}
                {endPoint && endRisk && (
                  <Marker position={[endPoint.lat, endPoint.lng] as LatLngExpression} icon={L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background-color: ${endRisk.color === 'red' ? '#ef4444' : endRisk.color === 'orange' ? '#f97316' : '#22c55e'}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                  })}>
                    <Popup>
                      <p className="font-bold">End Point</p>
                      <p>Risk: {endRisk.risk}/5 ({endRisk.color})</p>
                      {endRisk.aiReason && <p className="text-xs mt-1">🤖 {endRisk.aiReason}</p>}
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>

            {/* Path Summary */}
            {safePath.length > 1 && (
              <motion.div 
                className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl text-white"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <FaShieldAlt className="text-green-400" />
                  <h4 className="font-bold">Safe Route Found!</h4>
                </div>
                <p className="text-sm text-gray-300">
                  This path avoids high-risk zones (risk ≥ 4). Total waypoints: {safePath.length}
                </p>
              </motion.div>
            )}
          </motion.section>
        </div>

        {/* Safety Sister Bot */}
        <SafetyBot 
          location={startPoint || endPoint ? { 
            lat: (startPoint?.lat || endPoint?.lat)!, 
            lng: (startPoint?.lng || endPoint?.lng)! 
          } : undefined}
          isPremium={user?.isPremium || false}
        />
      </div>
    </div>
  );
}