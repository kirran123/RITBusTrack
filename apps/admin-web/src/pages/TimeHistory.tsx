import React, { useState, useEffect, useMemo } from 'react';
import { Bus, Driver, Route, Trip, BusTimeRecord, timeHistoryStore } from '@college-bus/shared';
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
  Sunrise,
  Sunset,
  Trash2,
  ChevronDown,
  X,
  FileSpreadsheet,
  Plus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TimeHistoryProps {
  buses: Bus[];
  drivers: Driver[];
  routes: Route[];
  trips?: Trip[];
  currentUser?: any;
}

export const TimeHistory: React.FC<TimeHistoryProps> = ({
  buses = [],
  drivers = [],
  routes = [],
  currentUser,
}) => {
  const canEdit = currentUser?.role === 'admin' || (currentUser?.role === 'staff' && currentUser?.access_level === 'edit');

  // Time records state initialized from real driver actions & store
  const [timeRecords, setTimeRecords] = useState<BusTimeRecord[]>(() => {
    return timeHistoryStore.getRecords();
  });

  // Filter States
  const [activeShiftTab, setActiveShiftTab] = useState<'morning' | 'evening' | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [busFilter, setBusFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'scheduled'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual Dispatch Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualBusId, setManualBusId] = useState(buses[0]?.id || '');
  const [manualShift, setManualShift] = useState<'morning' | 'evening'>('morning');
  const [manualAction, setManualAction] = useState<'start' | 'end'>('start');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Real-time reactive subscription to driver start/end trip actions via store + Supabase Realtime
  useEffect(() => {
    const unsubscribe = timeHistoryStore.subscribe((updatedRecords) => {
      setTimeRecords(updatedRecords);
    });

    let channel: any = null;
    if (supabase) {
      // 1. Initial fetch from Supabase time_records table so any admin / staff sees all existing logs
      supabase
        .from('time_records')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data && Array.isArray(data) && data.length > 0) {
            timeHistoryStore.mergeRecords(data);
            setTimeRecords(timeHistoryStore.getRecords());
          }
        })
        .catch((err) => console.warn('Supabase time_records fetch note:', err));

      channel = supabase
        .channel('time_records_sync')
        .on('broadcast', { event: 'time_history_update' }, ({ payload }: { payload: any }) => {
          if (payload && payload.params) {
            if (payload.action === 'start') {
              timeHistoryStore.recordTripStart(payload.params);
            } else if (payload.action === 'end') {
              timeHistoryStore.recordTripEnd(payload.params);
            }
            setTimeRecords(timeHistoryStore.getRecords());
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'time_records' }, ({ new: row }: any) => {
          if (row) {
            timeHistoryStore.mergeRecords([row]);
            setTimeRecords(timeHistoryStore.getRecords());
          }
        })
        .subscribe();
    }

    // Polling every 2s to guarantee instant sync across tabs and memory
    const interval = setInterval(() => {
      const records = timeHistoryStore.getRecords();
      setTimeRecords(records);
    }, 2000);

    return () => {
      unsubscribe();
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      clearInterval(interval);
    };
  }, []);

  // Compute filtered records
  const filteredRecords = useMemo(() => {
    return timeRecords.filter((record) => {
      const matchesShift = activeShiftTab === 'all' || record.shift === activeShiftTab;
      const matchesDate = !selectedDate || record.date === selectedDate;
      const matchesBus = busFilter === 'all' || record.bus_id === busFilter || record.bus_number === busFilter;
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      const matchesSearch =
        searchQuery.trim() === '' ||
        (record.bus_number && record.bus_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (record.driver_name && record.driver_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (record.route_name && record.route_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (record.start_location && record.start_location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (record.destination && record.destination.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesShift && matchesDate && matchesBus && matchesStatus && matchesSearch;
    });
  }, [timeRecords, activeShiftTab, selectedDate, busFilter, statusFilter, searchQuery]);

  // Morning and Evening Counts
  const morningList = useMemo(
    () => timeRecords.filter((r) => r.shift === 'morning' && (!selectedDate || r.date === selectedDate)),
    [timeRecords, selectedDate]
  );
  const eveningList = useMemo(
    () => timeRecords.filter((r) => r.shift === 'evening' && (!selectedDate || r.date === selectedDate)),
    [timeRecords, selectedDate]
  );

  const morningCompleted = morningList.filter((r) => r.status === 'completed').length;
  const morningInProgress = morningList.filter((r) => r.status === 'in_progress').length;

  const eveningCompleted = eveningList.filter((r) => r.status === 'completed').length;
  const eveningInProgress = eveningList.filter((r) => r.status === 'in_progress').length;

  // Admin Start Trip Action
  const handleAdminRecordStart = async (record: BusTimeRecord) => {
    if (!canEdit) return;
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
    showToast(`Noted START time for ${record.bus_number} (${record.shift.toUpperCase()}) at ${updatedRecord.start_time}`);

    if (supabase) {
      try {
        await supabase.from('time_records').upsert(updatedRecord);
        const channel = supabase.channel('time_records_sync');
        channel.send({
          type: 'broadcast',
          event: 'time_history_update',
          payload: { action: 'start', params: updatedRecord },
        }).catch(() => {});
      } catch (err) {
        console.warn('Supabase upsert error:', err);
      }
    }
  };

  // Admin End Trip Action
  const handleAdminRecordEnd = async (record: BusTimeRecord) => {
    if (!canEdit) return;
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
    showToast(`Noted END time for ${record.bus_number} (${record.shift.toUpperCase()}) at ${updatedRecord.end_time}`);

    if (supabase) {
      try {
        await supabase.from('time_records').upsert(updatedRecord);
        const channel = supabase.channel('time_records_sync');
        channel.send({
          type: 'broadcast',
          event: 'time_history_update',
          payload: { action: 'end', params: updatedRecord },
        }).catch(() => {});
      } catch (err) {
        console.warn('Supabase upsert error:', err);
      }
    }
  };

  // Manual Dispatch Submit (New entry for any bus)
  const handleManualDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBus = buses.find((b) => b.id === manualBusId) || buses[0];
    if (!targetBus) return;

    const targetRoute = routes.find((r) => r.id === targetBus.route_id);
    const targetDriver = drivers.find(
      (d) => d.id === (targetBus.substitute_driver_id || targetBus.assigned_driver_id)
    );

    const rName = targetRoute?.route_name || (targetRoute as any)?.name || 'Corridor Express';
    const startLoc = manualShift === 'morning'
      ? (targetRoute?.start_location || (targetRoute as any)?.start_point || 'Old Bus Stand')
      : (targetRoute?.destination || (targetRoute as any)?.end_point || 'RIT Campus');
    const destLoc = manualShift === 'morning'
      ? (targetRoute?.destination || (targetRoute as any)?.end_point || 'RIT Campus')
      : (targetRoute?.start_location || (targetRoute as any)?.start_point || 'Old Bus Stand');

    if (manualAction === 'start') {
      const rec = timeHistoryStore.recordTripStart({
        busId: targetBus.id,
        busNumber: targetBus.bus_number,
        registrationNumber: targetBus.registration_number,
        driverId: targetDriver?.id,
        driverName: targetDriver?.profile?.name || targetDriver?.name || 'Driver',
        driverPhone: targetDriver?.phone || targetDriver?.profile?.phone || '+91 9894668646',
        routeName: rName,
        startLocation: startLoc,
        destination: destLoc,
        shift: manualShift,
        date: selectedDate || new Date().toISOString().split('T')[0],
      });
      setTimeRecords(timeHistoryStore.getRecords());
      showToast(`Started trip entry for ${targetBus.bus_number} (${manualShift.toUpperCase()})`);

      if (supabase) {
        try {
          await supabase.from('time_records').upsert(rec);
          const channel = supabase.channel('time_records_sync');
          channel.send({
            type: 'broadcast',
            event: 'time_history_update',
            payload: { action: 'start', params: rec },
          }).catch(() => {});
        } catch {}
      }
    } else {
      const rec = timeHistoryStore.recordTripEnd({
        busId: targetBus.id,
        busNumber: targetBus.bus_number,
        registrationNumber: targetBus.registration_number,
        driverId: targetDriver?.id,
        driverName: targetDriver?.profile?.name || targetDriver?.name || 'Driver',
        driverPhone: targetDriver?.phone || targetDriver?.profile?.phone || '+91 9894668646',
        routeName: rName,
        startLocation: startLoc,
        destination: destLoc,
        shift: manualShift,
        date: selectedDate || new Date().toISOString().split('T')[0],
      });
      setTimeRecords(timeHistoryStore.getRecords());
      showToast(`Finished trip entry for ${targetBus.bus_number} (${manualShift.toUpperCase()})`);

      if (supabase) {
        try {
          await supabase.from('time_records').upsert(rec);
          const channel = supabase.channel('time_records_sync');
          channel.send({
            type: 'broadcast',
            event: 'time_history_update',
            payload: { action: 'end', params: rec },
          }).catch(() => {});
        } catch {}
      }
    }

    setIsManualModalOpen(false);
  };

  const handleClearAllHistory = async () => {
    if (!canEdit) return;
    if (
      window.confirm(
        'Are you sure you want to clear all stored Time History logs? All driver start/end records will be permanently removed across all admin and staff logins.'
      )
    ) {
      timeHistoryStore.clearAllRecords();
      setTimeRecords([]);
      if (supabase) {
        try {
          await supabase.from('time_records').delete().neq('id', 'placeholder');
        } catch {}
      }
      showToast('All Time History records have been cleared.');
    }
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

    const rows = filteredRecords.map((r) => [
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

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RIT_Bus_Time_History_${selectedDate || 'All'}_${activeShiftTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
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
            fontSize: '13px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="section-intro">
        <div>
          <span className="eyebrow section-eyebrow">
            <span className="eyebrow-dot" /> DRIVER DISPATCH TELEMETRY LOGS
          </span>
          <h1>
            Time History<span className="headline-period">.</span>
          </h1>
          <p>
            Real-time automated logging of bus start & end timestamps triggered when drivers click{' '}
            <strong>Start Trip</strong> and <strong>End Trip</strong> on their cockpit devices for Morning and Evening shifts.
          </p>
        </div>
        <div className="section-summary">
          <strong>{timeRecords.length}</strong>
          <span>dispatch records logged</span>
        </div>
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="metric-grid" style={{ marginBottom: '14px' }}>
        {/* Morning Shift Card */}
        <div className="metric-card metric-amber">
          <div className="metric-top">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Sunrise size={14} style={{ color: '#d97706' }} /> Morning Shift
            </span>
            <span className="metric-icon">
              <Sunrise size={14} />
            </span>
          </div>
          <div className="metric-value-row">
            <strong>{morningCompleted}</strong>
            <span className="metric-trend" style={{ color: 'var(--muted)' }}>
              / {buses.length} finished
            </span>
          </div>
          <div className="metric-bottom">
            <span>Live in progress:</span>
            <strong style={{ color: 'var(--green)' }}>{morningInProgress} Active</strong>
          </div>
        </div>

        {/* Evening Shift Card */}
        <div className="metric-card metric-blue">
          <div className="metric-top">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Sunset size={14} style={{ color: '#6366f1' }} /> Evening Shift
            </span>
            <span className="metric-icon">
              <Sunset size={14} />
            </span>
          </div>
          <div className="metric-value-row">
            <strong>{eveningCompleted}</strong>
            <span className="metric-trend" style={{ color: 'var(--muted)' }}>
              / {buses.length} finished
            </span>
          </div>
          <div className="metric-bottom">
            <span>Live in progress:</span>
            <strong style={{ color: 'var(--green)' }}>{eveningInProgress} Active</strong>
          </div>
        </div>

        {/* Monitored Fleet */}
        <div className="metric-card metric-green">
          <div className="metric-top">
            <span>Monitored Fleet</span>
            <span className="metric-icon">
              <BusIcon size={14} />
            </span>
          </div>
          <div className="metric-value-row">
            <strong>{buses.length}</strong>
            <span className="metric-trend">Buses</span>
          </div>
          <div className="metric-bottom">
            <span>Assigned corridors:</span>
            <strong>{routes.length} Routes</strong>
          </div>
        </div>

        {/* Live Telemetry Engine */}
        <div className="metric-card metric-green">
          <div className="metric-top">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span className="footer-live-dot" /> Live Telemetry
            </span>
            <span className="metric-icon">
              <RefreshCw size={14} />
            </span>
          </div>
          <div className="metric-value-row">
            <strong style={{ fontSize: '20px' }}>Realtime Sync</strong>
          </div>
          <div className="metric-bottom">
            <span>Driver trigger:</span>
            <strong style={{ color: 'var(--green)' }}>Automated</strong>
          </div>
        </div>
      </div>

      {/* 3. Primary Shift Segmented Tab Switcher */}
      <div
        className="change-type-tabs"
        style={{
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={activeShiftTab === 'morning' ? 'active' : ''}
            onClick={() => setActiveShiftTab('morning')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Sunrise size={14} style={{ color: activeShiftTab === 'morning' ? '#d97706' : 'inherit' }} />
            <span>Morning Shift ({morningList.length})</span>
          </button>

          <button
            type="button"
            className={activeShiftTab === 'evening' ? 'active' : ''}
            onClick={() => setActiveShiftTab('evening')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Sunset size={14} style={{ color: activeShiftTab === 'evening' ? '#6366f1' : 'inherit' }} />
            <span>Evening Shift ({eveningList.length})</span>
          </button>

          <button
            type="button"
            className={activeShiftTab === 'all' ? 'active' : ''}
            onClick={() => setActiveShiftTab('all')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Clock size={14} />
            <span>All Shifts ({timeRecords.length})</span>
          </button>
        </div>

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={14} /> Trip Date:
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--panel)',
              color: 'var(--ink)',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          />
        </div>
      </div>

      {/* 4. Toolbar */}
      <div className="data-toolbar">
        <div className="data-toolbar-left" style={{ flex: 1 }}>
          <label className="table-search" style={{ width: '100%', maxWidth: '300px' }}>
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by bus, driver, route or terminal..."
            />
            <kbd>/</kbd>
          </label>

          <label className="select-wrap">
            <Filter size={14} />
            <select value={busFilter} onChange={(e) => setBusFilter(e.target.value)}>
              <option value="all">All Buses ({buses.length})</option>
              {buses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bus_number} • {b.bus_name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </label>

          <label className="select-wrap">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="scheduled">Scheduled</option>
            </select>
            <ChevronDown size={13} />
          </label>

          {(searchQuery || busFilter !== 'all' || statusFilter !== 'all' || selectedDate) && (
            <button
              type="button"
              className="text-action"
              onClick={() => {
                setSearchQuery('');
                setBusFilter('all');
                setStatusFilter('all');
                setSelectedDate('');
              }}
            >
              Reset <X size={12} />
            </button>
          )}
        </div>

        <div className="data-toolbar-right">
          {canEdit && (
            <>
              <button
                type="button"
                className="button button-quiet"
                onClick={() => {
                  setManualBusId(buses[0]?.id || '');
                  setManualShift(activeShiftTab === 'evening' ? 'evening' : 'morning');
                  setManualAction('start');
                  setIsManualModalOpen(true);
                }}
                title="Manually log a start or end trip entry"
              >
                <Plus size={14} /> Log Trip Entry
              </button>

              <button
                type="button"
                className="button button-danger"
                onClick={handleClearAllHistory}
                title="Clear all stored time history logs"
              >
                <Trash2 size={14} /> Clear all
              </button>
            </>
          )}

          <button type="button" className="button button-quiet" onClick={handleExportCSV}>
            <FileSpreadsheet size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* 5. Main Dispatch Table matching the old design columns */}
      <div className="panel table-panel">
        <div className="table-meta">
          <span>
            Showing <strong>{filteredRecords.length}</strong> dispatch records
            {selectedDate && <small> for {selectedDate}</small>}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Start & End timestamps recorded from driver cockpit actions
          </span>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Bus & Shift</th>
                <th>Assigned Driver</th>
                <th>Route & Corridor</th>
                <th style={{ textAlign: 'center' }}>
                  <span style={{ color: '#d97706' }}>Scheduled Time</span>
                </th>
                <th>
                  <span style={{ color: 'var(--green)' }}>● Driver Start Time</span>
                </th>
                <th>
                  <span style={{ color: 'var(--red)' }}>🏁 Driver End Time</span>
                </th>
                <th style={{ textAlign: 'center' }}>Duration</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th className="actions-col" style={{ textAlign: 'right' }}>
                  Admin Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const isMorning = record.shift === 'morning';
                const isInProgress = record.status === 'in_progress';
                const isCompleted = record.status === 'completed';

                return (
                  <tr key={record.id}>
                    {/* Bus & Shift */}
                    <td>
                      <div className="primary-cell">
                        <div
                          className="primary-cell-icon"
                          style={{
                            background: isMorning ? 'var(--amber-soft)' : 'var(--blue-soft)',
                            color: isMorning ? '#b45309' : '#2563eb',
                            fontWeight: 700,
                          }}
                        >
                          {record.bus_number.replace('BUS-', '')}
                        </div>
                        <span>
                          <strong style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {record.bus_number}
                            <span
                              className={`status-badge ${isMorning ? 'status-warning' : 'status-neutral'}`}
                              style={{ fontSize: '9px', padding: '1px 5px' }}
                            >
                              {isMorning ? '🌅 Morning' : '🌆 Evening'}
                            </span>
                          </strong>
                          <small style={{ fontFamily: 'monospace' }}>
                            {record.registration_number || record.bus_name || 'TN 67 AM 9785'}
                          </small>
                        </span>
                      </div>
                    </td>

                    {/* Assigned Driver */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <strong style={{ color: 'var(--ink)' }}>{record.driver_name}</strong>
                        <small style={{ fontFamily: 'monospace', color: 'var(--muted)' }}>
                          {record.driver_phone || '+91 9894668646'}
                        </small>
                      </div>
                    </td>

                    {/* Route & Corridor */}
                    <td style={{ maxWidth: '240px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <strong style={{ color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {record.route_name}
                        </strong>
                        <small style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span>{record.start_location}</span>
                          <ArrowRight size={10} style={{ flexShrink: 0 }} />
                          <span>{record.destination}</span>
                        </small>
                      </div>
                    </td>

                    {/* Scheduled Time */}
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '11.5px', fontWeight: 600, color: '#b45309' }}>
                        {record.scheduled_start_time || '07:30 AM'} • {record.scheduled_end_time || '08:20 AM'}
                      </div>
                      <small style={{ fontSize: '10px', color: 'var(--muted)' }}>Scheduled Slot</small>
                    </td>

                    {/* Driver Start Time */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {record.start_time ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="footer-live-dot" style={{ margin: 0 }} />
                          <div>
                            <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: 'var(--green)' }}>
                              {record.start_time}
                            </div>
                            <small style={{ fontSize: '10px', color: 'var(--muted)' }}>Noted on Start Click</small>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted-2)', fontFamily: 'monospace', fontSize: '11px', fontStyle: 'italic' }}>
                          --:-- (Standby)
                        </span>
                      )}
                    </td>

                    {/* Driver End Time */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {record.end_time ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />
                          <div>
                            <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: 'var(--red)' }}>
                              {record.end_time}
                            </div>
                            <small style={{ fontSize: '10px', color: 'var(--muted)' }}>Noted on End Click</small>
                          </div>
                        </div>
                      ) : isInProgress ? (
                        <span className="status-badge status-positive" style={{ fontSize: '10px', animation: 'pulse 1.5s infinite' }}>
                          Trip In Progress...
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted-2)', fontFamily: 'monospace', fontSize: '11px', fontStyle: 'italic' }}>
                          --:-- (Pending)
                        </span>
                      )}
                    </td>

                    {/* Duration */}
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 650, color: 'var(--ink)' }}>
                        {record.duration || '--'}
                      </div>
                      {record.distance_km ? (
                        <small style={{ fontSize: '10px', color: 'var(--muted)' }}>{record.distance_km} km</small>
                      ) : null}
                    </td>

                    {/* Status */}
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {isCompleted ? (
                        <span className="status-badge status-positive">
                          <CheckCircle2 size={11} /> Completed
                        </span>
                      ) : isInProgress ? (
                        <span className="status-badge status-neutral" style={{ animation: 'pulse 1.5s infinite' }}>
                          <PlayCircle size={11} /> In Progress
                        </span>
                      ) : (
                        <span className="status-badge status-muted">
                          <Timer size={11} /> Scheduled
                        </span>
                      )}
                    </td>

                    {/* Admin Actions */}
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {!canEdit ? (
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>View Only</span>
                      ) : isInProgress ? (
                        <button
                          type="button"
                          className="button button-quiet"
                          style={{ minHeight: '27px', fontSize: '11px', color: 'var(--red)', borderColor: 'var(--border)' }}
                          onClick={() => handleAdminRecordEnd(record)}
                          title="Record finish time now"
                        >
                          <StopCircle size={12} /> Log Finish Time
                        </button>
                      ) : isCompleted ? (
                        <button
                          type="button"
                          className="button button-quiet"
                          style={{ minHeight: '27px', fontSize: '11px' }}
                          onClick={() => handleAdminRecordStart(record)}
                          title="Re-log or update trip start timestamp"
                        >
                          <PlayCircle size={12} /> Start New
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="button button-quiet"
                          style={{ minHeight: '27px', fontSize: '11px', color: 'var(--green)' }}
                          onClick={() => handleAdminRecordStart(record)}
                          title="Start trip"
                        >
                          <PlayCircle size={12} /> Start Trip
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '48px 16px' }}>
                    <div className="empty-state">
                      <span><Clock size={20} /></span>
                      <strong>No Time History Records Found</strong>
                      <p style={{ maxWidth: '420px', margin: '6px auto 14px', lineHeight: 1.5 }}>
                        Trip start and finish records are dynamically logged here whenever drivers click{' '}
                        <strong style={{ color: 'var(--green)' }}>Start Trip</strong> and{' '}
                        <strong style={{ color: 'var(--red)' }}>End Trip</strong> in their app (or logged manually by an admin).
                      </p>
                      {canEdit && (
                        <button
                          type="button"
                          className="button button-primary"
                          onClick={() => {
                            setManualBusId(buses[0]?.id || '');
                            setManualShift(activeShiftTab === 'evening' ? 'evening' : 'morning');
                            setManualAction('start');
                            setIsManualModalOpen(true);
                          }}
                        >
                          <Plus size={14} /> Log Trip Entry
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

      {/* 6. Manual Dispatch Modal */}
      {isManualModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsManualModalOpen(false);
          }}
        >
          <section className="modal" role="dialog" aria-modal="true" style={{ maxWidth: '480px' }}>
            <header className="modal-header">
              <div>
                <span className="modal-kicker">
                  <span className="eyebrow-dot" /> DISPATCH OVERRIDE
                </span>
                <h2>Manual Trip Dispatch</h2>
                <p>Record a driver trip start or finish timestamp for today's fleet schedule.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsManualModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </header>

            <form className="record-form" onSubmit={handleManualDispatchSubmit}>
              <div className="record-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <label>
                  Select Bus
                  <select
                    value={manualBusId}
                    onChange={(e) => setManualBusId(e.target.value)}
                  >
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bus_number} • {b.bus_name} ({b.registration_number || 'TN 67 AM 9785'})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Shift
                  <select
                    value={manualShift}
                    onChange={(e) => setManualShift(e.target.value as any)}
                  >
                    <option value="morning">🌅 Morning Shift (Pickup ➔ Campus)</option>
                    <option value="evening">🌆 Evening Shift (Campus ➔ Return)</option>
                  </select>
                </label>

                <label>
                  Telemetry Action
                  <select
                    value={manualAction}
                    onChange={(e) => setManualAction(e.target.value as any)}
                  >
                    <option value="start">🟢 Record Start Trip (Driver Departure)</option>
                    <option value="end">🏁 Record End Trip (Driver Arrival)</option>
                  </select>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setIsManualModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  Confirm Dispatch <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
};
