import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { GPSCoordinate, EmergencyAlert, SystemNotification, timeHistoryStore } from '@college-bus/shared';
import { authStorage } from './authStorage';

// Read Supabase credentials with fallback to live production project
const supabaseUrl = 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  'https://ztsmxehwjyriyihypppu.supabase.co';

const supabaseAnonKey = 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0c214ZWh3anlyaXlpaHlwcHB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MTA4NTMsImV4cCI6MjEwNTQ4Njg1M30.16sn2O8c1HGA6lJTD0TbWYG9lvnHFrhU6-fZXlbmwi4';

export const isLiveBackendConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder')
);

// Initialize Supabase Client safely for both Web and Native Android
export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      persistSession: Platform.OS === 'web',
      autoRefreshToken: Platform.OS === 'web',
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
  shift?: 'morning' | 'evening';
}

// In-memory event bus listeners for peer-to-peer realtime updates within app session
type TelemetryListener = (payload: BusTelemetryPayload) => void;
type SOSListener = (payload: EmergencyAlert) => void;
type FleetSwapListener = (payload: FleetSwapNotice) => void;
type LeaveListener = (payload: LeaveTogglePayload) => void;
type TripListener = (payload: TripUpdatePayload) => void;
type NotificationListener = (payload: SystemNotification) => void;

const telemetryListeners: Set<TelemetryListener> = new Set();
const sosListeners: Set<SOSListener> = new Set();
const fleetSwapListeners: Set<FleetSwapListener> = new Set();
const leaveListeners: Set<LeaveListener> = new Set();
const tripListeners: Set<TripListener> = new Set();
const notificationListeners: Set<NotificationListener> = new Set();

// Deduplication tracking to prevent duplicate message and alert popups
const recentNotificationDedupe = new Map<string, number>();

