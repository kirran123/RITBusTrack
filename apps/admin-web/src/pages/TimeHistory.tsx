import React, { useState, useEffect, useMemo } from 'react';
import { Bus, Driver, Route, BusTimeRecord, timeHistoryStore } from '@college-bus/shared';
import { 
  Clock, 
  Calendar, 
  Bus as BusIcon, 
  Search, 
  Download, 
  Filter, 
  CheckCircle2, 
  PlayCircle, 
  StopCircle, 
  Timer, 
  ArrowRight, 
  RefreshCw, 
  ChevronRight,
  Sparkles,
  MapPin,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

interface TimeHistoryProps {
  buses: Bus[];
  drivers: Driver[];
  routes: Route[];
  currentUser?: any;
}

// Generate realistic default historical time records for all buses
export const generateInitialTimeRecords = (buses: Bus[], routes: Route[], drivers: Driver[]): BusTimeRecord[] => {
  const today = new Date().toISOString().split('T')[0];
  const records: BusTimeRecord[] = [];

  buses.forEach((bus, index) => {
    const route = routes.find(r => r.id === bus.route_id) || routes[index % routes.length];
    const driver = drivers.find(d => d.id === bus.assigned_driver_id) || drivers[index % drivers.length];
    
    // Morning record
    const morningStart = route?.start_time || '07:30 AM';
    const morningEnd = route?.end_time || '08:20 AM';
    
    // Some variation in actual logged times
    const mStartActual = index === 0 ? '07:31:42 AM' : `${morningStart.replace(' AM', '')}:15 AM`;
    const mEndActual = index === 0 ? '08:22:10 AM' : `${morningEnd.replace(' AM', '')}:05 AM`;

    records.push({
      id: `time_${bus.bus_number}_morning_${today}`,
      bus_id: bus.id,
      bus_number: bus.bus_number,
      bus_name: bus.bus_name,
      registration_number: bus.registration_number,
      driver_id: driver?.id,
      driver_name: driver?.profile?.name || 'Driver',
      driver_phone: driver?.phone || '+91 98946 00000',
      route_id: route?.id,
      route_name: route?.route_name || 'Route',
      start_location: route?.start_location || 'Start Point',
      destination: route?.destination || 'Ramco Institute of Technology Campus',
      shift: 'morning',
      date: today,
      scheduled_start_time: morningStart,
      scheduled_end_time: morningEnd,
      start_time: mStartActual,
      end_time: mEndActual,
      duration: '50m 28s',
      distance_km: route?.distance_km || 12.5,
      avg_speed_kmh: 32,
      status: 'completed',
      updated_at: new Date().toISOString(),
    });

    // Evening record
    const eveStart = route?.evening_start_time || '04:30 PM';
    const eveEnd = route?.evening_end_time || '05:25 PM';
    const isPastEvening = new Date().getHours() >= 17;

    records.push({
      id: `time_${bus.bus_number}_evening_${today}`,
      bus_id: bus.id,
      bus_number: bus.bus_number,
      bus_name: bus.bus_name,
      registration_number: bus.registration_number,
      driver_id: driver?.id,
      driver_name: driver?.profile?.name || 'Driver',
      driver_phone: driver?.phone || '+91 98946 00000',
      route_name: route?.route_name || 'Route',
      start_location: route?.destination || 'Ramco Institute of Technology Campus',
      destination: route?.start_location || 'Destination Stop',
      shift: 'evening',
      date: today,
      scheduled_start_time: eveStart,
      scheduled_end_time: eveEnd,
      start_time: isPastEvening ? `${eveStart.replace(' PM', '')}:08 PM` : (index === 0 ? '04:30:15 PM' : null),
      end_time: isPastEvening ? `${eveEnd.replace(' PM', '')}:18 PM` : null,
      duration: isPastEvening ? '52m 10s' : (index === 0 ? 'In Progress' : '--'),
      distance_km: route?.distance_km || 12.5,
      avg_speed_kmh: isPastEvening ? 30 : 0,
      status: isPastEvening ? 'completed' : (index === 0 ? 'in_progress' : 'scheduled'),
      updated_at: new Date().toISOString(),
    });
  });

  return records;
};

export const TimeHistory: React.FC<TimeHistoryProps> = ({
  buses,
  drivers,
  routes,
  currentUser,
}) => {
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Time records state initialized from storage or defaults
  const [timeRecords, setTimeRecords] = useState<BusTimeRecord[]>(() => {
    const existing = timeHistoryStore.getRecords();
    if (existing.length > 0) return existing;
    const initial = generateInitialTimeRecords(buses, routes, drivers);
    timeHistoryStore.saveRecords(initial);
    return initial;
  });

  // Filter States
  const [activeShiftTab, setActiveShiftTab] = useState<'morning' | 'evening' | 'all'>('morning');
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);
  const [searchQuery, setSearchQuery] = useState('');
  const [busFilter, setBusFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'scheduled'>('all');

  // Real-time reactive subscription to driver start/end trip actions
  useEffect(() => {
    const unsubscribe = timeHistoryStore.subscribe((updatedRecords) => {
      setTimeRecords(updatedRecords);
    });

    // Also poll every 1s to guarantee instant sync across tabs
    const interval = setInterval(() => {
      const records = timeHistoryStore.getRecords();
      if (records.length > 0) {
        setTimeRecords(records);
      }
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Compute filtered records
  const filteredRecords = useMemo(() => {
    return timeRecords.filter(record => {
      const matchesShift = activeShiftTab === 'all' || record.shift === activeShiftTab;
      const matchesDate = !selectedDate || record.date === selectedDate;
      const matchesBus = busFilter === 'all' || record.bus_id === busFilter || record.bus_number === busFilter;
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      const matchesSearch = searchQuery.trim() === '' || 
        record.bus_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.route_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.start_location && record.start_location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (record.destination && record.destination.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesShift && matchesDate && matchesBus && matchesStatus && matchesSearch;
    });
  }, [timeRecords, activeShiftTab, selectedDate, busFilter, statusFilter, searchQuery]);

  // Morning and Evening Counts
  const morningList = useMemo(() => timeRecords.filter(r => r.shift === 'morning' && r.date === selectedDate), [timeRecords, selectedDate]);
  const eveningList = useMemo(() => timeRecords.filter(r => r.shift === 'evening' && r.date === selectedDate), [timeRecords, selectedDate]);
  
  const morningCompleted = morningList.filter(r => r.status === 'completed').length;
  const morningInProgress = morningList.filter(r => r.status === 'in_progress').length;
  
  const eveningCompleted = eveningList.filter(r => r.status === 'completed').length;
  const eveningInProgress = eveningList.filter(r => r.status === 'in_progress').length;

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAdminRecordStart = (record: BusTimeRecord) => {
    const updatedRecord = timeHistoryStore.recordTripStart({
      busId: record.bus_id,
      busNumber: record.bus_number,
      registrationNumber: record.registration_number,
      driverId: record.driver_id,
      driverName: record.driver_name,
      driverPhone: record.driver_phone,
      routeName: record.route_name,
      startLocation: record.start_location,
      destination: record.destination,
      shift: record.shift,
      date: record.date || selectedDate,
    });
    setTimeRecords(timeHistoryStore.getRecords());
    showToast(`🟢 Noted START time for ${record.bus_number} (${record.shift.toUpperCase()}) at ${updatedRecord.start_time}`);
  };

  const handleAdminRecordEnd = (record: BusTimeRecord) => {
    const updatedRecord = timeHistoryStore.recordTripEnd({
      busId: record.bus_id,
      busNumber: record.bus_number,
      registrationNumber: record.registration_number,
      driverId: record.driver_id,
      driverName: record.driver_name,
      driverPhone: record.driver_phone,
      routeName: record.route_name,
      startLocation: record.start_location,
      destination: record.destination,
      shift: record.shift,
      date: record.date || selectedDate,
    });
    setTimeRecords(timeHistoryStore.getRecords());
    showToast(`🏁 Noted END time for ${record.bus_number} (${record.shift.toUpperCase()}) at ${updatedRecord.end_time}`);
  };

  const handleExportCSV = () => {
    const headers = [
      'Shift',
      'Date',
      'Bus Number',
      'Registration',
      'Route Name',
      'Driver Name',
      'Driver Phone',
      'Start Location',
      'Destination',
      'Scheduled Start',
      'Scheduled End',
      'Driver Clicked START Time',
      'Driver Clicked END Time',
      'Total Duration',
      'Distance (km)',
      'Status',
    ];

    const rows = filteredRecords.map(r => [
      r.shift.toUpperCase(),
      r.date,
      r.bus_number,
      r.registration_number || '',
      `"${r.route_name}"`,
      `"${r.driver_name}"`,
      r.driver_phone || '',
      `"${r.start_location || ''}"`,
      `"${r.destination || ''}"`,
      r.scheduled_start_time || '',
      r.scheduled_end_time || '',
      r.start_time || 'Not Started',
      r.end_time || 'In Progress',
      r.duration || '--',
      r.distance_km || 0,
      r.status.toUpperCase(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RIT_Bus_Time_History_${selectedDate}_${activeShiftTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>Driver Dispatch Telemetry Logs</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-3">
            <span>Fleet Time History & Shift Dispatch Records</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Real-time automated logging of bus start & end timestamps triggered when drivers click <strong>Start Trip</strong> and <strong>End Trip</strong> on their cockpit devices for Morning and Evening shifts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV Sheet</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Morning Shift Card */}
        <div className="bg-slate-900/90 border border-slate-800/90 p-4 rounded-2xl space-y-1 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-amber-400">
            <span className="flex items-center gap-1.5">
              <span>🌅 Morning Shift</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 font-mono">
              Pickup Corridor
            </span>
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {morningCompleted} <span className="text-xs text-slate-400 font-normal">/ {buses.length} Finished</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>Live in progress:</span>
            <span className="text-emerald-400 font-bold font-mono">{morningInProgress} Active</span>
          </div>
        </div>

        {/* Evening Shift Card */}
        <div className="bg-slate-900/90 border border-slate-800/90 p-4 rounded-2xl space-y-1 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
            <span className="flex items-center gap-1.5">
              <span>🌆 Evening Shift</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 font-mono">
              Campus Return
            </span>
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {eveningCompleted} <span className="text-xs text-slate-400 font-normal">/ {buses.length} Finished</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>Live in progress:</span>
            <span className="text-emerald-400 font-bold font-mono">{eveningInProgress} Active</span>
          </div>
        </div>

        {/* Total Monitored Fleet */}
        <div className="bg-slate-900/90 border border-slate-800/90 p-4 rounded-2xl space-y-1 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-blue-400">
            <span className="flex items-center gap-1.5">
              <span>🚌 Monitored Fleet</span>
            </span>
            <BusIcon className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {buses.length} <span className="text-xs text-slate-400 font-normal">College Buses</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>Assigned Routes:</span>
            <span className="text-blue-400 font-bold font-mono">{routes.length} Corridors</span>
          </div>
        </div>

        {/* Real-time Dispatch Sensor */}
        <div className="bg-slate-900/90 border border-slate-800/90 p-4 rounded-2xl space-y-1 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Telemetry Engine</span>
            </span>
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-white mt-1">
            10s Dynamic GPS
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>Driver Sync:</span>
            <span className="text-emerald-400 font-bold">Auto-Logged</span>
          </div>
        </div>
      </div>

      {/* Primary Shift Segmented Tab Switcher (Split as All Buses Morning & Evening Trip) */}
      <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="grid grid-cols-3 p-1 bg-slate-950 rounded-xl gap-1 w-full sm:w-auto">
          <button
            onClick={() => setActiveShiftTab('morning')}
            className={`py-2.5 px-5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              activeShiftTab === 'morning'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>🌅 Morning Shift ({morningList.length})</span>
          </button>

          <button
            onClick={() => setActiveShiftTab('evening')}
            className={`py-2.5 px-5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              activeShiftTab === 'evening'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>🌆 Evening Shift ({eveningList.length})</span>
          </button>

          <button
            onClick={() => setActiveShiftTab('all')}
            className={`py-2.5 px-5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              activeShiftTab === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>📊 All Shifts ({timeRecords.length})</span>
          </button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5 whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Trip Date:</span>
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-950 text-white text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 font-mono cursor-pointer"
          />
        </div>
      </div>

      {/* Search and Secondary Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by bus number, driver name, route or terminal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 text-white text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
          />
        </div>

        {/* Bus Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={busFilter}
            onChange={(e) => setBusFilter(e.target.value)}
            className="bg-slate-950 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
          >
            <option value="all">All Buses ({buses.length})</option>
            {buses.map(b => (
              <option key={b.id} value={b.id}>
                {b.bus_number} &bull; {b.bus_name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="completed">✅ Completed</option>
            <option value="in_progress">🟢 In Progress</option>
            <option value="scheduled">⏳ Scheduled</option>
          </select>

          {(searchQuery || busFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setBusFilter('all');
                setStatusFilter('all');
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Time History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {activeShiftTab === 'morning' ? '🌅 Morning Shift Dispatch Table' : activeShiftTab === 'evening' ? '🌆 Evening Shift Dispatch Table' : '📊 Combined Shift Dispatch Logs'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-mono font-bold">
              {filteredRecords.length} Records
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Click Start/End times synchronized in real-time
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Bus & Shift</th>
                <th className="px-3.5 py-3.5">Assigned Driver</th>
                <th className="px-3.5 py-3.5">Route & Corridor</th>
                <th className="px-3.5 py-3.5 text-center">
                  <span className="text-amber-400">Scheduled Time</span>
                </th>
                <th className="px-4 py-3.5">
                  <span className="text-emerald-400 font-black">🟢 Driver Start Time</span>
                </th>
                <th className="px-4 py-3.5">
                  <span className="text-rose-400 font-black">🏁 Driver End Time</span>
                </th>
                <th className="px-3.5 py-3.5 text-center">Duration</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">
                  <span className="text-blue-400">⚡ Admin Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-bold text-slate-400">No Time History records matched the selected criteria.</p>
                    <p className="text-xs text-slate-600 mt-1">Try changing shift, clearing search query, or selecting another date.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const isMorning = record.shift === 'morning';
                  const isInProgress = record.status === 'in_progress';
                  const isCompleted = record.status === 'completed';

                  return (
                    <tr key={record.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Bus & Shift Badge */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                            isMorning 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {record.bus_number.replace('BUS-', '')}
                          </div>
                          <div>
                            <div className="font-extrabold text-white text-xs flex items-center gap-1.5">
                              <span>{record.bus_number}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                isMorning
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                              }`}>
                                {isMorning ? '🌅 Morning' : '🌆 Evening'}
                              </span>
                            </div>
                            <div className="text-[10.5px] text-slate-400 font-mono">
                              {record.registration_number || record.bus_name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Driver */}
                      <td className="px-3.5 py-3.5">
                        <div className="font-bold text-slate-200">{record.driver_name}</div>
                        <div className="text-[10.5px] text-slate-500 font-mono">{record.driver_phone}</div>
                      </td>

                      {/* Route & Corridor */}
                      <td className="px-3.5 py-3.5 max-w-[220px]">
                        <div className="font-bold text-white truncate" title={record.route_name}>
                          {record.route_name}
                        </div>
                        <div className="text-[10.5px] text-slate-400 flex items-center space-x-1 truncate mt-0.5">
                          <span className="truncate">{record.start_location}</span>
                          <span className="text-slate-600">&rarr;</span>
                          <span className="truncate">{record.destination}</span>
                        </div>
                      </td>

                      {/* Scheduled Time */}
                      <td className="px-3.5 py-3.5 text-center whitespace-nowrap">
                        <div className="font-mono text-xs text-amber-300 font-bold">
                          {record.scheduled_start_time} &bull; {record.scheduled_end_time}
                        </div>
                        <div className="text-[10px] text-slate-500">Scheduled Slot</div>
                      </td>

                      {/* Driver Clicked Start Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {record.start_time ? (
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <div>
                              <div className="font-mono text-xs font-black text-emerald-300">
                                {record.start_time}
                              </div>
                              <div className="text-[10px] text-slate-500">Noted on Start Click</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono text-xs italic">--:-- (Standby)</span>
                        )}
                      </td>

                      {/* Driver Clicked End Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {record.end_time ? (
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            <div>
                              <div className="font-mono text-xs font-black text-rose-300">
                                {record.end_time}
                              </div>
                              <div className="text-[10px] text-slate-500">Noted on End Click</div>
                            </div>
                          </div>
                        ) : isInProgress ? (
                          <div className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10.5px] font-bold animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Trip In Progress...</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono text-xs italic">--:-- (Pending)</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-3.5 py-3.5 text-center whitespace-nowrap">
                        <div className="font-mono font-bold text-xs text-white">
                          {record.duration || '--'}
                        </div>
                        {record.distance_km && (
                          <div className="text-[10px] text-slate-500">{record.distance_km} km logged</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {isCompleted ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            <span>Completed</span>
                          </span>
                        ) : isInProgress ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse">
                            <PlayCircle className="w-3 h-3 mr-1" />
                            <span>In Progress</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            <Timer className="w-3 h-3 mr-1" />
                            <span>Scheduled</span>
                          </span>
                        )}
                      </td>

                      {/* Admin Action Cell */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {isInProgress ? (
                          <button
                            onClick={() => handleAdminRecordEnd(record)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all shadow-md shadow-rose-950/40 cursor-pointer active:scale-95"
                            title="Record End Time now"
                          >
                            <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Log Finish Time</span>
                          </button>
                        ) : isCompleted ? (
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleAdminRecordStart(record)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95"
                              title="Re-log start time"
                            >
                              <RefreshCw className="w-3 h-3 text-slate-400" />
                              <span>Re-log</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAdminRecordStart(record)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all shadow-md shadow-emerald-950/40 cursor-pointer active:scale-95"
                            title="Record Start Time now"
                          >
                            <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Log Start Time</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 border border-emerald-500/50 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 backdrop-blur-md">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold text-slate-100">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
