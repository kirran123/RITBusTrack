import React, { useState, useMemo } from 'react';
import { StatCard } from '../components/StatCard';
import { LiveFleetMap } from '../components/LiveFleetMap';
import { 
  Bus as BusIcon, 
  Users, 
  GraduationCap, 
  Route as RouteIcon, 
  Activity, 
  AlertTriangle, 
  ArrowUpRight,
  MapPin,
  Clock,
  UserCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Radio,
  ExternalLink,
  ChevronRight,
  Send,
  Zap,
  Layers
} from 'lucide-react';
import { 
  Bus, Driver, Student, Route, Stop, Trip, CurrentBusLocation, EmergencyAlert 
} from '@college-bus/shared';
import { Link } from 'react-router-dom';

interface DashboardProps {
  buses: Bus[];
  drivers: Driver[];
  students: Student[];
  routes: Route[];
  stops?: Stop[];
  trips: Trip[];
  locations: CurrentBusLocation[];
  emergencies: EmergencyAlert[];
  onToggleStudentLeave?: (studentId: string) => void;
  onSubstituteDriver?: (busId: string, substituteDriverId: string, reason?: string) => void;
  onSwapBus?: (routeId: string, newBusId: string, reason?: string) => void;
  onRevertSubstituteDriver?: (busId: string) => void;
  onRevertBusSwap?: (routeId: string) => void;
  currentUser?: any;
  canEdit?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  buses = [],
  drivers = [],
  students = [],
  routes = [],
  stops = [],
  trips = [],
  locations = [],
  emergencies = [],
  onToggleStudentLeave,
  onSubstituteDriver,
  onSwapBus,
  onRevertSubstituteDriver,
  onRevertBusSwap,
  currentUser,
  canEdit,
}) => {
  const isEditable = canEdit ?? (currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit'));
  const [selectedBusId, setSelectedBusId] = useState<string | null>(buses[0]?.id || null);

  const safeBuses = Array.isArray(buses) ? buses : [];
  const safeDrivers = Array.isArray(drivers) ? drivers : [];
  const safeStudents = Array.isArray(students) ? students : [];
  const safeRoutes = Array.isArray(routes) ? routes : [];
  const safeStops = Array.isArray(stops) ? stops : [];
  const safeLocations = Array.isArray(locations) ? locations : [];
  const safeEmergencies = Array.isArray(emergencies) ? emergencies : [];

  const activeBusesCount = safeBuses.filter(b => b.status === 'active').length;
  const maintenanceBusesCount = safeBuses.filter(b => b.status === 'maintenance').length;
  const activeEmergencies = safeEmergencies.filter(e => e.status === 'ACTIVE');
  const movingBusesCount = safeLocations.filter(l => (l.speed || 0) > 0).length;
  const absentStudents = safeStudents.filter(s => s.is_on_leave);
  const presentStudentsCount = safeStudents.length - absentStudents.length;

  // Identify temporary allocations
  const busesWithSubDriver = safeBuses.filter(b => !!b.substitute_driver_id);
  const standbySwappedBuses = safeBuses.filter(b => !!b.is_standby_replacement && !!b.route_id);
  const hasActiveTemporaryChanges = busesWithSubDriver.length > 0 || standbySwappedBuses.length > 0;

  // Selected bus telemetry details
  const selectedBus = safeBuses.find(b => b.id === selectedBusId) || safeBuses[0];
  const selectedLoc = safeLocations.find(l => l.bus_id === selectedBus?.id);
  const selectedRoute = safeRoutes.find(r => r.id === selectedBus?.route_id);
  const selectedDriver = safeDrivers.find(d => d.id === selectedBus?.assigned_driver_id || d.assigned_bus_id === selectedBus?.id);

  return (
    <div className="space-y-7 pb-8">
      
      {/* 1. TOP HERO BANNER: Clean, Premium Gradient & Live Indicator */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 p-6 lg:p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>SYSTEM LIVE &bull; 100% OPERATIONAL</span>
              </span>
              <span className="text-slate-500 text-xs hidden sm:inline">&bull;</span>
              <span className="text-slate-400 text-xs font-mono hidden sm:inline">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              Bus Command Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Real-time multi-route bus monitoring, GPS telemetry radar, driver assignments, and student transport management.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <Link
              to="/live"
              className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all"
            >
              <MapPin className="w-4 h-4" />
              <span>Open Live Radar</span>
            </Link>

            <Link
              to="/notifications"
              className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl border border-slate-700/80 flex items-center justify-center space-x-2 transition-all"
            >
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>Broadcast</span>
            </Link>
          </div>
        </div>

        {/* Decorative Background Glows */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -top-10 w-48 h-48 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 2. TEMPORARY SUBSTITUTION & MAINTENANCE NOTICES (If any active) */}
      {hasActiveTemporaryChanges && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-xl space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h3 className="text-sm font-black text-amber-300 flex items-center space-x-2">
                  <span>Active Temporary Bus Changes</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-extrabold border border-amber-500/30">
                    {busesWithSubDriver.length + standbySwappedBuses.length} Temporary
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  Drivers or replacement buses currently operating on temporary assignment until restored.
                </p>
              </div>
            </div>

            <Link to="/buses" className="text-xs font-bold text-amber-400 hover:underline flex items-center space-x-1">
              <span>Manage Buses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Driver Substitutions */}
            {busesWithSubDriver.map(bus => {
              const subDriver = safeDrivers.find(d => d.id === bus.substitute_driver_id);
              const regularDriver = safeDrivers.find(d => d.id === bus.assigned_driver_id);
              const busRoute = safeRoutes.find(r => r.id === bus.route_id);

              return (
                <div key={'sub_' + bus.id} className="bg-slate-950/80 p-3.5 rounded-2xl border border-amber-500/25 flex flex-col justify-between space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-black text-[10.5px]">
                        👨‍✈️ DRIVER SUBSTITUTION
                      </span>
                      <span className="text-xs font-bold text-white">
                        {bus.bus_number} &bull; {busRoute?.route_name || 'Route'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300">
                      Operating: <strong className="text-amber-400 font-bold">{subDriver?.profile?.name || 'Substitute Driver'}</strong> ({subDriver?.phone || '+91 91234 56781'})
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500">Regular: {regularDriver?.profile?.name || 'Assigned'}</span>
                    {isEditable && onRevertSubstituteDriver && (
                      <button
                        onClick={() => onRevertSubstituteDriver(bus.id)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] shadow-sm transition-all flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Revert Driver</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Standby Bus Swaps */}
            {standbySwappedBuses.map(bus => {
              const busRoute = safeRoutes.find(r => r.id === bus.route_id);
              const originalBus = safeBuses.find(b => b.id === bus.original_bus_id || b.original_route_id === bus.route_id);

              return (
                <div key={'swap_' + bus.id} className="bg-slate-950/80 p-3.5 rounded-2xl border border-indigo-500/30 flex flex-col justify-between space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-black text-[10.5px]">
                        🔄 STANDBY VEHICLE SWAP
                      </span>
                      <span className="text-xs font-bold text-white">
                        {busRoute?.route_name || 'Route'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300">
                      Deployed Standby: <strong className="text-indigo-400 font-bold">{bus.bus_number}</strong> (In place of {originalBus?.bus_number || 'Bus under repair'})
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500">Under Maintenance</span>
                    {isEditable && onRevertBusSwap && bus.route_id && (
                      <button
                        onClick={() => onRevertBusSwap(bus.route_id!)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-[11px] shadow-sm transition-all flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Restore Regular Bus</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. FOUR KPI CARDS (Crisp Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="College Buses"
          value={safeBuses.length}
          subtitle={`${activeBusesCount} Active • ${maintenanceBusesCount} Service`}
          icon={BusIcon}
          color="blue"
        />
        <StatCard
          title="Live Moving Buses"
          value={movingBusesCount}
          subtitle={`${safeRoutes.length} Connected Routes`}
          icon={Activity}
          color="emerald"
          trend="Realtime GPS"
        />
        <StatCard
          title="Student Commuters"
          value={safeStudents.length}
          subtitle={`${presentStudentsCount} Boarding (${absentStudents.length} Leave)`}
          icon={GraduationCap}
          color="purple"
        />
        <StatCard
          title="Emergency Status"
          value={activeEmergencies.length}
          subtitle={activeEmergencies.length > 0 ? 'Requires Immediate Review' : 'All Clear • Safe Transit'}
          icon={AlertTriangle}
          color={activeEmergencies.length > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* 4. MAIN COCKPIT: Map + Fleet Real-time List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left (2 Cols): Live Interactive Fleet Map */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">
                  Live Bus Radar & Route Map
                </h2>
                <p className="text-[11px] text-slate-400">
                  Dual-stroke transit paths, sequenced stops & live GPS positions
                </p>
              </div>
            </div>
          </div>

          <LiveFleetMap
            locations={safeLocations}
            buses={safeBuses}
            routes={safeRoutes}
            stops={safeStops}
            drivers={safeDrivers}
            selectedBusId={selectedBusId}
            onSelectBus={setSelectedBusId}
            height="460px"
          />

          {/* Active Selected Bus Quick Strip */}
          {selectedBus && (
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-md">
              <div className="flex items-center space-x-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white shrink-0 shadow-sm"
                  style={{ backgroundColor: selectedRoute?.route_color || '#2563eb' }}
                >
                  {selectedBus.bus_number.replace(/^(BUS\s*-\s*|BUS\s*)/i, '').trim() || '01'}
                </div>
                <div>
                  <div className="font-extrabold text-white flex items-center space-x-2">
                    <span>{selectedBus.bus_number}</span>
                    <span className="text-slate-400 font-normal">({selectedRoute?.route_name || 'Assigned Route'})</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Driver: <span className="text-slate-200 font-semibold">{selectedDriver?.profile?.name || 'Assigned Driver'}</span> &bull; 
                    Speed: <span className="text-emerald-400 font-bold">{Math.round(selectedLoc?.speed || 0)} km/h</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <a
                  href={`https://www.google.com/maps?q=${selectedLoc?.latitude || 9.449},${selectedLoc?.longitude || 77.548}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-[11px] border border-slate-700 transition-all flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                  <span>Google Maps</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Right (1 Col): Active Fleet Status List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">
                  Bus Registry ({safeBuses.length})
                </h2>
                <p className="text-[11px] text-slate-400">
                  Select a vehicle to inspect & focus
                </p>
              </div>
            </div>

            <Link to="/buses" className="text-xs text-slate-400 hover:text-white font-semibold">
              Manage All
            </Link>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 space-y-2 max-h-[520px] overflow-y-auto">
            {safeBuses.map(bus => {
              const route = safeRoutes.find(r => r.id === bus.route_id);
              const driver = safeDrivers.find(d => d.id === bus.assigned_driver_id || d.assigned_bus_id === bus.id);
              const loc = safeLocations.find(l => l.bus_id === bus.id);
              const isSelected = bus.id === selectedBusId;
              const isMoving = (loc?.speed || 0) > 0;
              const routeColor = route?.route_color || '#2563eb';

              return (
                <div
                  key={bus.id}
                  onClick={() => setSelectedBusId(bus.id)}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-slate-800/90 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: routeColor }}
                      />
                      <span className="font-extrabold text-white text-sm">
                        {bus.bus_number}
                      </span>
                      {bus.is_standby_replacement && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          SUB
                        </span>
                      )}
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center space-x-1 ${
                      isMoving 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {isMoving && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                      <span>{isMoving ? `${Math.round(loc?.speed || 0)} km/h` : 'IDLE'}</span>
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-300 mt-1.5 truncate">
                    {route?.route_name || 'Unassigned Route'}
                  </div>

                  <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between border-t border-slate-800/60 pt-1.5">
                    <span className="truncate">👨‍✈️ {driver?.profile?.name || 'Assigned Driver'}</span>
                    <span className="text-slate-500 font-mono text-[10px]">
                      {(loc?.latitude || 9.449).toFixed(3)}, {(loc?.longitude || 77.548).toFixed(3)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. TODAY'S 1-DAY STUDENT LEAVE SUBMISSIONS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-sm">
              ⛔
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black text-white">
                  Today's Student Leave Notices (Not Boarding)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {absentStudents.length} Reported Today
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time leave requests synced directly with Driver Rosters to optimize stop times.
              </p>
            </div>
          </div>

          <Link
            to="/students"
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
          >
            <span>Passenger Directory</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {absentStudents.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-slate-300">All Registered Students Scheduled to Board</p>
            <p className="text-xs text-slate-500">No 1-day absence notices have been filed for today's shifts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {absentStudents.map((student) => {
              const bus = safeBuses.find(b => b.id === student.bus_id);
              const stop = student.boarding_stop;
              const leaveInfo = student.leave_info;

              return (
                <div
                  key={student.id}
                  className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-black text-xs">
                        {student.profile?.name ? student.profile.name.charAt(0) : 'S'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{student.profile?.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">Reg: {student.register_number}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[9.5px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      ABSENT TODAY
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Assigned Bus:</span>
                      <span className="font-extrabold text-amber-400">
                        {bus?.bus_number || leaveInfo?.bus_number || 'BUS 12'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400 whitespace-nowrap">Boarding Stop:</span>
                      <span className="font-semibold text-sky-400 text-right">
                        📍 {stop?.stop_name || leaveInfo?.stop_name || 'Gandhi Statue Junction'}
                      </span>
                    </div>
                  </div>

                  {isEditable && onToggleStudentLeave && (
                    <button
                      onClick={() => onToggleStudentLeave(student.id)}
                      className="w-full py-1.5 px-3 bg-slate-900 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Restore Student Attendance</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
