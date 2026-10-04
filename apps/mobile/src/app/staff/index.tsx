import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Platform,
  Linking,
  Modal,
  AppState,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OSMMapView } from '../../components/OSMMapView';
import { LocationPermissionBanner, LocationPermissionModal } from '../../components/LocationPermissionModal';
import { NotificationPermissionBanner } from '../../components/NotificationPermissionModal';
import { notificationService } from '../../services/notificationService';
import {
  locationTracker,
  calculateDistanceKm,
  formatDistance,
  calculateDynamicETA,
  DynamicETA,
  formatEventTime,
} from '../../services/locationService';
import { 
  subscribeToTelemetry, 
  subscribeToFleetSwap, 
  subscribeToSOS, 
  subscribeToSystemNotifications,
  subscribeToTrip,
  fetchSystemNotificationsFromDB,
  fetchLatestBusLocation, 
  BusTelemetryPayload, 
  FleetSwapNotice,
  TripUpdatePayload,
  subscribeToStops,
  fetchLiveStops,
  fetchCloudUserRegistry,
  isInternalRegistryNotification,
  onCloudRegistryUpdate,
  clearSystemNotification,
  clearAllSystemNotifications,
  subscribeToStaffLeave,
} from '../../services/supabase';
import { authStorage } from '../../services/authStorage';
import { hideSplash } from '../../services/splashService';
import { GPSCoordinate, INITIAL_STOPS, SIMULATION_ROUTE_A, EmergencyAlert, SystemNotification, Stop, MASTER_BUSES, MASTER_ROUTES, MASTER_STOPS } from '@college-bus/shared';
import { useTheme } from '../../theme';
import {
  AppHeader,
  BottomTabBar,
  Card,
  Button,
  StatusChip,
  StatBadge,
  SectionHeader,
  Input,
  TabItem,
} from '../../components/ui';
import {
  Navigation,
  MapPin,
  Bell,
  User,
  Clock,
  Compass,
  Phone,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  QrCode,
  LogOut,
  Check,
  CheckCircle2,
  X,
  ChevronRight,
  Circle,
  Square,
  Sparkles,
} from 'lucide-react-native';

const ROUTE_033_STOPS: Stop[] = [
  {
    id: 'st1_1',
    route_id: 'r1',
    stop_name: 'Old Bus Stand, RJPM',
    latitude: 9.4485,
    longitude: 77.5505,
    stop_order: 1,
    estimated_arrival: '08:20 AM',
    morning_time: '08:20 AM',
    evening_time: '05:15 PM',
    status: 'active',
  },
  {
    id: 'st1_2',
    route_id: 'r1',
    stop_name: 'Tenkasi Road Junction',
    latitude: 9.4498,
    longitude: 77.5518,
    stop_order: 2,
    estimated_arrival: '08:28 AM',
    morning_time: '08:28 AM',
    evening_time: '05:05 PM',
    status: 'active',
  },
  {
    id: 'st1_3',
    route_id: 'r1',
    stop_name: 'PACR Mill Circle',
    latitude: 9.4505,
    longitude: 77.5525,
    stop_order: 3,
    estimated_arrival: '08:35 AM',
    morning_time: '08:35 AM',
    evening_time: '04:55 PM',
    status: 'active',
  },
  {
    id: 'st1_4',
    route_id: 'r1',
    stop_name: 'RIT Campus Main Gate',
    latitude: 9.4520,
    longitude: 77.5535,
    stop_order: 4,
    estimated_arrival: '08:45 AM',
    morning_time: '08:45 AM',
    evening_time: '04:45 PM',
    status: 'active',
  },
];

const MORNING_ROUTE_STOPS: Stop[] = ROUTE_033_STOPS;
const EVENING_ROUTE_STOPS: Stop[] = [
  ROUTE_033_STOPS[3],
  ROUTE_033_STOPS[2],
  ROUTE_033_STOPS[1],
  ROUTE_033_STOPS[0],
].map((st, i) => ({
  ...st,
  stop_order: i + 1,
  estimated_arrival: st.evening_time || st.estimated_arrival,
}));

type StaffTab = 'track' | 'stops' | 'alerts' | 'profile';

export interface FacultyCommuter {
  id: string;
  name: string;
  staffId: string;
  designation: string;
  department: string;
  boardingStopId: string;
  boardingStopName: string;
  phone: string;
  email: string;
  busNumber: string;
  routeId: string;
  passNumber: string;
  isOnLeave: boolean;
  leaveDate?: string;
  leaveReason?: string;
}

