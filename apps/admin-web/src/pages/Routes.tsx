import React, { useState, useEffect, useMemo } from 'react';
import { Route, Stop, Bus, Driver, Student, StaffCommuter } from '@college-bus/shared';
import { LiveFleetMap } from '../components/LiveFleetMap';
import {
  Route as RouteIcon,
  Search,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Sunrise,
  Sunset,
  RefreshCw,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckCircle2,
  Loader2,
  MapPin,
  ListOrdered,
  Download,
  Filter,
  X,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Navigation,
  Globe,
  Compass,
  BusFront,
  Users,
  GraduationCap,
  Briefcase,
  UserCheck,
  Phone,
  ArrowDownUp,
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
  students?: Student[];
  staffCommuters?: StaffCommuter[];
  onSaveRoute: (route: Route) => void;
  onDeleteRoute: (routeId: string) => void;
  onSaveStop?: (stop: Stop) => void;
  onDeleteStop?: (stopId: string) => void;
  onReorderStops?: (routeId: string, newRouteStops: Stop[]) => void;
  onSubstituteDriver?: (busId: string, substituteDriverId: string, reason?: string) => void;
  onSwapBus?: (routeId: string, newBusId: string, reason?: string) => void;
  onRevertSubstituteDriver?: (busId: string) => void;
  onRevertBusSwap?: (routeId: string) => void;
  onToggleStudentLeave?: (studentId: string) => void;
  onToggleStaffLeave?: (commuterId: string) => void;
  currentUser?: any;
  canEdit?: boolean;
}

