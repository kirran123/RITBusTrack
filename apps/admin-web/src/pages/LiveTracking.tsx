import React, { useState } from 'react';
import { LiveFleetMap } from '../components/LiveFleetMap';
import {
  CurrentBusLocation,
  Route,
  Stop,
  Bus,
  Driver,
  Student,
  calculateStopLiveETA,
  calculateDynamicETA,
  calculateDistanceKm,
  formatDistance,
} from '@college-bus/shared';
import {
  MapPin,
  Navigation,
  Bus as BusIcon,
  User,
  Phone,
  Gauge,
  ShieldAlert,
  Layers,
  Radio,
  Clock,
  Compass,
  GraduationCap,
  Sparkles,
  AlertTriangle,
  Play,
  CheckCircle2,
  Flag,
  Search,
  Calendar,
  Eye,
  Sliders,
  Bell,
  ArrowRight,
  Plus,
  Trash2,
  Edit2,
  Link as LinkIcon,
  ExternalLink,
  Check,
  X,
  Palette,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { parseGoogleMapsLink, parseGoogleMapsDirections } from '../lib/googleMapsParser';

const ROUTE_COLOR_PRESETS = [
  { label: 'Royal Blue (Bus 01)', color: '#2563eb' },
  { label: 'Emerald Green (Bus 02)', color: '#10b981' },
  { label: 'Amber Gold (Bus 03)', color: '#f59e0b' },
  { label: 'Violet Purple (Bus 04)', color: '#8b5cf6' },
  { label: 'Crimson Rose (Bus 05)', color: '#f43f5e' },
  { label: 'Cyan Ocean (Bus 06)', color: '#06b6d4' },
];

interface LiveTrackingProps {
  locations: CurrentBusLocation[];
  routes: Route[];
  stops: Stop[];
  buses: Bus[];
  drivers: Driver[];
  students: Student[];
  onToggleStudentLeave: (studentId: string) => void;
  onAdvanceBusStop?: (busId: string) => void;
  onSaveBus?: (bus: Bus) => void;
  onSaveDriver?: (driver: Driver) => void;
  onSaveStudent?: (student: Student) => void;
  onSaveRoute?: (route: Route) => void;
  onSaveStop?: (stop: Stop) => void;
  onDeleteStop?: (stopId: string) => void;
  onReorderStops?: (routeId: string, newRouteStops: Stop[]) => void;
  onSubstituteDriver?: (busId: string, substituteDriverId: string, reason?: string) => void;
  onSwapBus?: (routeId: string, newBusId: string, reason?: string) => void;
  onRevertSubstituteDriver?: (busId: string) => void;
  onRevertBusSwap?: (routeId: string) => void;
  currentUser?: any;
  canEdit?: boolean;
}

export const LiveTracking: React.FC<LiveTrackingProps> = ({
  locations,
  routes,
  stops,
  buses,
  drivers,
  students,
  onToggleStudentLeave,
  onAdvanceBusStop,
  onSaveBus,
  onSaveDriver,
  onSaveStudent,
  onSaveRoute,
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
  // Mode switcher: 'fleet' | 'driver' | 'student'
  const [activeMode, setActiveMode] = useState<'fleet' | 'driver' | 'student'>('fleet');
  const [selectedBusId, setSelectedBusId] = useState<string>(buses[0]?.id || 'b1');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || 's1');
  const [manifestSearch, setManifestSearch] = useState('');
  const [manifestStopFilter, setManifestStopFilter] = useState('all');
  const [scheduleType, setScheduleType] = useState<'morning' | 'evening'>('morning');

  // Quick Action Modal States
  const [isAddBusOpen, setIsAddBusOpen] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isRouteConfigOpen, setIsRouteConfigOpen] = useState(false);

  // Substitute Driver & Bus Swap Modal States
  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState(false);
  const [selectedSubDriverId, setSelectedSubDriverId] = useState('');
  const [substituteReason, setSubstituteReason] = useState('Regular Driver On Emergency Leave');

  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [selectedReplacementBusId, setSelectedReplacementBusId] = useState('');
  const [swapReason, setSwapReason] = useState('Bus Breakdown / Emergency Maintenance');

  // Add Bus Form State
  const [busNumber, setBusNumber] = useState(`BUS-0${buses.length + 1}`);
  const [registrationNumber, setRegistrationNumber] = useState(`TN 84 AX ${1000 + buses.length + 1}`);
  const [busName, setBusName] = useState(`Express Bus ${buses.length + 1}`);
  const [busCapacity, setBusCapacity] = useState(55);
  const [busRouteId, setBusRouteId] = useState(routes[0]?.id || '');
  const [busDriverId, setBusDriverId] = useState(drivers[0]?.id || '');

  // Add Driver Form State
  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState(`driver${drivers.length + 1}@college.edu`);
  const [driverPhone, setDriverPhone] = useState('+91 98421 ');
  const [driverLicense, setDriverLicense] = useState(`DL-TN84-2024-00${drivers.length + 1}`);
  const [driverBusId, setDriverBusId] = useState(buses[0]?.id || '');

  // Add Student Form State
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState(`student${students.length + 1}@college.edu`);
  const [studentReg, setStudentReg] = useState(`9536211040${students.length + 10}`);
  const [studentDept, setStudentDept] = useState('Computer Science');
  const [studentYear, setStudentYear] = useState(4);
  const [studentSection, setStudentSection] = useState('A');
  const [studentBusId, setStudentBusId] = useState(buses[0]?.id || '');
  const [studentStopId, setStudentStopId] = useState(stops[0]?.id || '');

  // Route & Google Maps Precision Stops Configurator State
  const [configRouteId, setConfigRouteId] = useState(routes[0]?.id || '');
  const [configStartName, setConfigStartName] = useState(routes[0]?.start_location || 'Rajapalayam New Bus Stand');
  const [configStartGoogleLink, setConfigStartGoogleLink] = useState('');
  const [configStartParsedMsg, setConfigStartParsedMsg] = useState('');
  const [configStartLat, setConfigStartLat] = useState(9.4475);
  const [configStartLng, setConfigStartLng] = useState(77.5450);
  const [configStartTime, setConfigStartTime] = useState('07:30 AM');

  const [configDestName, setConfigDestName] = useState(routes[0]?.destination || 'RIT College Campus Hub');
  const [configDestGoogleLink, setConfigDestGoogleLink] = useState('');
  const [configDestParsedMsg, setConfigDestParsedMsg] = useState('');
  const [configDestLat, setConfigDestLat] = useState(9.4005);
  const [configDestLng, setConfigDestLng] = useState(77.8010);
  const [configEndTime, setConfigEndTime] = useState('08:20 AM');
  const [configRouteColor, setConfigRouteColor] = useState(routes[0]?.route_color || '#2563eb');

  // Add Stop in Configurator
  const [newStopName, setNewStopName] = useState('');
  const [newStopGoogleLink, setNewStopGoogleLink] = useState('');
  const [newStopParsedMsg, setNewStopParsedMsg] = useState('');
  const [newStopLat, setNewStopLat] = useState(9.4491);
  const [newStopLng, setNewStopLng] = useState(77.5482);
  const [newStopArrival, setNewStopArrival] = useState('07:38 AM');
  const [newStopOrder, setNewStopOrder] = useState(2);

  // Driver simulation state in Admin
  const [currentStopIndex, setCurrentStopIndex] = useState(1);
  const [isTripActive, setIsTripActive] = useState(true);
  const [elapsedMinutes, setElapsedMinutes] = useState(14);

  const selectedBus = buses.find((b) => b.id === selectedBusId) || buses[0];
  const selectedLoc = locations.find((l) => l.bus_id === selectedBus?.id) || locations[0];
  const selectedRoute = routes.find((r) => r.id === selectedBus?.route_id) || routes[0];
  const selectedDriver = drivers.find((d) => d.id === selectedBus?.assigned_driver_id) || drivers[0];

  const routeStops = stops
    .filter((s) => s.route_id === selectedRoute?.id)
    .sort((a, b) => a.stop_order - b.stop_order);

  const currentStop = routeStops[Math.min(currentStopIndex, routeStops.length - 1)] || routeStops[0];

  // Students on this bus
  const busStudents = students.filter(
    (s) => s.bus_id === selectedBus?.id || (!s.bus_id && (selectedBus?.bus_number === 'BUS-01' || selectedBus?.id === 'b1'))
  );

  const onLeaveStudents = busStudents.filter((s) => s.is_on_leave);
  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  // Boarding status calculation for Driver Manifest
  const getBoardingStatus = (student: Student) => {
    if (student.is_on_leave) {
      return { label: '⛔ ON LEAVE', color: 'text-rose-400 bg-rose-500/15 border-rose-500/30' };
    }
    const studentStop = stops.find((s) => s.id === student.boarding_stop_id);
    const stopIdx = studentStop ? routeStops.findIndex((s) => s.id === studentStop.id) : 1;

    if (stopIdx < currentStopIndex) {
      return { label: '✓ BOARDED', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
    }
    if (stopIdx === currentStopIndex) {
      return { label: '⚡ APPROACHING', color: 'text-sky-400 bg-sky-500/15 border-sky-500/30' };
    }
    return { label: '⏳ AWAITING', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' };
  };

  const boardedCount = busStudents.filter((s) => !s.is_on_leave && getBoardingStatus(s).label.includes('BOARDED')).length;
  const awaitingCount = busStudents.filter((s) => !s.is_on_leave && !getBoardingStatus(s).label.includes('BOARDED')).length;

  const filteredManifestStudents = busStudents.filter((s) => {
    const matchesSearch =
      (s.profile?.name || '').toLowerCase().includes(manifestSearch.toLowerCase()) ||
      s.register_number.toLowerCase().includes(manifestSearch.toLowerCase()) ||
      s.department.toLowerCase().includes(manifestSearch.toLowerCase());

    if (manifestStopFilter === 'on_leave') {
      return matchesSearch && s.is_on_leave;
    }
    const matchesStop = manifestStopFilter === 'all' || s.boarding_stop_id === manifestStopFilter;
    return matchesSearch && matchesStop;
  });

  // Google Maps Parsers
  const handleParseStartLink = (linkStr: string) => {
    setConfigStartGoogleLink(linkStr);
    if (!linkStr.trim()) {
      setConfigStartParsedMsg('');
      return;
    }
    const coords = parseGoogleMapsLink(linkStr);
    if (coords) {
      setConfigStartLat(coords.latitude);
      setConfigStartLng(coords.longitude);
      setConfigStartParsedMsg(`✅ Extracted Coordinates: Lat ${coords.latitude.toFixed(5)}, Lng ${coords.longitude.toFixed(5)}`);
    } else {
      setConfigStartParsedMsg('⚠️ Could not extract coordinates from link. Please enter manually or verify link format.');
    }
  };

  const handleParseDestLink = (linkStr: string) => {
    setConfigDestGoogleLink(linkStr);
    if (!linkStr.trim()) {
      setConfigDestParsedMsg('');
      return;
    }
    const coords = parseGoogleMapsLink(linkStr);
    if (coords) {
      setConfigDestLat(coords.latitude);
      setConfigDestLng(coords.longitude);
      setConfigDestParsedMsg(`✅ Extracted Coordinates: Lat ${coords.latitude.toFixed(5)}, Lng ${coords.longitude.toFixed(5)}`);
    } else {
      setConfigDestParsedMsg('⚠️ Could not extract coordinates from link. Please enter manually or verify link format.');
    }
  };

  const handleParseNewStopLink = (linkStr: string) => {
    setNewStopGoogleLink(linkStr);
    if (!linkStr.trim()) {
      setNewStopParsedMsg('');
      return;
    }
    const coords = parseGoogleMapsLink(linkStr);
    if (coords) {
      setNewStopLat(coords.latitude);
      setNewStopLng(coords.longitude);
      setNewStopParsedMsg(`✅ Extracted Coordinates: Lat ${coords.latitude.toFixed(5)}, Lng ${coords.longitude.toFixed(5)}`);
    } else {
      setNewStopParsedMsg('⚠️ Could not extract coordinates from link. Please enter manually or verify link format.');
    }
  };

  const handleAddStopToSequence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStopName.trim()) return;

    const stopToAdd: Stop = {
      id: 's_' + Date.now(),
      route_id: configRouteId,
      stop_name: newStopName,
      stop_order: Number(newStopOrder),
      latitude: Number(newStopLat),
      longitude: Number(newStopLng),
      estimated_arrival: newStopArrival,
      google_maps_link: newStopGoogleLink || undefined,
    };

    if (onSaveStop) {
      onSaveStop(stopToAdd);
    }

    setNewStopName('');
    setNewStopGoogleLink('');
    setNewStopParsedMsg('');
    setNewStopOrder((prev) => prev + 1);
  };

  const handleModalMoveStopUp = (index: number) => {
    const configStops = stops.filter(s => s.route_id === configRouteId).sort((a, b) => a.stop_order - b.stop_order);
    if (index <= 0 || !configRouteId) return;
    const currentList = [...configStops];
    const temp = currentList[index];
    currentList[index] = currentList[index - 1];
    currentList[index - 1] = temp;
    const reindexed = currentList.map((st, i) => ({ ...st, stop_order: i + 1 }));
    if (onReorderStops) {
      onReorderStops(configRouteId, reindexed);
    } else if (onSaveStop) {
      reindexed.forEach(st => onSaveStop(st));
    }
  };

  const handleModalMoveStopDown = (index: number) => {
    const configStops = stops.filter(s => s.route_id === configRouteId).sort((a, b) => a.stop_order - b.stop_order);
    if (index >= configStops.length - 1 || !configRouteId) return;
    const currentList = [...configStops];
    const temp = currentList[index];
    currentList[index] = currentList[index + 1];
    currentList[index + 1] = temp;
    const reindexed = currentList.map((st, i) => ({ ...st, stop_order: i + 1 }));
    if (onReorderStops) {
      onReorderStops(configRouteId, reindexed);
    } else if (onSaveStop) {
      reindexed.forEach(st => onSaveStop(st));
    }
  };

  const handleModalAutoAlign = () => {
    const configStops = stops.filter(s => s.route_id === configRouteId).sort((a, b) => a.stop_order - b.stop_order);
    if (!configRouteId || configStops.length === 0) return;
    const reindexed = configStops.map((st, i) => ({ ...st, stop_order: i + 1 }));
    if (onReorderStops) {
      onReorderStops(configRouteId, reindexed);
    } else if (onSaveStop) {
      reindexed.forEach(st => onSaveStop(st));
    }
  };

  const handleSaveRouteConfiguration = () => {
    const targetRoute = routes.find((r) => r.id === configRouteId);
    if (!targetRoute) return;

    const updatedRoute: Route = {
      ...targetRoute,
      start_location: configStartName,
      destination: configDestName,
      start_time: configStartTime,
      end_time: configEndTime,
      route_color: configRouteColor,
      google_maps_link: configStartGoogleLink || configDestGoogleLink || undefined,
    };

    if (onSaveRoute) {
      onSaveRoute(updatedRoute);
    }
    setIsRouteConfigOpen(false);
  };

  const handleCreateBus = (e: React.FormEvent) => {
    e.preventDefault();
    const newBus: Bus = {
      id: 'b_' + Date.now(),
      bus_number: busNumber,
      registration_number: registrationNumber,
      bus_name: busName,
      capacity: Number(busCapacity),
      route_id: busRouteId || null,
      assigned_driver_id: busDriverId || null,
      status: 'active',
      route: routes.find((r) => r.id === busRouteId),
      driver: drivers.find((d) => d.id === busDriverId),
    };
    if (onSaveBus) onSaveBus(newBus);
    setIsAddBusOpen(false);
  };

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    const newDriver: Driver = {
      id: 'd_' + Date.now(),
      user_id: 'u_' + Date.now(),
      license_number: driverLicense,
      assigned_bus_id: driverBusId || null,
      status: 'active',
      profile: {
        id: 'u_' + Date.now(),
        auth_user_id: 'auth_' + Date.now(),
        name: driverName,
        email: driverEmail,
        phone: driverPhone,
        role: 'driver',
        status: 'active',
      },
    };
    if (onSaveDriver) onSaveDriver(newDriver);
    setIsAddDriverOpen(false);
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const newStudent: Student = {
      id: 's_' + Date.now(),
      user_id: 'u_stu_' + Date.now(),
      register_number: studentReg,
      department: studentDept,
      year: Number(studentYear),
      section: studentSection,
      route_id: routes[0]?.id || null,
      bus_id: studentBusId || null,
      boarding_stop_id: studentStopId || null,
      is_on_leave: false,
      profile: {
        id: 'u_stu_' + Date.now(),
        auth_user_id: 'auth_stu_' + Date.now(),
        name: studentName,
        email: studentEmail,
        role: 'student',
        status: 'active',
      },
      boarding_stop: stops.find((s) => s.id === studentStopId),
    };
    if (onSaveStudent) onSaveStudent(newStudent);
    setIsAddStudentOpen(false);
  };

  return (
    <div className="space-y-4 min-h-[calc(100vh-90px)] flex flex-col">
      {/* Top Header with Multi-Perspective Command Mode Switcher */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-md">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center space-x-2 flex-wrap gap-y-1">
              <span>Live Bus Radar & Command Center</span>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                isEditable 
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                  : 'bg-slate-800 text-slate-400 border-slate-750'
              }`}>
                {isEditable ? 'SUPER ADMIN ACCESS' : 'VIEW-ONLY ACCESS'}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live bus operations, interactive driver cockpit, and student commuter radar.
            </p>
          </div>
        </div>

        {/* 3 Main Perspective Mode Tabs */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 space-x-1">
          <button
            onClick={() => setActiveMode('fleet')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center space-x-2 ${
              activeMode === 'fleet'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>🌐 All Buses Overview</span>
          </button>

          <button
            onClick={() => setActiveMode('driver')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center space-x-2 ${
              activeMode === 'driver'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>👨‍✈️ Driver Cockpit</span>
          </button>

          <button
            onClick={() => setActiveMode('student')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center space-x-2 ${
              activeMode === 'student'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>🎓 Student Radar</span>
          </button>
        </div>
      </div>

      {/* QUICK ADMIN ACTION MANAGEMENT BAR */}
      {isEditable && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black text-white">Quick Bus Management:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAddBusOpen(true)}
              className="px-3.5 py-2 bg-blue-600/15 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bus</span>
            </button>

            <button
              onClick={() => setIsAddDriverOpen(true)}
              className="px-3.5 py-2 bg-purple-600/15 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Driver</span>
            </button>

            <button
              onClick={() => setIsAddStudentOpen(true)}
              className="px-3.5 py-2 bg-emerald-600/15 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Student</span>
            </button>

            <button
              onClick={() => {
                setConfigRouteId(selectedRoute?.id || routes[0]?.id || '');
                setConfigStartName(selectedRoute?.start_location || 'Rajapalayam New Bus Stand');
                setConfigDestName(selectedRoute?.destination || 'RIT College Campus Hub');
                setConfigRouteColor(selectedRoute?.route_color || '#2563eb');
                setIsRouteConfigOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-black shadow-lg shadow-amber-600/25 transition-all flex items-center space-x-1.5"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>📍 Configure Route & Google Maps Points</span>
            </button>
          </div>
        </div>
      )}

      {/* Bus Selector Sub-Bar (Used across all modes) */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2 overflow-x-auto max-w-full pb-0.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 mr-1">
            Focus Bus:
          </span>
          {buses.map((bus) => {
            const isSelected = bus.id === selectedBus?.id;
            const route = routes.find((r) => r.id === bus.route_id);
            const color = route?.route_color || '#2563eb';

            return (
              <button
                key={bus.id}
                onClick={() => setSelectedBusId(bus.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center space-x-2 ${
                  isSelected
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
                style={{ borderColor: isSelected ? color : undefined }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span>{bus.bus_number}</span>
                {isSelected && <span className="text-[10px] text-emerald-400 font-extrabold">&bull; ACTIVE</span>}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Shift Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setScheduleType('morning')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center space-x-1.5 ${
                scheduleType === 'morning'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🌅 Morning Pickup</span>
            </button>
            <button
              onClick={() => setScheduleType('evening')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center space-x-1.5 ${
                scheduleType === 'evening'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🌆 Evening Return</span>
            </button>
          </div>

          {/* Substitute Driver Quick Action */}
          {isEditable && selectedBus && (
            <button
              onClick={() => {
                const available = drivers.filter(d => d.id !== selectedBus.assigned_driver_id);
                setSelectedSubDriverId(selectedBus.substitute_driver_id || available[0]?.id || '');
                setIsSubstituteModalOpen(true);
              }}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold transition-all flex items-center space-x-1"
              title="Deploy substitute driver for selected bus"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sub Driver</span>
            </button>
          )}

          {/* Swap Bus Quick Action */}
          {isEditable && selectedBus?.route_id && (
            <button
              onClick={() => {
                const available = buses.filter(b => b.id !== selectedBus.id);
                setSelectedReplacementBusId(available[0]?.id || '');
                setIsSwapModalOpen(true);
              }}
              className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl font-bold transition-all flex items-center space-x-1"
              title="Swap standby bus for this route"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Swap Bus</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: 🌐 FLEET OVERVIEW MAP & ALL BUSES GPS EXPLORER                   */}
      {/* ========================================================================= */}
      {activeMode === 'fleet' && (
        <div className="space-y-4 flex-1">
          {/* Map + Selected Bus Telemetry Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 h-[520px] rounded-3xl overflow-hidden border border-slate-800">
              <LiveFleetMap
                locations={locations}
                buses={buses}
                routes={routes}
                stops={stops}
                selectedBusId={selectedBus?.id}
                onSelectBus={setSelectedBusId}
                height="100%"
              />
            </div>

            {/* Selected Bus Live GPS Telemetry Inspector Drawer */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 overflow-y-auto space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Live GPS Telemetry</span>
                    </span>
                    <h2 className="text-xl font-black text-white mt-1 flex items-center space-x-2">
                      <span>{selectedBus?.bus_number}</span>
                      <span
                        className="w-3 h-3 rounded-full inline-block border border-white/40"
                        style={{ backgroundColor: selectedRoute?.route_color || '#2563eb' }}
                      />
                    </h2>
                    <p className="text-xs text-slate-400 font-mono">{selectedBus?.registration_number}</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${selectedLoc?.latitude || 9.449},${selectedLoc?.longitude || 77.548}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-bold flex items-center space-x-1"
                    title="Open in Google Maps"
                  >
                    <span>Google Maps</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>

                {/* Where Bus is Travelling */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Current Travelling Location</span>
                    <span className="text-emerald-400 font-bold">🟢 TRANSMITTING</span>
                  </div>
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Near {currentStop?.stop_name || 'En Route to Next Terminal'}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800 flex justify-between">
                    <span>GPS Lat: <strong className="text-slate-200">{selectedLoc?.latitude?.toFixed(5) || '9.44921'}</strong></span>
                    <span>Lng: <strong className="text-slate-200">{selectedLoc?.longitude?.toFixed(5) || '77.54823'}</strong></span>
                  </div>
                </div>

                {/* Start / End Terminals */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-black text-[10px]">🟢 START POINT:</span>
                    <span className="text-white font-medium truncate max-w-[170px]">{selectedRoute?.start_location}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5">
                    <span className="text-rose-400 font-black text-[10px]">🏁 END POINT:</span>
                    <span className="text-white font-medium truncate max-w-[170px]">{selectedRoute?.destination}</span>
                  </div>
                </div>

                {/* Quick Metrics (Speed + Heading) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center">
                      <Gauge className="w-3.5 h-3.5 mr-1 text-blue-400" />
                      Speed
                    </div>
                    <div className="text-lg font-black text-white mt-1">
                      {Math.round(selectedLoc?.speed || 0)} <span className="text-xs font-normal text-slate-400">km/h</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center">
                      <Compass className="w-3.5 h-3.5 mr-1 text-purple-400" />
                      Heading
                    </div>
                    <div className="text-lg font-black text-white mt-1 font-mono">
                      {selectedLoc?.heading || 0}&deg;
                    </div>
                  </div>
                </div>

                {/* Temporary Substitute Driver Notice */}
                {selectedBus?.substitute_driver_id && (
                  <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-amber-300">
                      <span>⚠️ Temporary Substitute Driver</span>
                      {onRevertSubstituteDriver && (
                        <button
                          onClick={() => onRevertSubstituteDriver(selectedBus.id)}
                          className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] rounded-lg shadow"
                        >
                          Revert
                        </button>
                      )}
                    </div>
                    <div className="text-white font-medium text-[11px]">
                      Operating: {selectedDriver?.profile?.name}
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      Regular Driver: {drivers.find(d => d.id === selectedBus.assigned_driver_id)?.profile?.name || 'Regular Driver'} (Allocated until reverted)
                    </div>
                  </div>
                )}

                {/* Standby Bus Swap Notice */}
                {selectedBus?.is_standby_replacement && (
                  <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-indigo-300">
                      <span>🔄 Standby Vehicle Active</span>
                      {onRevertBusSwap && selectedBus.route_id && (
                        <button
                          onClick={() => onRevertBusSwap(selectedBus.route_id!)}
                          className="px-2 py-0.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-[10px] rounded-lg shadow"
                        >
                          Restore Regular
                        </button>
                      )}
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      Standby deployed on this route until regular bus service resumes.
                    </div>
                  </div>
                )}

                {/* Driver & Passenger Summary */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Driver:</span>
                    <span className="text-white font-bold">{selectedDriver?.profile?.name || 'Mr. B. Moorthi'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Students:</span>
                    <span className="text-emerald-400 font-bold">{busStudents.length} Assigned ({onLeaveStudents.length} on leave)</span>
                  </div>
                </div>
              </div>

              {/* Direct Perspective Switch Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setActiveMode('driver')}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/30 flex items-center justify-center space-x-2 transition-all"
                >
                  <Gauge className="w-4 h-4" />
                  <span>Open Driver Cockpit ({selectedBus?.bus_number})</span>
                </button>
                <button
                  onClick={() => setActiveMode('student')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Open Student Radar ({selectedBus?.bus_number})</span>
                </button>
              </div>
            </div>
          </div>

          {/* ALL FLEET BUSES GPS & LOCATION CARDS GRID */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <BusIcon className="w-5 h-5 text-blue-400" />
                  <span>All College Buses ({buses.length}) — Real-Time GPS Explorer</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any bus to immediately pinpoint on map, view exact GPS coordinates, and inspect route status.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                {locations.length} Buses Transmitting Live GPS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {buses.map((bus) => {
                const isSelected = bus.id === selectedBus?.id;
                const loc = locations.find((l) => l.bus_id === bus.id) || selectedLoc;
                const route = routes.find((r) => r.id === bus.route_id);
                const driver = drivers.find((d) => d.id === bus.assigned_driver_id);
                const color = route?.route_color || '#2563eb';
                const countStudents = students.filter((s) => s.bus_id === bus.id || (!s.bus_id && (bus.bus_number === 'BUS-01' || bus.id === 'b1'))).length;
                const leaveCount = students.filter((s) => (s.bus_id === bus.id || (!s.bus_id && (bus.bus_number === 'BUS-01' || bus.id === 'b1'))) && s.is_on_leave).length;

                return (
                  <div
                    key={bus.id}
                    onClick={() => setSelectedBusId(bus.id)}
                    className={`cursor-pointer rounded-2xl p-4 transition-all space-y-3 border ${
                      isSelected
                        ? 'bg-slate-800/90 border-blue-500 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/20'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md"
                          style={{ backgroundColor: color }}
                        >
                          {bus.bus_number.replace('BUS ', '').replace('BUS-', '') || '01'}
                        </div>
                        <div>
                          <div className="text-sm font-black text-white flex items-center space-x-2">
                            <span>{bus.bus_number}</span>
                            {isSelected && (
                              <span className="text-[9px] bg-blue-500/20 text-blue-300 font-extrabold px-1.5 py-0.5 rounded">
                                SELECTED
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{bus.registration_number}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{Math.round(loc.speed || 0)} KM/H</span>
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">GPS Active</div>
                      </div>
                    </div>

                    {/* Route & Terminals */}
                    {(() => {
                      const busStops = stops.filter((s) => s.route_id === bus.route_id).sort((a, b) => a.stop_order - b.stop_order);
                      const nextStop = busStops[0];
                      const nextStopEta = nextStop ? calculateStopLiveETA(loc, nextStop, busStops) : null;

                      return (
                        <div className="text-xs bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Route:</span>
                            <span className="text-white font-bold truncate max-w-[180px]">{route?.route_name || 'Assigned Route'}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] border-t border-slate-800/60 pt-1">
                            <span className="text-emerald-400 font-semibold">🟢 {route?.start_location || 'Start Point'}</span>
                            <span className="text-slate-500">&rarr;</span>
                            <span className="text-rose-400 font-semibold">🏁 {route?.destination || 'College Hub'}</span>
                          </div>
                          {nextStop && nextStopEta && (
                            <div className="flex items-center justify-between text-[11px] border-t border-slate-800/60 pt-1">
                              <span className="text-sky-400 font-semibold">📍 Next: {nextStop.stop_name}</span>
                              <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-black ${
                                nextStopEta.status === 'DELAYED'
                                  ? 'text-rose-400 bg-rose-500/15'
                                  : nextStopEta.status === 'EARLY'
                                  ? 'text-sky-400 bg-sky-500/15'
                                  : 'text-emerald-400 bg-emerald-500/15'
                              }`}>
                                {nextStopEta.etaFormatted} ({nextStopEta.badgeText})
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-[11px] border-t border-slate-800/60 pt-1">
                            <span className="text-slate-400">Driver:</span>
                            <span className="text-slate-200 font-medium">{driver?.profile?.name || 'Assigned Driver'}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Exact GPS Coordinates */}
                    <div className="flex items-center justify-between text-[10px] font-mono bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-400">
                      <span>Lat: <strong className="text-sky-300">{(loc?.latitude ?? 9.449).toFixed(5)}</strong></span>
                      <span>Lng: <strong className="text-sky-300">{(loc?.longitude ?? 77.548).toFixed(5)}</strong></span>
                      <span>H: <strong className="text-purple-300">{loc?.heading || 0}&deg;</strong></span>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBusId(bus.id);
                        }}
                        className="flex-1 py-1.5 bg-blue-600/15 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-[11px] font-bold transition-all"
                      >
                        🎯 Track GPS
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBusId(bus.id);
                          setActiveMode('driver');
                        }}
                        className="py-1.5 px-2 bg-amber-600/15 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-lg text-[11px] font-bold transition-all"
                        title="Open Driver Cockpit"
                      >
                        👨‍✈️ Cockpit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBusId(bus.id);
                          setActiveMode('student');
                        }}
                        className="py-1.5 px-2 bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition-all"
                        title="Open Student Radar"
                      >
                        🎓 Radar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: 👨‍✈️ DRIVER COCKPIT & PASSENGER MANIFEST (ALL DRIVER OPTIONS)     */}
      {/* ========================================================================= */}
      {activeMode === 'driver' && (
        <div className="space-y-4">
          {/* Driver Start Point ➔ End Point Route Terminal Card */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <span className="text-[10px] font-black text-emerald-400 tracking-wider">🟢 START POINT</span>
              <div className="text-sm font-bold text-white">{selectedRoute?.start_location}</div>
              <div className="text-xs text-slate-400">Dep: {selectedRoute?.start_time || '07:30 AM'}</div>
            </div>
            <div className="hidden sm:flex text-slate-600 text-xl font-black">&rarr;</div>
            <div className="flex-1">
              <span className="text-[10px] font-black text-rose-400 tracking-wider">🏁 END POINT</span>
              <div className="text-sm font-bold text-white">{selectedRoute?.destination}</div>
              <div className="text-xs text-slate-400">Arr: {selectedRoute?.end_time || '08:20 AM'}</div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsTripActive(!isTripActive)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                  isTripActive ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {isTripActive ? <Flag className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isTripActive ? 'FINISH TRIP' : 'START TRIP'}</span>
              </button>
              <button
                onClick={() => setCurrentStopIndex((prev) => Math.min(prev + 1, routeStops.length - 1))}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ADVANCE STOP ({currentStopIndex + 1}/{routeStops.length})</span>
              </button>
            </div>
          </div>

          {/* DEDICATED ABSENTEES / 1-DAY LEAVE BOX DIRECTLY UP OF MAP */}
          <div className={`p-4 rounded-3xl border transition-all ${
            onLeaveStudents.length > 0 ? 'bg-rose-950/30 border-rose-600/40' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                  onLeaveStudents.length > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {onLeaveStudents.length > 0 ? '⛔' : '✅'}
                </div>
                <div>
                  <h3 className={`text-sm font-black ${onLeaveStudents.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    TODAY'S ABSENTEES / 1-DAY LEAVE ({onLeaveStudents.length}) &bull; {selectedBus?.bus_number}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {onLeaveStudents.length > 0
                      ? 'Student(s) on 1-day leave — Skip pickup at their stops'
                      : 'All enrolled passengers are boarding today'}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                onLeaveStudents.length > 0 ? 'bg-rose-600 text-white' : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {onLeaveStudents.length > 0 ? `${onLeaveStudents.length} ON LEAVE` : 'ALL PRESENT'}
              </span>
            </div>

            {onLeaveStudents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {onLeaveStudents.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 rounded-2xl bg-slate-950/80 border border-rose-500/30 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white text-xs truncate">
                        {st.profile?.name} <span className="text-[10px] text-slate-400 font-mono">({st.register_number})</span>
                      </div>
                      <div className="text-[11px] text-sky-400 font-semibold truncate mt-0.5">
                        📍 {st.boarding_stop?.stop_name || 'Designated Stop'}
                      </div>
                    </div>
                    {isEditable && (
                      <button
                        onClick={() => onToggleStudentLeave(st.id)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg"
                        title="Cancel Leave / Restore Attendance"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic pt-1">
                ✨ No students marked on leave for {selectedBus?.bus_number}. Full route pickup scheduled.
              </div>
            )}
          </div>

          {/* Map + Telemetry Card Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-[380px] rounded-3xl overflow-hidden border border-slate-800">
              <LiveFleetMap
                locations={locations}
                buses={buses}
                routes={routes}
                stops={stops}
                selectedBusId={selectedBus?.id}
                onSelectBus={setSelectedBusId}
                height="100%"
              />
            </div>

            {/* Live Cockpit Gauge & Stop Progression */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                  Live Cockpit Telemetry
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  60s SATELLITE SYNC
                </span>
              </div>

              {/* Gauge Bar */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Speed</span>
                  <div className="text-lg font-black text-white mt-0.5">{Math.round(selectedLoc?.speed || 0)} km/h</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Duration</span>
                  <div className="text-lg font-black text-white mt-0.5">{elapsedMinutes}m 00s</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Accuracy</span>
                  <div className="text-lg font-black text-white mt-0.5">&plusmn;3m</div>
                </div>
              </div>

              {/* Next Stop Highlight */}
              {(() => {
                const nextStopLiveEta = calculateStopLiveETA(selectedLoc, currentStop, routeStops);
                return (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                        NEXT STOP ({currentStopIndex + 1}/{routeStops.length})
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${
                        nextStopLiveEta.status === 'DELAYED'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : nextStopLiveEta.status === 'EARLY'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {nextStopLiveEta.badgeText}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white">{currentStop?.stop_name}</div>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
                      <span>
                        Live Arrival: <strong className="text-sky-400">{nextStopLiveEta.etaFormatted}</strong>
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {formatDistance(nextStopLiveEta.distanceKm)} ahead
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Stop Sequence */}
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {routeStops.map((stop, idx) => {
                  const isPassed = idx < currentStopIndex;
                  const isCurrent = idx === currentStopIndex;
                  const stopEta = calculateStopLiveETA(selectedLoc, stop, routeStops);

                  return (
                    <div
                      key={stop.id}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs border ${
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                          : isPassed
                          ? 'bg-slate-950/40 border-slate-850 text-slate-500 line-through'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="truncate">{idx + 1}. {stop.stop_name}</span>
                      <span className="text-[10px] font-mono">
                        {isPassed ? 'Passed' : isCurrent ? `NEXT (${stopEta.etaFormatted})` : `${stopEta.etaFormatted} (${stopEta.badgeText})`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Passenger Roster & Manifest Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center space-x-2">
                  <span>Passenger Manifest & Live Boarding Status</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    {selectedBus?.bus_number} &bull; 54 Cap
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Students automatically transition to Boarded as bus advances past their designated stops.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Enrolled</div>
                  <div className="text-sm font-black text-white">{busStudents.length}</div>
                </div>
                <div className="px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[9px] text-emerald-400 font-bold uppercase">Boarded</div>
                  <div className="text-sm font-black text-emerald-400">{boardedCount}</div>
                </div>
                <div className="px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[9px] text-amber-400 font-bold uppercase">Awaiting</div>
                  <div className="text-sm font-black text-amber-400">{awaitingCount}</div>
                </div>
                <div className="px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[9px] text-rose-400 font-bold uppercase">On Leave</div>
                  <div className="text-sm font-black text-rose-400">{onLeaveStudents.length}</div>
                </div>
              </div>
            </div>

            {/* Manifest Search & Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={manifestSearch}
                  onChange={(e) => setManifestSearch(e.target.value)}
                  placeholder="Search passenger by name or roll number..."
                  className="w-full bg-slate-950 text-white text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-800"
                />
              </div>

              <div className="flex items-center space-x-1.5 overflow-x-auto">
                <button
                  onClick={() => setManifestStopFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                    manifestStopFilter === 'all' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  All ({busStudents.length})
                </button>
                <button
                  onClick={() => setManifestStopFilter('on_leave')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                    manifestStopFilter === 'on_leave' ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-950 text-rose-400 border-rose-900/40'
                  }`}
                >
                  ⛔ On Leave ({onLeaveStudents.length})
                </button>
                {routeStops.slice(0, 4).map((st, i) => (
                  <button
                    key={st.id}
                    onClick={() => setManifestStopFilter(st.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                      manifestStopFilter === st.id ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Stop {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Manifest Table */}
            <div className="overflow-x-auto max-h-[320px]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 uppercase font-bold text-[10px] text-slate-500 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Register No</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Designated Stop</th>
                    <th className="p-3">Boarding Status</th>
                    <th className="p-3 text-right">Leave Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredManifestStudents.map((st) => {
                    const status = getBoardingStatus(st);
                    const stop = stops.find((s) => s.id === st.boarding_stop_id);

                    return (
                      <tr key={st.id} className="hover:bg-slate-950/60 transition-colors">
                        <td className="p-3 font-bold text-white">{st.profile?.name}</td>
                        <td className="p-3 font-mono text-slate-400">{st.register_number}</td>
                        <td className="p-3 text-slate-400">{st.department} (Yr {st.year})</td>
                        <td className="p-3 text-sky-400 font-semibold">📍 {stop?.stop_name || 'Stop'}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-lg font-black border text-[10px] ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {isEditable ? (
                            <button
                              onClick={() => onToggleStudentLeave(st.id)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                st.is_on_leave
                                  ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/30'
                                  : 'bg-rose-600/20 text-rose-400 border-rose-500/30 hover:bg-rose-600/30'
                              }`}
                            >
                              {st.is_on_leave ? 'Cancel Leave' : 'Mark Leave'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">Protected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: 🎓 STUDENT COMMUTER RADAR (ALL STUDENT OPTIONS)                  */}
      {/* ========================================================================= */}
      {activeMode === 'student' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Student Selection & Stop Arrival Radar */}
          <div className="space-y-4">
            {/* Student Selector Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                Simulate Student Perspective
              </span>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Student Profile:</label>
                <select
                  value={selectedStudent?.id}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-800 font-bold"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.profile?.name} &bull; {s.register_number} ({s.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Profile Overview */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white">{selectedStudent?.profile?.name}</span>
                  <span className="text-xs font-mono text-emerald-400">{selectedStudent?.register_number}</span>
                </div>
                <div className="text-xs text-slate-400">
                  Assigned Bus: <strong className="text-amber-400">{selectedBus?.bus_number || 'BUS-01'}</strong>
                </div>
                <div className="text-xs text-sky-400 font-semibold">
                  Designated Stop: 📍 {selectedStudent?.boarding_stop?.stop_name || 'Gandhi Statue Junction'}
                </div>
              </div>

              {/* 1-Day Leave Toggle Button for Student */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white">Today's Attendance Pass:</span>
                  <div className="text-[11px] text-slate-400">
                    {selectedStudent?.is_on_leave ? '⛔ Marked on 1-Day Leave' : '🟢 Commuting Regular'}
                  </div>
                </div>
                {isEditable ? (
                  <button
                    onClick={() => onToggleStudentLeave(selectedStudent?.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow ${
                      selectedStudent?.is_on_leave
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    {selectedStudent?.is_on_leave ? 'Cancel Leave' : 'Apply 1-Day Leave'}
                  </button>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold border border-slate-700">
                    Read Only
                  </span>
                )}
              </div>
            </div>

            {/* Dynamic Proximity Radar Card */}
            {(() => {
              const studentStop = stops.find((s) => s.id === selectedStudent?.boarding_stop_id) || routeStops[0];
              const studentEta = calculateStopLiveETA(selectedLoc, studentStop, routeStops);

              return (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-wider">
                      Proximity Radar & Dynamic ETA
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                      LIVE GPS SPEED: {Math.round(selectedLoc?.speed || 0)} KM/H
                    </span>
                  </div>

                  {/* Clock Arrival Banner */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-sky-500/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-sky-400 uppercase tracking-wider">
                        Expected Arrival Time
                      </span>
                      <div className="text-2xl font-black text-white mt-0.5">{studentEta.etaFormatted}</div>
                      <div className="text-xs text-slate-400">
                        Arriving in ~{studentEta.etaMinutes} mins &bull; {formatDistance(studentEta.distanceKm)}
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold ${
                      studentEta.status === 'DELAYED'
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        : studentEta.status === 'EARLY'
                        ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    }`}>
                      {studentEta.badgeText}
                    </div>
                  </div>


                </div>
              );
            })()}
          </div>

          {/* Right 2 Cols: Route Schedule Timelines & Live Sequence */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-white">Route Sequence & Dynamic Schedule</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time telemetry continuously recalibrates stop pickup timings based on speed ({Math.round(selectedLoc?.speed || 0)} km/h).
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setScheduleType('morning')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                    scheduleType === 'morning' ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  🌅 Morning (07:30 AM)
                </button>
                <button
                  onClick={() => setScheduleType('evening')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                    scheduleType === 'evening' ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  🌆 Evening (04:45 PM)
                </button>
              </div>
            </div>

            {/* Sequence Cards */}
            <div className="space-y-3">
              {routeStops.map((stop, idx) => {
                const isStudentStop = stop.id === selectedStudent?.boarding_stop_id;
                const isPassed = idx < currentStopIndex;
                const stopEta = calculateStopLiveETA(selectedLoc, stop, routeStops);

                return (
                  <div
                    key={stop.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                      isStudentStop
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                        : isPassed
                        ? 'bg-slate-950/40 border-slate-850'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isPassed ? 'bg-emerald-600 text-white' : isStudentStop ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {isPassed ? '✓' : idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className={`font-bold text-sm ${isPassed ? 'text-slate-500 line-through' : 'text-white'}`}>
                            {stop.stop_name}
                          </h4>
                          {isStudentStop && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500 text-black">
                              STUDENT STOP
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Scheduled: <span className={stopEta.isDelayed ? 'line-through text-slate-500' : 'text-slate-300'}>{stop.estimated_arrival}</span> &bull;{' '}
                          <strong className="text-sky-400">
                            Live ETA: {isPassed ? 'Passed' : `${stopEta.etaFormatted} (${stopEta.badgeText})`}
                          </strong>
                          {!isPassed && (
                            <span className="text-slate-500 font-mono text-[11px] ml-1.5">
                              &bull; {formatDistance(stopEta.distanceKm)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      isPassed
                        ? 'bg-slate-800 text-slate-500'
                        : stopEta.status === 'DELAYED'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : stopEta.status === 'EARLY'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {isPassed ? 'PASSED' : stopEta.badgeText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: 🚌 REGISTER NEW BUS                                             */}
      {/* ========================================================================= */}
      {isAddBusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <BusIcon className="w-5 h-5 text-blue-400" />
                <span>Register New Bus</span>
              </h3>
              <button onClick={() => setIsAddBusOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBus} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Bus Number</label>
                  <input
                    type="text"
                    required
                    value={busNumber}
                    onChange={(e) => setBusNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                    placeholder="BUS 15"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Reg Number</label>
                  <input
                    type="text"
                    required
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    placeholder="TN 84 AX 1015"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Bus Name / Label</label>
                <input
                  type="text"
                  required
                  value={busName}
                  onChange={(e) => setBusName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="Express Sankarankovil Deluxe"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Seating Capacity</label>
                  <input
                    type="number"
                    required
                    value={busCapacity}
                    onChange={(e) => setBusCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Assign Route</label>
                  <select
                    value={busRouteId}
                    onChange={(e) => setBusRouteId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium"
                  >
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.route_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Assign Driver</label>
                <select
                  value={busDriverId}
                  onChange={(e) => setBusDriverId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium"
                >
                  <option value="">-- Select Driver --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.profile?.name} ({d.license_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddBusOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black shadow-lg shadow-blue-600/30"
                >
                  Save & Register Bus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: 👨‍✈️ REGISTER NEW DRIVER                                          */}
      {/* ========================================================================= */}
      {isAddDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <User className="w-5 h-5 text-purple-400" />
                <span>Register New Driver</span>
              </h3>
              <button onClick={() => setIsAddDriverOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Driver Full Name</label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                  placeholder="K. Ramasamy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={driverEmail}
                    onChange={(e) => setDriverEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    placeholder="+91 98421 99999"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Driving License Number</label>
                <input
                  type="text"
                  required
                  value={driverLicense}
                  onChange={(e) => setDriverLicense(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  placeholder="DL-TN84-2024-0099"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Assign to Bus</label>
                <select
                  value={driverBusId}
                  onChange={(e) => setDriverBusId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium"
                >
                  <option value="">-- Select Bus --</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bus_number} &bull; {b.bus_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black shadow-lg shadow-purple-600/30"
                >
                  Save & Register Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: 🎓 REGISTER NEW STUDENT                                          */}
      {/* ========================================================================= */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <span>Register New Student Pass</span>
              </h3>
              <button onClick={() => setIsAddStudentOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                  placeholder="K. Anand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Roll / Reg Number</label>
                  <input
                    type="text"
                    required
                    value={studentReg}
                    onChange={(e) => setStudentReg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    placeholder="953621104050"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-bold mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={studentDept}
                    onChange={(e) => setStudentDept(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Year</label>
                  <select
                    value={studentYear}
                    onChange={(e) => setStudentYear(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value={1}>1st</option>
                    <option value={2}>2nd</option>
                    <option value={3}>3rd</option>
                    <option value={4}>4th</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Assigned Bus</label>
                  <select
                    value={studentBusId}
                    onChange={(e) => setStudentBusId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium"
                  >
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bus_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Boarding Stop</label>
                  <select
                    value={studentStopId}
                    onChange={(e) => setStudentStopId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium"
                  >
                    {stops.map((s) => (
                      <option key={s.id} value={s.id}>
                        📍 {s.stop_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black shadow-lg shadow-emerald-600/30"
                >
                  Save & Register Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: 🗺️ CONFIGURE ROUTE START, END & GOOGLE MAPS STOPS PRECISION      */}
      {/* ========================================================================= */}
      {isRouteConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Google Maps Coordinates Precision Engine</span>
                </span>
                <h2 className="text-xl font-black text-white mt-1">Configure Route Start, End & Intermediate Stops</h2>
              </div>
              <button onClick={() => setIsRouteConfigOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select Route & Color */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Target Route</label>
                <select
                  value={configRouteId}
                  onChange={(e) => {
                    const rId = e.target.value;
                    setConfigRouteId(rId);
                    const r = routes.find((rt) => rt.id === rId);
                    if (r) {
                      setConfigStartName(r.start_location);
                      setConfigDestName(r.destination);
                      setConfigRouteColor(r.route_color || '#2563eb');
                      setConfigStartTime(r.start_time || '07:30 AM');
                      setConfigEndTime(r.end_time || '08:20 AM');
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.route_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Route Stroke Color on Map</label>
                <div className="flex items-center space-x-2">
                  {ROUTE_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => setConfigRouteColor(preset.color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        configRouteColor === preset.color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60'
                      }`}
                      style={{ backgroundColor: preset.color }}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 🟢 START POINT & 🏁 END POINT GOOGLE MAPS CONFIGURATION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Point Card */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/30 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-400 text-sm">🟢 START POINT TERMINAL</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                    Dep: {configStartTime}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Terminal Location Name</label>
                  <input
                    type="text"
                    value={configStartName}
                    onChange={(e) => setConfigStartName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1 flex items-center justify-between">
                    <span>Google Maps Link or "Lat, Lng"</span>
                    <span className="text-[10px] text-sky-400">Auto-Extracts GPS</span>
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={configStartGoogleLink}
                      onChange={(e) => handleParseStartLink(e.target.value)}
                      placeholder="Paste Google Maps link or e.g. 9.4475, 77.5450"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>
                  {configStartParsedMsg ? (
                    <div className="text-[10px] font-mono text-emerald-400 mt-1">{configStartParsedMsg}</div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/80 p-2 rounded-xl border border-slate-800 text-slate-300">
                  <div>Lat: <strong className="text-emerald-400">{(Number(configStartLat) || 9.4475).toFixed(5)}</strong></div>
                  <div>Lng: <strong className="text-emerald-400">{(Number(configStartLng) || 77.5450).toFixed(5)}</strong></div>
                </div>
              </div>

              {/* End Point Card */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-rose-500/30 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-rose-400 text-sm">🏁 END POINT TERMINAL</span>
                  <span className="text-[10px] bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded border border-rose-500/20 font-bold">
                    Arr: {configEndTime}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Destination Campus Hub Name</label>
                  <input
                    type="text"
                    value={configDestName}
                    onChange={(e) => setConfigDestName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1 flex items-center justify-between">
                    <span>Google Maps Link or "Lat, Lng"</span>
                    <span className="text-[10px] text-sky-400">Auto-Extracts GPS</span>
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={configDestGoogleLink}
                      onChange={(e) => handleParseDestLink(e.target.value)}
                      placeholder="Paste Google Maps link or e.g. 9.4005, 77.8010"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>
                  {configDestParsedMsg ? (
                    <div className="text-[10px] font-mono text-emerald-400 mt-1">{configDestParsedMsg}</div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/80 p-2 rounded-xl border border-slate-800 text-slate-300">
                  <div>Lat: <strong className="text-rose-400">{(Number(configDestLat) || 9.4005).toFixed(5)}</strong></div>
                  <div>Lng: <strong className="text-rose-400">{(Number(configDestLng) || 77.8010).toFixed(5)}</strong></div>
                </div>
              </div>
            </div>

            {/* 📍 ADD & CONFIGURE INTERMEDIATE STOPS WITH GOOGLE MAPS */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-extrabold text-white text-sm flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-sky-400" />
                  <span>Intermediate Stop Sequence Points ({stops.filter(s => s.route_id === configRouteId).length})</span>
                </h4>
                <button
                  type="button"
                  onClick={handleModalAutoAlign}
                  className="px-2.5 py-1 rounded-lg bg-sky-600/20 text-sky-300 border border-sky-500/30 text-[11px] font-bold flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  <span>Auto-Align 1..N</span>
                </button>
              </div>

              {/* Stop Sequence List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stops
                  .filter((s) => s.route_id === configRouteId)
                  .sort((a, b) => a.stop_order - b.stop_order)
                  .map((st, idx, arr) => (
                    <div
                      key={st.id}
                      className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-300 font-black text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-white text-xs">{st.stop_name}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            Lat: {(st?.latitude ?? 0).toFixed(4)}, Lng: {(st?.longitude ?? 0).toFixed(4)} &bull; Arrival: {st.estimated_arrival}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          disabled={idx <= 0}
                          onClick={() => handleModalMoveStopUp(idx)}
                          className={`p-1.5 rounded-lg border ${
                            idx <= 0
                              ? 'opacity-30 border-slate-800 text-slate-600 cursor-not-allowed'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-sky-600'
                          }`}
                          title="Move Stop Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx >= arr.length - 1}
                          onClick={() => handleModalMoveStopDown(idx)}
                          className={`p-1.5 rounded-lg border ${
                            idx >= arr.length - 1
                              ? 'opacity-30 border-slate-800 text-slate-600 cursor-not-allowed'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-sky-600'
                          }`}
                          title="Move Stop Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        {onDeleteStop && (
                          <button
                            type="button"
                            onClick={() => onDeleteStop(st.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                            title="Remove Stop"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Add New Stop Form */}
              <form onSubmit={handleAddStopToSequence} className="pt-3 border-t border-slate-800 space-y-3">
                <span className="font-bold text-sky-400 text-xs">+ Add New Intermediate Stop to Sequence:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 font-bold mb-1">Stop Name</label>
                    <input
                      type="text"
                      required
                      value={newStopName}
                      onChange={(e) => setNewStopName(e.target.value)}
                      placeholder="e.g. Gandhi Statue Junction"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Scheduled Arrival</label>
                    <input
                      type="text"
                      required
                      value={newStopArrival}
                      onChange={(e) => setNewStopArrival(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1 flex items-center justify-between">
                    <span>Google Maps Link or "Lat, Lng" for Stop</span>
                    <span className="text-[10px] text-sky-400">Instant Pin Marker</span>
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={newStopGoogleLink}
                      onChange={(e) => handleParseNewStopLink(e.target.value)}
                      placeholder="Paste Google Maps link or coordinates e.g. 9.4491, 77.5482"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>
                  {newStopParsedMsg ? (
                    <div className="text-[10px] font-mono text-emerald-400 mt-1">{newStopParsedMsg}</div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stop to Route Sequence</span>
                </button>
              </form>
            </div>

            {/* Bottom Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsRouteConfigOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRouteConfiguration}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Save & Apply Route & Google Maps Points</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBSTITUTE DRIVER MODAL */}
      {isSubstituteModalOpen && selectedBus && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Substitute Driver Reassignment</h2>
                  <p className="text-xs text-slate-400">{selectedBus.bus_number} &bull; {selectedRoute?.route_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSubstituteModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onSubstituteDriver) {
                  onSubstituteDriver(selectedBus.id, selectedSubDriverId, substituteReason);
                }
                setIsSubstituteModalOpen(false);
              }}
              className="space-y-4"
            >
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Regular Driver:</span>
                <span className="text-sm font-bold text-slate-200">
                  {drivers.find(d => d.id === selectedBus.assigned_driver_id)?.profile?.name || 'No Driver Assigned'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select Substitute Driver</label>
                <select
                  required
                  value={selectedSubDriverId}
                  onChange={(e) => setSelectedSubDriverId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Restore Regular Driver / None --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.profile?.name || d.employee_id} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Reassignment Reason</label>
                <input
                  type="text"
                  value={substituteReason}
                  onChange={(e) => setSubstituteReason(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Regular driver unavailable / medical leave"
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

      {/* SWAP BUS MODAL */}
      {isSwapModalOpen && selectedBus && selectedBus.route_id && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Route Bus Swap & Standby Dispatch</h2>
                  <p className="text-xs text-slate-400">{selectedRoute?.route_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSwapModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (selectedBus.route_id && onSwapBus) {
                  onSwapBus(selectedBus.route_id, selectedReplacementBusId, swapReason);
                }
                setIsSwapModalOpen(false);
              }}
              className="space-y-4"
            >
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Current Bus:</span>
                <span className="text-sm font-bold text-slate-200">
                  {selectedBus.bus_number} ({selectedBus.registration_number})
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select Alternate / Standby Bus</label>
                <select
                  required
                  value={selectedReplacementBusId}
                  onChange={(e) => setSelectedReplacementBusId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Alternate Bus --</option>
                  {buses.filter(b => b.id !== selectedBus.id).map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bus_number} &bull; {b.registration_number} ({b.capacity} Seats)
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
                  placeholder="e.g. Bus breakdown, puncture, repair"
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
    </div>
  );
};