export function emitSystemNotification(notif: SystemNotification) {
  if (!notif) return;
  const cleanTitle = (notif.title || '').trim();
  const cleanMsg = (notif.message || '').trim();
  const dedupeKey = `${cleanTitle}::${cleanMsg}`;
  const now = Date.now();
  const lastTime = recentNotificationDedupe.get(dedupeKey);

  // If identical notification received within 5 seconds, suppress duplicate
  if (lastTime && now - lastTime < 5000) {
    return;
  }
  recentNotificationDedupe.set(dedupeKey, now);

  if (recentNotificationDedupe.size > 50) {
    for (const [k, timestamp] of recentNotificationDedupe.entries()) {
      if (now - timestamp > 12000) recentNotificationDedupe.delete(k);
    }
  }

  notificationListeners.forEach((listener) => {
    try {
      listener(notif);
    } catch {}
  });
}

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
      } else if (data.type === 'broadcast_notification') {
        emitSystemNotification(data.payload);
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
          } else if (data.type === 'broadcast_notification') {
            notificationListeners.forEach((l) => l(data.payload));
          } else if (data.type === 'time_history_update') {
            if (data.payload?.action === 'start') {
              timeHistoryStore.recordTripStart(data.payload.params);
            } else if (data.payload?.action === 'end') {
              timeHistoryStore.recordTripEnd(data.payload.params);
            }
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
      .on('broadcast', { event: 'broadcast_notification' }, ({ payload }: { payload: SystemNotification }) => {
        emitSystemNotification(payload);
      })
      .on('broadcast', { event: 'time_history_update' }, ({ payload }: { payload: any }) => {
        if (payload && payload.params) {
          if (payload.action === 'start') {
            timeHistoryStore.recordTripStart(payload.params);
          } else if (payload.action === 'end') {
            timeHistoryStore.recordTripEnd(payload.params);
          }
        }
      })
      .on('broadcast', { event: 'sync_user_registry' }, async ({ payload }: any) => {
        if (!payload) return;
        try {
          if (Array.isArray(payload.drivers) && payload.drivers.length > 0) {
            await authStorage.setItem('bustrack_drivers_v1', JSON.stringify(payload.drivers));
          }
          if (Array.isArray(payload.students) && payload.students.length > 0) {
            await authStorage.setItem('bustrack_students_v1', JSON.stringify(payload.students));
          }
          if (Array.isArray(payload.staffCommuters) && payload.staffCommuters.length > 0) {
            await authStorage.setItem('bustrack_staff_commuters_v1', JSON.stringify(payload.staffCommuters));
          }
          if (Array.isArray(payload.staffList) && payload.staffList.length > 0) {
            await authStorage.setItem('bustrack_staff_v1', JSON.stringify(payload.staffList));
          }
          console.log('✅ Synchronized updated user accounts from Admin Control');
        } catch (syncErr) {
          console.warn('Sync registry notice:', syncErr);
        }
      })
      .subscribe((status: string) => {
        isSubscribing = false;
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime Telemetry Channel: CONNECTED (Live GPS & Broadcasts active)');
          // Request fresh registry from online admin web
          requestUserRegistrySync().catch(() => {});
        }
      });

    // Realtime Postgres changes on notifications table
    supabase
      .channel('schema_notifications_broadcasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: any) => {
        const row = payload.new;
        if (!row) return;
        const notif: SystemNotification = {
          id: row.id,
          title: row.title,
          message: row.message,
          type: row.type || 'general',
          target_type: row.target_type || 'all',
          target_id: row.target_id || null,
          created_at: row.created_at || new Date().toISOString(),
        };
        emitSystemNotification(notif);

        const key = 'bustrack_notifications_v1';
        authStorage.getItem(key).then((raw) => {
          let list: SystemNotification[] = [];
          if (raw) {
            try { list = JSON.parse(raw); } catch {}
          }
          if (!Array.isArray(list)) list = [];
          if (!list.some((n) => n.id === notif.id || (n.title === notif.title && n.message === notif.message))) {
            list.unshift(notif);
            if (list.length > 50) list = list.slice(0, 50);
            authStorage.setItem(key, JSON.stringify(list)).catch(() => {});
          }
        }).catch(() => {});
      })
      .subscribe();

    // Also listen to direct DB table inserts on emergency_alerts as a resilient fallback
    supabase
      .channel('schema_emergency_broadcasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emergency_alerts' }, (payload: any) => {
        const row = payload.new;
        if (!row) return;
        const parts = (row.message || '').split(' | ');
        const title = parts.length > 1 ? parts[0] : `🚨 EMERGENCY: ${row.type?.toUpperCase() || 'DISTRESS'}`;
        const message = parts.length > 1 ? parts.slice(1).join(' | ') : row.message;
        const notif: SystemNotification = {
          id: row.id,
          title,
          message,
          type: 'emergency',
          target_type: 'all',
          created_at: row.created_at || new Date().toISOString(),
          priority: 'high',
        };
        emitSystemNotification(notif);

        const alert: EmergencyAlert = {
          id: row.id,
          bus_id: row.bus_id || 'b1',
          driver_id: row.driver_id || 'd1',
          trip_id: row.trip_id,
          type: row.type || 'emergency',
          message: row.message,
          latitude: row.latitude || 9.4475,
          longitude: row.longitude || 77.5450,
          status: row.status || 'ACTIVE',
          created_at: row.created_at || new Date().toISOString(),
        };
        sosListeners.forEach((listener) => listener(alert));
      })
      .subscribe();
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

  // 2b. Persist to localStorage for web
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`bustrack_latest_location_${payload.busId}`, JSON.stringify(payload.coordinate));
      const locsRaw = localStorage.getItem('bustrack_locations_v1');
      let locsList: any[] = [];
      if (locsRaw) {
        try { locsList = JSON.parse(locsRaw); } catch {}
      }
      if (!Array.isArray(locsList)) locsList = [];
      const idx = locsList.findIndex((l: any) => l.bus_id === payload.busId);
      const item = {
        id: 'loc_' + payload.busId,
        bus_id: payload.busId,
        trip_id: payload.tripId,
        latitude: payload.coordinate.latitude,
        longitude: payload.coordinate.longitude,
        speed: payload.coordinate.speed || 0,
        heading: payload.coordinate.heading || 0,
        updated_at: new Date().toISOString(),
      };
      if (idx >= 0) {
        locsList[idx] = item;
      } else {
        locsList.push(item);
      }
      localStorage.setItem('bustrack_locations_v1', JSON.stringify(locsList));
    } catch {}
  }

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
      const isUUID = (str?: string | null) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
      const busId = isUUID(alert.bus_id) ? alert.bus_id : null;
      const driverId = isUUID(alert.driver_id) ? alert.driver_id : null;
      const tripId = isUUID(alert.trip_id) ? alert.trip_id : null;

      await supabase.from('emergency_alerts').insert({
        bus_id: busId,
        driver_id: driverId,
        trip_id: tripId,
        type: (alert.type && ['breakdown', 'accident', 'medical', 'emergency', 'other', 'sos'].includes(alert.type.toLowerCase()))
          ? alert.type.toLowerCase()
          : 'emergency',
        message: alert.message,
        latitude: alert.latitude || 9.4475,
        longitude: alert.longitude || 77.5450,
        status: 'ACTIVE',
      });

      // Also persist to notifications table so all clients pick it up in announcement & bell feeds
      await supabase.from('notifications').insert({
        title: `🚨 EMERGENCY SOS: ${alert.bus_id || 'BUS'}`,
        message: alert.message,
        type: 'emergency',
        target_type: 'all',
        created_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn('DB emergency insert error:', dbErr);
    }
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

/**
 * Broadcast System Notification / Announcement to ALL connected clients (admin, students, staff)
 * Also persists to localStorage so any client that polls will receive it
 */
export async function broadcastSystemNotification(notification: SystemNotification) {
  // 1. Notify in-memory local listeners immediately (same session)
  notificationListeners.forEach((listener) => listener(notification));

  // 2. Persist to authStorage and localStorage so polling clients pick it up
  const key = 'bustrack_notifications_v1';
  authStorage.getItem(key).then((raw) => {
    let list: SystemNotification[] = [];
    if (raw) {
      try { list = JSON.parse(raw); } catch {}
    }
    if (!Array.isArray(list)) list = [];
    if (!list.some((n) => n.id === notification.id)) {
      list.unshift(notification);
      if (list.length > 50) list = list.slice(0, 50);
    }
    authStorage.setItem(key, JSON.stringify(list)).catch(() => {});
  }).catch(() => {});

  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      const existing = localStorage.getItem(key);
      let list: SystemNotification[] = [];
      if (existing) {
        try { list = JSON.parse(existing); } catch {}
      }
      if (!Array.isArray(list)) list = [];
      if (!list.some((n) => n.id === notification.id)) {
        list.unshift(notification);
        if (list.length > 50) list = list.slice(0, 50);
      }
      localStorage.setItem(key, JSON.stringify(list));
    } catch {}
  }

  // 3. Cross-client channel (BroadcastChannel + localStorage event)
  postCrossClient('broadcast_notification', notification);

  // 4. Supabase Realtime channel for cross-device push
  if (telemetryChannel) {
    try {
      await telemetryChannel.send({
        type: 'broadcast',
        event: 'broadcast_notification',
        payload: notification,
      });
    } catch {}
  }

  // 5. Persist to Supabase DB notifications table for admin history and cross-session retrieval
  if (isLiveBackendConfigured) {
    try {
      const validTypes = ['general', 'trip', 'delay', 'emergency', 'maintenance', 'announcement', 'sos', 'urgent', 'route_change', 'broadcast'];
      const rawType = (notification.type || 'general').toLowerCase();
      const dbType = validTypes.includes(rawType) ? rawType : 'general';

      await supabase.from('notifications').insert({
        title: notification.title,
        message: notification.message,
        type: dbType,
        target_type: notification.target_type || 'all',
        target_id: notification.target_id || null,
        created_at: notification.created_at || new Date().toISOString(),
      });
    } catch (e) {
      console.warn('DB notification insert error:', e);
    }
  }
}

