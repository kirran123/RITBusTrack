import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { GPSCoordinate, EmergencyAlert } from '@college-bus/shared';

// Read Supabase credentials with fallback
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isLiveBackendConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('demo')
);

// Initialize Supabase Client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Telemetry Broadcast Event types
export interface BusTelemetryPayload {
  busId: string;
  tripId: string;
  coordinate: GPSCoordinate;
  driverName?: string;
  busNumber?: string;
  distanceKm?: number;
  currentStopIndex?: number;
  status: 'active' | 'completed' | 'sos';
}

export interface FleetSwapNotice {
  id: string;
  type: 'driver_swap' | 'bus_swap';
  title: string;
  message: string;
  busId: string;
  busNumber: string;
  originalDriverName?: string;
  substituteDriverName?: string;
  substituteDriverPhone?: string;
  originalBusNumber?: string;
  replacementBusNumber?: string;
  replacementRegistrationNumber?: string;
  reason?: string;
  timestamp: string;
}

export interface LeaveTogglePayload {
  studentId: string;
  isOnLeave: boolean;
  reason?: string;
  leaveDate?: string;
}

export interface TripUpdatePayload {
  busId: string;
  isTripActive: boolean;
  currentStopIdx: number;
  completedStopIds: string[];
}

// In-memory event bus listeners for peer-to-peer realtime updates within app session
type TelemetryListener = (payload: BusTelemetryPayload) => void;
type SOSListener = (payload: EmergencyAlert) => void;
type FleetSwapListener = (payload: FleetSwapNotice) => void;
type LeaveListener = (payload: LeaveTogglePayload) => void;
type TripListener = (payload: TripUpdatePayload) => void;

const telemetryListeners: Set<TelemetryListener> = new Set();
const sosListeners: Set<SOSListener> = new Set();
const fleetSwapListeners: Set<FleetSwapListener> = new Set();
const leaveListeners: Set<LeaveListener> = new Set();
const tripListeners: Set<TripListener> = new Set();

// Cross-Tab / Cross-Window Broadcast Channel for instant local sync (Web Only)
let crossClientChannel: any = null;
if (Platform.OS === 'web' && typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    crossClientChannel = new BroadcastChannel('bustrack_cross_client_sync');
    crossClientChannel.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || !data.type) return;

      if (data.type === 'location_update') {
        telemetryListeners.forEach((l) => l(data.payload));
      } else if (data.type === 'emergency_sos') {
        sosListeners.forEach((l) => l(data.payload));
      } else if (data.type === 'fleet_swap_notice') {
        fleetSwapListeners.forEach((l) => l(data.payload));
      } else if (data.type === 'leave_toggle') {
        leaveListeners.forEach((l) => l(data.payload));
      } else if (data.type === 'trip_update') {
        tripListeners.forEach((l) => l(data.payload));
      }
    };
  } catch (bcErr) {
    console.warn('BroadcastChannel setup note:', bcErr);
  }
}

// Storage event listener fallback (Web Only)
if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  try {
    window.addEventListener('storage', (e) => {
      if (e.key === 'bustrack_cross_sync_event' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.type === 'location_update') {
            telemetryListeners.forEach((l) => l(data.payload));
          } else if (data.type === 'emergency_sos') {
            sosListeners.forEach((l) => l(data.payload));
          } else if (data.type === 'fleet_swap_notice') {
            fleetSwapListeners.forEach((l) => l(data.payload));
          } else if (data.type === 'leave_toggle') {
            leaveListeners.forEach((l) => l(data.payload));
          } else if (data.type === 'trip_update') {
            tripListeners.forEach((l) => l(data.payload));
          }
        } catch {}
      }
    });
  } catch {}
}

// Shared Realtime Channel
let telemetryChannel: any = null;
let isSubscribing = false;

export function initRealtimeChannel() {
  if (telemetryChannel || isSubscribing || !isLiveBackendConfigured) return;

  try {
    isSubscribing = true;
    telemetryChannel = supabase.channel('bus_tracking_live', {
      config: { broadcast: { self: true } },
    });

    telemetryChannel
      .on('broadcast', { event: 'location_update' }, ({ payload }: { payload: BusTelemetryPayload }) => {
        telemetryListeners.forEach((listener) => listener(payload));
      })
      .on('broadcast', { event: 'emergency_sos' }, ({ payload }: { payload: EmergencyAlert }) => {
        sosListeners.forEach((listener) => listener(payload));
      })
      .on('broadcast', { event: 'fleet_swap_notice' }, ({ payload }: { payload: FleetSwapNotice }) => {
        fleetSwapListeners.forEach((listener) => listener(payload));
      })
      .on('broadcast', { event: 'leave_toggle' }, ({ payload }: { payload: LeaveTogglePayload }) => {
        leaveListeners.forEach((listener) => listener(payload));
      })
      .on('broadcast', { event: 'trip_update' }, ({ payload }: { payload: TripUpdatePayload }) => {
        tripListeners.forEach((listener) => listener(payload));
      })
      .subscribe((status: string) => {
        isSubscribing = false;
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime Telemetry Channel: CONNECTED (Live GPS active)');
        }
      });
  } catch (err) {
    isSubscribing = false;
    console.warn('Realtime channel initialization note:', err);
  }
}

