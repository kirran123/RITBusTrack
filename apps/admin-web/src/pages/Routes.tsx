import React, { useState } from 'react';
import { Route, Stop, Bus, Driver, COLLEGE_LOCATION } from '@college-bus/shared';
import { LiveFleetMap } from '../components/LiveFleetMap';
import {
  Route as RouteIcon,
  Plus,
  MapPin,
  Edit2,
  Trash2,
  X,
  Link,
  Navigation,
  Compass,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Palette,
  Sunrise,
  Sunset,
  RefreshCw,
  UserCheck,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Clock,
  Check,
  Shuffle,
  ListOrdered,
  Layers,
  Loader2,
  Map as MapViewIcon
} from 'lucide-react';
import { parseGoogleMapsLink, parseGoogleMapsDirections, resolveLocationInput } from '../lib/googleMapsParser';

const ROUTE_COLOR_PRESETS = [
  { label: 'Royal Blue (Bus 01)', color: '#2563eb' },
  { label: 'Emerald Green (Bus 02)', color: '#10b981' },
  { label: 'Amber Gold (Bus 03)', color: '#f59e0b' },
  { label: 'Violet Purple (Bus 04)', color: '#8b5cf6' },
  { label: 'Crimson Rose (Bus 05)', color: '#f43f5e' },
  { label: 'Cyan Ocean (Bus 06)', color: '#06b6d4' },
];

interface RoutesProps {
  routes: Route[];
  stops: Stop[];
  buses?: Bus[];
  drivers?: Driver[];
  onSaveRoute: (route: Route) => void;
  onDeleteRoute: (routeId: string) => void;
  onSaveStop: (stop: Stop) => void;
  onDeleteStop: (stopId: string) => void;
  onReorderStops?: (routeId: string, newRouteStops: Stop[]) => void;
  onSubstituteDriver?: (busId: string, substituteDriverId: string, reason?: string) => void;
  onSwapBus?: (routeId: string, newBusId: string, reason?: string) => void;
  onRevertSubstituteDriver?: (busId: string) => void;
  onRevertBusSwap?: (routeId: string) => void;
  currentUser?: any;
  canEdit?: boolean;
}