/**
 * Broadcast Real-Time Time History Record for Driver Start / End Trip
 * and persist to Supabase Database so all admins & staff see it synchronously
 */
export async function broadcastTimeHistoryUpdate(action: 'start' | 'end', params: any) {
  postCrossClient('time_history_update', { action, params, timestamp: Date.now() });

  if (telemetryChannel) {
    try {
      await telemetryChannel.send({
        type: 'broadcast',
        event: 'time_history_update',
        payload: { action, params, timestamp: Date.now() },
      });
    } catch {}
  }

  // Persist directly to Supabase time_records database table
  if (supabase && params) {
    try {
      const recordPayload = {
        id: params.tripId || `trip_${Date.now()}_${params.busNumber || 'bus'}`,
        bus_id: params.busId,
        bus_number: params.busNumber || 'BUS-01',
        bus_name: params.busName || `Bus ${params.busNumber || '01'}`,
        registration_number: params.registrationNumber || null,
        driver_id: params.driverId || null,
        driver_name: params.driverName || 'Driver',
        driver_phone: params.driverPhone || null,
        route_name: params.routeName || (params.shift === 'evening' ? 'Route (Evening Return)' : 'Route (Morning Pickup)'),
        start_location: params.startLocation || null,
        destination: params.destination || null,
        shift: params.shift || 'morning',
        date: params.date || new Date().toISOString().split('T')[0],
        scheduled_start_time: params.shift === 'evening' ? '04:30 PM' : '07:30 AM',
        scheduled_end_time: params.shift === 'evening' ? '05:25 PM' : '08:20 AM',
        start_time: params.customStartTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        end_time: action === 'end' ? (params.customEndTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : null,
        duration: params.duration || (action === 'end' ? 'Completed' : 'In Progress'),
        distance_km: Number(params.distanceKm || 0),
        avg_speed_kmh: Number(params.avgSpeedKmh || 0),
        status: action === 'end' ? 'completed' : 'in_progress',
        updated_at: new Date().toISOString()
      };
      await supabase.from('time_records').upsert(recordPayload);
    } catch (e) {
      console.warn('Supabase time_records upsert note:', e);
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

export function subscribeToSystemNotifications(listener: NotificationListener) {
  notificationListeners.add(listener);
  return () => {
    notificationListeners.delete(listener);
  };
}

/**
 * Fetch the latest live GPS coordinate of a bus from the Supabase database
 */
export async function fetchLatestBusLocation(busId: string = 'b1'): Promise<GPSCoordinate | null> {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        const storedLatest = localStorage.getItem(`bustrack_latest_location_${busId}`);
        if (storedLatest) {
          const parsed = JSON.parse(storedLatest);
          if (parsed && parsed.latitude && parsed.longitude) {
            return parsed;
          }
        }
      } catch {}
    }

    const { data, error } = await supabase
      .from('current_bus_locations')
      .select('*')
      .eq('bus_id', busId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return {
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      speed: Number(data.speed || 0),
      heading: Number(data.heading || 0),
      accuracy: Number(data.accuracy || 4),
      timestamp: data.updated_at,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch registered live students from the Supabase database
 */
export async function fetchLiveStudentsFromDB(): Promise<any[] | null> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*, profile:profiles(*), boarding_stop:stops(*), bus:buses(*)');

    if (error || !data || data.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch persistent system announcements and admin broadcast alerts from Supabase
 */
export async function fetchSystemNotificationsFromDB(): Promise<SystemNotification[]> {
  if (!isLiveBackendConfigured) return [];
  try {
    const items: SystemNotification[] = [];

    // 1. Fetch from notifications table
    const { data: notifData } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (notifData && Array.isArray(notifData)) {
      notifData.forEach((row: any) => {
        items.push({
          id: row.id,
          title: row.title,
          message: row.message,
          type: row.type || 'general',
          target_type: row.target_type || 'all',
          target_id: row.target_id || null,
          created_at: row.created_at || new Date().toISOString(),
          read_at: row.read_at || null,
        });
      });
    }

    // 2. Fetch from emergency_alerts table
    const { data: alertData } = await supabase
      .from('emergency_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    if (alertData && Array.isArray(alertData)) {
      alertData.forEach((row: any) => {
        const parts = (row.message || '').split(' | ');
        const title = parts.length > 1 ? parts[0] : `🚨 EMERGENCY: ${row.type?.toUpperCase() || 'DISTRESS'}`;
        const message = parts.length > 1 ? parts.slice(1).join(' | ') : row.message;
        if (!items.some((i) => i.id === row.id)) {
          items.push({
            id: row.id,
            title,
            message,
            type: 'emergency',
            target_type: 'all',
            created_at: row.created_at || new Date().toISOString(),
            priority: 'high',
          });
        }
      });
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return items;
  } catch (err) {
    console.warn('fetchSystemNotificationsFromDB error:', err);
    return [];
  }
}

/**
 * Fetch active emergency alerts from Supabase
 */
export async function fetchEmergencyAlertsFromDB(): Promise<EmergencyAlert[]> {
  if (!isLiveBackendConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('emergency_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.id,
      bus_id: row.bus_id || 'b1',
      driver_id: row.driver_id || 'd1',
      trip_id: row.trip_id,
      type: row.type || 'emergency',
      message: row.message,
      latitude: Number(row.latitude || 9.4475),
      longitude: Number(row.longitude || 77.5450),
      status: row.status || 'ACTIVE',
      created_at: row.created_at || new Date().toISOString(),
      resolved_at: row.resolved_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Request real-time user registry sync from active Admin Web clients
 */
export async function requestUserRegistrySync() {
  if (telemetryChannel) {
    try {
      await telemetryChannel.send({
        type: 'broadcast',
        event: 'request_user_registry',
        payload: { timestamp: Date.now() },
      });
    } catch {}
  }
}

/**
 * Fetch registered user profiles from Supabase database
 */
export async function fetchLiveProfilesFromDB(): Promise<any[] | null> {
  if (!isLiveBackendConfigured) return null;
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error || !data || data.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

// Auto-initialize realtime channel on load
initRealtimeChannel();


