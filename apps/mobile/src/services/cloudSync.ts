import { Student, Driver, StaffCommuter, StaffUser, Bus, Route, Stop, CLOUD_REGISTRY_SNAPSHOT_ID, CLOUD_REGISTRY_NOTIFICATION_TITLE, SyncedUserRegistryPayload } from '@college-bus/shared';
import { supabase, isLiveBackendConfigured } from './supabase';
import { authStorage } from './authStorage';
import { studentRosterStore } from './studentStore';

let cachedRegistry: SyncedUserRegistryPayload | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds

/**
 * Apply a received cloud registry to local persistent storage (AsyncStorage & localStorage)
 */
export async function applyRegistryToStorage(payload: SyncedUserRegistryPayload): Promise<void> {
  if (!payload) return;
  try {
    cachedRegistry = payload;
    lastFetchTime = Date.now();

    if (Array.isArray(payload.students) && payload.students.length > 0) {
      await authStorage.setItem('bustrack_students_v1', JSON.stringify(payload.students));
      try {
        studentRosterStore.updateFromRegistry(payload.students);
      } catch {}
    }
    if (Array.isArray(payload.drivers) && payload.drivers.length > 0) {
      await authStorage.setItem('bustrack_drivers_v1', JSON.stringify(payload.drivers));
    }
    if (Array.isArray(payload.staffCommuters) && payload.staffCommuters.length > 0) {
      await authStorage.setItem('bustrack_staff_commuters_v1', JSON.stringify(payload.staffCommuters));
    }
    if (Array.isArray(payload.staffList) && payload.staffList.length > 0) {
      await authStorage.setItem('bustrack_staff_v1', JSON.stringify(payload.staffList));
    }
    if (Array.isArray(payload.buses) && payload.buses.length > 0) {
      await authStorage.setItem('bustrack_buses_v1', JSON.stringify(payload.buses));
    }
    if (Array.isArray(payload.routes) && payload.routes.length > 0) {
      await authStorage.setItem('bustrack_routes_v1', JSON.stringify(payload.routes));
    }
    if (Array.isArray(payload.stops) && payload.stops.length > 0) {
      await authStorage.setItem('bustrack_stops_v1', JSON.stringify(payload.stops));
    }
    console.log('✅ Applied user registry to mobile storage. Students:', payload.students?.length, 'Drivers:', payload.drivers?.length, 'Staff:', payload.staffCommuters?.length);
  } catch (err) {
    console.warn('⚠️ Error applying registry to storage:', err);
  }
}

/**
 * Fetches the user registry snapshot from Supabase Cloud.
 * Caches in memory for 15s unless forceRefresh is true.
 */
export async function fetchCloudUserRegistry(forceRefresh = false): Promise<SyncedUserRegistryPayload | null> {
  if (!isLiveBackendConfigured || !supabase) return cachedRegistry;

  const now = Date.now();
  if (!forceRefresh && cachedRegistry && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedRegistry;
  }

  try {
    // 1. Fetch by fixed UUID snapshot row
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', CLOUD_REGISTRY_SNAPSHOT_ID)
      .limit(1);

    if (!error && data && data.length > 0 && data[0].message) {
      const payload: SyncedUserRegistryPayload = JSON.parse(data[0].message);
      await applyRegistryToStorage(payload);
      return payload;
    }

    // 2. Fallback fetch by title
    const { data: byTitle, error: titleErr } = await supabase
      .from('notifications')
      .select('*')
      .eq('title', CLOUD_REGISTRY_NOTIFICATION_TITLE)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!titleErr && byTitle && byTitle.length > 0 && byTitle[0].message) {
      const payload: SyncedUserRegistryPayload = JSON.parse(byTitle[0].message);
      await applyRegistryToStorage(payload);
      return payload;
    }

    return cachedRegistry;
  } catch (err) {
    console.warn('⚠️ Cloud registry fetch warning:', err);
    return cachedRegistry;
  }
}

/**
 * Direct database fallback lookup for newly added students
 */
export async function findStudentInDatabaseDirectly(identifier: string): Promise<any | null> {
  if (!isLiveBackendConfigured || !supabase) return null;
  const cleanInput = identifier.trim().toLowerCase();
  const cleanPrefix = cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput;

  try {
    const { data, error } = await supabase
      .from('students')
      .select('*, profile:profiles(*), boarding_stop:stops(*), bus:buses(*)')
      .or(`register_number.ilike.${cleanInput},register_number.ilike.${cleanPrefix}`)
      .limit(1);

    if (!error && data && data.length > 0) {
      return data[0];
    }
    return null;
  } catch {
    return null;
  }
}
