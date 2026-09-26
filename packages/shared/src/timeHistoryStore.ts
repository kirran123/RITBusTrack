import { BusTimeRecord } from './types';

const STORAGE_KEY = 'bustrack_live_time_history_v3';
const SYNC_CHANNEL = 'bustrack_cross_client_sync';

export interface TripLogParams {
  tripId?: string;
  busId: string;
  busNumber: string;
  busName?: string;
  registrationNumber?: string;
  driverId?: string;
  driverName: string;
  driverPhone?: string;
  routeName?: string;
  startLocation?: string;
  destination?: string;
  shift: 'morning' | 'evening';
  date?: string; // defaults to today (YYYY-MM-DD)
  distanceKm?: number;
  duration?: string;
  avgSpeedKmh?: number;
  customStartTime?: string;
  customEndTime?: string;
}

export const timeHistoryStore = {
  getRecords(): BusTimeRecord[] {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  },

  saveRecords(records: BusTimeRecord[]) {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        localStorage.setItem('bustrack_cross_sync_event', JSON.stringify({ type: 'time_history_update', timestamp: Date.now() }));
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel(SYNC_CHANNEL);
          bc.postMessage({ type: 'time_history_update', timestamp: Date.now() });
          bc.close();
        }
        window.dispatchEvent(new CustomEvent('bustrack_time_history_changed', { detail: records }));
      } catch {}
    }
  },

  clearAllRecords() {
    this.saveRecords([]);
  },

  recordTripStart(params: TripLogParams): BusTimeRecord {
    const today = params.date || new Date().toISOString().split('T')[0];
    const uniqueTripId = params.tripId || `trip_${Date.now()}_${params.busNumber}`;
    const startTimeFormatted = params.customStartTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const records = this.getRecords();

    const record: BusTimeRecord = {
      id: uniqueTripId,
      bus_id: params.busId,
      bus_number: params.busNumber,
      bus_name: params.busName || `Bus ${params.busNumber}`,
      registration_number: params.registrationNumber || 'TN 67 AM 9785',
      driver_id: params.driverId || 'dr1',
      driver_name: params.driverName || 'Driver',
      driver_phone: params.driverPhone || '+91 9894668646',
      route_name: params.routeName || (params.shift === 'evening' ? 'Route 1 (RIT ➔ Town Drop)' : 'Route 1 (Town ➔ RIT)'),
      start_location: params.startLocation || (params.shift === 'evening' ? 'Ramco Institute of Technology Campus' : 'Old Bus Stand, Rajapalayam'),
      destination: params.destination || (params.shift === 'evening' ? 'Old Bus Stand, Rajapalayam' : 'Ramco Institute of Technology Campus'),
      shift: params.shift,
      date: today,
      scheduled_start_time: params.shift === 'evening' ? '04:30 PM' : '07:30 AM',
      scheduled_end_time: params.shift === 'evening' ? '05:25 PM' : '08:20 AM',
      start_time: startTimeFormatted,
      end_time: null,
      duration: 'In Progress',
      distance_km: 0,
      avg_speed_kmh: 0,
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    };

    // Prepend new trip as a separate unique history log entry
    records.unshift(record);
    this.saveRecords(records);
    return record;
  },

  recordTripEnd(params: TripLogParams): BusTimeRecord {
    const today = params.date || new Date().toISOString().split('T')[0];
    const endTimeFormatted = params.customEndTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const records = this.getRecords();

    // Find in-progress trip for this bus (matching tripId or most recent in_progress for this bus)
    const existingIdx = records.findIndex(r => 
      (params.tripId && r.id === params.tripId) || 
      (r.bus_number === params.busNumber && r.status === 'in_progress')
    );

    const existing = existingIdx >= 0 ? records[existingIdx] : null;
    const start_time = existing?.start_time || params.customStartTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const updatedRecord: BusTimeRecord = {
      id: existing?.id || params.tripId || `trip_${Date.now()}_${params.busNumber}`,
      bus_id: params.busId,
      bus_number: params.busNumber,
      bus_name: params.busName || existing?.bus_name || `Bus ${params.busNumber}`,
      registration_number: params.registrationNumber || existing?.registration_number || 'TN 67 AM 9785',
      driver_id: params.driverId || existing?.driver_id || 'dr1',
      driver_name: params.driverName || existing?.driver_name || 'Driver',
      driver_phone: params.driverPhone || existing?.driver_phone || '+91 9894668646',
      route_name: params.routeName || existing?.route_name || (params.shift === 'evening' ? 'Route 1 (RIT ➔ Town Drop)' : 'Route 1 (Town ➔ RIT)'),
      start_location: params.startLocation || existing?.start_location || (params.shift === 'evening' ? 'Ramco Institute of Technology Campus' : 'Old Bus Stand, Rajapalayam'),
      destination: params.destination || existing?.destination || (params.shift === 'evening' ? 'Old Bus Stand, Rajapalayam' : 'Ramco Institute of Technology Campus'),
      shift: params.shift,
      date: today,
      scheduled_start_time: params.shift === 'evening' ? '04:30 PM' : '07:30 AM',
      scheduled_end_time: params.shift === 'evening' ? '05:25 PM' : '08:20 AM',
      start_time: start_time,
      end_time: endTimeFormatted,
      duration: params.duration || existing?.duration || 'Completed',
      distance_km: params.distanceKm !== undefined ? params.distanceKm : (existing?.distance_km || 0),
      avg_speed_kmh: params.avgSpeedKmh !== undefined ? params.avgSpeedKmh : (existing?.avg_speed_kmh || 0),
      status: 'completed',
      updated_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      records[existingIdx] = updatedRecord;
    } else {
      records.unshift(updatedRecord);
    }

    this.saveRecords(records);
    return updatedRecord;
  },

  subscribe(callback: (records: BusTimeRecord[]) => void) {
    if (typeof window === 'undefined') return () => {};

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          callback(JSON.parse(e.newValue));
        } catch {}
      }
    };

    const handleCustom = (e: any) => {
      if (e.detail) {
        callback(e.detail);
      } else {
        callback(this.getRecords());
      }
    };

    let bc: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel(SYNC_CHANNEL);
        bc.onmessage = (ev) => {
          if (ev.data && ev.data.type === 'time_history_update') {
            callback(this.getRecords());
          }
        };
      } catch {}
    }

    window.addEventListener('storage', handleStorage);
    window.addEventListener('bustrack_time_history_changed', handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('bustrack_time_history_changed', handleCustom);
      if (bc) bc.close();
    };
  }
};
