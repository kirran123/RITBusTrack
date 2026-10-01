import { Student, Driver, StaffCommuter, StaffUser, Bus, Route, Stop, CLOUD_REGISTRY_SNAPSHOT_ID, CLOUD_REGISTRY_NOTIFICATION_TITLE, SyncedUserRegistryPayload } from '@college-bus/shared';
import { supabase } from './supabaseClient';

/**
 * Helper to ensure a string is a valid UUID, or convert it deterministically
 */
export function ensureValidUuid(id: string): string {
  if (!id) return '00000000-0000-0000-0000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;

  // Convert non-UUID (e.g. "s_1720000000" or "s1") to deterministic 36-char hex UUID format
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, '').slice(-12).padStart(12, '0');
  return `30000000-${hex.slice(0, 4)}-4000-8000-${cleanId.toLowerCase()}`;
}

export interface CloudPushResult {
  success: boolean;
  timestamp: number;
  studentCount: number;
  driverCount: number;
  staffCount: number;
  error?: string;
}

/**
 * Pushes the complete active user registry (Students, Drivers, Staff) to Supabase Cloud
 * so that all mobile devices, tablets, and web apps stay 100% in sync persistently.
 */
export async function pushRegistryToCloud(params: {
  students: Student[];
  drivers: Driver[];
  staffCommuters: StaffCommuter[];
  staffList: StaffUser[];
  buses?: Bus[];
  routes?: Route[];
  stops?: Stop[];
}): Promise<CloudPushResult> {
  const timestamp = Date.now();

  // 1. Sanitize & enrich students
  const enrichedStudents: Student[] = (params.students || []).map((s, idx) => {
    const rawEmail = (s.profile?.email || s.email || '').trim().toLowerCase();
    const regNum = (s.register_number || s.roll_number || (s as any).rollNumber || '').trim();
    const effectiveEmail = rawEmail || (regNum ? `${regNum}@ritrjpm.ac.in` : `student${idx + 1}@ritrjpm.ac.in`);
    const studentPass = s.password || (s as any).profile?.password || 'student123';
    return {
      ...s,
      register_number: regNum || `953624${String(idx + 1).padStart(6, '0')}`,
      password: studentPass,
      email: effectiveEmail,
      profile: {
        id: s.profile?.id || s.user_id || `prof_stu_${idx + 1}`,
        auth_user_id: s.profile?.auth_user_id || `auth_stu_${idx + 1}`,
        name: s.profile?.name || (s as any).name || `Student ${idx + 1}`,
        email: effectiveEmail,
        phone: s.profile?.phone || (s as any).phone || '+91 9988776655',
        role: 'student',
        status: s.status || 'active',
      },
    };
  });

  // 2. Sanitize & enrich drivers
  const enrichedDrivers: Driver[] = (params.drivers || []).map((d, idx) => {
    const dPhone = (d.phone || d.profile?.phone || '').replace(/\D/g, '');
    const dEmail = (d.profile?.email || (d as any).email || `driver${idx + 1}@ritrjpm.ac.in`).trim().toLowerCase();
    const dPass = d.password || (d as any).profile?.password || 'driver123';
    return {
      ...d,
      phone: dPhone || '9876543210',
      password: dPass,
      profile: {
        id: d.profile?.id || d.user_id || `prof_drv_${idx + 1}`,
        auth_user_id: d.profile?.auth_user_id || `auth_drv_${idx + 1}`,
        name: d.profile?.name || (d as any).name || `Driver ${idx + 1}`,
        email: dEmail,
        phone: dPhone || '9876543210',
        role: 'driver',
        status: d.status || 'active',
      },
    };
  });

  // 3. Sanitize & enrich staff commuters & staff users
  const enrichedStaffCommuters: StaffCommuter[] = (params.staffCommuters || []).map((sc, idx) => {
    const scEmail = (sc.email || sc.profile?.email || `staff${idx + 1}@ritrjpm.ac.in`).trim().toLowerCase();
    const scPass = sc.password || (sc as any).profile?.password || 'staff123';
    return {
      ...sc,
      email: scEmail,
      password: scPass,
      profile: {
        id: sc.profile?.id || sc.user_id || `prof_sc_${idx + 1}`,
        auth_user_id: sc.profile?.auth_user_id || `auth_sc_${idx + 1}`,
        name: sc.name || sc.profile?.name || `Staff Member ${idx + 1}`,
        email: scEmail,
        phone: sc.phone || sc.profile?.phone || '+91 9629284690',
        role: 'staff',
        status: sc.status || 'active',
      },
    };
  });

  const payload: SyncedUserRegistryPayload = {
    version: 1,
    updatedAt: timestamp,
    students: enrichedStudents,
    drivers: enrichedDrivers,
    staffCommuters: enrichedStaffCommuters,
    staffList: params.staffList || [],
    buses: params.buses || [],
    routes: params.routes || [],
    stops: params.stops || [],
  };

  // Broadcast through cross-client channel immediately (Electron/Tabs)
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('bustrack_cross_client_sync');
      bc.postMessage({ type: 'sync_user_registry', payload });
      bc.close();
    }
  } catch {}

  // Push to Supabase if configured
  if (!supabase) {
    return {
      success: true,
      timestamp,
      studentCount: enrichedStudents.length,
      driverCount: enrichedDrivers.length,
      staffCount: enrichedStaffCommuters.length,
    };
  }

  try {
    // A. Upsert into Supabase persistent cloud document store (notifications table)
    const { error: snapError } = await supabase.from('notifications').upsert({
      id: CLOUD_REGISTRY_SNAPSHOT_ID,
      title: CLOUD_REGISTRY_NOTIFICATION_TITLE,
      message: JSON.stringify(payload),
      type: 'broadcast',
      target_type: 'all',
    } as any);

    if (snapError) {
      console.warn('⚠️ Cloud registry snapshot notice:', snapError.message);
    } else {
      console.log('☁️ Successfully saved cloud registry snapshot to Supabase!');
    }

    // B. Send ephemeral Realtime broadcast on 'bus_tracking_live' channel
    try {
      const liveChannel = supabase.channel('bus_tracking_live', {
        config: { broadcast: { self: false } },
      });
      liveChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          liveChannel.send({
            type: 'broadcast',
            event: 'sync_user_registry',
            payload,
          }).catch(() => {});
        }
      });
    } catch {}

    // C. Best-effort individual student upsert into Supabase students table
    try {
      for (const st of enrichedStudents) {
        const studentUuid = ensureValidUuid(st.id);
        const routeUuid = st.route_id ? ensureValidUuid(st.route_id) : null;
        const busUuid = st.bus_id ? ensureValidUuid(st.bus_id) : null;
        const stopUuid = st.boarding_stop_id ? ensureValidUuid(st.boarding_stop_id) : null;

        await supabase.from('students').upsert({
          id: studentUuid,
          user_id: null,
          register_number: st.register_number,
          department: st.department || 'General',
          year: Math.max(1, Math.min(5, Number(st.year) || 1)),
          section: st.section || 'A',
          route_id: routeUuid,
          bus_id: busUuid,
          boarding_stop_id: stopUuid,
          status: st.status || 'active',
        } as any);
      }
    } catch (stErr) {
      // Best-effort
    }

    return {
      success: true,
      timestamp,
      studentCount: enrichedStudents.length,
      driverCount: enrichedDrivers.length,
      staffCount: enrichedStaffCommuters.length,
    };
  } catch (err: any) {
    console.error('Error pushing registry to cloud:', err);
    return {
      success: false,
      timestamp,
      studentCount: enrichedStudents.length,
      driverCount: enrichedDrivers.length,
      staffCount: enrichedStaffCommuters.length,
      error: err?.message || 'Failed to push registry',
    };
  }
}

/**
 * Pulls the latest user registry from Supabase Cloud
 */
export async function pullRegistryFromCloud(): Promise<SyncedUserRegistryPayload | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', CLOUD_REGISTRY_SNAPSHOT_ID)
      .limit(1);

    if (error || !data || data.length === 0) {
      // Try fallback by title
      const { data: byTitle } = await supabase
        .from('notifications')
        .select('*')
        .eq('title', CLOUD_REGISTRY_NOTIFICATION_TITLE)
        .order('created_at', { ascending: false })
        .limit(1);

      if (byTitle && byTitle.length > 0 && byTitle[0].message) {
        return JSON.parse(byTitle[0].message);
      }
      return null;
    }

    if (data[0].message) {
      return JSON.parse(data[0].message);
    }
    return null;
  } catch (err) {
    console.warn('Error pulling registry from cloud:', err);
    return null;
  }
}