export default function StaffMobileDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<StaffTab>('track');
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [isLocationPermanentlyDenied, setIsLocationPermanentlyDenied] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean | null>(null);
  const [showPermModal, setShowPermModal] = useState(false);
  const [scheduleType, setScheduleType] = useState<'morning' | 'evening'>(() => {
    return new Date().getHours() >= 13 ? 'evening' : 'morning';
  });
  const [completedStopIds, setCompletedStopIds] = useState<string[]>([]);

  useEffect(() => {
    hideSplash();
  }, []);
  // Emergency SOS State
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([]);

  // Fleet Driver & Bus Swap Notification State
  const [activeSwapNotice, setActiveSwapNotice] = useState<FleetSwapNotice | null>(null);
  const [swapNoticesList, setSwapNoticesList] = useState<FleetSwapNotice[]>([]);

  // System Broadcasts & Announcements from Admin / Transport Control
  const [systemBroadcasts, setSystemBroadcasts] = useState<SystemNotification[]>(() => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('bustrack_notifications_v1');
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) return list.filter((n) => !isInternalRegistryNotification(n));
        }
      } catch {}
    }
    return [];
  });
  const [incomingToast, setIncomingToast] = useState<SystemNotification | null>(null);
  const [incomingAlertModal, setIncomingAlertModal] = useState<SystemNotification | null>(null);

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);
  const unreadNotifCount = (systemBroadcasts || []).filter((n) => n && n.id && !readNotifIds.includes(n.id)).length;

  // Restore persisted read notification IDs on mount & clean up internal registry snapshots
  useEffect(() => {
    authStorage.getItem('bustrack_staff_read_notifs').then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setReadNotifIds(parsed);
        } catch {}
      }
    }).catch(() => {});

    // Clean up stored notifications to remove any stale registry snapshots
    authStorage.getItem('bustrack_notifications_v1').then((raw) => {
      if (raw) {
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const cleaned = list.filter((n: any) => !isInternalRegistryNotification(n));
            authStorage.setItem('bustrack_notifications_v1', JSON.stringify(cleaned)).catch(() => {});
            setSystemBroadcasts(cleaned);
          }
        } catch {}
      }
    }).catch(() => {});
  }, []);

  const markAllNotificationsAsRead = () => {
    const allIds = (systemBroadcasts || []).map((n) => n.id);
    setReadNotifIds(allIds);
    authStorage.setItem('bustrack_staff_read_notifs', JSON.stringify(allIds)).catch(() => {});
    setShowNotifModal(false);
  };

  const markSingleNotificationRead = (notifId: string) => {
    setReadNotifIds((prev) => {
      const updated = prev.includes(notifId) ? prev : [...prev, notifId];
      authStorage.setItem('bustrack_staff_read_notifs', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const handleClearAllNotifications = async () => {
    const ids = (systemBroadcasts || []).map((n) => n.id);
    setSystemBroadcasts([]);
    await clearAllSystemNotifications(ids);
  };

  const handleClearSingleNotification = async (notifId: string) => {
    setSystemBroadcasts((prev) => prev.filter((n) => n.id !== notifId));
    await clearSystemNotification(notifId);
  };

  // Commuter Faculty Profile & Realtime Leave State
  const [facultyProfile, setFacultyProfile] = useState<FacultyCommuter & { routeName?: string }>({
    id: 'fac_042',
    name: 'Dr. S. Kanthimathi',
    staffId: 'FAC-042',
    designation: 'Associate Professor',
    department: 'Electronics & Communication Eng.',
    boardingStopId: 'st3',
    boardingStopName: 'PACR Mill Circle (Stop 3)',
    phone: '+91 94432 87654',
    email: 'kanthimathi.ece@college.edu',
    busNumber: 'BUS-01',
    routeId: 'r1',
    routeName: 'Route 1 (Rajapalayam - RIT)',
    passNumber: 'FAC-PASS-2024-88',
    isOnLeave: false,
  });

  // Load saved faculty profile from persistent session
  useEffect(() => {
    const loadSavedStaff = async () => {
      try {
        fetchCloudUserRegistry(true).catch(() => {});

        const session = await authStorage.getSession();
        let u = (session && session.role === 'staff' && session.user)
          ? session.user as any
          : null;

        if (!u) {
          const raw = await authStorage.getItem('bustrack_current_mobile_staff');
          if (raw) u = JSON.parse(raw);
        }

        if (u) {
          let allBuses = [...MASTER_BUSES];
          try {
            const rawB = await authStorage.getItem('bustrack_buses_v1');
            if (rawB) {
              const pB = JSON.parse(rawB);
              if (Array.isArray(pB) && pB.length > 0) allBuses = [...pB, ...allBuses];
            }
          } catch {}

          let allRoutes = [...MASTER_ROUTES];
          try {
            const rawR = await authStorage.getItem('bustrack_routes_v1');
            if (rawR) {
              const pR = JSON.parse(rawR);
              if (Array.isArray(pR) && pR.length > 0) allRoutes = [...pR, ...allRoutes];
            }
          } catch {}

          const bNum = u.bus?.bus_number || u.bus_number || u.busNumber || 'BUS-01';
          const busObj = allBuses.find(b => b.bus_number === bNum || b.id === (u.bus_id || u.busId));
          const rId = u.route?.id || u.route_id || u.routeId || busObj?.route_id || 'r1';
          const routeObj = allRoutes.find(r => r.id === rId);
          const rName = u.route?.route_name || u.route_name || u.routeName || routeObj?.route_name || (rId ? `Route ${rId.replace(/\D/g, '') || '1'}` : 'Route 1');
          const stopName = typeof u.boarding_stop === 'object' ? u.boarding_stop?.stop_name : (u.boarding_stop || u.boardingStopName || 'Assigned Stop');

          setFacultyProfile((prev) => ({
            ...prev,
            id: u.id || prev.id,
            name: u.profile?.name || u.name || prev.name,
            staffId: u.employee_id || u.staffId || prev.staffId,
            designation: u.designation || prev.designation,
            department: u.department || prev.department,
            boardingStopId: u.boarding_stop_id || u.boardingStopId || prev.boardingStopId,
            boardingStopName: stopName || prev.boardingStopName,
            phone: u.profile?.phone || u.phone || prev.phone,
            email: u.profile?.email || u.email || prev.email,
            busNumber: bNum,
            routeId: rId,
            routeName: rName,
            isOnLeave: Boolean(u.is_on_leave || u.isOnLeave),
          }));
        }
      } catch (e) {
        console.warn('Staff session load error:', e);
      }
    };
    loadSavedStaff();
  }, []);

  // Live Sync with Admin Web updates (Routes, Buses, Stops, Staff Profile, and Leaves)
  useEffect(() => {
    const unsubRegistry = onCloudRegistryUpdate((payload) => {
      if (!payload) return;

      // 1. Update faculty details if admin changed them in admin-web
      if (Array.isArray(payload.staffCommuters)) {
        const cleanName = (facultyProfile.name || '').trim().toLowerCase();
        const cleanStaffId = (facultyProfile.staffId || '').trim().toLowerCase();
        const matched = payload.staffCommuters.find((sc: any) =>
          sc.id === facultyProfile.id ||
          (sc.employee_id && sc.employee_id.trim().toLowerCase() === cleanStaffId) ||
          (sc.staffId && sc.staffId.trim().toLowerCase() === cleanStaffId) ||
          (sc.profile?.name && sc.profile.name.trim().toLowerCase() === cleanName) ||
          (sc.name && sc.name.trim().toLowerCase() === cleanName)
        );

        if (matched) {
          const m = matched as any;
          const allB = Array.isArray(payload.buses) && payload.buses.length > 0 ? payload.buses : MASTER_BUSES;
          const allR = Array.isArray(payload.routes) && payload.routes.length > 0 ? payload.routes : MASTER_ROUTES;
          const bNum = m.bus?.bus_number || m.bus_number || m.busNumber || facultyProfile.busNumber;
          const busObj = allB.find((b: any) => b.bus_number === bNum || b.id === (m.bus_id || m.busId));
          const rId = m.route?.id || m.route_id || m.routeId || busObj?.route_id || facultyProfile.routeId;
          const routeObj = allR.find((r: any) => r.id === rId);
          const rName = m.route?.route_name || m.route_name || m.routeName || routeObj?.route_name || facultyProfile.routeName;
          const stopName = typeof m.boarding_stop === 'object' ? m.boarding_stop?.stop_name : (m.boarding_stop || m.boardingStopName || facultyProfile.boardingStopName);

          setFacultyProfile((prev) => ({
            ...prev,
            name: m.profile?.name || m.name || prev.name,
            staffId: m.employee_id || m.staffId || prev.staffId,
            designation: m.designation || prev.designation,
            department: m.department || prev.department,
            busNumber: bNum,
            routeId: rId,
            routeName: rName,
            boardingStopId: m.boarding_stop_id || m.boardingStopId || prev.boardingStopId,
            boardingStopName: stopName,
            phone: m.profile?.phone || m.phone || prev.phone,
            isOnLeave: Boolean(m.is_on_leave || m.isOnLeave),
          }));
        }
      }

      // 2. Update stops if admin modified stops
      if (Array.isArray(payload.stops) && payload.stops.length > 0) {
        setAllStops(payload.stops);
      }
    });

    const unsubStaffLeave = subscribeToStaffLeave((leavePayload) => {
      if (!leavePayload) return;
      if (leavePayload.commuterId === facultyProfile.id || leavePayload.commuterId === facultyProfile.staffId) {
        setFacultyProfile((prev) => ({
          ...prev,
          isOnLeave: leavePayload.isOnLeave,
        }));
      }
    });

    return () => {
      unsubRegistry();
      unsubStaffLeave();
    };
  }, [facultyProfile.id, facultyProfile.staffId, facultyProfile.name]);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedLeaveDate, setSelectedLeaveDate] = useState('Today (20 Sep)');

  // Notification / App preferences
  const [proximityAlerts, setProximityAlerts] = useState(true);
  const [swapAlerts, setSwapAlerts] = useState(true);
  const [announcementAlerts, setAnnouncementAlerts] = useState(true);

  // Staff device GPS location
  const [staffLocation, setStaffLocation] = useState<GPSCoordinate | null>(null);

  // Live Bus Location (synced from Driver via Supabase Realtime / DB)
  const [busLocation, setBusLocation] = useState<GPSCoordinate | null>(null);
  const [hasTelemetry, setHasTelemetry] = useState(false);

  const [currentStopIndex, setCurrentStopIndex] = useState(1);
  const [lastUpdatedSec, setLastUpdatedSec] = useState(1);
  const [isDriverActive, setIsDriverActive] = useState(false);

  const [allStops, setAllStops] = useState<Stop[]>(INITIAL_STOPS);

  useEffect(() => {
    fetchLiveStops().then((loaded) => {
      if (loaded && loaded.length > 0) setAllStops(loaded);
    });
    const unsub = subscribeToStops((freshStops) => {
      if (freshStops && freshStops.length > 0) setAllStops(freshStops);
    });
    return unsub;
  }, []);

  const currentRouteStops: Stop[] = React.useMemo(() => {
    const rId = facultyProfile.routeId || 'r1';
    const isRoute033Or1 = rId === 'r1' || rId === 'r33' || rId === 'r033' || rId === 'route_033' || (facultyProfile.routeName && (facultyProfile.routeName.includes('033') || facultyProfile.routeName.includes('Route 1')));
    if (isRoute033Or1) {
      const exactMatched = allStops.filter(s => s.route_id === rId);
      if (exactMatched.length === 4) return exactMatched;
      const r33Matched = allStops.filter(s => s.route_id === 'r33');
      if (r33Matched.length === 4) return r33Matched;
      const r1Matched = allStops.filter(s => s.route_id === 'r1');
      if (r1Matched.length === 4) return r1Matched;
      return ROUTE_033_STOPS;
    }
    const matched = allStops.filter(s => s.route_id === rId);
    if (matched.length > 0) return matched;
    const masterMatched = MASTER_STOPS.filter(s => s.route_id === rId);
    if (masterMatched.length > 0) return masterMatched;
    return ROUTE_033_STOPS;
  }, [allStops, facultyProfile.routeId, facultyProfile.routeName]);

  // Active stops sequence based on schedule shift
  const activeStops = React.useMemo(() => {
    const baseStops = [...currentRouteStops].sort((a, b) => (a.stop_order ?? 0) - (b.stop_order ?? 0));
    if (scheduleType === 'evening') {
      return [...baseStops].reverse().map((st, i) => ({
        ...st,
        stop_order: i + 1,
        estimated_arrival: st.evening_time || st.estimated_arrival,
      }));
    }
    return baseStops.map((st, i) => ({
      ...st,
      stop_order: i + 1,
      estimated_arrival: st.morning_time || st.estimated_arrival,
    }));
  }, [currentRouteStops, scheduleType]);

  const staffBoardingStop = React.useMemo(() => {
    const targetId = facultyProfile.boardingStopId || '';
    const targetName = (facultyProfile.boardingStopName || '').toLowerCase().trim();
    if (targetId) {
      const found = activeStops.find(s => s.id === targetId || s.id === targetId.replace('_', '') || s.id === `st1_${targetId.replace('st', '')}`);
      if (found) return found;
    }
    if (targetName && targetName !== 'assigned stop') {
      const found = activeStops.find(s => s.stop_name && s.stop_name.toLowerCase().includes(targetName.slice(0, 6)));
      if (found) return found;
    }
    return activeStops[0] || ROUTE_033_STOPS[0];
  }, [activeStops, facultyProfile.boardingStopId, facultyProfile.boardingStopName]);

  useEffect(() => {
    checkAndFetchStaffLocation();
    checkNotificationPermissionStatus();

    // 0. Fetch latest recorded live bus location from database
    fetchLatestBusLocation('b1').then((latest) => {
      if (latest) {
        setBusLocation(latest);
      }
    }).catch(() => {});

    // Periodic live database sync fallback (every 3s)
    const pollTimer = setInterval(async () => {
      try {
        const latest = await fetchLatestBusLocation('b1');
        if (latest && latest.latitude && latest.longitude) {
          setBusLocation(latest);
          setHasTelemetry(true);
          const ageSec = latest.timestamp ? (Date.now() - new Date(latest.timestamp).getTime()) / 1000 : 999;
          if (ageSec < 180) {
            setIsDriverActive(true);
          }
          setLastUpdatedSec(1);
        }
      } catch {}
    }, 3500);

    // 1. Subscribe to Live Driver Broadcasts via Supabase Realtime Channel
    const unsubscribe = subscribeToTelemetry((payload: BusTelemetryPayload) => {
      setBusLocation(payload.coordinate);
      if (typeof payload.currentStopIndex === 'number') {
        setCurrentStopIndex(payload.currentStopIndex);
      }
      setIsDriverActive(payload.status === 'active');
      setLastUpdatedSec(1);
    });

    // 1b. Subscribe to Trip Stop Updates & Shift Sync
    const unsubTrip = subscribeToTrip((payload: TripUpdatePayload) => {
      setIsDriverActive(payload.isTripActive);
      if (typeof payload.currentStopIdx === 'number') {
        setCurrentStopIndex(payload.currentStopIdx);
      }
      if (Array.isArray(payload.completedStopIds)) {
        setCompletedStopIds(payload.completedStopIds);
      }
      if (payload.shift) {
        setScheduleType(payload.shift);
      }
    });

    // 2. Subscribe to Real-Time Driver & Vehicle Swap Notifications
    const unsubSwap = subscribeToFleetSwap((notice: FleetSwapNotice) => {
      setActiveSwapNotice(notice);
      setSwapNoticesList((prev) => [notice, ...prev]);

      // Deliver System Push Notification to Mobile Notification Bar
      notificationService.sendPushNotification(notice.title, notice.message, 'swap_alert');
    });

    // 3. Subscribe to Emergency SOS Alerts dispatched by Driver or Transport Admin
    const unsubSOS = subscribeToSOS((alert: EmergencyAlert) => {
      setEmergencyAlerts((prev) => [alert, ...prev]);

      // Deliver High-Priority Push Notification to Mobile Notification Bar
      notificationService.sendPushNotification(
        `🚨 EMERGENCY ALERT: ${facultyProfile.busNumber || 'BUS-01'}`,
        alert.message || `An urgent alert (${alert.type?.toUpperCase()}) was reported for your bus. Safety protocols active.`,
        'emergency_sos'
      );
    });

    // 4. Subscribe to Live Admin Broadcast Announcements
    const unsubSystemNotif = subscribeToSystemNotifications((notif: SystemNotification) => {
      if (isInternalRegistryNotification(notif)) return;

      setSystemBroadcasts((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      setIncomingToast(notif);
      setIncomingAlertModal(notif);
      setTimeout(() => setIncomingToast(null), 8000);

      // Deliver Push Notification to Notification Tray
      notificationService.sendPushNotification(
        `📢 ${notif.title}`,
        notif.message,
        notif.type || 'broadcast'
      );
    });

    // 5. Fetch announcements from Supabase DB and local cache
    const syncAnnouncements = async (shouldPushAlerts: boolean = false) => {
      try {
        const notifs = await fetchSystemNotificationsFromDB();
        if (notifs && notifs.length > 0) {
          const cleanNotifs = notifs.filter((n) => !isInternalRegistryNotification(n));
          setSystemBroadcasts((prev) => {
            const ids = new Set(prev.map((n) => n.id));
            const fresh = cleanNotifs.filter((n) => !ids.has(n.id));
            if (fresh.length > 0) {
              if (shouldPushAlerts) {
                const unreadFresh = fresh.filter((n) => !readNotifIds.includes(n.id));
                if (unreadFresh.length > 0) {
                  const top = unreadFresh[0];
                  setIncomingAlertModal(top);
                  setIncomingToast(top);
                  notificationService.sendPushNotification(
                    `📢 ${top.title}`,
                    top.message,
                    top.type || 'broadcast'
                  );
                }
              }
              return [...fresh, ...prev];
            }
            return prev;
          });
        }
      } catch {}

      // Also check authStorage fallback
      authStorage.getItem('bustrack_notifications_v1').then((raw) => {
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.length > 0) {
              const cleanList = list.filter((n: any) => !isInternalRegistryNotification(n));
              setSystemBroadcasts((prev) => {
                const prevIds = new Set(prev.map((n) => n.id));
                const newItems = cleanList.filter((n: any) => !prevIds.has(n.id));
                if (newItems.length > 0) {
                  if (shouldPushAlerts) {
                    const newest = newItems[0];
                    setIncomingAlertModal(newest);
                    setIncomingToast(newest);
                    notificationService.sendPushNotification(
                      `📢 ${newest.title}`,
                      newest.message,
                      newest.type || 'broadcast'
                    );
                  }
                  return [...newItems, ...prev];
                }
                return prev;
              });
            }
          } catch {}
        }
      }).catch(() => {});
    };

    // Initial fetch on mount
    syncAnnouncements(true);

    // 6. Polling sync every 3.5 seconds
    const notifPollTimer = setInterval(() => {
      syncAnnouncements(true);
    }, 3500);

    // 6b. Foreground sync when app is reopened or focused
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncAnnouncements(true);
      }
    });

    // 7. Seconds counter for telemetry freshness and dynamic ETA recalibration
    const secTimer = setInterval(() => {
      setLastUpdatedSec((prev) => prev + 1);
    }, 1000);

    return () => {
      unsubscribe();
      unsubTrip();
      unsubSwap();
      unsubSOS();
      unsubSystemNotif();
      clearInterval(secTimer);
      clearInterval(notifPollTimer);
      clearInterval(pollTimer);
      appStateSub.remove();
    };
  }, []);

  const checkNotificationPermissionStatus = async () => {
    const granted = await notificationService.checkPermission();
    setHasNotificationPermission(granted);
  };

  const handleRequestNotificationPermission = async () => {
    const granted = await notificationService.requestPermission();
    setHasNotificationPermission(granted);
    if (granted) {
      notificationService.sendPushNotification(
        '🔔 Staff Push Notifications Active',
        'You will now receive live bus arrival notices, driver updates, and standby vehicle swap alerts in your mobile notification bar!'
      );
    }
  };

  const checkAndFetchStaffLocation = async () => {
    try {
      const perm = await locationTracker.checkPermissions();
      if (perm.granted) {
        setHasLocationPermission(true);
        setIsLocationPermanentlyDenied(false);
        try {
          const pos = await locationTracker.getCurrentPosition();
          if (pos && typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
            setStaffLocation(pos);
          } else {
            setStaffLocation(null);
          }
        } catch {
          setStaffLocation(null);
        }
      } else {
        setHasLocationPermission(false);
        setIsLocationPermanentlyDenied(perm.canAskAgain === false && perm.foregroundStatus === 'denied');
        setStaffLocation(null);
      }
    } catch {
      setHasLocationPermission(false);
      setStaffLocation(null);
    }
  };

  const handleRequestPermission = async () => {
    try {
      const res = await locationTracker.requestForegroundPermissionDetailed();
      if (res.granted) {
        setHasLocationPermission(true);
        setIsLocationPermanentlyDenied(false);
        const pos = await locationTracker.getCurrentPosition();
        if (pos) setStaffLocation(pos);
        Alert.alert('✅ Location Access Active', 'Your faculty live location is pinpointed on the map.');
      } else {
        setHasLocationPermission(false);
        if (res.canAskAgain === false) {
          setIsLocationPermanentlyDenied(true);
        }
      }
    } catch {
      setHasLocationPermission(false);
    }
  };

  const handleCallDriver = (phone: string = '+919842100001') => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleCallHelpline = (phone: string = '+919629284690') => {
    Linking.openURL(`tel:${phone}`);
  };

  // Distance calculations
  const distanceToBoardingStopKm = hasLocationPermission && staffLocation && staffBoardingStop && typeof staffBoardingStop.latitude === 'number' && typeof staffLocation.latitude === 'number'
    ? calculateDistanceKm(
        staffLocation.latitude,
        staffLocation.longitude,
        staffBoardingStop.latitude,
        staffBoardingStop.longitude
      )
    : null;

  const walkingMinutes = distanceToBoardingStopKm !== null
    ? Math.max(1, Math.round((distanceToBoardingStopKm / 4.5) * 60))
    : null;

  const distanceBusToStopKm = busLocation && staffBoardingStop && typeof staffBoardingStop.latitude === 'number' && typeof busLocation.latitude === 'number'
    ? calculateDistanceKm(
        busLocation.latitude,
        busLocation.longitude,
        staffBoardingStop.latitude,
        staffBoardingStop.longitude
      )
    : null;

  const remainingStopsToBoarding = Math.max(
    0,
    INITIAL_STOPS.findIndex((s) => s.id === (staffBoardingStop?.id || 'stop_3')) - currentStopIndex
  );

  // Dynamic ETA
  const dynamicETA: DynamicETA = calculateDynamicETA(
    isDriverActive && distanceBusToStopKm !== null ? distanceBusToStopKm : null,
    isDriverActive && busLocation ? Number(busLocation.speed || 0) : 0,
    remainingStopsToBoarding,
    staffBoardingStop?.estimated_arrival || null
  );

  const walkingDistanceFormatted = distanceToBoardingStopKm !== null ? formatDistance(distanceToBoardingStopKm) : '--';

  // Submit 1-day leave
  const handleApplyStaffLeave = () => {
    setFacultyProfile((prev) => ({
      ...prev,
      isOnLeave: true,
      leaveDate: selectedLeaveDate,
      leaveReason: 'Official Duty / Faculty Leave',
    }));
    setShowLeaveModal(false);

    // Notify Driver & System Push
    notificationService.sendPushNotification(
      '📝 Staff 1-Day Leave Recorded',
      `Leave marked for ${selectedLeaveDate}. Driver Mr. B. Moorthi has been notified not to wait at ${staffBoardingStop.stop_name}.`,
      'announcement'
    );

    Alert.alert(
      '✅ Faculty Leave Recorded',
      `Your 1-day leave for ${selectedLeaveDate} has been confirmed.\n\nDriver & Admin roster updated. Have a great day!`
    );
  };

  const handleCancelStaffLeave = () => {
    setFacultyProfile((prev) => ({
      ...prev,
      isOnLeave: false,
      leaveDate: undefined,
      leaveReason: undefined,
    }));

    notificationService.sendPushNotification(
      '🚌 Staff Attendance Restored',
      `You are scheduled to board ${facultyProfile.busNumber || 'BUS-01'} at ${staffBoardingStop.stop_name} today.`,
      'arrival'
    );

    Alert.alert('✅ Attendance Restored', 'You are marked as regular commuter for today.');
  };

  const triggerTestNotification = async () => {
    await notificationService.sendPushNotification(
      '🔄 Test Push Notification Alert',
      'This is how bus swap changes, driver substitutions, and transit announcements appear on your mobile phone notification bar.'
    );
    Alert.alert('🔔 Push Sent', 'Check your device notification shade / notification bar at the top of your screen!');
  };


  const staffTabs: TabItem<StaffTab>[] = [
    { id: 'track', label: 'Track', icon: Navigation },
    { id: 'stops', label: 'Stops', icon: MapPin },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: Bell,
      badge: unreadNotifCount + emergencyAlerts.length > 0 ? unreadNotifCount + emergencyAlerts.length : undefined,
    },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* TOP APP HEADER */}
      <AppHeader
        title="RITBusTrack Faculty"
        subtitle={`${facultyProfile.busNumber || 'BUS-01'} · ${facultyProfile.routeName || 'Route 1'}`}
        roleBadge="FACULTY"
        isLive={isDriverActive}
        onNotificationPress={() => setShowNotifModal(true)}
        unreadCount={unreadNotifCount}
        showThemeToggle={true}
      />

      {/* FLOATING LIVE BROADCAST TOAST */}
      {incomingToast && (
        <TouchableOpacity
          style={[
            styles.incomingToastBanner,
            {
              top: Math.max(insets.top + 60, 70),
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {
            setActiveTab('alerts');
            setIncomingToast(null);
          }}
          activeOpacity={0.9}
        >
          <View style={[styles.toastIconWrap, { backgroundColor: colors.surfaceSubtle }]}>
            <Bell size={18} color={colors.text} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.toastTitle, { color: colors.text }]} numberOfLines={1}>
                {incomingToast.title}
              </Text>
              <StatusChip label="LIVE" variant="ontime" />
            </View>
            <Text style={[styles.toastBody, { color: colors.textSecondary }]} numberOfLines={2}>
              {incomingToast.message}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* NOTIFICATIONS & BROADCASTS MODAL */}
      <Modal
        visible={showNotifModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotifModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalHeaderTitleRow}>
                <Bell size={20} color={colors.text} />
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Faculty Notifications</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    Transport Wing Bulletins & Alerts
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {systemBroadcasts.length > 0 && (
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      backgroundColor: colors.emergencyBg,
                      borderWidth: 1,
                      borderColor: colors.emergencyBorder,
                    }}
                    onPress={handleClearAllNotifications}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.emergency, fontSize: 12, fontWeight: '700' }}>Clear All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceSubtle }]}
                  onPress={() => setShowNotifModal(false)}
                >
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 380, padding: 16 }}>
              {systemBroadcasts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Bell size={32} color={colors.textSecondary} />
                  <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No announcements</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>All transport updates will appear here.</Text>
                </View>
              ) : (
                systemBroadcasts.map((notif) => {
                  const isRead = readNotifIds.includes(notif.id);
                  const isEmergency = notif.type === 'emergency' || notif.type === 'sos' || notif.priority === 'urgent';
                  return (
                    <TouchableOpacity
                      key={notif.id}
                      style={[
                        styles.notifItem,
                        {
                          backgroundColor: isEmergency ? colors.emergencyBg : colors.surfaceSubtle,
                          borderColor: isEmergency ? colors.emergencyBorder : colors.borderSubtle,
                          opacity: isRead ? 0.7 : 1,
                        },
                      ]}
                      onPress={() => markSingleNotificationRead(notif.id)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={[styles.notifItemTitle, { color: isEmergency ? colors.emergency : colors.text, flex: 1, marginRight: 8 }]}>
                          {notif.title}
                        </Text>
                        <TouchableOpacity
                          style={{
                            padding: 4,
                            borderRadius: 4,
                            backgroundColor: colors.surface,
                          }}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleClearSingleNotification(notif.id);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          accessibilityLabel="Dismiss notification"
                        >
                          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.notifItemBody, { color: colors.textSecondary }]}>{notif.message}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {systemBroadcasts.length > 0 && (
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: 14, flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Mark Read"
                    onPress={markAllNotificationsAsRead}
                    variant="outline"
                    size="sm"
                    fullWidth
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Clear All"
                    onPress={handleClearAllNotifications}
                    variant="danger"
                    size="sm"
                    fullWidth
                  />
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* LEAVE REQUEST MODAL */}
      <Modal
        visible={showLeaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLeaveModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={[styles.confirmModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.confirmModalTitle, { color: colors.text }]}>Faculty 1-Day Leave</Text>
            <Text style={[styles.confirmModalDesc, { color: colors.textSecondary }]}>
              Marking leave updates the driver roster so the bus does not wait at {staffBoardingStop?.stop_name || 'your stop'}.
            </Text>

            <View style={{ gap: 8, marginBottom: 16 }}>
              {['Today (Current Shift)', 'Tomorrow (Next Shift)', 'Next Working Day'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.dateOption,
                    {
                      backgroundColor: selectedLeaveDate === d ? colors.primary : colors.surfaceSubtle,
                      borderColor: selectedLeaveDate === d ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedLeaveDate(d)}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: selectedLeaveDate === d ? colors.primaryContrast : colors.text,
                    }}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.confirmModalBtnRow}>
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => setShowLeaveModal(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                label="Confirm Leave"
                variant="primary"
                onPress={handleApplyStaffLeave}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MAIN VIEW CONTENT */}
      <View style={styles.mainContent}>
        {/* ================= TAB 1: TRACK ================= */}
        {activeTab === 'track' && (
          <ScrollView
            style={styles.scrollPage}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 76 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* GPS Signal Warning if needed */}
            {!hasLocationPermission && (
              <LocationPermissionBanner
                role="staff"
                isGranted={false}
                onRequestPermission={handleRequestPermission}
                onOpenSettings={() => locationTracker.openSettings()}
                showSettings={isLocationPermanentlyDenied}
              />
            )}

            {!hasNotificationPermission && (
              <NotificationPermissionBanner
                isGranted={false}
                onRequestPermission={handleRequestNotificationPermission}
              />
            )}

            {/* Primary ETA Information Hierarchy Card */}
            <Card style={styles.etaHeroCard} padding="lg">
              <View style={styles.etaTopRow}>
                <View>
                  <Text style={[styles.busNumberHero, { color: colors.text }]}>
                    {facultyProfile.busNumber || 'BUS 14'}
                  </Text>
                  <Text style={[styles.routeHero, { color: colors.textSecondary }]}>
                    {facultyProfile.routeName || 'Main Route'}
                  </Text>
                </View>
                <StatusChip
                  label={dynamicETA.statusLabel || (isDriverActive ? 'ON TIME' : 'SCHEDULED')}
                  variant={dynamicETA.isDelayed ? 'delayed' : 'ontime'}
                  dot
                />
              </View>

              {/* Prominent Large ETA */}
              <View style={styles.etaValueRow}>
                <Text style={[styles.etaBigNumber, { color: colors.text }]}>
                  {dynamicETA.formattedEta || '4 min'}
                </Text>
                <Text style={[styles.etaSubText, { color: colors.textSecondary }]}>
                  Arrival by {dynamicETA.arrivalTimeStr || staffBoardingStop?.estimated_arrival || '08:35 AM'}
                </Text>
              </View>

              <View style={[styles.nextStopBar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.nextStopLabel, { color: colors.textSecondary }]}>NEXT STOP</Text>
                <Text style={[styles.nextStopValue, { color: colors.text }]}>
                  {activeStops[currentStopIndex]?.stop_name || 'Engineering Block'}
                </Text>
              </View>
            </Card>

            {/* Quick Metrics HUD */}
            <View style={styles.metricsGrid}>
              <StatBadge
                label="Bus Speed"
                value={isDriverActive && busLocation && typeof busLocation.speed === 'number' ? Math.round(busLocation.speed) : '--'}
                unit="km/h"
                style={{ flex: 1 }}
              />
              <StatBadge
                label="Distance"
                value={distanceBusToStopKm !== null ? formatDistance(distanceBusToStopKm) : '--'}
                style={{ flex: 1 }}
              />
            </View>

            {/* Live Navigation Map */}
            <SectionHeader
              title="Route Map"
              subtitle="Live GPS telemetry with stop timeline"
            />

            <View style={[styles.mapContainer, { borderColor: colors.border }]}>
              <OSMMapView
                busLocation={isDriverActive ? busLocation : null}
                userLocation={hasLocationPermission ? staffLocation : null}
                userLocationLabel="📍 Faculty Point"
                busNumber={facultyProfile.busNumber}
                routeNumber={facultyProfile.routeName}
                stops={activeStops}
                boardingStop={staffBoardingStop}
                height={240}
              />
            </View>

            {/* Assigned Boarding Point Card */}
            <SectionHeader
              title="Boarding Point"
              subtitle="Your assigned faculty pickup location"
            />

            <Card style={styles.boardingCard} padding="md">
              <View style={styles.boardingRow}>
                <View style={[styles.stopIconCircle, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <MapPin size={20} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.boardingTitle, { color: colors.text }]}>
                    {staffBoardingStop?.stop_name || 'PACR Mill Circle'}
                  </Text>
                  <Text style={[styles.boardingSubtitle, { color: colors.textSecondary }]}>
                    Scheduled Departure: {staffBoardingStop?.estimated_arrival || '08:35 AM'}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Driver Contact & Assistance */}
            <SectionHeader title="Driver & Assistance" subtitle="Direct contact with assigned vehicle pilot" />

            <Card style={styles.driverContactCard} padding="md">
              <View style={styles.driverRow}>
                <View style={[styles.driverAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <User size={20} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.driverNameText, { color: colors.text }]}>Mr. B. Moorthi</Text>
                  <Text style={[styles.driverPhoneText, { color: colors.textSecondary }]}>+91 98946 68646 · Vehicle Pilot</Text>
                </View>
                <Button
                  label="Call"
                  size="sm"
                  variant="outline"
                  icon={<Phone size={14} color={colors.text} />}
                  onPress={() => handleCallDriver('+919894668646')}
                />
              </View>
            </Card>
          </ScrollView>
        )}

        {/* ================= TAB 2: STOPS ================= */}
        {activeTab === 'stops' && (
          <ScrollView
            style={styles.scrollPage}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 76 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Shift Switcher */}
            <View style={[styles.shiftToggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.shiftBtn, scheduleType === 'morning' && { backgroundColor: colors.primary }]}
                onPress={() => setScheduleType('morning')}
                activeOpacity={0.8}
              >
                <Text style={[styles.shiftBtnText, { color: scheduleType === 'morning' ? colors.primaryContrast : colors.textSecondary, fontWeight: scheduleType === 'morning' ? '700' : '500' }]}>
                  Morning Pickup
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shiftBtn, scheduleType === 'evening' && { backgroundColor: colors.primary }]}
                onPress={() => setScheduleType('evening')}
                activeOpacity={0.8}
              >
                <Text style={[styles.shiftBtnText, { color: scheduleType === 'evening' ? colors.primaryContrast : colors.textSecondary, fontWeight: scheduleType === 'evening' ? '700' : '500' }]}>
                  Evening Return
                </Text>
              </TouchableOpacity>
            </View>

            <SectionHeader
              title="Stop Sequence"
              subtitle={`Route: ${facultyProfile.routeName || 'Route 1'} (${activeStops.length} stops)`}
            />

            {/* Vertical Timeline */}
            <Card style={styles.timelineCard} padding="md">
              {activeStops.map((stop: Stop, idx: number) => {
                const isPassed = completedStopIds.includes(stop.id) || idx < currentStopIndex;
                const isCurrent = idx === currentStopIndex;
                const isAssigned = stop.id === staffBoardingStop?.id;

                return (
                  <View key={stop.id} style={styles.timelineItem}>
                    <View style={styles.timelineIconCol}>
                      {isPassed ? (
                        <View style={[styles.dotCircle, { backgroundColor: colors.primary }]} />
                      ) : isCurrent ? (
                        <View style={[styles.squareIconWrap, { backgroundColor: colors.primary }]}>
                          <Square size={12} color={colors.primaryContrast} />
                        </View>
                      ) : (
                        <View style={[styles.squareOutlineWrap, { borderColor: colors.border }]}>
                          <Square size={10} color={colors.border} />
                        </View>
                      )}
                      {idx < activeStops.length - 1 && (
                        <View
                          style={[
                            styles.timelineLine,
                            { backgroundColor: isPassed ? colors.primary : colors.border },
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.timelineTextCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[styles.stopName, { color: colors.text, fontWeight: isCurrent || isAssigned ? '700' : '500' }]}>
                          {stop.stop_name}
                        </Text>
                        {isAssigned && <StatusChip label="YOUR STOP" variant="neutral" />}
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                        <Text style={[styles.stopDetail, { color: colors.textSecondary }]}>
                          {isPassed ? 'Passed' : isCurrent ? 'Approaching' : stop.estimated_arrival || '--'}
                        </Text>
                        <Text style={[styles.stopStatusText, { color: isPassed ? colors.textMuted : isCurrent ? colors.text : colors.textSecondary }]}>
                          {isPassed ? '● Completed' : isCurrent ? '■ Current' : '□ Upcoming'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </Card>
          </ScrollView>
        )}

        {/* ================= TAB 3: ALERTS ================= */}
        {activeTab === 'alerts' && (
          <ScrollView
            style={styles.scrollPage}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 76 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* High Priority Emergency SOS Alerts */}
            {emergencyAlerts.length > 0 && (
              <>
                <SectionHeader title="Emergency Alerts" subtitle="Safety and route dispatches" />
                {emergencyAlerts.map((alert) => (
                  <Card key={alert.id} variant="emergency" style={styles.emergencyAlertCard} padding="md">
                    <View style={styles.alertHeaderRow}>
                      <ShieldAlert size={20} color={colors.emergency} />
                      <Text style={[styles.alertHeaderTitle, { color: colors.emergency }]}>
                        EMERGENCY SOS: {alert.type?.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.alertBodyText, { color: colors.text }]}>{alert.message}</Text>
                    <Text style={[styles.alertTimeText, { color: colors.textSecondary }]}>
                      {formatEventTime(alert.created_at)}
                    </Text>
                  </Card>
                ))}
              </>
            )}

            {/* Standby Driver / Vehicle Swap Notice */}
            {activeSwapNotice && (
              <Card style={styles.swapNoticeCard} padding="md">
                <View style={styles.swapNoticeHeader}>
                  <AlertTriangle size={18} color={colors.warning} />
                  <Text style={[styles.swapNoticeTitle, { color: colors.text }]}>
                    {activeSwapNotice.title}
                  </Text>
                </View>
                <Text style={[styles.swapNoticeBody, { color: colors.textSecondary }]}>
                  {activeSwapNotice.message}
                </Text>
              </Card>
            )}

            {/* System Announcements */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Transport Bulletins</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>Official campus transport circulars and updates</Text>
              </View>
              {(systemBroadcasts.length > 0 || emergencyAlerts.length > 0) && (
                <TouchableOpacity
                  style={{ borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderColor: colors.emergency, backgroundColor: colors.surface }}
                  onPress={async () => {
                    setSystemBroadcasts([]);
                    setEmergencyAlerts([]);
                    setActiveSwapNotice(null);
                    try {
                      await authStorage.setItem('bustrack_notifications_v1', '[]');
                      await authStorage.setItem('bustrack_emergency_alerts_v1', '[]');
                    } catch {}
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.emergency }}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {systemBroadcasts.length === 0 ? (
              <Card style={{ alignItems: 'center', paddingVertical: 40 }} padding="lg">
                <Bell size={32} color={colors.textSecondary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text, marginTop: 10 }]}>No active alerts</Text>
                <Text style={[styles.emptyStateSub, { color: colors.textSecondary }]}>
                  All campus transport notices will be published here in real time.
                </Text>
              </Card>
            ) : (
              systemBroadcasts.map((notif) => (
                <Card key={notif.id} style={styles.bulletinCard} padding="md">
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={[styles.bulletinTitle, { color: colors.text }]}>{notif.title}</Text>
                    <StatusChip label={notif.type?.toUpperCase() || 'INFO'} variant="neutral" />
                  </View>
                  <Text style={[styles.bulletinBody, { color: colors.textSecondary }]}>{notif.message}</Text>
                  <Text style={[styles.bulletinTime, { color: colors.textMuted }]}>
                    {formatEventTime(notif.created_at)}
                  </Text>
                </Card>
              ))
            )}
          </ScrollView>
        )}

        {/* ================= TAB 4: PROFILE / DIGITAL PASS ================= */}
        {activeTab === 'profile' && (
          <ScrollView
            style={styles.scrollPage}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 76 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Clean Faculty Digital Transit Pass Card */}
            <Card style={styles.passCard} padding="lg">
              <View style={styles.passTopRow}>
                <View>
                  <Text style={[styles.passCorpLabel, { color: colors.textSecondary }]}>
                    RAMCO INSTITUTE OF TECHNOLOGY
                  </Text>
                  <Text style={[styles.passTypeLabel, { color: colors.text }]}>
                    Faculty Transit Pass
                  </Text>
                </View>
                <StatusChip
                  label={facultyProfile.isOnLeave ? 'ON LEAVE' : 'VALID PASS'}
                  variant={facultyProfile.isOnLeave ? 'warning' : 'ontime'}
                />
              </View>

              <View style={[styles.passDivider, { backgroundColor: colors.borderSubtle }]} />

              {/* Faculty Info */}
              <View style={styles.passProfileRow}>
                <View style={[styles.passAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <User size={28} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.passName, { color: colors.text }]}>{facultyProfile.name}</Text>
                  <Text style={[styles.passMeta, { color: colors.textSecondary }]}>
                    {facultyProfile.designation} · {facultyProfile.department}
                  </Text>
                  <Text style={[styles.passStaffId, { color: colors.textMuted }]}>
                    Staff ID: {facultyProfile.staffId}
                  </Text>
                </View>
              </View>

              <View style={[styles.passMetaGrid, { borderTopColor: colors.borderSubtle }]}>
                <View style={styles.passMetaItem}>
                  <Text style={[styles.passMetaLbl, { color: colors.textSecondary }]}>Boarding Point</Text>
                  <Text style={[styles.passMetaVal, { color: colors.text }]}>{facultyProfile.boardingStopName}</Text>
                </View>
                <View style={styles.passMetaItem}>
                  <Text style={[styles.passMetaLbl, { color: colors.textSecondary }]}>Assigned Bus</Text>
                  <Text style={[styles.passMetaVal, { color: colors.text }]}>{facultyProfile.busNumber}</Text>
                </View>
                <View style={styles.passMetaItem}>
                  <Text style={[styles.passMetaLbl, { color: colors.textSecondary }]}>Route</Text>
                  <Text style={[styles.passMetaVal, { color: colors.text }]}>{facultyProfile.routeName}</Text>
                </View>
                <View style={styles.passMetaItem}>
                  <Text style={[styles.passMetaLbl, { color: colors.textSecondary }]}>Pass Number</Text>
                  <Text style={[styles.passMetaVal, { color: colors.text }]}>{facultyProfile.passNumber || 'FAC-PASS-2024-88'}</Text>
                </View>
              </View>

              {/* Minimal Monochrome QR Representation */}
              <View style={[styles.qrMockWrap, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
                <QrCode size={48} color={colors.text} />
                <View style={{ marginLeft: 14 }}>
                  <Text style={[styles.qrTitle, { color: colors.text }]}>SECURE DIGITAL PASS</Text>
                  <Text style={[styles.qrSerial, { color: colors.textSecondary }]}>
                    {facultyProfile.passNumber || 'FAC-PASS-2024-88'}
                  </Text>
                  <Text style={[styles.qrSubtitle, { color: colors.textMuted }]}>
                    Scannable by Conductor & Campus Gate Terminal
                  </Text>
                </View>
              </View>
            </Card>

            {/* Leave Management Card */}
            <SectionHeader
              title="Transit Leave Management"
              subtitle="Mark absence so vehicle driver does not wait at your boarding point"
            />

            <Card style={styles.leaveCard} padding="md">
              <View style={styles.leaveStatusRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.leaveStatusTitle, { color: colors.text }]}>
                    {facultyProfile.isOnLeave ? 'Marked on Leave' : 'Active Commuter Today'}
                  </Text>
                  <Text style={[styles.leaveStatusSubtitle, { color: colors.textSecondary }]}>
                    {facultyProfile.isOnLeave
                      ? `Leave active for ${facultyProfile.leaveDate || 'Today'}. Driver notified.`
                      : "You are listed on today's pickup manifest."}
                  </Text>
                </View>
                <StatusChip
                  label={facultyProfile.isOnLeave ? 'ON LEAVE' : 'ACTIVE'}
                  variant={facultyProfile.isOnLeave ? 'warning' : 'ontime'}
                />
              </View>

              <View style={{ marginTop: 14 }}>
                {facultyProfile.isOnLeave ? (
                  <Button
                    label="Cancel Leave (Restore Commute)"
                    variant="outline"
                    size="md"
                    onPress={handleCancelStaffLeave}
                    fullWidth
                  />
                ) : (
                  <Button
                    label="Request 1-Day Leave"
                    variant="primary"
                    size="md"
                    icon={<Calendar size={16} color={colors.primaryContrast} />}
                    onPress={() => setShowLeaveModal(true)}
                    fullWidth
                  />
                )}
              </View>
            </Card>

            {/* Helpline Contacts */}
            <SectionHeader title="Transport Coordinators" subtitle="Emergency and dispatch contacts" />

            <Card style={styles.helplineCard} padding="md">
              <View style={styles.helplineRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helplineName, { color: colors.text }]}>N. Govindaraju (Transport Incharge)</Text>
                  <Text style={[styles.helplinePhone, { color: colors.textSecondary }]}>+91 96292 84690</Text>
                </View>
                <Button
                  label="Call"
                  size="sm"
                  variant="outline"
                  icon={<Phone size={14} color={colors.text} />}
                  onPress={() => handleCallHelpline('+919629284690')}
                />
              </View>
            </Card>

            {/* Sign Out */}
            <View style={{ marginTop: 24 }}>
              <Button
                label="Sign Out"
                icon={<LogOut size={16} color={colors.text} />}
                onPress={async () => {
                  await authStorage.clearSession();
                  router.replace('/');
                }}
                variant="outline"
                size="md"
                fullWidth
              />
            </View>
          </ScrollView>
        )}
      </View>

      {/* BOTTOM TAB BAR */}
      <BottomTabBar
        tabs={staffTabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  scrollPage: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  etaHeroCard: {
    marginBottom: 16,
  },
  etaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  busNumberHero: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  routeHero: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  etaValueRow: {
    marginVertical: 14,
  },
  etaBigNumber: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
  },
  etaSubText: {
    fontSize: 13,
    marginTop: 4,
  },
  nextStopBar: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  nextStopLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nextStopValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  mapContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 20,
  },
  boardingCard: {
    marginBottom: 20,
  },
  boardingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stopIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardingTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  boardingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  driverContactCard: {
    marginBottom: 16,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  driverPhoneText: {
    fontSize: 12,
    marginTop: 2,
  },
  shiftToggleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  shiftBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  shiftBtnText: {
    fontSize: 13,
  },
  timelineCard: {
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  timelineIconCol: {
    width: 28,
    alignItems: 'center',
  },
  dotCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  squareIconWrap: {
    width: 16,
    height: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareOutlineWrap: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  stopName: {
    fontSize: 14,
  },
  stopDetail: {
    fontSize: 12,
  },
  stopStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emergencyAlertCard: {
    marginBottom: 12,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  alertHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  alertBodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  alertTimeText: {
    fontSize: 11,
    marginTop: 6,
  },
  swapNoticeCard: {
    marginBottom: 12,
  },
  swapNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  swapNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  swapNoticeBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  bulletinCard: {
    marginBottom: 10,
  },
  bulletinTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  bulletinBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  bulletinTime: {
    fontSize: 11,
    marginTop: 6,
  },
  passCard: {
    marginBottom: 16,
  },
  passTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  passCorpLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  passTypeLabel: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  passDivider: {
    height: 1,
    marginVertical: 12,
  },
  passProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  passAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passName: {
    fontSize: 17,
    fontWeight: '700',
  },
  passMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  passStaffId: {
    fontSize: 11,
    marginTop: 2,
  },
  passMetaGrid: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  passMetaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passMetaLbl: {
    fontSize: 12,
  },
  passMetaVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  qrMockWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  qrTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qrSerial: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  qrSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },
  leaveCard: {
    marginBottom: 16,
  },
  leaveStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaveStatusTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  leaveStatusSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  helplineCard: {
    marginBottom: 16,
  },
  helplineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helplineName: {
    fontSize: 14,
    fontWeight: '600',
  },
  helplinePhone: {
    fontSize: 12,
    marginTop: 2,
  },
  incomingToastBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  toastIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  toastBody: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyStateSub: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  notifItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  notifItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  notifItemBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmModalDesc: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  dateOption: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  confirmModalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