export const Routes: React.FC<RoutesProps> = ({
  routes,
  stops,
  buses = [],
  drivers = [],
  onSaveRoute,
  onDeleteRoute,
  onSaveStop,
  onDeleteStop,
  onReorderStops,
  onSubstituteDriver,
  onSwapBus,
  onRevertSubstituteDriver,
  onRevertBusSwap,
  currentUser,
  canEdit,
}) => {
  const isEditable = canEdit ?? (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  const [selectedRouteId, setSelectedRouteId] = useState<string>(routes[0]?.id || '');
  const [activeShiftView, setActiveShiftView] = useState<'morning' | 'evening'>('morning');
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [successToast, setSuccessToast] = useState<string>('');

  // Substitute Driver Modal State
  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState(false);
  const [substituteBus, setSubstituteBus] = useState<Bus | null>(null);
  const [selectedSubDriverId, setSelectedSubDriverId] = useState('');
  const [substituteReason, setSubstituteReason] = useState('Driver On Leave / Emergency');

  // Bus Swap Modal State
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapCurrentBus, setSwapCurrentBus] = useState<Bus | null>(null);
  const [selectedReplacementBusId, setSelectedReplacementBusId] = useState('');
  const [swapReason, setSwapReason] = useState('Vehicle Under Maintenance / Mechanical Breakdown');

  // Route Form State
  const [routeName, setRouteName] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('Ramco Institute of Technology Campus');
  const [startTime, setStartTime] = useState('07:30 AM');
  const [endTime, setEndTime] = useState('08:20 AM');
  const [eveningStartTime, setEveningStartTime] = useState('04:30 PM');
  const [eveningEndTime, setEveningEndTime] = useState('05:25 PM');
  const [distanceKm, setDistanceKm] = useState(12.5);
  const [estimatedDuration, setEstimatedDuration] = useState('45 mins');
  const [routeColor, setRouteColor] = useState('#2563eb');
  const [routeMapsLink, setRouteMapsLink] = useState('');
  const [routeLinkParsedMsg, setRouteLinkParsedMsg] = useState('');

  // Stop Form
  const [stopName, setStopName] = useState('');
  const [latitude, setLatitude] = useState(9.4475);
  const [longitude, setLongitude] = useState(77.5450);
  const [estimatedArrival, setEstimatedArrival] = useState('07:45 AM');
  const [stopMapsLink, setStopMapsLink] = useState('');
  const [stopLinkParsedMsg, setStopLinkParsedMsg] = useState('');

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const assignedBus = buses.find((b) => b.route_id === selectedRouteId);
  const assignedDriver = assignedBus ? drivers.find(d => d.id === (assignedBus.substitute_driver_id || assignedBus.assigned_driver_id)) : null;

  // Stored sequential stops for this route (Morning baseline: 1..N)
  const rawRouteStops = stops
    .filter((s) => s.route_id === selectedRouteId)
    .sort((a, b) => a.stop_order - b.stop_order);

  // In Evening shift, view displays in reverse sequence
  const displayStops = activeShiftView === 'evening'
    ? [...rawRouteStops].reverse()
    : rawRouteStops;

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast('');
    }, 3500);
  };

  // Move Stop Up in sequence (Towards start of route)
  const handleMoveStopUp = (index: number) => {
    if (index <= 0 || !selectedRouteId) return;
    const currentList = [...rawRouteStops];
    // Swap item with previous item
    const temp = currentList[index];
    currentList[index] = currentList[index - 1];
    currentList[index - 1] = temp;

    // Re-index cleanly 1..N
    const reindexed = currentList.map((st, i) => ({ ...st, stop_order: i + 1 }));
    if (onReorderStops) {
      onReorderStops(selectedRouteId, reindexed);
    } else {
      reindexed.forEach(st => onSaveStop(st));
    }
    showToast(`🔼 Moved "${temp.stop_name}" up to Stop #${index}`);
  };

  // Move Stop Down in sequence (Towards end of route)
  const handleMoveStopDown = (index: number) => {
    if (index >= rawRouteStops.length - 1 || !selectedRouteId) return;
    const currentList = [...rawRouteStops];
    // Swap item with next item
    const temp = currentList[index];
    currentList[index] = currentList[index + 1];
    currentList[index + 1] = temp;

    // Re-index cleanly 1..N
    const reindexed = currentList.map((st, i) => ({ ...st, stop_order: i + 1 }));
    if (onReorderStops) {
      onReorderStops(selectedRouteId, reindexed);
    } else {
      reindexed.forEach(st => onSaveStop(st));
    }
    showToast(`🔽 Moved "${temp.stop_name}" down to Stop #${index + 2}`);
  };

  // Re-order to exact target position number (1..N)
  const handleSetStopPosition = (currentIndex: number, newPosition: number) => {
    if (!selectedRouteId || newPosition < 1 || newPosition > rawRouteStops.length || currentIndex === newPosition - 1) return;
    const currentList = [...rawRouteStops];
    const [movedItem] = currentList.splice(currentIndex, 1);
    currentList.splice(newPosition - 1, 0, movedItem);

    // Re-index cleanly 1..N
    const reindexed = currentList.map((st, i) => ({ ...st, stop_order: i + 1 }));
    if (onReorderStops) {
      onReorderStops(selectedRouteId, reindexed);
    } else {
      reindexed.forEach(st => onSaveStop(st));
    }
    showToast(`🎯 Positioned "${movedItem.stop_name}" as Stop #${newPosition}`);
  };

  // Auto Normalize 1..N
  const handleAutoAlignSequence = () => {
    if (!selectedRouteId || rawRouteStops.length === 0) return;
    const reindexed = rawRouteStops.map((st, i) => ({ ...st, stop_order: i + 1 }));
    if (onReorderStops) {
      onReorderStops(selectedRouteId, reindexed);
    } else {
      reindexed.forEach(st => onSaveStop(st));
    }
    showToast(`⚡ Cleanly aligned & normalized ${rawRouteStops.length} stops from 1 to ${rawRouteStops.length}`);
  };

  // Reverse Sequence
  const handleReverseAllStops = () => {
    if (!selectedRouteId || rawRouteStops.length <= 1) return;
    const reversed = [...rawRouteStops].reverse().map((st, i) => ({ ...st, stop_order: i + 1 }));
    if (onReorderStops) {
      onReorderStops(selectedRouteId, reindexed => onReorderStops(selectedRouteId, reversed));
    } else {
      reversed.forEach(st => onSaveStop(st));
    }
    showToast(`🔄 Inverted stop sequence corridor successfully`);
  };

  // Auto-Calculate Estimated Arrival Times spaced sequentially
  const handleRecalculateArrivalTimes = () => {
    if (!selectedRoute || rawRouteStops.length === 0) return;
    
    // Parse start time (e.g. "07:30 AM")
    const startStr = activeShiftView === 'morning' ? (selectedRoute.start_time || '07:30 AM') : (selectedRoute.evening_start_time || '04:30 PM');
    const [timePart, modifier] = startStr.trim().split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    const intervalMinutes = Math.max(4, Math.floor(45 / Math.max(1, rawRouteStops.length)));

    const updatedStops = rawRouteStops.map((st, idx) => {
      const totalMinutes = (hours * 60) + minutes + ((idx + 1) * intervalMinutes);
      const stopHour = Math.floor(totalMinutes / 60) % 24;
      const stopMin = totalMinutes % 60;
      const ampm = stopHour >= 12 ? 'PM' : 'AM';
      const displayHour = stopHour % 12 === 0 ? 12 : stopHour % 12;
      const formattedMin = stopMin < 10 ? `0${stopMin}` : `${stopMin}`;
      const formattedTime = `${displayHour < 10 ? '0' + displayHour : displayHour}:${formattedMin} ${ampm}`;

      return {
        ...st,
        estimated_arrival: formattedTime
      };
    });

    if (onReorderStops) {
      onReorderStops(selectedRouteId, updatedStops);
    } else {
      updatedStops.forEach(st => onSaveStop(st));
    }
    showToast(`⏱ Recalculated sequential arrival times at ${intervalMinutes} min intervals`);
  };

  const [isResolvingStopUrl, setIsResolvingStopUrl] = useState(false);

  // Parse Google Maps Link for Route
  const handleParseRouteMapsLink = async (linkStr: string) => {
    setRouteMapsLink(linkStr);
    if (!linkStr.trim()) {
      setRouteLinkParsedMsg('');
      return;
    }
    const endpoints = parseGoogleMapsDirections(linkStr);
    if (endpoints.isExtracted && endpoints.start) {
      setRouteLinkParsedMsg(`✅ Detected Coordinates: Lat ${endpoints.start.latitude.toFixed(4)}, Lng ${endpoints.start.longitude.toFixed(4)}`);
    } else {
      const single = parseGoogleMapsLink(linkStr);
      if (single) {
        setRouteLinkParsedMsg(`✅ Detected Coordinates: Lat ${single.latitude.toFixed(4)}, Lng ${single.longitude.toFixed(4)}`);
      } else {
        setRouteLinkParsedMsg('🔄 Resolving route link...');
        const resolved = await resolveLocationInput(linkStr);
        if (resolved) {
          setRouteLinkParsedMsg(`✅ Detected Coordinates: Lat ${resolved.latitude.toFixed(4)}, Lng ${resolved.longitude.toFixed(4)}`);
        } else {
          setRouteLinkParsedMsg('⚠️ Could not parse coordinates. Please enter manually or verify link format.');
        }
      }
    }
  };

  // Parse Google Maps Link for Stop with Async Auto-Unshortener
  const handleParseStopMapsLink = async (linkStr: string) => {
    setStopMapsLink(linkStr);
    if (!linkStr.trim()) {
      setStopLinkParsedMsg('');
      setIsResolvingStopUrl(false);
      return;
    }

    // 1. Fast synchronous parsing (coords, plus codes, standard @lat,lng)
    const direct = parseGoogleMapsLink(linkStr);
    if (direct) {
      setLatitude(direct.latitude);
      setLongitude(direct.longitude);
      setStopLinkParsedMsg(`✅ Parsed GPS: Lat ${direct.latitude.toFixed(5)}, Lng ${direct.longitude.toFixed(5)}`);
      setIsResolvingStopUrl(false);
      return;
    }

    // 2. Async unshortener for maps.app.goo.gl or place query search
    setIsResolvingStopUrl(true);
    setStopLinkParsedMsg('🔄 Resolving location / expanding Google Maps link...');
    try {
      const resolved = await resolveLocationInput(linkStr);
      if (resolved) {
        setLatitude(resolved.latitude);
        setLongitude(resolved.longitude);
        setStopLinkParsedMsg(`✅ Parsed GPS: Lat ${resolved.latitude.toFixed(5)}, Lng ${resolved.longitude.toFixed(5)}${resolved.label ? ` (${resolved.label})` : ''}`);
        if (!stopName.trim() && resolved.label && !resolved.label.startsWith('Plus Code')) {
          setStopName(resolved.label.split(',')[0]);
        }
      } else {
        setStopLinkParsedMsg('⚠️ Could not parse coordinates automatically. Please verify link or enter manually.');
      }
    } catch {
      setStopLinkParsedMsg('⚠️ Error resolving link. Please enter coordinates manually.');
    } finally {
      setIsResolvingStopUrl(false);
    }
  };

  const openAddStopModal = () => {
    setEditingStop(null);
    setStopName('');
    setLatitude(9.4490 + (rawRouteStops.length * 0.003));
    setLongitude(77.5480 + (rawRouteStops.length * 0.002));
    setEstimatedArrival(activeShiftView === 'morning' ? '07:45 AM' : '04:45 PM');
    setStopMapsLink('');
    setStopLinkParsedMsg('');
    setIsStopModalOpen(true);
  };

  const openEditStopModal = (st: Stop) => {
    setEditingStop(st);
    setStopName(st.stop_name);
    setLatitude(st.latitude);
    setLongitude(st.longitude);
    setEstimatedArrival(st.estimated_arrival || '07:45 AM');
    setStopMapsLink(st.google_maps_link || '');
    setStopLinkParsedMsg(st.google_maps_link ? '✅ Existing Google Maps coordinates loaded' : '');
    setIsStopModalOpen(true);
  };

  const openCreateRouteModal = () => {
    setEditingRoute(null);
    setRouteName('Route ' + (routes.length + 1) + ': Express Corridor');
    setStartLocation('Rajapalayam New Bus Stand');
    setDestination('Ramco Institute of Technology Campus');
    setStartTime('07:30 AM');
    setEndTime('08:20 AM');
    setEveningStartTime('04:30 PM');
    setEveningEndTime('05:25 PM');
    setDistanceKm(12.5);
    setEstimatedDuration('45 mins');
    setRouteColor(ROUTE_COLOR_PRESETS[routes.length % ROUTE_COLOR_PRESETS.length].color);
    setRouteMapsLink('');
    setRouteLinkParsedMsg('');
    setIsRouteModalOpen(true);
  };

  const openEditRouteModal = (r: Route) => {
    setEditingRoute(r);
    setRouteName(r.route_name);
    setStartLocation(r.start_location);
    setDestination(r.destination);
    setStartTime(r.start_time || '07:30 AM');
    setEndTime(r.end_time || '08:20 AM');
    setEveningStartTime(r.evening_start_time || '04:30 PM');
    setEveningEndTime(r.evening_end_time || '05:25 PM');
    setDistanceKm(r.distance_km || 12.5);
    setEstimatedDuration(r.estimated_duration || '45 mins');
    setRouteColor(r.route_color || '#2563eb');
    setRouteMapsLink(r.google_maps_link || '');
    setRouteLinkParsedMsg('');
    setIsRouteModalOpen(true);
  };

  const handleDeleteRoutePrompt = (r: Route) => {
    if (window.confirm(`Are you sure you want to delete route "${r.route_name}"?`)) {
      onDeleteRoute(r.id);
      if (selectedRouteId === r.id) {
        const remaining = routes.filter(item => item.id !== r.id);
        setSelectedRouteId(remaining[0]?.id || '');
      }
      showToast(`🗑️ Route "${r.route_name}" deleted`);
    }
  };

  const handleSaveRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoute) {
      const updatedRoute: Route = {
        ...editingRoute,
        route_name: routeName,
        start_location: startLocation,
        destination: destination,
        distance_km: Number(distanceKm),
        estimated_duration: estimatedDuration,
        route_color: routeColor,
        start_time: startTime,
        end_time: endTime,
        evening_start_time: eveningStartTime,
        evening_end_time: eveningEndTime,
        google_maps_link: routeMapsLink,
      };
      onSaveRoute(updatedRoute);
      setIsRouteModalOpen(false);
      showToast(`✏️ Route "${routeName}" updated successfully`);
    } else {
      const newRouteId = 'r_' + Date.now();
      const newRoute: Route = {
        id: newRouteId,
        route_name: routeName,
        start_location: startLocation,
        destination: destination,
        distance_km: Number(distanceKm),
        estimated_duration: estimatedDuration,
        route_color: routeColor,
        start_time: startTime,
        end_time: endTime,
        evening_start_time: eveningStartTime,
        evening_end_time: eveningEndTime,
        google_maps_link: routeMapsLink,
        status: 'active',
      };
      onSaveRoute(newRoute);
      setSelectedRouteId(newRoute.id);
      setIsRouteModalOpen(false);

      // Auto-create initial Start and Campus Destination stops so stop points appear on the map immediately
      let startLat = 9.4475;
      let startLng = 77.5450;
      if (routeMapsLink) {
        const dir = parseGoogleMapsDirections(routeMapsLink);
        if (dir.isExtracted && dir.start) {
          startLat = dir.start.latitude;
          startLng = dir.start.longitude;
        } else {
          const single = parseGoogleMapsLink(routeMapsLink);
          if (single) {
            startLat = single.latitude;
            startLng = single.longitude;
          }
        }
      }

      const initialStartStop: Stop = {
        id: 'st_start_' + Date.now(),
        route_id: newRouteId,
        stop_name: `Start: ${startLocation}`,
        latitude: startLat,
        longitude: startLng,
        stop_order: 1,
        estimated_arrival: startTime || '07:30 AM',
        google_maps_link: routeMapsLink || undefined,
      };

      const initialEndStop: Stop = {
        id: 'st_end_' + (Date.now() + 1),
        route_id: newRouteId,
        stop_name: `Campus: ${destination}`,
        latitude: COLLEGE_LOCATION?.latitude || 9.4492,
        longitude: COLLEGE_LOCATION?.longitude || 77.5482,
        stop_order: 2,
        estimated_arrival: endTime || '08:20 AM',
      };

      onSaveStop(initialStartStop);
      setTimeout(() => onSaveStop(initialEndStop), 80);

      showToast(`✨ Created new route "${routeName}" with Start & Campus stops plotted on map`);
    }
  };

  const handleSaveStopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteId) return;

    if (editingStop) {
      const updatedStop: Stop = {
        ...editingStop,
        stop_name: stopName,
        latitude: Number(latitude),
        longitude: Number(longitude),
        estimated_arrival: estimatedArrival,
        google_maps_link: stopMapsLink || undefined,
      };
      onSaveStop(updatedStop);
      showToast(`💾 Saved changes to stop "${stopName}"`);
    } else {
      const newStop: Stop = {
        id: 'st_' + Date.now(),
        route_id: selectedRouteId,
        stop_name: stopName,
        latitude: Number(latitude),
        longitude: Number(longitude),
        stop_order: rawRouteStops.length + 1,
        estimated_arrival: estimatedArrival,
        google_maps_link: stopMapsLink || undefined,
        status: 'active',
      };
      onSaveStop(newStop);
      showToast(`📍 Added Stop #${newStop.stop_order} "${stopName}" to route`);
    }
    setIsStopModalOpen(false);
  };

  const handleApplySubstitute = (e: React.FormEvent) => {
    e.preventDefault();
    if (substituteBus && onSubstituteDriver) {
      onSubstituteDriver(substituteBus.id, selectedSubDriverId, substituteReason);
    }
    setIsSubstituteModalOpen(false);
    showToast(`👤 Substitute driver updated for ${substituteBus?.bus_number}`);
  };

  const handleApplySwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (swapCurrentBus && swapCurrentBus.route_id && onSwapBus) {
      onSwapBus(swapCurrentBus.route_id, selectedReplacementBusId, swapReason);
    }
    setIsSwapModalOpen(false);
    showToast(`🔄 Alternate standby vehicle swapped for route`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-3 tracking-tight">
            <div className="p-2.5 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner">
              <RouteIcon className="w-6 h-6" />
            </div>
            <span>Routes & Stop Sequence Alignment</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">
            Manage route corridors, configure stop sequences (1..N), toggle Morning/Evening shifts, and manage vehicle & driver reassignments.
          </p>
        </div>

        {isEditable ? (
          <button
            onClick={openCreateRouteModal}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/25 flex items-center space-x-2 transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Route</span>
          </button>
        ) : (
          <span className="px-3.5 py-1.5 rounded-full bg-slate-800 text-slate-400 font-semibold text-xs border border-slate-700 shrink-0">
            View-Only Mode
          </span>
        )}
      </div>

      {/* Shift Mode Toggle Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 backdrop-blur p-3.5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1 whitespace-nowrap">
            Active Shift:
          </span>
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800/80 w-full sm:w-auto">
            <button
              onClick={() => setActiveShiftView('morning')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 whitespace-nowrap ${
                activeShiftView === 'morning'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sunrise className="w-4 h-4 text-amber-300" />
              <span>Morning Shift (Pickup → Campus)</span>
            </button>
            <button
              onClick={() => setActiveShiftView('evening')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 whitespace-nowrap ${
                activeShiftView === 'evening'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sunset className="w-4 h-4 text-indigo-300" />
              <span>Evening Shift (Campus → Return Stops)</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-950/60 rounded-xl border border-slate-800/60 hidden md:block">
          {activeShiftView === 'morning' ? (
            <span className="text-slate-300 flex items-center space-x-1.5 font-mono">
              <span className="text-amber-400 font-bold">Town Terminals</span>
              <span className="text-blue-400 font-bold">→</span>
              <span className="text-emerald-400 font-bold">RIT Campus</span>
            </span>
          ) : (
            <span className="text-slate-300 flex items-center space-x-1.5 font-mono">
              <span className="text-indigo-400 font-bold">RIT Campus</span>
              <span className="text-blue-400 font-bold">→</span>
              <span className="text-amber-400 font-bold">Town Terminals (Reverse Sequence)</span>
            </span>
          )}
        </div>
      </div>

      {/* Grid: Route Tabs (Left) + Stops Realignment Sequencer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Selector List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Active Routes ({routes.length})
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">Select route corridor</span>
          </div>

          <div className="space-y-2.5">
            {routes.map((r) => {
              const count = stops.filter((s) => s.route_id === r.id).length;
              const isSelected = r.id === selectedRouteId;
              const color = r.route_color || '#2563eb';
              const routeBus = buses.find(b => b.route_id === r.id);

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRouteId(r.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? 'bg-slate-900 border-2 shadow-xl shadow-blue-500/5'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                  style={{ borderColor: isSelected ? color : undefined }}
                >
                  {/* Left edge active indicator bar */}
                  {isSelected && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1.5"
                      style={{ backgroundColor: color }}
                    />
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className="w-3.5 h-3.5 rounded-full shadow-sm flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {r.route_name}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {count} Stops
                      </span>
                      {isEditable && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditRouteModal(r);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                            title="Edit Route"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoutePrompt(r);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete Route"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 mt-2 flex items-center space-x-1.5 font-medium truncate">
                    {activeShiftView === 'morning' ? (
                      <>
                        <span className="text-emerald-400 font-bold truncate">{r.start_location}</span>
                        <span className="text-slate-500 font-bold">→</span>
                        <span className="text-rose-400 font-bold truncate">{r.destination}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-emerald-400 font-bold truncate">{r.destination}</span>
                        <span className="text-slate-500 font-bold">→</span>
                        <span className="text-rose-400 font-bold truncate">{r.start_location}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800/80 font-mono">
                    <span className="flex items-center space-x-1">
                      <span>{activeShiftView === 'morning' ? (r.start_time || '07:30 AM') : (r.evening_start_time || '04:30 PM')}</span>
                      <span className="text-blue-400 font-bold">→</span>
                      <span>{activeShiftView === 'morning' ? (r.end_time || '08:20 AM') : (r.evening_end_time || '05:25 PM')}</span>
                    </span>
                    {routeBus && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 font-bold text-[10px] border border-blue-500/20">
                        {routeBus.bus_number}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Route Details & Stop Realignment Tool */}
        <div className="lg:col-span-2 space-y-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          {selectedRoute ? (
            <>
              {/* Route Summary Top Section */}
              <div className="border-b border-slate-800 pb-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3.5">
                    <div
                      className="w-7 h-7 rounded-xl shadow-md flex-shrink-0"
                      style={{ backgroundColor: selectedRoute.route_color || '#2563eb' }}
                    />
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h2 className="text-xl font-black text-white tracking-tight">{selectedRoute.route_name}</h2>
                        {assignedBus && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-black">
                            {assignedBus.bus_number} ({assignedBus.registration_number})
                          </span>
                        )}
                        {assignedBus?.is_standby_replacement && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                            STANDBY SWAP
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2 font-medium">
                        <span>{selectedRoute.distance_km} km</span>
                        <span className="text-slate-600">&bull;</span>
                        <span>Est: {selectedRoute.estimated_duration}</span>
                        <span className="text-slate-600">&bull;</span>
                        <span className="text-slate-300 font-semibold">
                          Driver: {assignedDriver?.profile?.name || 'Unassigned'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                    {isEditable ? (
                      <>
                        {/* Edit Route Button */}
                        <button
                          onClick={() => openEditRouteModal(selectedRoute)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
                          title="Edit route details (name, terminals, times, color)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Route</span>
                        </button>

                        {/* Delete Route Button */}
                        <button
                          onClick={() => handleDeleteRoutePrompt(selectedRoute)}
                          className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
                          title="Delete this route"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        <button
                          onClick={openAddStopModal}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 flex items-center space-x-1.5 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Stop</span>
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold border border-slate-700">
                        Read Only
                      </span>
                    )}
                  </div>
                </div>

                {/* Temporary Driver Substitution Active Strip */}
                {assignedBus?.substitute_driver_id && (
                  <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md">
                    <div className="flex items-center space-x-2.5 text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div>
                          <strong>Temporary Substitute Driver:</strong> {assignedDriver?.profile?.name || 'Substitute'} ({assignedDriver?.phone || '+91 91234 56781'})
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Regular Allocated Driver: {drivers.find(d => d.id === assignedBus.assigned_driver_id)?.profile?.name || 'Regular Driver'} &bull; <span className="text-amber-300 font-semibold">Active until reverted</span>
                        </div>
                      </div>
                    </div>
                    {isEditable && onRevertSubstituteDriver && (
                      <button
                        onClick={() => onRevertSubstituteDriver(assignedBus.id)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center space-x-1 shadow transition-all shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Revert to Regular Driver</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Standby Bus Swap Active Strip */}
                {assignedBus?.is_standby_replacement && (
                  <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md">
                    <div className="flex items-center space-x-2.5 text-indigo-300">
                      <RefreshCw className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <div>
                          <strong>Standby Bus Active on this Route:</strong> {assignedBus.bus_number} ({assignedBus.registration_number})
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Regular Bus: {buses.find(b => b.id === assignedBus.original_bus_id || b.original_route_id === selectedRoute.id)?.bus_number || 'Regular Bus'} (Under Maintenance &bull; Standby active until resumed)
                        </div>
                      </div>
                    </div>
                    {isEditable && onRevertBusSwap && (
                      <button
                        onClick={() => onRevertBusSwap(selectedRoute.id)}
                        className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-xs rounded-xl flex items-center space-x-1 shadow transition-all shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Restore Regular Bus</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Terminals Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center space-x-3 shadow-inner">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 font-black text-xs border border-emerald-500/20">
                      🟢 START POINT
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {activeShiftView === 'morning' ? selectedRoute.start_location : selectedRoute.destination}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Departure: {activeShiftView === 'morning' ? (selectedRoute.start_time || '07:30 AM') : (selectedRoute.evening_start_time || '04:30 PM')}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center space-x-3 shadow-inner">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 font-black text-xs border border-rose-500/20">
                      🏁 END POINT
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {activeShiftView === 'morning' ? selectedRoute.destination : selectedRoute.start_location}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Arrival: {activeShiftView === 'morning' ? (selectedRoute.end_time || '08:20 AM') : (selectedRoute.evening_end_time || '05:25 PM')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Route Map with All Bus Stop Points & Waypoints */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                      <MapViewIcon className="w-4 h-4 text-blue-400" />
                      <span>Route Corridor Map & Stop Markers ({rawRouteStops.length} Stops Plotted)</span>
                    </div>
                    {assignedBus && (
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                        🚌 Assigned: {assignedBus.bus_number}
                      </span>
                    )}
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
                    <LiveFleetMap
                      locations={[]}
                      buses={assignedBus ? [assignedBus] : buses}
                      routes={[selectedRoute]}
                      stops={rawRouteStops}
                      selectedBusId={assignedBus?.id}
                      height="280px"
                    />
                  </div>
                </div>
              </div>

              {/* STOP REALIGNMENT & MANAGEMENT CONTROLS */}
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                      <ListOrdered className="w-4 h-4 text-blue-400" />
                      <span>Stop Order Realignment & Sequence Controls</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Adjust stop sequence (1, 2, 3...), move stops up/down, or normalize ordering.
                    </p>
                  </div>

                  {/* Realign Actions */}
                  {isEditable && (
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <button
                        onClick={handleRecalculateArrivalTimes}
                        className="px-3 py-1.5 rounded-xl bg-teal-600/15 hover:bg-teal-600/25 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
                        title="Automatically calculate progressive arrival times"
                      >
                        <Clock className="w-3.5 h-3.5 text-teal-400" />
                        <span>⏱ Auto-ETAs</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Stops Sequencer List */}
                {displayStops.length === 0 ? (
                  <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-sm">
                    <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-slate-300">No stops added for this route corridor yet.</p>
                    <p className="text-xs text-slate-500 mt-1">Add waypoint stops with Google Maps GPS coordinates.</p>
                    {isEditable && (
                      <button
                        onClick={openAddStopModal}
                        className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition-all"
                      >
                        Add First Stop (Google Maps GPS)
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {displayStops.map((stop, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === displayStops.length - 1;
                      const realIndexInRaw = rawRouteStops.findIndex(s => s.id === stop.id);

                      return (
                        <div
                          key={stop.id}
                          className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group shadow-sm"
                        >
                          {/* Left: Sequence Badge + Name + Coordinates */}
                          <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                            {/* Numbered Sequence Badge */}
                            <div className="flex flex-col items-center shrink-0">
                              <div
                                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs text-white shadow-md ${
                                  isFirst
                                    ? 'bg-emerald-600 shadow-emerald-600/30 ring-2 ring-emerald-500/40'
                                    : isLast
                                    ? 'bg-rose-600 shadow-rose-600/30 ring-2 ring-rose-500/40'
                                    : 'bg-slate-800 border border-slate-700 text-blue-400'
                                }`}
                              >
                                {idx + 1}
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                <h4 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">
                                  {stop.stop_name}
                                </h4>
                                {isFirst && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold border border-emerald-500/30 whitespace-nowrap">
                                    START WAYPOINT
                                  </span>
                                )}
                                {isLast && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-extrabold border border-rose-500/30 whitespace-nowrap">
                                    FINAL TERMINAL
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center flex-wrap gap-2">
                                <span>Lat: <strong className="text-slate-200">{stop.latitude.toFixed(4)}</strong></span>
                                <span className="text-slate-600">&bull;</span>
                                <span>Lng: <strong className="text-slate-200">{stop.longitude.toFixed(4)}</strong></span>
                                <span className="text-slate-600">&bull;</span>
                                <span className="text-amber-400 font-bold">
                                  ETA: {stop.estimated_arrival || '07:45 AM'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Controls (Google Maps, or Edit/Delete/Order for edit permissions) */}
                          <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-800 shrink-0">
                            {isEditable && (
                              <>
                                {/* Sequence Selector Dropdown */}
                                <div className="flex items-center space-x-1 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">Pos:</span>
                                  <select
                                    value={idx + 1}
                                    onChange={(e) => {
                                      const targetPos = Number(e.target.value);
                                      handleSetStopPosition(realIndexInRaw, targetPos);
                                    }}
                                    className="bg-transparent text-white font-black text-xs focus:outline-none cursor-pointer"
                                    title="Change stop position number"
                                  >
                                    {displayStops.map((_, pIdx) => (
                                      <option key={pIdx + 1} value={pIdx + 1} className="bg-slate-900 text-white">
                                        #{pIdx + 1}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Move Up */}
                                <button
                                  type="button"
                                  disabled={realIndexInRaw <= 0}
                                  onClick={() => handleMoveStopUp(realIndexInRaw)}
                                  className={`p-2 rounded-xl border transition-all ${
                                    realIndexInRaw <= 0
                                      ? 'opacity-30 cursor-not-allowed border-slate-800 text-slate-600'
                                      : 'bg-slate-900 hover:bg-blue-600 hover:text-white border-slate-800 text-slate-300 shadow-sm'
                                  }`}
                                  title="Move Stop Up (Earlier in route)"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>

                                {/* Move Down */}
                                <button
                                  type="button"
                                  disabled={realIndexInRaw >= rawRouteStops.length - 1}
                                  onClick={() => handleMoveStopDown(realIndexInRaw)}
                                  className={`p-2 rounded-xl border transition-all ${
                                    realIndexInRaw >= rawRouteStops.length - 1
                                      ? 'opacity-30 cursor-not-allowed border-slate-800 text-slate-600'
                                      : 'bg-slate-900 hover:bg-blue-600 hover:text-white border-slate-800 text-slate-300 shadow-sm'
                                  }`}
                                  title="Move Stop Down (Later in route)"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {/* Google Maps Pin Link */}
                            {stop.google_maps_link && (
                              <a
                                href={stop.google_maps_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl text-blue-400 hover:text-white hover:bg-blue-600/20 border border-blue-500/20 transition-colors shadow-sm"
                                title="Open in Google Maps"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {isEditable && (
                              <>
                                {/* Edit Stop */}
                                <button
                                  type="button"
                                  onClick={() => openEditStopModal(stop)}
                                  className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-900 border border-slate-800 transition-colors shadow-sm"
                                  title="Edit Stop Details & GPS"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Stop */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Remove stop "${stop.stop_name}" from route?`)) {
                                      onDeleteStop(stop.id);
                                      showToast(`🗑 Removed stop "${stop.stop_name}"`);
                                    }
                                  }}
                                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-slate-800 transition-colors shadow-sm"
                                  title="Delete Stop"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500">
              <RouteIcon className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-40" />
              <p className="text-base font-bold text-slate-300">No Route Selected</p>
              <p className="text-xs text-slate-500 mt-1">Select a route on the left to configure stop sequence and alignment.</p>
            </div>
          )}
        </div>
      </div>

      {/* SUBSTITUTE DRIVER MODAL */}
      {isSubstituteModalOpen && substituteBus && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Substitute Driver Allocation</h2>
                  <p className="text-xs text-slate-400">{substituteBus.bus_number} &bull; {selectedRoute?.route_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSubstituteModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubstitute} className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Regular Driver:</span>
                <span className="text-sm font-bold text-slate-200">
                  {drivers.find(d => d.id === substituteBus.assigned_driver_id)?.profile?.name || 'No Regular Driver'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select Substitute Driver to Deploy</label>
                <select
                  required
                  value={selectedSubDriverId}
                  onChange={(e) => setSelectedSubDriverId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Remove Substitute / Restore Regular Driver --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.profile?.name || d.employee_id} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Reason for Reassignment</label>
                <input
                  type="text"
                  value={substituteReason}
                  onChange={(e) => setSubstituteReason(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Driver emergency leave, illness"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSubstituteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30"
                >
                  Confirm Driver Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SWAP BUS FOR ROUTE MODAL */}
      {isSwapModalOpen && swapCurrentBus && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Route Bus Swap & Standby Dispatch</h2>
                  <p className="text-xs text-slate-400">Route: {selectedRoute?.route_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSwapModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySwap} className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Current Assigned Vehicle:</span>
                <span className="text-sm font-bold text-slate-200">
                  {swapCurrentBus.bus_number} ({swapCurrentBus.registration_number})
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select Standby / Alternate Bus</label>
                <select
                  required
                  value={selectedReplacementBusId}
                  onChange={(e) => setSelectedReplacementBusId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Alternate Vehicle --</option>
                  {buses.filter(b => b.id !== swapCurrentBus.id).map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bus_number} &bull; {b.registration_number} ({b.capacity} Seats - {b.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Swap Reason</label>
                <input
                  type="text"
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Bus breakdown, puncture, mechanical issue"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSwapModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
                >
                  Confirm Vehicle Swap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ROUTE MODAL */}
      {isRouteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white">
                {editingRoute ? `Edit Route: ${editingRoute.route_name}` : 'Create New Bus Route'}
              </h2>
              <button
                onClick={() => setIsRouteModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRouteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Route Name</label>
                <input
                  type="text"
                  required
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  placeholder="Route 1: Rajapalayam Express"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">🟢 Start Terminal (Morning)</label>
                  <input
                    type="text"
                    required
                    value={startLocation}
                    onChange={(e) => setStartLocation(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="Rajapalayam New Bus Stand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">🏁 End Terminal (Morning)</label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="Ramco Institute of Technology Campus"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Morning Dep &bull; Arr</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-1/2 bg-slate-950 text-white text-xs px-2.5 py-2 rounded-xl border border-slate-800"
                      placeholder="07:30 AM"
                    />
                    <input
                      type="text"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-1/2 bg-slate-950 text-white text-xs px-2.5 py-2 rounded-xl border border-slate-800"
                      placeholder="08:20 AM"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Evening Return Dep &bull; Arr</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={eveningStartTime}
                      onChange={(e) => setEveningStartTime(e.target.value)}
                      className="w-1/2 bg-slate-950 text-white text-xs px-2.5 py-2 rounded-xl border border-slate-800"
                      placeholder="04:30 PM"
                    />
                    <input
                      type="text"
                      value={eveningEndTime}
                      onChange={(e) => setEveningEndTime(e.target.value)}
                      className="w-1/2 bg-slate-950 text-white text-xs px-2.5 py-2 rounded-xl border border-slate-800"
                      placeholder="05:25 PM"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Est. Duration</label>
                  <input
                    type="text"
                    required
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="45 mins"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Route Color Identifier</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={routeColor}
                    onChange={(e) => setRouteColor(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer p-1"
                  />
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {ROUTE_COLOR_PRESETS.map((p) => (
                      <button
                        key={p.color}
                        type="button"
                        onClick={() => setRouteColor(p.color)}
                        className="w-6 h-6 rounded-lg border border-slate-700 transition-transform hover:scale-110"
                        style={{ backgroundColor: p.color }}
                        title={p.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRouteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30"
                >
                  {editingRoute ? 'Save Route Changes' : 'Create Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT STOP MODAL WITH GOOGLE MAPS GPS PARSER */}
      {isStopModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editingStop ? `Edit Stop: ${editingStop.stop_name}` : 'Add Route Stop Waypoint'}
                </h2>
                <p className="text-xs text-slate-400">Specify landmark and auto-extract coordinates from Google Maps</p>
              </div>
              <button
                onClick={() => setIsStopModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStopSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Stop Name / Landmark</label>
                <input
                  type="text"
                  required
                  value={stopName}
                  onChange={(e) => setStopName(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  placeholder="e.g. Gandhi Statue Junction, PACR Mill"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-400">
                    Google Maps Link / Short URL / "Lat, Lng"
                  </label>
                  {isResolvingStopUrl && (
                    <span className="text-[11px] text-blue-400 flex items-center space-x-1 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Resolving URL...</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={stopMapsLink}
                    onChange={(e) => handleParseStopMapsLink(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono pr-20"
                    placeholder="https://maps.app.goo.gl/... or 9.4490, 77.5472"
                  />
                  <button
                    type="button"
                    onClick={() => handleParseStopMapsLink(stopMapsLink)}
                    disabled={!stopMapsLink.trim() || isResolvingStopUrl}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-[11px] font-bold disabled:opacity-40 transition-all flex items-center space-x-1"
                  >
                    {isResolvingStopUrl ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Resolve</span>}
                  </button>
                </div>
                {stopLinkParsedMsg && (
                  <p className={`text-xs mt-1 font-medium ${stopLinkParsedMsg.startsWith('✅') ? 'text-emerald-400' : stopLinkParsedMsg.startsWith('🔄') ? 'text-blue-400' : 'text-amber-400'}`}>
                    {stopLinkParsedMsg}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(Number(e.target.value))}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(Number(e.target.value))}
                    className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Scheduled Arrival Time</label>
                <input
                  type="text"
                  value={estimatedArrival}
                  onChange={(e) => setEstimatedArrival(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="07:52 AM"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStopModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30"
                >
                  {editingStop ? 'Save Changes' : 'Add Stop to Sequence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
