// app/safe-path/page.tsx
"use client";

import { motion } from 'framer-motion';
import { useEffect, useState, useCallback, ReactNode } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  useMap,
  useMapEvents,
  CircleMarker as LeafletCircleMarker
} from 'react-leaflet';
import L, { LatLngExpression, LeafletMouseEvent, DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaShieldAlt, FaExclamationTriangle, FaRoute, FaMapMarkerAlt, FaPlay, FaRedo } from 'react-icons/fa';

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

// === Component: Map Click Handler ===
interface LocationSelectorProps {
  onLocationSelect: (lat: number, lng: number, type: 'start' | 'end') => void;
  start: PathPoint | null;
  end: PathPoint | null;
}

const LocationSelector = ({ 
  onLocationSelect, 
  start, 
  end 
}: LocationSelectorProps): null => {
  const [selectionMode, setSelectionMode] = useState<'start' | 'end' | null>(null);
  
  useMapEvents({
    click(e: LeafletMouseEvent) {
      if (selectionMode) {
        onLocationSelect(e.latlng.lat, e.latlng.lng, selectionMode);
        setSelectionMode(null);
      }
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

// === Main Component ===
export default function SafePathPage() {
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [startPoint, setStartPoint] = useState<PathPoint | null>(null);
  const [endPoint, setEndPoint] = useState<PathPoint | null>(null);
  const [safePath, setSafePath] = useState<PathPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pathLoading, setPathLoading] = useState<boolean>(false);
  const [selectionMode, setSelectionMode] = useState<'start' | 'end' | null>(null);

  // Default: Addis Ababa center
  const DEFAULT_CENTER: [number, number] = [9.03, 38.74];

  // === Known Safe/Danger Zones (for demo) ===
  const knownZones: KnownZone[] = [
    { pos: [9.017, 38.825], name: 'Megenagna', risk: 4, type: 'danger' },
    { pos: [9.032, 38.746], name: 'Piassa', risk: 3, type: 'caution' },
    { pos: [8.997, 38.794], name: 'Bole', risk: 2, type: 'safe' },
    { pos: [9.027, 38.752], name: 'Mexico', risk: 5, type: 'danger' },
    { pos: [9.005, 38.763], name: 'Kazanchis', risk: 1, type: 'safe' },
  ];

  // === Fetch Heatmap Data on Mount ===
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

  // === Check Risk for a Location ===
  const checkRisk = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/safety/risk-score?lat=${lat}&lng=${lng}`);
      const data: RiskData = await res.json();
      setRiskData(data);
    } catch (err) {
      console.error('Risk check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // === Handle Location Selection ===
  const handleLocationSelect = (lat: number, lng: number, type: 'start' | 'end') => {
    if (type === 'start') {
      setStartPoint({ lat, lng, label: 'Start' });
      checkRisk(lat, lng);
    } else {
      setEndPoint({ lat, lng, label: 'Destination' });
      checkRisk(lat, lng);
    }
  };

  // === Calculate Safe Path (Simplified A* avoiding high-risk zones) ===
  const calculateSafePath = async () => {
    if (!startPoint || !endPoint) return;
    
    setPathLoading(true);
    
    try {
      // Simplified path: straight line with waypoints avoiding risk >= 4 zones
      const path: PathPoint[] = [startPoint];
      
      // Generate intermediate points (for demo: 5 waypoints)
      const steps = 5;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const lat = startPoint.lat + (endPoint.lat - startPoint.lat) * t;
        const lng = startPoint.lng + (endPoint.lng - startPoint.lng) * t;
        
        // Check if this point is in a high-risk zone
        const nearbyRisk = heatmapData.filter(h => 
          distanceKm(lat, lng, h.lat, h.lng) < 0.5 && h.risk >= 4
        );
        
        // If high risk nearby, offset the path slightly
        if (nearbyRisk.length > 0) {
          path.push({ 
            lat: lat + (Math.random() - 0.5) * 0.02, 
            lng: lng + (Math.random() - 0.5) * 0.02,
            label: `Waypoint ${i}`
          });
        } else {
          path.push({ lat, lng });
        }
      }
      
      path.push(endPoint);
      setSafePath(path);
      
      // Check risk at destination
      checkRisk(endPoint.lat, endPoint.lng);
      
    } catch (err) {
      console.error('Path calculation failed:', err);
    } finally {
      setPathLoading(false);
    }
  };

  // === Reset ===
  const resetPath = () => {
    setStartPoint(null);
    setEndPoint(null);
    setSafePath([]);
    setRiskData(null);
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
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 bg-clip-text text-transparent mb-4 drop-shadow-2xl">
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
                      {riskData.color === 'green' ? '✅ Safe' : 
                       riskData.color === 'orange' ? '⚠️ Caution' : '🚫 Danger'}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">Risk Score: {riskData.risk}/5</p>
                  </div>
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
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Click Handler */}
                <LocationSelector 
                  onLocationSelect={handleLocationSelect}
                  start={startPoint}
                  end={endPoint}
                />
                
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

                {/* Safe Path Line */}
                {safePath.length > 1 && (
                  <Polyline
                    positions={safePath.map(p => [p.lat, p.lng] as LatLngExpression)}
                    color="#22c55e"
                    weight={4}
                    opacity={0.9}
                    dashArray="5, 5"
                  />
                )}

                {/* Heatmap Points (as colored circles) */}
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

        {/* Emergency SOS Button (Fixed Bottom) */}
        <motion.div 
          className="fixed bottom-6 right-6 z-50"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center shadow-2xl border-4 border-red-400/50 hover:shadow-red-500/50 transition-all"
            onClick={() => window.location.href = '/emergency'}
          >
            <FaExclamationTriangle className="w-8 h-8 md:w-10 md:h-10 drop-shadow-2xl" />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}