export const Routes: React.FC<RoutesProps> = ({
  routes = [],
  stops = [],
  buses = [],
  drivers = [],
  students = [],
  staffCommuters = [],
  onSaveRoute,
  onDeleteRoute,
  onSaveStop,
  onDeleteStop,
  onReorderStops,
  onSubstituteDriver,
  onSwapBus,
  onRevertSubstituteDriver,
  onRevertBusSwap,
  onToggleStudentLeave,
  onToggleStaffLeave,
  currentUser,
  canEdit,
}) => {
  const isEditable = canEdit ?? (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  
  const [selectedRouteId, setSelectedRouteId] = useState<string>(routes[0]?.id || '');
  const [activeShiftView, setActiveShiftView] = useState<'morning' | 'evening'>('morning');
  const [activeTab, setActiveTab] = useState<'stops' | 'students' | 'staff'>('stops');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All status');
  const [successToast, setSuccessToast] = useState<string>('');

  // Keep selected route valid when routes change
  useEffect(() => {
    if (!routes.some(r => r.id === selectedRouteId) && routes.length > 0) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes, selectedRouteId]);

  // Modals state
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);

  // Route Form State
  const [routeName, setRouteName] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('Ramco Institute of Technology Campus');
  const [startTime, setStartTime] = useState('07:30 AM');
  const [endTime, setEndTime] = useState('08:20 AM');
  const [eveningStartTime, setEveningStartTime] = useState('04:30 PM');
  const [eveningEndTime, setEveningEndTime] = useState('05:25 PM');
  const [distanceKm, setDistanceKm] = useState(18.5);
  const [estimatedDuration, setEstimatedDuration] = useState('45 mins');
  const [routeColor, setRouteColor] = useState('#2563eb');
  const [routeMapsLink, setRouteMapsLink] = useState('');
  const [routeStatus, setRouteStatus] = useState<'active' | 'inactive'>('active');

  // Stop Form State
  const [stopName, setStopName] = useState('');
  const [stopPosition, setStopPosition] = useState<number>(1);
  const [latitude, setLatitude] = useState(9.4475);
  const [longitude, setLongitude] = useState(77.5450);
  const [morningTime, setMorningTime] = useState('07:45 AM');
  const [eveningTime, setEveningTime] = useState('04:45 PM');
  const [stopMapsLink, setStopMapsLink] = useState('');
  const [stopLinkParsedMsg, setStopLinkParsedMsg] = useState('');
  const [isResolvingStopUrl, setIsResolvingStopUrl] = useState(false);

  // Helper to extract numeric route sequence for perfect ascending ordering (Route 1 .. Route 32)
  const getRouteSortNumber = (r: Route): number => {
    if (r.route_number) {
      const parsed = parseInt(String(r.route_number).replace(/\D/g, ''), 10);
      if (!isNaN(parsed)) return parsed;
    }
    const name = r.route_name || (r as any).name || '';
    const match = name.match(/Route\s*(\d+)/i) || name.match(/(\d+)/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed)) return parsed;
    }
    const idMatch = r.id.match(/r(\d+)/i) || r.id.match(/(\d+)/);
    if (idMatch) {
      const parsed = parseInt(idMatch[1], 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 9999;
  };

  // Filter & sort routes in ascending numerical order, guaranteed strictly deduplicated
  const filteredRoutes = useMemo(() => {
    const seen = new Set<string>();
    return routes
      .filter((r) => {
        const name = r.route_name || (r as any).name || '';
        const start = r.start_location || (r as any).start_point || '';
        const end = r.destination || (r as any).end_point || '';
        const text = `${name} ${start} ${end}`.toLowerCase();
        const matchesQuery = !searchQuery || text.includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All status' || (r.status || 'active').toLowerCase() === statusFilter.toLowerCase();
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => getRouteSortNumber(a) - getRouteSortNumber(b))
      .filter((r) => {
        const num = getRouteSortNumber(r);
        const name = (r.route_name || (r as any).name || r.id).trim().toLowerCase();
        const key = num !== 9999 ? `num_${num}` : name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [routes, searchQuery, statusFilter]);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || filteredRoutes[0] || routes[0];
  const assignedBus = selectedRoute ? buses.find((b) => b.route_id === selectedRoute.id) : null;
  const assignedDriver = assignedBus ? drivers.find(d => d.id === (assignedBus.substitute_driver_id || assignedBus.assigned_driver_id)) : null;

  // Stored sequential stops for this route (De-duplicated: prevent stops showing 2 times)
  const rawRouteStops = useMemo(() => {
    if (!selectedRoute) return [];
    const seenNames = new Set<string>();
    return stops
      .filter((s) => s.route_id === selectedRoute.id)
      .filter((s) => {
        const name = (s.stop_name || (s as any).name || '').trim().toLowerCase();
        if (seenNames.has(name)) return false;
        seenNames.add(name);
        return true;
      })
      .sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));
  }, [stops, selectedRoute]);

  // In Evening shift, sequence displays in reverse (Campus ➔ Return Stops)
  const displayStops = activeShiftView === 'evening'
    ? [...rawRouteStops].reverse()
    : rawRouteStops;

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast('');
    }, 3500);
  };

  // Reorder Stops Handlers (Move Up / Down)
  const handleMoveStopUp = (index: number) => {
    if (index <= 0 || !selectedRoute) return;
    const currentList = [...rawRouteStops];
    const temp = currentList[index];
    currentList[index] = currentList[index - 1];
    currentList[index - 1] = temp;

    const reindexed = currentList.map((st, i) => ({ ...st, stop_order: i + 1 }));
    if (onReorderStops) {
      onReorderStops(selectedRoute.id, reindexed);
    } else if (onSaveStop) {
      reindexed.forEach(st => onSaveStop(st));
    }
    showToast(`Moved "${temp.stop_name || (temp as any).name}" UP to Position #${index}`);
  };

  const handleMoveStopDown = (index: number) => {
    if (index >= rawRouteStops.length - 1 || !selectedRoute) return;
    const currentList = [...rawRouteStops];
    const temp = currentList[index];
    currentList[index] = currentList[index + 1];
    currentList[index + 1] = temp;

    const reindexed = currentList.map((st, i) => ({ ...st, stop_order: i + 1 }));
    if (onReorderStops) {
      onReorderStops(selectedRoute.id, reindexed);
    } else if (onSaveStop) {
      reindexed.forEach(st => onSaveStop(st));
    }
    showToast(`Moved "${temp.stop_name || (temp as any).name}" DOWN to Position #${index + 2}`);
  };

  const handleSetStopPosition = (currentIndex: number, newPosition: number) => {
    if (!selectedRoute || newPosition < 1 || newPosition > rawRouteStops.length || currentIndex === newPosition - 1) return;
    const currentList = [...rawRouteStops];
    const [movedItem] = currentList.splice(currentIndex, 1);
    currentList.splice(newPosition - 1, 0, movedItem);

    const reindexed = currentList.map((st, i) => ({ ...st, stop_order: i + 1 }));
    if (onReorderStops) {
      onReorderStops(selectedRoute.id, reindexed);
    } else if (onSaveStop) {
      reindexed.forEach(st => onSaveStop(st));
    }
    showToast(`Changed position of "${movedItem.stop_name || (movedItem as any).name}" to #${newPosition}`);
  };

  const handleAutoAlignSequence = () => {
    if (!selectedRoute || rawRouteStops.length === 0) return;
    const reindexed = rawRouteStops.map((st, i) => ({ ...st, stop_order: i + 1 }));
    if (onReorderStops) {
      onReorderStops(selectedRoute.id, reindexed);
    } else if (onSaveStop) {
      reindexed.forEach(st => onSaveStop(st));
    }
    showToast(`Aligned & normalized ${rawRouteStops.length} stops from 1 to ${rawRouteStops.length}`);
  };

  const handleReverseAllStops = () => {
    if (!selectedRoute || rawRouteStops.length <= 1) return;
    const reversed = [...rawRouteStops].reverse().map((st, i) => ({ ...st, stop_order: i + 1 }));
    if (onReorderStops) {
      onReorderStops(selectedRoute.id, reversed);
    } else if (onSaveStop) {
      reversed.forEach(st => onSaveStop(st));
    }
    showToast(`Inverted stop sequence corridor successfully`);
  };

  // Auto-Calculate Sequential Arrival Times for Morning & Evening
  const handleRecalculateArrivalTimes = () => {
    if (!selectedRoute || rawRouteStops.length === 0) return;

    // Parse morning start time
    const startStr = selectedRoute.start_time || '07:30 AM';
    const [timePart, modifier] = startStr.trim().split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    // Parse evening start time
    const eveStartStr = selectedRoute.evening_start_time || '04:30 PM';
    const [eveTimePart, eveModifier] = eveStartStr.trim().split(' ');
    let [eveHours, eveMinutes] = eveTimePart.split(':').map(Number);
    if (eveModifier === 'PM' && eveHours < 12) eveHours += 12;
    if (eveModifier === 'AM' && eveHours === 12) eveHours = 0;

    const intervalMinutes = Math.max(3, Math.floor(45 / Math.max(1, rawRouteStops.length)));

    const updatedStops = rawRouteStops.map((st, idx) => {
      // Morning sequential time
      const totalMornMins = (hours * 60) + minutes + ((idx + 1) * intervalMinutes);
      const mHour = Math.floor(totalMornMins / 60) % 24;
      const mMin = totalMornMins % 60;
      const mAmpm = mHour >= 12 ? 'PM' : 'AM';
      const mDispHour = mHour % 12 === 0 ? 12 : mHour % 12;
      const mFormatted = `${mDispHour < 10 ? '0' + mDispHour : mDispHour}:${mMin < 10 ? '0' + mMin : mMin} ${mAmpm}`;

      // Evening sequential time (evening runs in reverse order)
      const eveIdx = (rawRouteStops.length - 1 - idx);
      const totalEveMins = (eveHours * 60) + eveMinutes + ((eveIdx + 1) * intervalMinutes);
      const eHour = Math.floor(totalEveMins / 60) % 24;
      const eMin = totalEveMins % 60;
      const eAmpm = eHour >= 12 ? 'PM' : 'AM';
      const eDispHour = eHour % 12 === 0 ? 12 : eHour % 12;
      const eFormatted = `${eDispHour < 10 ? '0' + eDispHour : eDispHour}:${eMin < 10 ? '0' + eMin : eMin} ${eAmpm}`;

      return {
        ...st,
        morning_time: mFormatted,
        evening_time: eFormatted,
        estimated_arrival: activeShiftView === 'morning' ? mFormatted : eFormatted,
      };
    });

    if (onReorderStops) {
      onReorderStops(selectedRoute.id, updatedStops);
    } else if (onSaveStop) {
      updatedStops.forEach(st => onSaveStop(st));
    }
    showToast(`Recalculated sequential arrival times at ${intervalMinutes} min intervals`);
  };

  // Google Maps link parser for Stop
  const handleParseStopMapsLink = async (linkStr: string) => {
    setStopMapsLink(linkStr);
    if (!linkStr.trim()) {
      setStopLinkParsedMsg('');
      setIsResolvingStopUrl(false);
      return;
    }

    const direct = parseGoogleMapsLink(linkStr);
    if (direct) {
      setLatitude(Number(direct.latitude.toFixed(6)));
      setLongitude(Number(direct.longitude.toFixed(6)));
      setStopLinkParsedMsg(`✓ Parsed GPS: Lat ${direct.latitude.toFixed(5)}, Lng ${direct.longitude.toFixed(5)}`);
      setIsResolvingStopUrl(false);
      return;
    }

    setIsResolvingStopUrl(true);
    setStopLinkParsedMsg('Resolving location / expanding Google Maps link...');
    try {
      const resolved = await resolveLocationInput(linkStr);
      if (resolved) {
        setLatitude(Number(resolved.latitude.toFixed(6)));
        setLongitude(Number(resolved.longitude.toFixed(6)));
        setStopLinkParsedMsg(`✓ Parsed GPS: Lat ${resolved.latitude.toFixed(5)}, Lng ${resolved.longitude.toFixed(5)}${resolved.label ? ` (${resolved.label})` : ''}`);
        if (!stopName.trim() && resolved.label && !resolved.label.startsWith('Plus Code')) {
          setStopName(resolved.label.split(',')[0]);
        }
      } else {
        setStopLinkParsedMsg('Could not parse coordinates automatically. Please verify link or enter manually.');
      }
    } catch {
      setStopLinkParsedMsg('Error resolving link. Please enter coordinates manually.');
    } finally {
      setIsResolvingStopUrl(false);
    }
  };


  // Open Route Modal (Pre-populate with existing route name so admin can easily edit it!)
  const openCreateRouteModal = () => {
    setEditingRoute(null);
    setRouteName(`Route ${routes.length + 1}: Express Corridor`);
    setStartLocation('Rajapalayam New Bus Stand');
    setDestination('Ramco Institute of Technology Campus');
    setStartTime('07:30 AM');
    setEndTime('08:20 AM');
    setEveningStartTime('04:30 PM');
    setEveningEndTime('05:25 PM');
    setDistanceKm(18.5);
    setEstimatedDuration('45 mins');
    setRouteColor(ROUTE_COLOR_PRESETS[routes.length % ROUTE_COLOR_PRESETS.length].color);
    setRouteMapsLink('');
    setRouteStatus('active');
    setIsRouteModalOpen(true);
  };

  const openEditRouteModal = (r: Route) => {
    setEditingRoute(r);
    // Explicitly pre-populate route name so admin can view and edit it!
    const existingName = r.route_name || (r as any).name || '';
    setRouteName(existingName);
    setStartLocation(r.start_location || (r as any).start_point || 'Rajapalayam Old Bus Stand');
    setDestination(r.destination || (r as any).end_point || 'Ramco Institute of Technology Campus');
    setStartTime(r.start_time || '07:30 AM');
    setEndTime(r.end_time || '08:20 AM');
    setEveningStartTime(r.evening_start_time || '04:30 PM');
    setEveningEndTime(r.evening_end_time || '05:25 PM');
    setDistanceKm(r.distance_km || 18.5);
    setEstimatedDuration(r.estimated_duration || (r as any).duration || '45 mins');
    setRouteColor(r.route_color || '#2563eb');
    setRouteMapsLink(r.google_maps_link || '');
    setRouteStatus(r.status === 'inactive' ? 'inactive' : 'active');
    setIsRouteModalOpen(true);
  };

  const handleDeleteRoutePrompt = (r: Route) => {
    const rName = r.route_name || (r as any).name || 'Route';
    if (window.confirm(`Are you sure you want to delete route "${rName}"? All stops on this corridor will be removed.`)) {
      onDeleteRoute(r.id);
      if (selectedRouteId === r.id) {
        const remaining = routes.filter(item => item.id !== r.id);
        setSelectedRouteId(remaining[0]?.id || '');
      }
      showToast(`Route "${rName}" deleted`);
    }
  };

  const handleSaveRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeName.trim()) return;

    if (editingRoute) {
      const updatedRoute: Route = {
        ...editingRoute,
        id: editingRoute.id,
        route_name: routeName,
        start_location: startLocation,
        destination: destination,
        distance_km: Number(distanceKm) || 15,
        estimated_duration: estimatedDuration,
        route_color: routeColor,
        start_time: startTime,
        end_time: endTime,
        evening_start_time: eveningStartTime,
        evening_end_time: eveningEndTime,
        google_maps_link: routeMapsLink,
        status: routeStatus,
        // Aliases
        ...({ name: routeName, start_point: startLocation, end_point: destination }),
      };
      onSaveRoute(updatedRoute);
      setIsRouteModalOpen(false);
      showToast(`Route "${routeName}" updated successfully`);
    } else {
      const newRouteId = 'rte_' + Date.now();
      const newRoute: Route = {
        id: newRouteId,
        route_name: routeName,
        start_location: startLocation,
        destination: destination,
        distance_km: Number(distanceKm) || 15,
        estimated_duration: estimatedDuration,
        route_color: routeColor,
        start_time: startTime,
        end_time: endTime,
        evening_start_time: eveningStartTime,
        evening_end_time: eveningEndTime,
        google_maps_link: routeMapsLink,
        status: routeStatus,
        // Aliases
        ...({ name: routeName, start_point: startLocation, end_point: destination }),
      };
      onSaveRoute(newRoute);
      setSelectedRouteId(newRoute.id);
      setIsRouteModalOpen(false);

      // Auto-create initial default start waypoint & campus destination stops
      if (onSaveStop) {
        const firstStop: Stop = {
          id: 'st_' + Date.now() + '_1',
          route_id: newRouteId,
          stop_name: startLocation,
          latitude: 9.4475,
          longitude: 77.5450,
          stop_order: 1,
          morning_time: startTime,
          evening_time: eveningEndTime,
          estimated_arrival: startTime,
          status: 'active',
        };
        const endStop: Stop = {
          id: 'st_' + Date.now() + '_2',
          route_id: newRouteId,
          stop_name: destination,
          latitude: 9.4735,
          longitude: 77.5852,
          stop_order: 2,
          morning_time: endTime,
          evening_time: eveningStartTime,
          estimated_arrival: endTime,
          status: 'active',
        };
        onSaveStop(firstStop);
        setTimeout(() => onSaveStop(endStop), 50);
      }
      showToast(`Created route "${routeName}"`);
    }
  };

  // Open Stop Modal (with Position Order and Google Maps URL options!)
  const openAddStopModal = () => {
    setEditingStop(null);
    setStopName('');
    const newPos = rawRouteStops.length + 1;
    setStopPosition(newPos);
    const baseLat = 9.4490 + (rawRouteStops.length * 0.0035);
    const baseLng = 77.5480 + (rawRouteStops.length * 0.003);
    setLatitude(Number(baseLat.toFixed(6)));
    setLongitude(Number(baseLng.toFixed(6)));
    setMorningTime('07:45 AM');
    setEveningTime('04:45 PM');
    const defaultMapUrl = `https://www.google.com/maps?q=${baseLat.toFixed(6)},${baseLng.toFixed(6)}`;
    setStopMapsLink(defaultMapUrl);
    setStopLinkParsedMsg('');
    setIsStopModalOpen(true);
  };

  const openEditStopModal = (st: Stop) => {
    setEditingStop(st);
    setStopName(st.stop_name || (st as any).name || '');
    const rawIdx = rawRouteStops.findIndex((s) => s.id === st.id);
    const pos = rawIdx >= 0 ? rawIdx + 1 : (st.stop_order || 1);
    setStopPosition(pos);
    setLatitude(st.latitude);
    setLongitude(st.longitude);
    const mTime = st.morning_time || st.estimated_arrival || '07:45 AM';
    const eTime = st.evening_time || '04:45 PM';
    setMorningTime(mTime);
    setEveningTime(eTime);
    const existingUrl = st.google_maps_link || `https://www.google.com/maps?q=${st.latitude},${st.longitude}`;
    setStopMapsLink(existingUrl);
    setStopLinkParsedMsg(st.google_maps_link ? '✓ Existing Google Maps URL loaded' : '');
    setIsStopModalOpen(true);
  };

  // Save Stop with Position Change Support (Moves Up/Down automatically if position changed)
  const handleSaveStopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stopName.trim() || !selectedRoute) return;

    if (editingStop) {
      const updatedStop: Stop = {
        ...editingStop,
        stop_name: stopName,
        latitude: Number(latitude),
        longitude: Number(longitude),
        morning_time: morningTime,
        evening_time: eveningTime,
        estimated_arrival: activeShiftView === 'morning' ? morningTime : eveningTime,
        google_maps_link: stopMapsLink.trim() || undefined,
        // Alias
        ...({ name: stopName }),
      };

      const currentIdx = rawRouteStops.findIndex((s) => s.id === editingStop.id);
      const targetPos = Math.max(1, Math.min(rawRouteStops.length, stopPosition));

      if (currentIdx >= 0 && targetPos !== currentIdx + 1) {
        // Position changed! Re-splice array and re-index cleanly 1..N
        const currentList = [...rawRouteStops];
        currentList.splice(currentIdx, 1);
        currentList.splice(targetPos - 1, 0, updatedStop);
        const reindexed = currentList.map((st, i) => ({ ...st, stop_order: i + 1 }));

        if (onReorderStops) {
          onReorderStops(selectedRoute.id, reindexed);
        } else if (onSaveStop) {
          reindexed.forEach(st => onSaveStop(st));
        }
        showToast(`Saved stop "${stopName}" & moved to Position #${targetPos}`);
      } else {
        if (onSaveStop) onSaveStop(updatedStop);
        showToast(`Saved changes to stop "${stopName}"`);
      }
    } else {
      const newStop: Stop = {
        id: 'st_' + Date.now(),
        route_id: selectedRoute.id,
        stop_name: stopName,
        latitude: Number(latitude),
        longitude: Number(longitude),
        stop_order: stopPosition || (rawRouteStops.length + 1),
        morning_time: morningTime,
        evening_time: eveningTime,
        estimated_arrival: activeShiftView === 'morning' ? morningTime : eveningTime,
        google_maps_link: stopMapsLink.trim() || undefined,
        status: 'active',
        // Alias
        ...({ name: stopName }),
      };

      if (stopPosition <= rawRouteStops.length) {
        const currentList = [...rawRouteStops];
        const targetIdx = Math.max(0, Math.min(currentList.length, stopPosition - 1));
        currentList.splice(targetIdx, 0, newStop);
        const reindexed = currentList.map((st, i) => ({ ...st, stop_order: i + 1 }));

        if (onReorderStops) {
          onReorderStops(selectedRoute.id, reindexed);
        } else if (onSaveStop) {
          reindexed.forEach(st => onSaveStop(st));
        }
        showToast(`Added stop #${stopPosition} "${stopName}"`);
      } else {
        if (onSaveStop) onSaveStop(newStop);
        showToast(`Added stop #${newStop.stop_order} "${stopName}"`);
      }
    }
    setIsStopModalOpen(false);
  };

  const exportCSV = () => {
    if (!routes.length) return;
    const headers = [
      'Route Name',
      'Start Terminal (Morning)',
      'Campus Destination',
      'Morning Shift Schedule',
      'Evening Shift Schedule',
      'Distance (km)',
      'Est Duration',
      'Assigned Bus',
      'Stops Count',
      'Status'
    ];

    const rows = routes.map((r) => {
      const rStops = stops.filter(s => s.route_id === r.id);
      const b = buses.find(bus => bus.route_id === r.id);
      return [
        `"${r.route_name || (r as any).name || ''}"`,
        `"${r.start_location || (r as any).start_point || ''}"`,
        `"${r.destination || (r as any).end_point || ''}"`,
        `"${r.start_time || '07:30 AM'} - ${r.end_time || '08:20 AM'}"`,
        `"${r.evening_start_time || '04:30 PM'} - ${r.evening_end_time || '05:25 PM'}"`,
        `"${r.distance_km || 18.5}"`,
        `"${r.estimated_duration || '45 mins'}"`,
        `"${b ? b.bus_number : 'Unassigned'}"`,
        `"${rStops.length}"`,
        `"${r.status || 'active'}"`,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `ritbus-routes-schedule-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <>
      {/* Toast Notification */}
      {successToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: 'var(--green-soft)',
          border: '1px solid var(--green)',
          color: 'var(--green)',
          padding: '10px 16px',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-pop)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600,
          fontSize: '13px'
        }}>
          <CheckCircle2 size={16} />
          <span>{successToast}</span>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="section-intro">
        <div>
          <span className="eyebrow section-eyebrow">
            <span className="eyebrow-dot" /> ROUTES & STOPS MANAGEMENT
          </span>
          <h1>
            Routes<span className="headline-period">.</span>
          </h1>
          <p>Configure route corridors, morning & evening shift schedules, waypoint stops with position reordering (Up/Down), and individual Google Maps location URLs.</p>
        </div>
        <div className="section-summary">
          <strong>{routes.length}</strong>
          <span>corridors ({stops.length} stops)</span>
        </div>
      </div>

      {/* 2. Primary Shift Switcher (Morning & Evening) */}
      <div className="change-type-tabs" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={activeShiftView === 'morning' ? 'active' : ''}
            onClick={() => setActiveShiftView('morning')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
          >
            <Sunrise size={15} style={{ color: activeShiftView === 'morning' ? '#d97706' : 'inherit' }} />
            <span>Morning Shift (Pickup ➔ Campus)</span>
          </button>
          <button
            type="button"
            className={activeShiftView === 'evening' ? 'active' : ''}
            onClick={() => setActiveShiftView('evening')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
          >
            <Sunset size={15} style={{ color: activeShiftView === 'evening' ? '#6366f1' : 'inherit' }} />
            <span>Evening Shift (Campus ➔ Return Stops)</span>
          </button>
        </div>

        <div style={{ fontSize: '11.5px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Corridor Flow:</span>
          {activeShiftView === 'morning' ? (
            <strong style={{ color: 'var(--ink)' }}>Town Terminals ➔ RIT Campus (1..N sequence)</strong>
          ) : (
            <strong style={{ color: 'var(--ink)' }}>RIT Campus ➔ Town Terminals (Reverse drop sequence)</strong>
          )}
        </div>
      </div>

      {/* 3. Data Toolbar */}
      <div className="data-toolbar">
        <div className="data-toolbar-left">
          <label className="table-search">
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search route name, stop, terminal..."
            />
            <kbd>/</kbd>
          </label>

          <label className="select-wrap">
            <Filter size={14} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <ChevronDown size={13} />
          </label>
        </div>

        <div className="data-toolbar-right">
          <button className="button button-quiet" onClick={exportCSV}>
            <Download size={15} /> Export CSV
          </button>
          {isEditable && (
            <button className="button button-primary" onClick={openCreateRouteModal}>
              <Plus size={16} /> Create new route
            </button>
          )}
        </div>
      </div>

      {/* 4. Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
        
        {/* Left Column: Route Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--muted)', textTransform: 'uppercase' }}>
              Corridor Directory ({filteredRoutes.length})
            </span>
            <small style={{ fontSize: '11px', color: 'var(--muted)' }}>Select corridor</small>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: 'calc(100vh - 270px)', overflowY: 'auto', paddingRight: '2px' }}>
            {filteredRoutes.map((r) => {
              const rStops = stops.filter((s) => s.route_id === r.id);
              const isSelected = selectedRoute?.id === r.id;
              const color = r.route_color || '#2563eb';
              const rBus = buses.find((b) => b.route_id === r.id);
              const rName = r.route_name || (r as any).name || 'Unnamed Route';
              const startLoc = r.start_location || (r as any).start_point || 'Terminal';
              const destLoc = r.destination || (r as any).end_point || 'RIT Campus';

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRouteId(r.id)}
                  style={{
                    background: 'var(--panel)',
                    border: `1.5px solid ${isSelected ? color : 'var(--border)'}`,
                    borderRadius: '12px',
                    padding: '13px 14px',
                    cursor: 'pointer',
                    position: 'relative',
                    boxShadow: isSelected ? 'var(--shadow)' : 'none',
                    transition: 'all 0.16s ease',
                  }}
                >
                  {/* Left Accent Bar */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '5px',
                        backgroundColor: color,
                        borderTopLeftRadius: '11px',
                        borderBottomLeftRadius: '11px',
                      }}
                    />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: color,
                          flexShrink: 0,
                        }}
                      />
                      <strong style={{ fontSize: '13px', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {rName}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                      <span className="status-badge status-neutral" style={{ fontSize: '10px', padding: '2px 7px' }}>
                        {rStops.length} stops
                      </span>
                      {isEditable && (
                        <>
                          <button
                            type="button"
                            className="icon-button"
                            style={{ width: '24px', height: '24px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditRouteModal(r);
                            }}
                            title="Edit route details & route name"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            style={{ width: '24px', height: '24px', color: 'var(--red)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoutePrompt(r);
                            }}
                            title="Delete route"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Terminal Row */}
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-2)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {activeShiftView === 'morning' ? startLoc : destLoc}
                    </span>
                    <ArrowRight size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {activeShiftView === 'morning' ? destLoc : startLoc}
                    </span>
                  </div>

                  {/* Bottom Schedule Timings & Assigned Bus */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginTop: '8px', paddingTop: '7px', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {activeShiftView === 'morning'
                        ? `${r.start_time || '07:30 AM'} → ${r.end_time || '08:20 AM'}`
                        : `${r.evening_start_time || '04:30 PM'} → ${r.evening_end_time || '05:25 PM'}`}
                    </span>
                    {rBus ? (
                      <span className="bus-tag" style={{ fontWeight: 600 }}>
                        {rBus.bus_number}
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', color: 'var(--muted-2)' }}>No bus assigned</span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredRoutes.length === 0 && (
              <div className="panel" style={{ padding: '24px 16px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>No routes match your search.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Route Details & Stops Sequencer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {selectedRoute ? (
            <>
              {/* Selected Route Top Panel */}
              <div className="panel" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        backgroundColor: selectedRoute.route_color || '#2563eb',
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                          {selectedRoute.route_name || (selectedRoute as any).name}
                        </h2>
                        {assignedBus && (
                          <span className="status-badge status-positive">
                            {assignedBus.bus_number} ({assignedBus.registration_number || 'TN 67 AM 9785'})
                          </span>
                        )}
                        {assignedBus?.is_standby_replacement && (
                          <span className="status-badge status-warning">
                            STANDBY VEHICLE SWAPPED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span>Distance: <strong style={{ color: 'var(--ink-2)' }}>{selectedRoute.distance_km || 18.5} km</strong></span>
                        <span>•</span>
                        <span>Est Duration: <strong style={{ color: 'var(--ink-2)' }}>{selectedRoute.estimated_duration || '45 mins'}</strong></span>
                        <span>•</span>
                        <span>
                          Driver:{' '}
                          <strong style={{ color: 'var(--ink-2)' }}>
                            {assignedDriver?.profile?.name || assignedDriver?.name || 'Unassigned'}
                          </strong>
                          {assignedDriver?.phone && ` (${assignedDriver.phone})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Selected Route */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isEditable && (
                      <>
                        <button
                          type="button"
                          className="button button-quiet"
                          onClick={() => openEditRouteModal(selectedRoute)}
                          title="Edit Route Name, Morning & Evening Times, Color, and Terminals"
                        >
                          <Pencil size={14} />
                          <span>Edit route</span>
                        </button>
                        <button
                          type="button"
                          className="button button-primary"
                          onClick={openAddStopModal}
                        >
                          <Plus size={15} />
                          <span>Add stop</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Terminals & Shift Times Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ padding: '10px 12px', background: 'var(--panel-soft)', border: '1px solid var(--border)', borderRadius: '9px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      🌅 Morning Schedule
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', marginTop: '4px' }}>
                      {selectedRoute.start_time || '07:30 AM'} ➔ {selectedRoute.end_time || '08:20 AM'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                      {selectedRoute.start_location || 'Old Bus Stand'} ➔ {selectedRoute.destination || 'RIT Campus'}
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', background: 'var(--panel-soft)', border: '1px solid var(--border)', borderRadius: '9px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      🌆 Evening Schedule
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', marginTop: '4px' }}>
                      {selectedRoute.evening_start_time || '04:30 PM'} ➔ {selectedRoute.evening_end_time || '05:25 PM'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                      {selectedRoute.destination || 'RIT Campus'} ➔ {selectedRoute.start_location || 'Old Bus Stand'} (Reverse)
                    </div>
                  </div>

                  {selectedRoute.google_maps_link && (
                    <div style={{ padding: '10px 12px', background: 'var(--panel-soft)', border: '1px solid var(--border)', borderRadius: '9px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                        Route Corridor Directions Link
                      </div>
                      <a
                        href={selectedRoute.google_maps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}
                      >
                        <span>Open Route in Google Maps</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>

                {/* Interactive Leaflet Route Map */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ink)' }}>
                      Corridor Map & Plotted Waypoint Markers ({rawRouteStops.length} stops)
                    </span>
                    {assignedBus && (
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        Vehicle: <strong>{assignedBus.bus_number}</strong>
                      </span>
                    )}
                  </div>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <LiveFleetMap
                      locations={[]}
                      buses={assignedBus ? [assignedBus] : buses}
                      routes={[selectedRoute]}
                      stops={rawRouteStops}
                      selectedBusId={assignedBus?.id}
                      height="280px"
                      showRouteSelector={false}
                    />
                  </div>
                </div>
              </div>

              {/* Stops Sequencer & Waypoints Table Panel */}
              <div className="panel table-panel">
                <div className="table-meta" style={{ height: 'auto', padding: '12px 16px', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ListOrdered size={15} style={{ color: 'var(--muted)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 650, color: 'var(--ink)' }}>
                      Stop Sequence & Scheduled Shift Timings
                    </span>
                    <span className="status-badge status-neutral" style={{ fontSize: '10px' }}>
                      {displayStops.length} stops
                    </span>
                  </div>

                  {/* Alignment & ETA calculation tools */}
                  {isEditable && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="button button-quiet"
                        style={{ minHeight: '28px', fontSize: '11px', padding: '0 8px' }}
                        onClick={handleRecalculateArrivalTimes}
                        title="Auto-calculate progressive arrival times for morning & evening shifts"
                      >
                        <Clock size={12} />
                        <span>Auto-ETAs</span>
                      </button>
                      <button
                        type="button"
                        className="button button-quiet"
                        style={{ minHeight: '28px', fontSize: '11px', padding: '0 8px' }}
                        onClick={handleAutoAlignSequence}
                        title="Normalize sequence numbers 1 to N"
                      >
                        <RefreshCw size={12} />
                        <span>Align 1..N</span>
                      </button>
                      <button
                        type="button"
                        className="button button-quiet"
                        style={{ minHeight: '28px', fontSize: '11px', padding: '0 8px' }}
                        onClick={handleReverseAllStops}
                        title="Invert full sequence"
                      >
                        <span>Invert corridor</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '60px', textAlign: 'center' }}>S.No</th>
                        <th>Stop Landmark Name</th>
                        <th style={{ color: activeShiftView === 'morning' ? '#d97706' : 'inherit' }}>
                          🌅 Morning Scheduled
                        </th>
                        <th style={{ color: activeShiftView === 'evening' ? '#6366f1' : 'inherit' }}>
                          🌆 Evening Scheduled
                        </th>
                        <th className="actions-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayStops.map((stop, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === displayStops.length - 1;
                        const rawIndex = rawRouteStops.findIndex((s) => s.id === stop.id);
                        const stopTitle = stop.stop_name || (stop as any).name || 'Stop';
                        const mTime = stop.morning_time || stop.estimated_arrival || '07:45 AM';
                        const eTime = stop.evening_time || '04:45 PM';

                        return (
                          <tr key={stop.id}>
                            {/* Serial No */}
                            <td style={{ textAlign: 'center', width: '60px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: 'var(--panel-soft)',
                                  border: '1px solid var(--border)',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: 'var(--muted)',
                                }}
                              >
                                {idx + 1}
                              </span>
                            </td>

                            {/* Stop Landmark Name */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong style={{ color: 'var(--ink)' }}>{stopTitle}</strong>
                                {isFirst && (
                                  <span className="status-badge status-positive" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                    {activeShiftView === 'morning' ? 'Origin' : 'Campus Terminal'}
                                  </span>
                                )}
                                {isLast && (
                                  <span className="status-badge status-danger" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                    {activeShiftView === 'morning' ? 'Campus Terminal' : 'Final Drop'}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Morning Scheduled Time */}
                            <td>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontFamily: 'monospace',
                                  fontSize: '11.5px',
                                  fontWeight: activeShiftView === 'morning' ? 700 : 500,
                                  color: activeShiftView === 'morning' ? '#b45309' : 'var(--ink-2)',
                                  background: activeShiftView === 'morning' ? 'var(--amber-soft)' : 'transparent',
                                  padding: activeShiftView === 'morning' ? '2px 6px' : '0',
                                  borderRadius: '5px',
                                }}
                              >
                                {mTime}
                              </span>
                            </td>

                            {/* Evening Scheduled Time */}
                            <td>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontFamily: 'monospace',
                                  fontSize: '11.5px',
                                  fontWeight: activeShiftView === 'evening' ? 700 : 500,
                                  color: activeShiftView === 'evening' ? '#4f46e5' : 'var(--ink-2)',
                                  background: activeShiftView === 'evening' ? 'var(--violet-soft)' : 'transparent',
                                  padding: activeShiftView === 'evening' ? '2px 6px' : '0',
                                  borderRadius: '5px',
                                }}
                              >
                                {eTime}
                              </span>
                            </td>

                            {/* Row Actions */}
                            <td>
                              <div className="row-actions">
                                {isEditable && (
                                  <>
                                    <button
                                      type="button"
                                      className="icon-button row-edit"
                                      onClick={() => openEditStopModal(stop)}
                                      title="Edit stop details, position (order), and Google Maps URL"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      className="icon-button row-delete"
                                      onClick={() => {
                                        if (window.confirm(`Delete stop "${stopTitle}"?`)) {
                                          if (onDeleteStop) onDeleteStop(stop.id);
                                          showToast(`Deleted stop "${stopTitle}"`);
                                        }
                                      }}
                                      title="Delete stop"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {displayStops.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '32px 16px' }}>
                            <div className="empty-state">
                              <span><MapPin size={20} /></span>
                              <strong>No stops added yet</strong>
                              <p>Add waypoint stops along this corridor with individual Google Maps GPS links.</p>
                              {isEditable && (
                                <button type="button" className="button button-primary" onClick={openAddStopModal}>
                                  <Plus size={14} /> Add first stop
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <RouteIcon size={32} style={{ color: 'var(--muted)', margin: '0 auto 12px' }} />
              <h3 style={{ margin: 0, color: 'var(--ink)' }}>No Route Selected</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                Select a corridor from the left directory or create a new route.
              </p>
              {isEditable && (
                <button type="button" className="button button-primary" onClick={openCreateRouteModal} style={{ marginTop: '12px' }}>
                  <Plus size={15} /> Create route
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. Route Modal */}
      {isRouteModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsRouteModalOpen(false);
          }}
        >
          <section className="modal" role="dialog" aria-modal="true" style={{ maxWidth: '640px' }}>
            <header className="modal-header">
              <div>
                <span className="modal-kicker">
                  <span className="eyebrow-dot" /> CORRIDOR CONFIGURATION
                </span>
                <h2>{editingRoute ? 'Edit Route Corridor' : 'Create New Route Corridor'}</h2>
                <p>
                  {editingRoute
                    ? 'Update the route name, morning & evening shift schedules, terminals, and color.'
                    : 'Create a new campus bus corridor with shift times and waypoint stops.'}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsRouteModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </header>

            <form className="record-form" onSubmit={handleSaveRouteSubmit}>
              <div className="record-form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {/* Route Name: Always displayed and editable! */}
                <label style={{ gridColumn: 'span 2' }}>
                  Route Name (Corridor Identifier)
                  <input
                    type="text"
                    required
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder="e.g. Route 1: Express Corridor"
                    style={{ fontWeight: 600 }}
                  />
                  <small style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    Displayed across admin tracking, student passes, and driver rosters.
                  </small>
                </label>

                <label>
                  Start Terminal (Morning Origin)
                  <input
                    type="text"
                    required
                    value={startLocation}
                    onChange={(e) => setStartLocation(e.target.value)}
                    placeholder="e.g. Rajapalayam Old Bus Stand"
                  />
                </label>

                <label>
                  Campus Destination (Morning Drop)
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Ramco Institute of Technology Campus"
                  />
                </label>

                {/* Morning Shift Timings */}
                <label>
                  🌅 Morning Departure Time
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="07:30 AM"
                  />
                </label>

                <label>
                  🌅 Morning Campus Arrival Time
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="08:20 AM"
                  />
                </label>

                {/* Evening Shift Timings */}
                <label>
                  🌆 Evening Campus Departure Time
                  <input
                    type="text"
                    value={eveningStartTime}
                    onChange={(e) => setEveningStartTime(e.target.value)}
                    placeholder="04:30 PM"
                  />
                </label>

                <label>
                  🌆 Evening Final Drop Arrival Time
                  <input
                    type="text"
                    value={eveningEndTime}
                    onChange={(e) => setEveningEndTime(e.target.value)}
                    placeholder="05:25 PM"
                  />
                </label>

                <label>
                  Total Distance (km)
                  <input
                    type="number"
                    step="0.1"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                  />
                </label>

                <label>
                  Estimated Duration
                  <input
                    type="text"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                    placeholder="45 mins"
                  />
                </label>

                <label>
                  Corridor Status
                  <select
                    value={routeStatus}
                    onChange={(e) => setRouteStatus(e.target.value as any)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>

                {/* Route Color Picker */}
                <label>
                  Route Color Identifier
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="color"
                      value={routeColor}
                      onChange={(e) => setRouteColor(e.target.value)}
                      style={{ width: '38px', height: '36px', padding: '2px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border)' }}
                    />
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {ROUTE_COLOR_PRESETS.map((p) => (
                        <button
                          key={p.color}
                          type="button"
                          onClick={() => setRouteColor(p.color)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            backgroundColor: p.color,
                            border: routeColor === p.color ? '2px solid var(--ink)' : '1px solid var(--border)',
                            cursor: 'pointer',
                          }}
                          title={p.label}
                        />
                      ))}
                    </div>
                  </div>
                </label>

                {/* Route Google Maps Link */}
                <label style={{ gridColumn: 'span 2' }}>
                  Route Google Maps Link / Directions URL (Optional)
                  <input
                    type="text"
                    value={routeMapsLink}
                    onChange={(e) => setRouteMapsLink(e.target.value)}
                    placeholder="https://maps.app.goo.gl/... or Google Maps Directions URL"
                  />
                </label>
              </div>

              <div className="modal-note">
                <ShieldCheck size={14} /> Schedule changes sync instantly across Driver App rosters, live map tracking, and student dashboards.
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setIsRouteModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  {editingRoute ? 'Save changes' : 'Create route'} <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* 6. Stop Modal (With Position Change Up/Down & Map URL Options) */}
      {isStopModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsStopModalOpen(false);
          }}
        >
          <section className="modal" role="dialog" aria-modal="true" style={{ maxWidth: '580px' }}>
            <header className="modal-header">
              <div>
                <span className="modal-kicker">
                  <span className="eyebrow-dot" /> WAYPOINT MANAGEMENT
                </span>
                <h2>{editingStop ? `Edit Stop: ${editingStop.stop_name || (editingStop as any).name}` : 'Add Route Stop Waypoint'}</h2>
                <p>Configure stop landmark name, sequence position (Move Up / Down), and Google Maps URL.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsStopModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </header>

            <form className="record-form" onSubmit={handleSaveStopSubmit}>
              <div className="record-form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {/* Stop Name */}
                <label style={{ gridColumn: 'span 2' }}>
                  Stop Landmark Name
                  <input
                    type="text"
                    required
                    value={stopName}
                    onChange={(e) => setStopName(e.target.value)}
                    placeholder="e.g. Gandhi Statue Junction, PACR Mill"
                    style={{ fontWeight: 600 }}
                  />
                </label>

                {/* Stop Position in Route with Up and Down Buttons */}
                <label style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Stop Position in Corridor (Order Sequence)</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                      Current: Position #{stopPosition} {stopPosition === 1 ? '(Origin)' : stopPosition === (rawRouteStops.length + (editingStop ? 0 : 1)) ? '(Final Drop)' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <select
                      value={stopPosition}
                      onChange={(e) => setStopPosition(Number(e.target.value))}
                      style={{ flex: 1, padding: '7px 10px', fontWeight: 600 }}
                    >
                      {Array.from({ length: rawRouteStops.length + (editingStop ? 0 : 1) }).map((_, pIdx) => (
                        <option key={pIdx + 1} value={pIdx + 1}>
                          Position #{pIdx + 1} {pIdx === 0 ? '(Origin Waypoint)' : pIdx === (rawRouteStops.length + (editingStop ? 0 : 1) - 1) ? '(Final Terminal)' : ''}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="button button-quiet"
                      disabled={stopPosition <= 1}
                      onClick={() => setStopPosition((p) => Math.max(1, p - 1))}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      title="Move position UP"
                    >
                      <ArrowUp size={13} /> Move Up
                    </button>

                    <button
                      type="button"
                      className="button button-quiet"
                      disabled={stopPosition >= (rawRouteStops.length + (editingStop ? 0 : 1))}
                      onClick={() => setStopPosition((p) => Math.min((rawRouteStops.length + (editingStop ? 0 : 1)), p + 1))}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      title="Move position DOWN"
                    >
                      <ArrowDown size={13} /> Move Down
                    </button>
                  </div>
                  <small style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '3px', display: 'block' }}>
                    Use the selector or Move Up/Down buttons to re-order this stop relative to other waypoints.
                  </small>
                </label>

                {/* Google Maps URL for this Stop Position */}
                <label style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>Google Maps URL for Stop Position</span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {stopMapsLink && (
                        <a
                          href={stopMapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '11px', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', fontWeight: 600 }}
                        >
                          <ExternalLink size={11} /> Test Map Link
                        </a>
                      )}
                      <button
                        type="button"
                        style={{ border: 'none', background: 'transparent', color: '#2563eb', fontSize: '11px', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                        onClick={() => {
                          const genUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                          setStopMapsLink(genUrl);
                          setStopLinkParsedMsg(`✓ Generated Google Maps URL from Lat: ${latitude}, Lng: ${longitude}`);
                        }}
                      >
                        Auto-generate from GPS
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <input
                      type="text"
                      value={stopMapsLink}
                      onChange={(e) => handleParseStopMapsLink(e.target.value)}
                      placeholder="e.g. https://maps.app.goo.gl/... or https://www.google.com/maps?q=9.4490,77.5472"
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: '12px' }}
                    />
                    <button
                      type="button"
                      className="button button-quiet"
                      disabled={!stopMapsLink.trim() || isResolvingStopUrl}
                      onClick={() => handleParseStopMapsLink(stopMapsLink)}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {isResolvingStopUrl ? <Loader2 size={13} className="animate-spin" /> : <span>Resolve GPS</span>}
                    </button>
                  </div>
                  <small style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '3px', display: 'block' }}>
                    Paste any Google Maps share link, short URL (`maps.app.goo.gl`), or coordinates. GPS will automatically extract.
                  </small>
                  {stopLinkParsedMsg && (
                    <small style={{ fontSize: '11px', color: stopLinkParsedMsg.startsWith('✓') ? 'var(--green)' : 'var(--amber)', marginTop: '4px', display: 'block' }}>
                      {stopLinkParsedMsg}
                    </small>
                  )}
                </label>

                {/* GPS Position Coordinates */}
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--panel-soft)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 650, color: 'var(--ink)' }}>
                    <MapPin size={13} style={{ color: 'var(--accent)' }} />
                    <span>GPS Position:</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--muted)', fontWeight: 600 }}>
                      {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '11px', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none', fontWeight: 600 }}
                  >
                    <span>Test GPS on Maps</span>
                    <ExternalLink size={10} />
                  </a>
                </div>

                {/* Latitude & Longitude */}
                <label>
                  Latitude (GPS North/South)
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(Number(e.target.value))}
                    style={{ fontFamily: 'monospace' }}
                  />
                </label>

                <label>
                  Longitude (GPS East/West)
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(Number(e.target.value))}
                    style={{ fontFamily: 'monospace' }}
                  />
                </label>

                {/* Morning & Evening Times */}
                <label>
                  🌅 Morning Scheduled Time
                  <input
                    type="text"
                    value={morningTime}
                    onChange={(e) => setMorningTime(e.target.value)}
                    placeholder="07:45 AM"
                    style={{ fontWeight: 600, color: '#b45309' }}
                  />
                  <small style={{ fontSize: '10.5px', color: 'var(--muted)' }}>Pickup corridor arrival</small>
                </label>

                <label>
                  🌆 Evening Scheduled Time
                  <input
                    type="text"
                    value={eveningTime}
                    onChange={(e) => setEveningTime(e.target.value)}
                    placeholder="04:45 PM"
                    style={{ fontWeight: 600, color: '#4f46e5' }}
                  />
                  <small style={{ fontSize: '10.5px', color: 'var(--muted)' }}>Return drop corridor arrival</small>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setIsStopModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  {editingStop ? 'Save stop changes' : 'Add waypoint'} <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}


    </>
  );
};
