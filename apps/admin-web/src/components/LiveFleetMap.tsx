import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { CurrentBusLocation, Route, Stop, Bus, Driver, COLLEGE_LOCATION, calculateStopLiveETA, calculateDynamicETA } from '@college-bus/shared';
import { 
  Bus as BusIcon, Navigation, MapPin, Layers, Filter, Eye, EyeOff, Maximize2, Compass, CheckCircle2,
  ChevronLeft, ChevronRight, Clock, Gauge
} from 'lucide-react';

// Fallback curated vibrant transit colors
const DEFAULT_ROUTE_COLORS = [
  '#2563eb', // Royal Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Amber Gold
  '#8b5cf6', // Violet Purple
  '#f43f5e', // Crimson Rose
  '#06b6d4', // Cyan Ocean
  '#ea580c', // Tangerine Orange
  '#14b8a6', // Teal
];

// Custom Leaflet Icons for Bus - Ultra-Clean, Modern Transit Puck
const createBusMarkerIcon = (
  busNumber: string,
  isMoving: boolean,
  color: string = '#2563eb',
  speed: number = 0,
  heading: number = 0,
  isSelected: boolean = false,
  isStandby: boolean = false
) => {
  const shortNumber = busNumber.replace(/^(BUS\s*-\s*|BUS\s*)/i, '').trim() || busNumber;
  const standbyTag = isStandby ? `<span style="background: #9333ea; color: #fff; font-size: 7.5px; padding: 1px 3.5px; border-radius: 4px; font-weight: 900; margin-left: 2px;">SUB</span>` : '';

  return L.divIcon({
    className: 'clean-bus-puck-wrapper',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer; z-index: ${isSelected ? 9999 : 1000};">
        <!-- Floating Pill Badge -->
        <div style="
          background: #0b1329;
          color: white;
          border: ${isSelected ? '2px solid #38bdf8' : `1.5px solid ${color}`};
          padding: 2.5px 8px;
          border-radius: 20px;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.3px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.6);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 5px;
          transform: scale(${isSelected ? 1.08 : 1.0});
          transition: transform 0.15s ease;
        ">
          <span style="color: ${color}; font-size: 11px;">🚌</span>
          <span>BUS ${shortNumber}</span>
          ${standbyTag}
        </div>

        <!-- Puck Dot Pointer -->
        <div style="
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 5px solid ${isSelected ? '#38bdf8' : color};
          margin-top: -1px;
        "></div>
      </div>
    `,
    iconSize: [80, 36],
    iconAnchor: [40, 36],
  });
};

// Custom Stop Marker Icons - Neat, uncluttered, color-coded
const createStopMarkerIcon = (
  isStart: boolean, 
  isEnd: boolean, 
  order: number, 
  stopName: string = '', 
  routeColor: string = '#2563eb',
  isHighlighted: boolean = false
) => {
  if (isStart) {
    return L.divIcon({
      className: 'clean-start-stop-node',
      html: `
        <div style="
          width: 22px;
          height: 22px;
          background: #059669;
          color: #ffffff;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 10.5px;
          transform: translate(-50%, -50%);
          cursor: pointer;
        ">
          ${order}
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

  if (isEnd) {
    return L.divIcon({
      className: 'clean-end-stop-node',
      html: `
        <div style="
          width: 22px;
          height: 22px;
          background: #dc2626;
          color: #ffffff;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 10px;
          transform: translate(-50%, -50%);
          cursor: pointer;
        ">
          🏁
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

  // Intermediate Transit Stop Node with Route Theme Ring
  return L.divIcon({
    className: 'clean-waypoint-stop-node',
    html: `
      <div style="
        width: 17px;
        height: 17px;
        background: #0f172a;
        color: #ffffff;
        border: 2px solid ${routeColor};
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 8.5px;
        transform: translate(-50%, -50%);
        cursor: pointer;
      ">
        ${order}
      </div>
    `,
    iconSize: [17, 17],
    iconAnchor: [8.5, 8.5],
  });
};

const collegeMarkerIcon = L.divIcon({
  className: 'clean-college-hub-pin',
  html: `
    <div style="
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: white;
      padding: 3px 8px;
      border-radius: 12px;
      border: 1.5px solid white;
      box-shadow: 0 3px 12px rgba(124,58,237,0.5);
      font-weight: 800;
      font-size: 10px;
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      transform: translate(-50%, -50%);
      cursor: pointer;
    ">
      <span>🏫</span>
      <span>RIT Campus</span>
    </div>
  `,
  iconSize: [110, 24],
  iconAnchor: [55, 12],
});

interface LiveFleetMapProps {
  locations: CurrentBusLocation[];
  buses?: Bus[];
  routes?: Route[];
  stops?: Stop[];
  drivers?: Driver[];
  selectedBusId?: string | null;
  selectedRouteId?: string | null;
  onSelectBus?: (busId: string) => void;
  onSelectRoute?: (routeId: string) => void;
  height?: string;
  showRouteSelector?: boolean;
}

const isValidCoord = (lat: any, lng: any): boolean => {
  return typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng);
};

// Map View Controller: Handles explicit user selections & fit bounds WITHOUT resetting manual zoom
const MapViewController: React.FC<{
  selectedBusId?: string | null;
  validLocations: CurrentBusLocation[];
  fitBoundsTrigger?: number;
  allPoints?: [number, number][];
}> = ({ selectedBusId, validLocations, fitBoundsTrigger, allPoints = [] }) => {
  const map = useMap();
  const prevSelectedBusRef = useRef<string | null | undefined>(undefined);

  // ONLY pan to a bus when selectedBusId is explicitly changed by the user
  useEffect(() => {
    if (selectedBusId && selectedBusId !== prevSelectedBusRef.current) {
      prevSelectedBusRef.current = selectedBusId;
      const target = validLocations.find(l => l.bus_id === selectedBusId);
      if (target && isValidCoord(target.latitude, target.longitude)) {
        map.setView([target.latitude, target.longitude], 15, { animate: true });
      }
    } else if (!selectedBusId) {
      prevSelectedBusRef.current = null;
    }
  }, [selectedBusId, validLocations, map]);

  // Fit bounds when explicitly clicked
  useEffect(() => {
    if (fitBoundsTrigger && fitBoundsTrigger > 0 && allPoints.length > 0) {
      const validPts = allPoints.filter(p => isValidCoord(p[0], p[1]));
      if (validPts.length > 0) {
        const bounds = L.latLngBounds(validPts.map(p => L.latLng(p[0], p[1])));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true });
      }
    }
  }, [fitBoundsTrigger, allPoints, map]);

  return null;
};

export const LiveFleetMap: React.FC<LiveFleetMapProps> = ({
  locations = [],
  buses = [],
  routes = [],
  stops = [],
  drivers = [],
  selectedBusId,
  selectedRouteId: controlledRouteId,
  onSelectBus,
  onSelectRoute,
  height = '480px',
  showRouteSelector = true,
}) => {
  const defaultCenter: [number, number] = [9.449, 77.548];

  // Active filter states
  const [internalSelectedRouteId, setInternalSelectedRouteId] = useState<string | 'all'>('all');
  const [stopFilterMode, setStopFilterMode] = useState<'all' | 'terminals' | 'none'>('all');
  const [mapStyle, setMapStyle] = useState<'google' | 'satellite' | 'dark' | 'osm'>('google');
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<number>(0);

  // Sync external selected route if provided
  useEffect(() => {
    if (controlledRouteId) {
      setInternalSelectedRouteId(controlledRouteId);
    }
  }, [controlledRouteId]);

  // If a bus is selected, auto-select its route
  useEffect(() => {
    if (selectedBusId) {
      const matchedBus = buses.find(b => b.id === selectedBusId);
      if (matchedBus && matchedBus.route_id) {
        setInternalSelectedRouteId(matchedBus.route_id);
      }
    }
  }, [selectedBusId, buses]);

  const activeRouteId = internalSelectedRouteId;

  // Merge locations with all registered buses with smart de-cluttering offset
  const allFleetLocations: CurrentBusLocation[] = useMemo(() => {
    const locs: CurrentBusLocation[] = [...(locations || [])];

    (buses || []).forEach((bus, index) => {
      const hasLocation = locs.some((l) => l.bus_id === bus.id);
      if (!hasLocation) {
        const busRouteStops = (stops || [])
          .filter((s) => s.route_id === bus.route_id)
          .sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));
        
        const angle = (index * 45 * Math.PI) / 180;
        const offsetDist = index === 0 ? 0 : 0.0022;
        const fallbackLat = (busRouteStops[0]?.latitude || 9.448) + Math.sin(angle) * offsetDist;
        const fallbackLng = (busRouteStops[0]?.longitude || 77.546) + Math.cos(angle) * offsetDist;

        locs.push({
          id: 'loc_auto_' + bus.id,
          bus_id: bus.id,
          trip_id: 'trip_' + bus.id,
          latitude: fallbackLat,
          longitude: fallbackLng,
          speed: 25.0,
          heading: 45,
          accuracy: 3.5,
          updated_at: new Date().toISOString(),
          bus: bus,
        });
      }
    });

    // De-duplication / Jitter for buses sharing the exact identical coordinate point
    const processedLocs: CurrentBusLocation[] = [];
    locs.forEach((loc, i) => {
      let lat = loc.latitude;
      let lng = loc.longitude;
      
      const collidingCount = processedLocs.filter(
        p => Math.abs(p.latitude - lat) < 0.0004 && Math.abs(p.longitude - lng) < 0.0004
      ).length;

      if (collidingCount > 0) {
        const angle = (collidingCount * 90 * Math.PI) / 180;
        lat += Math.sin(angle) * 0.0018;
        lng += Math.cos(angle) * 0.0018;
      }

      processedLocs.push({
        ...loc,
        latitude: lat,
        longitude: lng,
      });
    });

    return processedLocs;
  }, [locations, buses, stops]);

  const validLocations = useMemo(() => {
    return allFleetLocations.filter((l) => l && isValidCoord(l.latitude, l.longitude));
  }, [allFleetLocations]);

  const validStops = useMemo(() => {
    return (stops || []).filter((s) => s && isValidCoord(s.latitude, s.longitude));
  }, [stops]);

  // Collect all points for fit bounds
  const allMapPoints = useMemo(() => {
    const pts: [number, number][] = [];
    validLocations.forEach(l => pts.push([l.latitude, l.longitude]));
    validStops.forEach(s => pts.push([s.latitude, s.longitude]));
    pts.push([COLLEGE_LOCATION.latitude, COLLEGE_LOCATION.longitude]);
    return pts;
  }, [validLocations, validStops]);

  const getRouteColor = (routeId?: string | null, index: number = 0): string => {
    if (!routeId) return DEFAULT_ROUTE_COLORS[index % DEFAULT_ROUTE_COLORS.length];
    const r = routes.find(item => item.id === routeId);
    return r?.route_color || DEFAULT_ROUTE_COLORS[index % DEFAULT_ROUTE_COLORS.length];
  };

  const displayedStops = useMemo(() => {
    if (stopFilterMode === 'none') return [];

    return validStops.filter(stop => {
      if (activeRouteId !== 'all' && stop.route_id !== activeRouteId) {
        return false;
      }

      if (stopFilterMode === 'terminals') {
        const routeStops = validStops
          .filter(s => s.route_id === stop.route_id)
          .sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));
        const isStart = routeStops[0]?.id === stop.id;
        const isEnd = routeStops[routeStops.length - 1]?.id === stop.id;
        return isStart || isEnd;
      }

      return true;
    });
  }, [validStops, activeRouteId, stopFilterMode]);

  const routeScrollRef = useRef<HTMLDivElement>(null);

  const scrollRoutes = (direction: 'left' | 'right') => {
    if (routeScrollRef.current) {
      const scrollAmount = direction === 'left' ? -240 : 240;
      routeScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative z-10 flex flex-col bg-slate-950" style={{ height }}>
      
      {/* TOP HEADER: Clean Route Selector Bar with Visible Scroll Controls */}
      {showRouteSelector && (
        <div className="bg-slate-900 px-3 py-2.5 border-b border-slate-800/90 z-20 flex items-center justify-between gap-2">
          
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-400 font-extrabold text-[11px] flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Routes:</span>
            </span>
            
            {/* Scroll Left Button */}
            <button
              type="button"
              onClick={() => scrollRoutes('left')}
              className="p-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all shadow-sm flex items-center justify-center"
              title="Scroll Routes Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrollable Chips Container */}
          <div 
            ref={routeScrollRef}
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5 flex-1 min-w-0 scroll-smooth"
          >
            {/* All Routes Chip */}
            <button
              type="button"
              onClick={() => {
                setInternalSelectedRouteId('all');
                if (onSelectRoute) onSelectRoute('');
              }}
              className={`px-3 py-1 rounded-xl font-bold transition-all text-[11px] flex items-center gap-1.5 shrink-0 ${
                activeRouteId === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
            >
              <span>🌐 All Routes</span>
              <span className="bg-slate-950/60 px-1.5 py-0.2 rounded text-[9.5px] font-mono">
                {routes.length}
              </span>
            </button>

            {/* Individual Route Chips */}
            {routes.map((route, idx) => {
              const routeColor = route.route_color || DEFAULT_ROUTE_COLORS[idx % DEFAULT_ROUTE_COLORS.length];
              const isSelected = activeRouteId === route.id;
              const assignedBuses = buses.filter(b => b.route_id === route.id);

              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => {
                    setInternalSelectedRouteId(route.id);
                    if (onSelectRoute) onSelectRoute(route.id);
                  }}
                  className={`px-3 py-1 rounded-xl font-bold transition-all text-[11px] flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                  }`}
                  style={{
                    backgroundColor: isSelected ? routeColor : undefined,
                    borderColor: isSelected ? '#ffffff' : undefined,
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: routeColor }}
                  />
                  <span className="whitespace-nowrap">{route.route_name}</span>
                  {assignedBuses.length > 0 && (
                    <span className="bg-slate-950/60 px-1.5 py-0.2 rounded text-[9px] font-mono text-slate-200">
                      {assignedBuses.map(b => b.bus_number.replace(/BUS\s*/i, '')).join(', ')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Scroll Right Button */}
            <button
              type="button"
              onClick={() => scrollRoutes('right')}
              className="p-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all shadow-sm flex items-center justify-center"
              title="Scroll Routes Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Quick Fit Action */}
            <button
              type="button"
              onClick={() => setFitBoundsTrigger(prev => prev + 1)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all shadow-md shrink-0 flex items-center gap-1 text-[11px] font-bold ml-1"
              title="Fit All Buses in View"
            >
              <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Fit</span>
            </button>
          </div>
        </div>
      )}

      {/* MAP CONTAINER & FLOATING LAYER CONTROLS */}
      <div className="relative flex-1 w-full overflow-hidden">
        
        {/* Floating Clean Control Bar inside Map (Top Right) */}
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-700/80 shadow-2xl text-[10.5px]">
          {/* Stops Mode */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setStopFilterMode('all')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                stopFilterMode === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Stops
            </button>
            <button
              type="button"
              onClick={() => setStopFilterMode('none')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                stopFilterMode === 'none' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Paths Only
            </button>
          </div>

          {/* Map Layer Switcher */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setMapStyle('google')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                mapStyle === 'google' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Google Roadmap"
            >
              Roadmap
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('satellite')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                mapStyle === 'satellite' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Satellite Hybrid"
            >
              Satellite
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('dark')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                mapStyle === 'dark' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Dark Transit"
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('osm')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                mapStyle === 'osm' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="OpenStreetMap"
            >
              OSM
            </button>
          </div>
        </div>

        <MapContainer
          center={defaultCenter}
          zoom={13}
          zoomControl={false}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%', background: mapStyle === 'dark' ? '#090d16' : '#e5e7eb' }}
        >
          {/* Bottom Right Clean Custom Zoom Control */}
          <ZoomControl position="bottomright" />

          <MapViewController
            selectedBusId={selectedBusId}
            validLocations={validLocations}
            fitBoundsTrigger={fitBoundsTrigger}
            allPoints={allMapPoints}
          />

          {/* Layer Tile Providers */}
          {mapStyle === 'google' && (
            <TileLayer
              attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
              url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
              maxZoom={20}
            />
          )}

          {mapStyle === 'satellite' && (
            <TileLayer
              attribution='&copy; <a href="https://maps.google.com">Google Maps Satellite</a>'
              url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
              maxZoom={20}
            />
          )}

          {mapStyle === 'dark' && (
            <TileLayer
              attribution='&copy; <a href="https://maps.google.com">Google Maps Dark</a>'
              url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
              maxZoom={20}
              className="dark-map-tiles"
            />
          )}

          {mapStyle === 'osm' && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          )}

          {/* COLLEGE CAMPUS TERMINUS LANDMARK */}
          <Marker 
            position={[COLLEGE_LOCATION.latitude, COLLEGE_LOCATION.longitude]} 
            icon={collegeMarkerIcon} 
            zIndexOffset={600}
          >
            <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
              <span className="text-[11px] font-black text-purple-900">🏫 {COLLEGE_LOCATION.name}</span>
            </Tooltip>
            <Popup>
              <div className="text-slate-900 font-bold p-1 space-y-1">
                <div className="text-sm text-purple-700 flex items-center gap-1.5 font-extrabold">
                  <span>🏫</span> {COLLEGE_LOCATION.name}
                </div>
                <div className="text-xs text-slate-600 font-normal">
                  Primary Campus Central Bus Bay & Destination Terminal.
                </div>
              </div>
            </Popup>
          </Marker>

          {/* DUAL-STROKE ROUTE POLYLINES FOR ALL BUS ROUTES */}
          {(routes || []).map((route, idx) => {
            const routeColor = route.route_color || DEFAULT_ROUTE_COLORS[idx % DEFAULT_ROUTE_COLORS.length];
            const isRouteActive = activeRouteId === 'all' || activeRouteId === route.id;
            const isSelectedBusRoute = selectedBusId && validLocations.find(l => l.bus_id === selectedBusId)?.bus?.route_id === route.id;
            const isHighlight = isSelectedBusRoute || (activeRouteId === route.id);

            const routeStops = validStops
              .filter(s => s.route_id === route.id)
              .sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));

            if (routeStops.length < 2) return null;

            const polylinePoints: [number, number][] = routeStops.map(s => [s.latitude, s.longitude]);

            const lastStop = routeStops[routeStops.length - 1];
            if (lastStop && (Math.abs(lastStop.latitude - COLLEGE_LOCATION.latitude) > 0.001 || Math.abs(lastStop.longitude - COLLEGE_LOCATION.longitude) > 0.001)) {
              polylinePoints.push([COLLEGE_LOCATION.latitude, COLLEGE_LOCATION.longitude]);
            }

            const outerWeight = isHighlight ? 7 : 5;
            const innerWeight = isHighlight ? 4 : 3;
            const lineOpacity = isRouteActive ? (isHighlight ? 0.95 : 0.85) : 0.25;
            const glowOpacity = isRouteActive ? (isHighlight ? 0.7 : 0.35) : 0.1;

            return (
              <React.Fragment key={`route_poly_${route.id}`}>
                {/* Outer Dark Casing */}
                <Polyline
                  positions={polylinePoints}
                  pathOptions={{
                    color: '#0f172a',
                    weight: outerWeight,
                    opacity: glowOpacity,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />

                {/* Inner Core Transit Line */}
                <Polyline
                  positions={polylinePoints}
                  pathOptions={{
                    color: routeColor,
                    weight: innerWeight,
                    opacity: lineOpacity,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                  eventHandlers={{
                    click: () => {
                      setInternalSelectedRouteId(route.id);
                      if (onSelectRoute) onSelectRoute(route.id);
                    }
                  }}
                >
                  <Tooltip sticky direction="top" opacity={0.9}>
                    <div className="text-[11px] font-extrabold text-slate-900 py-0.5 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: routeColor }}></span>
                      <span>{route.route_name}</span>
                    </div>
                  </Tooltip>
                </Polyline>
              </React.Fragment>
            );
          })}

          {/* ROUTE STOPS (Clean, numbered transit nodes with Dynamic Live ETA) */}
          {displayedStops.map((stop) => {
            const routeStops = validStops
              .filter(s => s.route_id === stop.route_id)
              .sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));
            const matchedRoute = routes.find(r => r.id === stop.route_id);
            const routeColor = matchedRoute?.route_color || '#2563eb';
            const isStart = routeStops.length > 0 && routeStops[0].id === stop.id;
            const isEnd = routeStops.length > 0 && routeStops[routeStops.length - 1].id === stop.id;
            const isHighlighted = activeRouteId === stop.route_id;

            // Find live bus operating on this route to compute dynamic live arrival time
            const routeBusLoc = validLocations.find(l => {
              const b = l.bus || buses.find(item => item.id === l.bus_id);
              return b?.route_id === stop.route_id;
            });
            const dynamicETA = calculateStopLiveETA(routeBusLoc, stop, routeStops);

            return (
              <Marker
                key={`stop_marker_${stop.id}`}
                position={[stop.latitude, stop.longitude]}
                icon={createStopMarkerIcon(isStart, isEnd, stop.stop_order || 1, stop.stop_name, routeColor, isHighlighted)}
                zIndexOffset={isStart || isEnd ? 350 : 250}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                  <div className="text-[11px] font-bold text-slate-900 py-0.5 whitespace-nowrap flex items-center gap-1.5">
                    <span>{isStart ? '🟢 Start:' : isEnd ? '🏁 Terminus:' : `📍 Stop #${stop.stop_order}:`}</span>
                    <span>{stop.stop_name}</span>
                    <span className="font-mono font-black" style={{ color: dynamicETA.statusColor }}>
                      ({dynamicETA.arrivalTimeStr} &bull; {dynamicETA.statusLabel})
                    </span>
                  </div>
                </Tooltip>

                <Popup>
                  <div className="text-slate-900 text-xs p-1.5 min-w-[210px] space-y-2">
                    <div className="font-black text-slate-900 flex items-center justify-between">
                      <span>{isStart ? '🟢 Route Origin' : isEnd ? '🏁 Terminal Stop' : '📍 Transit Stop'}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold text-white" style={{ backgroundColor: routeColor }}>
                        #{stop.stop_order || 1}
                      </span>
                    </div>

                    <div className="font-extrabold text-slate-900 text-sm">{stop.stop_name}</div>

                    {matchedRoute && (
                      <div className="text-[11px] text-slate-600">
                        Route: <span className="font-bold" style={{ color: routeColor }}>{matchedRoute.route_name}</span>
                      </div>
                    )}

                    {/* Dynamic Live Telemetry ETA Card */}
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Live Dynamic ETA:</span>
                        <span className="font-mono font-black text-xs text-slate-900">{dynamicETA.arrivalTimeStr}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Scheduled Time:</span>
                        <span className="font-mono text-slate-500 line-through">{dynamicETA.scheduledTimeStr}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500 font-medium">Schedule Status:</span>
                        <span 
                          className="font-bold text-[10px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${dynamicETA.statusColor}20`, color: dynamicETA.statusColor }}
                        >
                          {dynamicETA.statusLabel} ({dynamicETA.formattedEta})
                        </span>
                      </div>
                      {routeBusLoc && (
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-200">
                          <span>Bus Speed / Dist:</span>
                          <span className="font-mono font-bold text-slate-700">
                            {Math.round(routeBusLoc.speed || 0)} km/h &bull; {dynamicETA.formattedDistance}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* ALL ACTIVE FLEET BUSES */}
          {validLocations.map((loc) => {
            const matchedBus = loc.bus || buses.find(b => b.id === loc.bus_id);
            const busNumber = matchedBus?.bus_number || loc.bus?.bus_number || 'BUS';
            const matchedDriver = drivers.find(d => d.id === matchedBus?.assigned_driver_id || d.assigned_bus_id === matchedBus?.id);
            const route = routes.find(r => r.id === matchedBus?.route_id || r.id === loc.bus?.route_id);
            const color = route?.route_color || getRouteColor(matchedBus?.route_id);
            const isSelected = selectedBusId === loc.bus_id;
            const speed = loc.speed || 0;
            const isMoving = speed > 0;
            const isStandby = matchedBus?.is_standby_replacement || false;

            // Compute bus next stop ETA
            const routeStops = validStops
              .filter(s => s.route_id === (matchedBus?.route_id || loc.bus?.route_id))
              .sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));
            const nextStop = routeStops[0];
            const nextStopETA = nextStop ? calculateStopLiveETA(loc, nextStop, routeStops) : null;

            return (
              <Marker
                key={`bus_loc_${loc.bus_id}`}
                position={[loc.latitude, loc.longitude]}
                icon={createBusMarkerIcon(busNumber, isMoving, color, speed, loc.heading || 0, isSelected, isStandby)}
                zIndexOffset={isSelected ? 5000 : 1000}
                eventHandlers={{
                  click: () => {
                    if (onSelectBus) onSelectBus(loc.bus_id);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -38]} opacity={0.95}>
                  <div className="text-[11px] font-bold text-slate-900 py-0.5 whitespace-nowrap flex items-center gap-1.5">
                    <span style={{ color }}>🚌</span>
                    <span>{busNumber}</span>
                    <span className="text-slate-500 font-normal">({route?.route_name || 'Active Fleet'})</span>
                    <span className="text-emerald-700 font-mono font-black">{Math.round(speed)} km/h</span>
                    {nextStopETA && (
                      <span className="font-bold font-mono text-[10px]" style={{ color: nextStopETA.statusColor }}>
                        &bull; {nextStopETA.statusLabel}
                      </span>
                    )}
                  </div>
                </Tooltip>

                <Popup>
                  <div className="text-slate-900 text-xs p-1.5 min-w-[210px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-black text-sm text-blue-700">{busNumber}</span>
                        {isStandby && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                            STANDBY SUB
                          </span>
                        )}
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                        isMoving ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isMoving ? '● LIVE MOVING' : '○ IDLE'}
                      </span>
                    </div>

                    <div className="font-bold text-slate-800 text-[11px]">
                      {matchedBus?.bus_name || busNumber} &bull; <span className="font-mono text-slate-500">{matchedBus?.registration_number}</span>
                    </div>

                    {route && (
                      <div className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span>Route:</span>
                        <span className="font-bold" style={{ color }}>{route.route_name}</span>
                      </div>
                    )}

                    {matchedDriver && (
                      <div className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span>Driver:</span>
                        <span className="font-bold text-slate-800">{matchedDriver.profile?.name || matchedDriver.employee_id}</span>
                      </div>
                    )}

                    {/* Next Stop Live Dynamic Arrival */}
                    {nextStop && nextStopETA && (
                      <div className="bg-blue-50/80 p-1.5 rounded-lg border border-blue-200 text-[10.5px] space-y-1">
                        <div className="flex items-center justify-between font-bold text-blue-950">
                          <span>Next: {nextStop.stop_name}</span>
                          <span className="font-mono">{nextStopETA.arrivalTimeStr}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-600">
                          <span>{nextStopETA.formattedDistance} &bull; {nextStopETA.formattedEta}</span>
                          <span 
                            className="font-bold px-1 py-0.2 rounded text-[9.5px]"
                            style={{ backgroundColor: `${nextStopETA.statusColor}20`, color: nextStopETA.statusColor }}
                          >
                            {nextStopETA.statusLabel}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 grid grid-cols-2 gap-1 text-[10px]">
                      <div>
                        <span className="text-slate-500">Speed:</span>{' '}
                        <span className="font-mono font-bold text-slate-900">{Math.round(speed)} km/h</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Heading:</span>{' '}
                        <span className="font-mono font-bold text-slate-900">{loc.heading || 0}&deg;</span>
                      </div>
                    </div>

                    {onSelectBus && (
                      <button
                        type="button"
                        onClick={() => onSelectBus(loc.bus_id)}
                        className="mt-1 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-2 rounded-lg text-[11px] transition-colors shadow-sm"
                      >
                        Inspect Telemetry & Route
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

    </div>
  );
};
