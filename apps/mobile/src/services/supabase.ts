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

// In-memory event bus listeners for peer-to-peer realtime updates within app session
type TelemetryListener = (payload: BusTelemetryPayload) => void;
type SOSListener = (payload: EmergencyAlert) => void;
type FleetSwapListener = (payload: FleetSwapNotice) => void;

const telemetryListeners: Set<TelemetryListener> = new Set();
const sosListeners: Set<SOSListener> = new Set();
const fleetSwapListeners: Set<FleetSwapListener> = new Set();

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
      .subscribe((status: string) => {
        isSubscribing = false;
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime Telemetry Channel: CONNECTED (Live GPS active)');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('ℹ️ Realtime Channel Notice: Supabase JWT anon key (starts with "eyJ...") is required for WebSockets. Local broadcast fallback active.');
        } else {
          console.log('Realtime Telemetry Status:', status);
        }
      });
  } catch (err) {
    isSubscribing = false;
    console.warn('Realtime channel initialization note:', err);
  }
}

/**
 * Broadcast GPS coordinate to Realtime channel and Supabase database
 */
export async function broadcastBusTelemetry(payload: BusTelemetryPayload) {
  // 1. Always notify in-memory listeners immediately (zero latency)
  telemetryListeners.forEach((listener) => listener(payload));

  // 2. Broadcast across WebSocket channel if connected
  if (telemetryChannel) {
    try {
      await telemetryChannel.send({
        type: 'broadcast',
        event: 'location_update',
        payload,
      });
    } catch (err) {
      // Graceful fallback
    }
  }

  // 3. Push to database table if configured
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
    } catch (dbErr) {
      // Ignore transient network errors
    }
  }
}

/**
 * Broadcast Emergency SOS alert
 */
export async function broadcastEmergencySOS(alert: EmergencyAlert) {
  sosListeners.forEach((listener) => listener(alert));

  if (telemetryChannel) {
    try {
      await telemetryChannel.send({
        type: 'broadcast',
        event: 'emergency_sos',
        payload: alert,
      });
    } catch (err) {
      // Graceful fallback
    }
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
    } catch (dbErr) {
      // Ignore transient network errors
    }
  }
}

export async function broadcastFleetSwapNotice(notice: FleetSwapNotice) {
  fleetSwapListeners.forEach((listener) => listener(notice));

  if (telemetryChannel) {
    try {
      await telemetryChannel.send({
        type: 'broadcast',
        event: 'fleet_swap_notice',
        payload: notice,
      });
    } catch (err) {
      // Graceful fallback
    }
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

// Auto-initialize realtime channel on load
initRealtimeChannel();