function postCrossClient(type: string, payload: any) {
  if (crossClientChannel) {
    try {
      crossClientChannel.postMessage({ type, payload, timestamp: Date.now() });
    } catch {}
  }
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('bustrack_cross_sync_event', JSON.stringify({ type, payload, timestamp: Date.now() }));
    } catch {}
  }
}

/**
 * Broadcast GPS coordinate to Realtime channel and Supabase database
 */
export async function broadcastBusTelemetry(payload: BusTelemetryPayload) {
  // 1. In-memory listeners immediately
  telemetryListeners.forEach((listener) => listener(payload));

  // 2. Cross-client channel for instant local / cross-tab reflection
  postCrossClient('location_update', payload);

  // 3. Supabase realtime WebSocket
  if (telemetryChannel) {
    try {
      await telemetryChannel.send({
        type: 'broadcast',
        event: 'location_update',
        payload,
      });
    } catch {}
  }

  // 4. Supabase DB Upsert
  if (isLiveBackendConfigured) {
    try {
      await supabase.from('current_bus_locations').upsert({
        bus_id: payload.busId,
        trip_id: payload.tripId,
        latitude: payload.coordinate.latitude,
        longitude: payload.coordinate.longitude,
        speed: payload.coordinate.speed || 0,
        heading: payload.coordinate.heading || 0,
        accuracy: payload.coordinate.accuracy || 5,
        updated_at: new Date().toISOString(),
      });
    } catch {}
  }
}

/**
 * Broadcast Emergency SOS alert
 */
export async function broadcastEmergencySOS(alert: EmergencyAlert) {
  sosListeners.forEach((listener) => listener(alert));
  postCrossClient('emergency_sos', alert);

  if (telemetryChannel) {
    try {
      await telemetryChannel.send({
        type: 'broadcast',
        event: 'emergency_sos',
        payload: alert,
      });
    } catch {}
  }

  if (isLiveBackendConfigured) {
    try {
      await supabase.from('emergency_alerts').insert({
        bus_id: alert.bus_id,
        driver_id: alert.driver_id,
        trip_id: alert.trip_id,
        type: alert.type,
        message: alert.message,
        latitude: alert.latitude,
        longitude: alert.longitude,
        status: 'ACTIVE',
      });
    } catch {}
  }
}

/**
 * Broadcast Fleet Swap Notice
 */
export async function broadcastFleetSwapNotice(notice: FleetSwapNotice) {
  fleetSwapListeners.forEach((listener) => listener(notice));
  postCrossClient('fleet_swap_notice', notice);

  if (telemetryChannel) {
    try {
      await telemetryChannel.send({
        type: 'broadcast',
        event: 'fleet_swap_notice',
        payload: notice,
      });
    } catch {}
  }
}

/**
 * Broadcast Student Leave Toggle
 */
export async function broadcastLeaveToggle(payload: LeaveTogglePayload) {
  leaveListeners.forEach((listener) => listener(payload));
  postCrossClient('leave_toggle', payload);

  if (telemetryChannel) {
    try {
      await telemetryChannel.send({
        type: 'broadcast',
        event: 'leave_toggle',
        payload,
      });
    } catch {}
  }

  if (isLiveBackendConfigured) {
    try {
      await supabase
        .from('students')
        .update({ is_on_leave: payload.isOnLeave })
        .eq('id', payload.studentId);
    } catch {}
  }
}

/**
 * Broadcast Trip State Update (Start, Advance Stop, Finish)
 */
export async function broadcastTripUpdate(payload: TripUpdatePayload) {
  tripListeners.forEach((listener) => listener(payload));
  postCrossClient('trip_update', payload);

  if (telemetryChannel) {
    try {
      await telemetryChannel.send({
        type: 'broadcast',
        event: 'trip_update',
        payload,
      });
    } catch {}
  }
}

export function subscribeToTelemetry(listener: TelemetryListener) {
  telemetryListeners.add(listener);
  return () => {
    telemetryListeners.delete(listener);
  };
}

export function subscribeToSOS(listener: SOSListener) {
  sosListeners.add(listener);
  return () => {
    sosListeners.delete(listener);
  };
}

export function subscribeToFleetSwap(listener: FleetSwapListener) {
  fleetSwapListeners.add(listener);
  return () => {
    fleetSwapListeners.delete(listener);
  };
}

export function subscribeToLeave(listener: LeaveListener) {
  leaveListeners.add(listener);
  return () => {
    leaveListeners.delete(listener);
  };
}

export function subscribeToTrip(listener: TripListener) {
  tripListeners.add(listener);
  return () => {
    tripListeners.delete(listener);
  };
}

// Auto-initialize realtime channel on load
initRealtimeChannel();
