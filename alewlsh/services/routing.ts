// services/routing.ts
export interface RouteSegment {
  lat: number;
  lng: number;
  risk?: number;
}

export async function getSafeRoute(
  start: [number, number], 
  end: [number, number],
  heatmapData: Array<{lat: number; lng: number; risk: number}> = [],
  avoidHighRisk: boolean = true
): Promise<RouteSegment[]> {
  
  try {
    // OSRM public demo server (for production, self-host or use paid tier)
    const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=false`;
    
    const response = await fetch(osrmUrl);
    const data = await response.json();
    
    if (!data.routes?.[0]?.geometry?.coordinates) {
      throw new Error("No route found");
    }

    // Parse OSRM coordinates [lng, lat] to [lat, lng]
    const rawPath: RouteSegment[] = data.routes[0].geometry.coordinates.map((coord: [number, number]) => ({
      lat: coord[1],
      lng: coord[0]
    }));

    // If avoiding high-risk zones, filter or adjust path
    if (avoidHighRisk && heatmapData.length > 0) {
      return adjustPathForSafety(rawPath, heatmapData);
    }

    return rawPath;
    
  } catch (error) {
    console.error("Routing failed:", error);
    // Fallback: straight line with waypoints
    return getFallbackPath(start, end);
  }
}

// Helper: Adjust path to avoid high-risk zones
function adjustPathForSafety(
  path: RouteSegment[], 
  heatmapData: Array<{lat: number; lng: number; risk: number}>,
  riskThreshold: number = 4
): RouteSegment[] {
  
  return path.filter(point => {
    // Check if any high-risk point is too close
    const nearbyHighRisk = heatmapData.some(h => {
      const dist = distanceKm(point.lat, point.lng, h.lat, h.lng);
      return h.risk >= riskThreshold && dist < 0.3; // 300m buffer
    });
    return !nearbyHighRisk;
  });
}

// Fallback if OSRM fails
export function getFallbackPath(start: [number, number], end: [number, number], steps: number = 10): RouteSegment[] {
  const path: RouteSegment[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    path.push({
      lat: start[0] + (end[0] - start[0]) * t,
      lng: start[1] + (end[1] - start[1]) * t
    });
  }
  return path;
}

// Re-use distanceKm helper
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}