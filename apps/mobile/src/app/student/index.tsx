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
} from '../../services/supabase';
import { GPSCoordinate, INITIAL_STOPS, SIMULATION_ROUTE_A, EmergencyAlert, SystemNotification, Stop, MASTER_BUSES, MASTER_ROUTES, MASTER_STOPS, MASTER_DRIVERS } from '@college-bus/shared';
import { authStorage } from '../../services/authStorage';
import { hideSplash } from '../../services/splashService';
import { studentRosterStore, BusStudent } from '../../services/studentStore';
import { useTheme } from '../../theme';
import {
  AppHeader,
  BottomTabBar,
  Card,
  Button,
  StatusChip,
  StatBadge,
  SectionHeader,
  TabItem,
} from '../../components/ui';
import {
  Navigation,
  Milestone,
  Bell,
  User,
  Clock,
  MapPin,
  Phone,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Circle,
  Square,
  Calendar,
  LogOut,
  ArrowRight,
  RefreshCw,
  Sun,
  Moon,
  Info,
  Check,
} from 'lucide-react-native';

const MORNING_ROUTE_STOPS: Stop[] = [
  {
    id: 'st1_1',
    route_id: 'r1',
    stop_name: 'Old Bus Stand, RJPM',
    latitude: 9.4485,
    longitude: 77.5505,
    stop_order: 1,
    estimated_arrival: '08:20 AM',
    morning_time: '08:20 AM',
    evening_time: '04:45 PM',
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
    evening_time: '04:45 PM',
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
    evening_time: '04:45 PM',
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

const EVENING_ROUTE_STOPS: Stop[] = [
  {
    id: 'st1_4',
    route_id: 'r1',
    stop_name: 'RIT Campus Main Gate',
    latitude: 9.4520,
    longitude: 77.5535,
    stop_order: 1,
    estimated_arrival: '04:45 PM',
    morning_time: '08:45 AM',
    evening_time: '04:45 PM',
    status: 'active',
  },
  {
    id: 'st1_3',
    route_id: 'r1',
    stop_name: 'PACR Mill Circle',
    latitude: 9.4505,
    longitude: 77.5525,
    stop_order: 2,
    estimated_arrival: '04:55 PM',
    morning_time: '08:35 AM',
    evening_time: '04:55 PM',
    status: 'active',
  },
  {
    id: 'st1_2',
    route_id: 'r1',
    stop_name: 'Tenkasi Road Junction',
    latitude: 9.4498,
    longitude: 77.5518,
    stop_order: 3,
    estimated_arrival: '05:05 PM',
    morning_time: '08:28 AM',
    evening_time: '05:05 PM',
    status: 'active',
  },
  {
    id: 'st1_1',
    route_id: 'r1',
    stop_name: 'Old Bus Stand, RJPM',
    latitude: 9.4485,
    longitude: 77.5505,
    stop_order: 4,
    estimated_arrival: '05:15 PM',
    morning_time: '08:20 AM',
    evening_time: '05:15 PM',
    status: 'active',
  },
];

type StudentTab = 'track' | 'stops' | 'alerts' | 'profile';

export default function StudentDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<StudentTab>('track');
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean | null>(null);
  const [showPermModal, setShowPermModal] = useState(false);
  const [scheduleType, setScheduleType] = useState<'morning' | 'evening'>(() => {
    return new Date().getHours() >= 13 ? 'evening' : 'morning';
  });
  const [completedStopIds, setCompletedStopIds] = useState<string[]>([]);
  const [driverActiveShift, setDriverActiveShift] = useState<'morning' | 'evening'>(() => {
    return new Date().getHours() >= 13 ? 'evening' : 'morning';
  });

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
  const unreadNotifCount = systemBroadcasts.filter((n) => !readNotifIds.includes(n.id)).length;

  // Restore persisted read notification IDs on mount & clean up any internal registry rows
  useEffect(() => {
    authStorage.getItem('bustrack_student_read_notifs').then((stored) => {
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
    const allIds = systemBroadcasts.map((n) => n.id);
    setReadNotifIds(allIds);
    authStorage.setItem('bustrack_student_read_notifs', JSON.stringify(allIds)).catch(() => {});
    setShowNotifModal(false);
  };

  const markSingleNotificationRead = (notifId: string) => {
    setReadNotifIds((prev) => {
      const updated = prev.includes(notifId) ? prev : [...prev, notifId];
      authStorage.setItem('bustrack_student_read_notifs', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  // Student Profile & Realtime Leave State
  const [currentStudent, setCurrentStudent] = useState<BusStudent>(() => {
    return studentRosterStore.getStudentById('s3') || studentRosterStore.getAllStudents()[0] || {
      id: 's3',
      name: 'Kishore ST',
      rollNumber: '21IT045',
      department: 'B.Tech Information Tech.',
      year: 3,
      section: 'A',
      boardingStopId: 'st1',
      boardingStopName: 'Old Bus Stand, RJPM',
      phone: '+91 98421 23456',
      email: 'kishore.it@ritrjpm.ac.in',
      busId: 'b1',
      busNumber: 'BUS-01',
      routeId: 'r1',
      routeName: 'Route 1 (Old Bus Stand ➔ RIT Campus)',
      isBoarded: false,
      isOnLeave: false,
      avatarBg: '#059669',
    };
  });
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedLeaveDate, setSelectedLeaveDate] = useState('Today (20 Sep)');

  // Dynamic Assigned Driver state for student's bus
  const [assignedDriver, setAssignedDriver] = useState<{ name: string; phone: string }>({
    name: 'Mr. B. Moorthi',
    phone: '+91 9894668646',
  });

  useEffect(() => {
    const loadDriverForBus = async () => {
      try {
        let driversList: any[] = [...MASTER_DRIVERS];
        const raw = await authStorage.getItem('bustrack_drivers_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            driversList = [...parsed, ...driversList];
          }
        }
        const bId = (currentStudent.busId || '').toLowerCase().replace(/[- ]/g, '');
        const bNum = (currentStudent.busNumber || '').toLowerCase().replace(/[- ]/g, '');
        const matched = driversList.find((d: any) => {
          const dBus = (d.assigned_bus_id || d.bus_id || d.busNumber || d.bus_number || '').toLowerCase().replace(/[- ]/g, '');
          return (bId && dBus === bId) || (bNum && dBus === bNum);
        });
        if (matched) {
          setAssignedDriver({
            name: matched.profile?.name || matched.name || 'Assigned Driver',
            phone: matched.phone || matched.profile?.phone || '+91 9894668646',
          });
        }
      } catch {}
    };
    loadDriverForBus();
  }, [currentStudent.busId, currentStudent.busNumber]);

  // Load saved student profile from persistent session
  useEffect(() => {
    const loadSavedStudent = async () => {
      try {
        const session = await authStorage.getSession();
        if (session && session.role === 'student' && session.user) {
          const u = session.user as any;
          const sName = u.profile?.name || u.name;
          const sRoll = u.register_number || u.rollNumber || u.roll_number;
          const sDept = u.department;
          const sYear = u.year;
          const sSection = u.section;
          const sPhone = u.profile?.phone || u.phone;
          const sEmail = u.profile?.email || u.email;
          const sStop = u.boarding_stop?.stop_name || u.boardingStopName;
          const sStopId = u.boarding_stop_id || u.boardingStopId;

          const bId = u.bus_id || u.busId || 'b1';
          const busObj = MASTER_BUSES.find(b => b.id === bId || b.bus_number === (u.bus?.bus_number || u.bus_number || u.busNumber));
          const bNum = u.bus?.bus_number || u.bus_number || u.busNumber || busObj?.bus_number || 'BUS-01';
          const rId = u.route_id || u.routeId || u.route?.id || busObj?.route_id || 'r1';
          const rObj = MASTER_ROUTES.find(r => r.id === rId);
          const rName = u.route_name || u.routeName || u.route?.route_name || rObj?.route_name || (rId ? `Route ${rId.replace(/\D/g, '') || '1'}` : 'Route 1');
          const stopName = sStop || 'Old Bus Stand, RJPM';
          const regNum = u.bus?.registration_number || u.registration_number || u.registrationNumber || busObj?.registration_number;

          setCurrentStudent((prev) => ({
            ...prev,
            ...u,
            id: u.id || prev.id,
            name: sName || prev.name,
            rollNumber: sRoll || prev.rollNumber,
            department: sDept || prev.department,
            year: sYear ? Number(sYear) : prev.year,
            section: sSection || prev.section,
            phone: sPhone || prev.phone,
            email: sEmail || prev.email,
            busId: bId,
            busNumber: bNum,
            routeId: rId,
            routeName: rName,
            boardingStopName: stopName,
            boardingStopId: sStopId || prev.boardingStopId,
            registrationNumber: regNum || (prev as any).registrationNumber,
            isOnLeave: Boolean(u.is_on_leave || u.isOnLeave),
          }));
        }
      } catch (e) {
        console.warn('Student session load error:', e);
      } finally {
        hideSplash();
      }
    };
    loadSavedStudent();
  }, []);

  // Sync with Student Roster Store (only attendance and leave toggles, preserve student identity)
  useEffect(() => {
    const unsubscribe = studentRosterStore.subscribe(() => {
      const updated = studentRosterStore.getStudentById(currentStudent.id) || studentRosterStore.getStudentById(currentStudent.rollNumber);
      if (updated) {
        setCurrentStudent((prev) => ({
          ...prev,
          isBoarded: updated.isBoarded ?? prev.isBoarded,
          isOnLeave: updated.isOnLeave ?? prev.isOnLeave,
          leaveDate: updated.leaveDate ?? prev.leaveDate,
          leaveReason: updated.leaveReason ?? prev.leaveReason,
        }));
      }
    });
    return unsubscribe;
  }, [currentStudent.id, currentStudent.rollNumber]);

  // Notification / App preferences
  const [proximityAlerts, setProximityAlerts] = useState(true);
  const [delayAlerts, setDelayAlerts] = useState(true);

  // Student device GPS location
  const [studentLocation, setStudentLocation] = useState<GPSCoordinate | null>(null);

  // Live Bus Location (synced from Driver via Supabase Realtime / DB)
  const [busLocation, setBusLocation] = useState<GPSCoordinate | null>(null);
  const [hasTelemetry, setHasTelemetry] = useState(false);

  const [currentStopIndex, setCurrentStopIndex] = useState(0);
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

  // Dynamic route stops for student's assigned route
  const currentRouteStops: Stop[] = React.useMemo(() => {
    const rId = currentStudent.routeId || 'r1';
    const matched = allStops.filter(s => s.route_id === rId);
    if (matched.length > 0) return matched;
    const masterMatched = MASTER_STOPS.filter(s => s.route_id === rId);
    if (masterMatched.length > 0) return masterMatched;
    return INITIAL_STOPS;
  }, [allStops, currentStudent.routeId]);

  // Active stops sequence based on schedule shift
  const activeStops = React.useMemo(() => {
    if (scheduleType === 'evening') {
      return [...currentRouteStops].reverse().map((st, i) => ({
        ...st,
        stop_order: i + 1,
        estimated_arrival: st.evening_time || st.estimated_arrival,
      }));
    }
    return [...currentRouteStops].sort((a, b) => a.stop_order - b.stop_order).map((st) => ({
      ...st,
      estimated_arrival: st.morning_time || st.estimated_arrival,
    }));
  }, [currentRouteStops, scheduleType]);

  const boardingStop = (activeStops && (
    activeStops.find(s => s.id === (currentStudent.boardingStopId || 'st1') || s.id === 'stop_1') ||
    activeStops.find(s => s.stop_name.toLowerCase().includes((currentStudent.boardingStopName || '').toLowerCase().slice(0, 6)))
  )) || activeStops[0];

  useEffect(() => {
    const loadStudentSession = async () => {
      try {
        // Fetch cloud user registry on launch
        fetchCloudUserRegistry(true).catch(() => {});

        // 1. First try authStorage session
        const session = await authStorage.getSession();
        let parsed = (session && session.role === 'student' && session.user)
          ? session.user as any
          : null;

        // 2. Fallback to student profile key
        if (!parsed) {
          const raw = await authStorage.getItem('bustrack_current_mobile_student');
          if (raw) parsed = JSON.parse(raw);
        }

        // 3. Fallback to localStorage on Web
        if (!parsed && Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
          const storedCurrent = window.localStorage.getItem('bustrack_current_mobile_student');
          if (storedCurrent) parsed = JSON.parse(storedCurrent);
        }

        if (parsed && (parsed.name || parsed.profile?.name)) {
          // Load dynamic buses and routes from persistent storage
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

          const bId = parsed.bus_id || parsed.busId || parsed.bus?.id || 'b1';
          const busObj = allBuses.find(b => b.id === bId || b.bus_number === (parsed.bus?.bus_number || parsed.busNumber || parsed.bus_number));
          const bNum = parsed.bus?.bus_number || parsed.bus_number || parsed.busNumber || busObj?.bus_number || 'BUS-01';
          const rId = parsed.route_id || parsed.routeId || parsed.route?.id || busObj?.route_id || 'r1';
          const rObj = allRoutes.find(r => r.id === rId);
          const rName = parsed.route_name || parsed.routeName || parsed.route?.route_name || rObj?.route_name || (rObj ? `${rObj.route_name}` : `Route ${rId}`);

          setCurrentStudent((prev) => ({
            ...prev,
            id: parsed.id || prev.id,
            name: parsed.profile?.name || parsed.name || prev.name,
            rollNumber: parsed.register_number || parsed.rollNumber || prev.rollNumber,
            department: parsed.department || prev.department,
            year: parsed.year || prev.year,
            section: parsed.section || prev.section,
            boardingStopId: parsed.boarding_stop_id || parsed.boardingStopId || prev.boardingStopId,
            boardingStopName: parsed.boarding_stop?.stop_name || parsed.boardingStopName || prev.boardingStopName,
            phone: parsed.profile?.phone || parsed.phone || prev.phone,
            email: parsed.profile?.email || parsed.email || prev.email,
            busId: bId,
            busNumber: bNum,
            routeId: rId,
            routeName: rName,
            isBoarded: false,
            isOnLeave: Boolean(parsed.is_on_leave),
            leaveDate: parsed.leave_date,
            leaveReason: parsed.leave_reason,
            avatarBg: '#059669',
          }));
        }
      } catch (e) {
        console.warn('Student session load error:', e);
      }
    };

    loadStudentSession();

    checkAndFetchStudentLocation();
    checkNotificationPermissionStatus();

    const targetBusId = currentStudent.busId || 'b1';

    // 0. Fetch latest recorded live bus location from database
    fetchLatestBusLocation(targetBusId).then((latest) => {
      if (latest && typeof latest.latitude === 'number' && typeof latest.longitude === 'number') {
        setBusLocation(latest);
        setHasTelemetry(true);
        const ageSec = latest.timestamp ? (Date.now() - new Date(latest.timestamp).getTime()) / 1000 : 999;
        if (ageSec < 180) {
          setIsDriverActive(true);
        }
      }
    }).catch(() => {});

    // Periodic live database sync fallback (every 3.5s)
    const pollTimer = setInterval(async () => {
      try {
        const latest = await fetchLatestBusLocation(targetBusId);
        if (latest && typeof latest.latitude === 'number' && typeof latest.longitude === 'number') {
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
      if (!payload.busId || payload.busId === targetBusId || payload.busNumber === currentStudent.busNumber) {
        setBusLocation(payload.coordinate);
        setHasTelemetry(true);
        if (typeof payload.currentStopIndex === 'number') {
          setCurrentStopIndex(payload.currentStopIndex);
        }
        setIsDriverActive(payload.status === 'active');
        setLastUpdatedSec(1);
      }
    });

    // 1b. Subscribe to Trip Stop Updates
    const unsubTrip = subscribeToTrip((payload: TripUpdatePayload) => {
      setIsDriverActive(payload.isTripActive);
      if (typeof payload.currentStopIdx === 'number') {
        setCurrentStopIndex(payload.currentStopIdx);
      }
      if (Array.isArray(payload.completedStopIds)) {
        setCompletedStopIds(payload.completedStopIds);
      }
      if (payload.shift) {
        setDriverActiveShift(payload.shift);
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
      setEmergencyAlerts((prev) => {
        if (prev.some((a) => a.id === alert.id || (a.type === alert.type && a.message?.trim().toLowerCase() === alert.message?.trim().toLowerCase() && a.bus_id === alert.bus_id))) {
          return prev;
        }
        return [alert, ...prev];
      });
      
      // Deliver High-Priority Push Notification to Mobile Notification Bar
      notificationService.sendPushNotification(
        `🚨 EMERGENCY ALERT: ${currentStudent.busNumber || 'BUS-01'}`,
        alert.message || `An urgent alert (${alert.type?.toUpperCase()}) was reported for your bus. Safety protocols active.`,
        'emergency_sos'
      );
    });

    // 4. Subscribe to Live Admin Broadcast Announcements
    const unsubSystemNotif = subscribeToSystemNotifications((notif: SystemNotification) => {
      if (isInternalRegistryNotification(notif)) return;

      setSystemBroadcasts((prev) => {
        if (prev.some((n) => n.id === notif.id || (n.title?.trim().toLowerCase() === notif.title?.trim().toLowerCase() && n.message?.trim().toLowerCase() === notif.message?.trim().toLowerCase()))) {
          return prev;
        }
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
    const syncAnnouncements = async () => {
      try {
        const notifs = await fetchSystemNotificationsFromDB();
        if (notifs && notifs.length > 0) {
          const cleanNotifs = notifs.filter((n) => !isInternalRegistryNotification(n));
          setSystemBroadcasts((prev) => {
            const fresh = cleanNotifs.filter((n) => !prev.some((p) => p.id === n.id || (p.title?.trim().toLowerCase() === n.title?.trim().toLowerCase() && p.message?.trim().toLowerCase() === n.message?.trim().toLowerCase())));
            if (fresh.length > 0) {
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
                const fresh = cleanList.filter((n: any) => !prev.some((p) => p.id === n.id || (p.title?.trim().toLowerCase() === n.title?.trim().toLowerCase() && p.message?.trim().toLowerCase() === n.message?.trim().toLowerCase())));
                if (fresh.length > 0) {
                  return [...fresh, ...prev];
                }
                return prev;
              });
            }
          } catch {}
        }
      }).catch(() => {});
    };
    syncAnnouncements();

    // Initial fetch on mount
    syncAnnouncements();

    // 6. Polling sync every 3.5 seconds
    const notifPollTimer = setInterval(() => {
      syncAnnouncements();
    }, 3500);

    // 6b. Foreground sync when app is reopened or focused
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncAnnouncements();
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
        '🔔 Push Notifications Active',
        'You will now receive live bus arrival notices, driver updates, and standby vehicle swap alerts!'
      );
    }
  };

  const checkAndFetchStudentLocation = async () => {
    try {
      const perm = await locationTracker.checkPermissions();
      if (perm.granted) {
        setHasLocationPermission(true);
        const pos = await locationTracker.getCurrentPosition();
        if (pos && typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
          setStudentLocation(pos);
        }
      } else {
        setHasLocationPermission(false);
      }
    } catch {}
  };

  const handleRequestPermission = async () => {
    try {
      const granted = await locationTracker.requestForegroundPermission();
      if (granted) {
        setHasLocationPermission(true);
        const pos = await locationTracker.getCurrentPosition();
        if (pos && typeof pos.latitude === 'number' && typeof pos.longitude === 'number') {
          setStudentLocation(pos);
        }
        Alert.alert('✅ Location Access Active', 'Your live location is pinpointed on the map.');
      } else {
        setShowPermModal(true);
      }
    } catch {
      setShowPermModal(true);
    }
  };

  const handleCallHelpline = (phone: string = '+919629284690') => {
    Linking.openURL(`tel:${phone}`);
  };

  // Distance calculations
  const distanceToBoardingStopKm = hasLocationPermission && studentLocation && boardingStop && typeof studentLocation.latitude === 'number' && typeof boardingStop.latitude === 'number'
    ? calculateDistanceKm(
        studentLocation.latitude,
        studentLocation.longitude,
        boardingStop.latitude,
        boardingStop.longitude
      )
    : null;

  const walkingMinutes = distanceToBoardingStopKm !== null
    ? Math.max(1, Math.round((distanceToBoardingStopKm / 4.5) * 60))
    : null;

  const distanceBusToStopKm = busLocation && boardingStop && typeof busLocation.latitude === 'number' && typeof boardingStop.latitude === 'number'
    ? calculateDistanceKm(
        busLocation.latitude,
        busLocation.longitude,
        boardingStop.latitude,
        boardingStop.longitude
      )
    : null;

  // Dynamic ETA Calculation to Assigned Boarding Stop
  const remainingStopsToBoarding = Math.max(
    0,
    activeStops.findIndex((s) => s.id === (boardingStop?.id || 'stop_1')) - currentStopIndex
  );

  const dynamicETA: DynamicETA = calculateDynamicETA(
    isDriverActive && distanceBusToStopKm !== null ? distanceBusToStopKm : null,
    isDriverActive && busLocation ? Number(busLocation.speed || 0) : 0,
    remainingStopsToBoarding,
    boardingStop?.estimated_arrival || null
  );

  const studentTabs: TabItem<StudentTab>[] = [
    { id: 'track', label: 'Track', icon: Navigation },
    { id: 'stops', label: 'Stops', icon: Milestone },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: unreadNotifCount },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* TOP HEADER */}
      <AppHeader
        title="RITBusTrack"
        subtitle={`${currentStudent.busNumber || 'BUS-01'} · ${currentStudent.routeName || 'Route 1'}`}
        roleBadge="STUDENT"
        isLive={isDriverActive}
        onNotificationPress={() => setShowNotifModal(true)}
        unreadCount={unreadNotifCount}
        showThemeToggle={true}
      />

      {/* NOTIFICATIONS MODAL */}
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
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Notifications</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    Transit announcements and updates
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => setShowNotifModal(false)}
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              {systemBroadcasts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Bell size={32} color={colors.textSecondary} />
                  <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No notifications yet</Text>
                  <Text style={[styles.emptyStateSub, { color: colors.textSecondary }]}>
                    All campus transport announcements will appear here.
                  </Text>
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
                      <View style={styles.notifItemHeader}>
                        <Text
                          style={[
                            styles.notifItemTitle,
                            { color: isEmergency ? colors.emergency : colors.text },
                          ]}
                          numberOfLines={2}
                        >
                          {notif.title}
                        </Text>
                        <StatusChip
                          label={notif.type?.toUpperCase() || 'INFO'}
                          variant={isEmergency ? 'emergency' : 'neutral'}
                        />
                      </View>
                      <Text style={[styles.notifItemBody, { color: colors.textSecondary }]}>
                        {notif.message}
                      </Text>
                      <Text style={[styles.notifItemTime, { color: colors.textMuted }]}>
                        {formatEventTime(notif.created_at)}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <Button
                label="Mark All as Read"
                onPress={markAllNotificationsAsRead}
                variant="outline"
                size="sm"
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* FLOATING TOAST */}
      {incomingToast && (
        <TouchableOpacity
          style={[
            styles.floatingToast,
            {
              top: Math.max(insets.top + 56, 70),
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
          <Bell size={18} color={colors.text} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.toastTitle, { color: colors.text }]} numberOfLines={1}>
              {incomingToast.title}
            </Text>
            <Text style={[styles.toastBody, { color: colors.textSecondary }]} numberOfLines={1}>
              {incomingToast.message}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* MAIN VIEW CONTENT (SWITCHED BY TABS) */}
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
            {/* Permission Banners if Needed */}
            {hasLocationPermission === false && (
              <LocationPermissionBanner
                role="student"
                isGranted={false}
                onRequestPermission={handleRequestPermission}
                onOpenSettings={() => locationTracker.openSettings()}
              />
            )}

            {hasNotificationPermission === false && (
              <NotificationPermissionBanner
                isGranted={false}
                onRequestPermission={handleRequestNotificationPermission}
              />
            )}

            {/* PRIMARY INFORMATION HIERARCHY CARD */}
            <Card style={styles.primaryCard} padding="lg">
              <View style={styles.busHeaderRow}>
                <View style={styles.busHeaderInfoCol}>
                  <Text style={[styles.busNumberText, { color: colors.text }]} numberOfLines={1}>
                    {currentStudent.busNumber || 'BUS-01'}
                  </Text>
                  <Text style={[styles.routeNameText, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                    {currentStudent.routeName || 'Main Route'}
                  </Text>
                </View>

                <View style={styles.headerChipsRow}>
                  <StatusChip
                    label={scheduleType === 'morning' ? 'Morning Trip' : 'Evening Trip'}
                    variant="neutral"
                  />
                  <StatusChip
                    label={isDriverActive ? (dynamicETA.statusLabel || 'On Time') : 'Standby'}
                    variant={isDriverActive ? (dynamicETA.isDelayed ? 'delayed' : 'ontime') : 'neutral'}
                    dot={isDriverActive}
                  />
                </View>
              </View>

              {/* Large Critical ETA Value */}
              <View style={[styles.etaDisplayBlock, { borderTopColor: colors.borderSubtle }]}>
                <Text style={[styles.etaLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  ESTIMATED ARRIVAL AT {currentStudent.boardingStopName?.toUpperCase() || 'YOUR STOP'}
                </Text>
                <View style={styles.etaValueRow}>
                  {isDriverActive && distanceBusToStopKm !== null ? (
                    <>
                      <Text style={[styles.etaValue, { color: colors.text }]}>
                        {dynamicETA.formattedEta}
                      </Text>
                      <Text style={[styles.etaExactTime, { color: colors.textSecondary }]}>
                        ({dynamicETA.arrivalTimeStr})
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.etaValue, { color: colors.textSecondary, fontSize: 26 }]}>
                        Standby
                      </Text>
                      <Text style={[styles.etaExactTime, { color: colors.textMuted }]}>
                        ({hasTelemetry ? 'Trip not started' : 'Live data unavailable'})
                      </Text>
                    </>
                  )}
                </View>
              </View>

              {/* Key Metrics Grid */}
              <View style={styles.metricsGrid}>
                <StatBadge
                  label="Distance"
                  value={distanceBusToStopKm !== null ? (distanceBusToStopKm < 1 ? Math.round(distanceBusToStopKm * 1000) : distanceBusToStopKm.toFixed(1)) : '--'}
                  unit={distanceBusToStopKm !== null ? (distanceBusToStopKm < 1 ? 'm' : 'km') : 'km'}
                  style={{ flex: 1 }}
                />
                <StatBadge
                  label="Speed"
                  value={isDriverActive && busLocation && typeof busLocation.speed === 'number' ? Math.round(busLocation.speed) : '--'}
                  unit="km/h"
                  style={{ flex: 1 }}
                />
              </View>
            </Card>

            {/* Next Stop Card */}
            <Card style={styles.nextStopCard} padding="md" variant="subtle">
              <View style={styles.nextStopRow}>
                <View style={styles.nextStopIcon}>
                  <MapPin size={18} color={colors.text} />
                </View>
                <View style={styles.nextStopTextCol}>
                  <Text style={[styles.nextStopSub, { color: colors.textSecondary }]}>
                    {isDriverActive ? 'Next Approaching Stop' : 'Route Schedule'}
                  </Text>
                  <Text style={[styles.nextStopTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                    {activeStops[currentStopIndex]?.stop_name || 'En Route to RIT Campus'}
                  </Text>
                </View>
                <StatusChip
                  label={isDriverActive ? `${Math.max(1, activeStops.length - currentStopIndex)} stops left` : `${activeStops.length} stops`}
                  variant="neutral"
                />
              </View>
            </Card>

            {/* Clean Map Container (Doesn't dominate screen) */}
            <SectionHeader
              title="Live Fleet Map"
              subtitle={isDriverActive ? `Live GPS updates · ${lastUpdatedSec}s ago` : (hasTelemetry ? 'Last known bus position' : 'Route stops overview')}
              rightElement={
                <TouchableOpacity
                  style={[styles.refreshPill, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={checkAndFetchStudentLocation}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={12} color={colors.textSecondary} />
                  <Text style={[styles.refreshPillText, { color: colors.textSecondary }]}>Refresh</Text>
                </TouchableOpacity>
              }
            />

            <View style={[styles.mapCardContainer, { borderColor: colors.border }]}>
              <OSMMapView
                busLocation={isDriverActive ? busLocation : null}
                userLocation={hasLocationPermission ? studentLocation : null}
                userLocationLabel="Your Location"
                busNumber={currentStudent.busNumber}
                routeNumber={currentStudent.routeName}
                routeColor={colors.primary}
                stops={activeStops}
                boardingStop={boardingStop}
                height={240}
              />
            </View>

            {/* Driver Contact Card */}
            <Card style={styles.driverCard} padding="md">
              <View style={styles.driverInfoRow}>
                <View style={[styles.driverAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <User size={18} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.driverName, { color: colors.text }]}>
                    {assignedDriver.name}
                  </Text>
                  <Text style={[styles.driverPhoneText, { color: colors.textSecondary }]}>
                    {assignedDriver.phone}
                  </Text>
                </View>
                <Button
                  label="Call"
                  icon={<Phone size={14} color={colors.text} />}
                  onPress={() => handleCallHelpline(assignedDriver.phone)}
                  variant="outline"
                  size="sm"
                />
              </View>
            </Card>

            {/* Standby Fleet Swap Notice (if active) */}
            {activeSwapNotice && (
              <Card style={styles.swapNoticeCard} variant="subtle" padding="md">
                <View style={styles.swapNoticeHeader}>
                  <AlertTriangle size={16} color={colors.warning} />
                  <Text style={[styles.swapNoticeTitle, { color: colors.text }]}>
                    Vehicle Notice: {activeSwapNotice.title}
                  </Text>
                </View>
                <Text style={[styles.swapNoticeBody, { color: colors.textSecondary }]}>
                  {activeSwapNotice.message}
                </Text>
              </Card>
            )}
          </ScrollView>
        )}

        {/* ================= TAB 2: STOPS (VERTICAL TIMELINE) ================= */}
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
                style={[
                  styles.shiftBtn,
                  scheduleType === 'morning' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setScheduleType('morning')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.shiftBtnText,
                    {
                      color: scheduleType === 'morning' ? colors.primaryContrast : colors.textSecondary,
                      fontWeight: scheduleType === 'morning' ? '700' : '500',
                    },
                  ]}
                >
                  Morning Trip (To Campus)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.shiftBtn,
                  scheduleType === 'evening' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setScheduleType('evening')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.shiftBtnText,
                    {
                      color: scheduleType === 'evening' ? colors.primaryContrast : colors.textSecondary,
                      fontWeight: scheduleType === 'evening' ? '700' : '500',
                    },
                  ]}
                >
                  Evening Trip (Return)
                </Text>
              </TouchableOpacity>
            </View>

            <SectionHeader
              title="Route Schedule & Stops"
              subtitle={`${activeStops.length} stops on ${currentStudent.routeName || 'Route 1'}`}
            />

            {/* Vertical Timeline Card */}
            <Card style={styles.timelineCard} padding="lg">
              {activeStops.map((stop, idx) => {
                const isPassed = idx < currentStopIndex;
                const isCurrent = idx === currentStopIndex;
                const isUpcoming = idx > currentStopIndex;
                const isBoarding = boardingStop ? stop.id === boardingStop.id : false;
                const isLast = idx === activeStops.length - 1;

                return (
                  <View key={stop.id} style={styles.timelineRow}>
                    {/* Vertical Connecting Line & Node */}
                    <View style={styles.timelineNodeCol}>
                      <View
                        style={[
                          styles.timelineNode,
                          isCurrent
                            ? [styles.nodeCurrent, { backgroundColor: colors.primary, borderColor: colors.primary }]
                            : isPassed
                            ? [styles.nodePassed, { backgroundColor: colors.textSecondary, borderColor: colors.textSecondary }]
                            : [styles.nodeUpcoming, { borderColor: colors.border, backgroundColor: colors.surface }],
                        ]}
                      >
                        {isCurrent && <View style={[styles.innerSquare, { backgroundColor: colors.primaryContrast }]} />}
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.timelineLine,
                            {
                              backgroundColor: isPassed ? colors.textSecondary : colors.borderSubtle,
                            },
                          ]}
                        />
                      )}
                    </View>

                    {/* Stop Details */}
                    <View style={styles.timelineContentCol}>
                      <View style={styles.stopTitleRow}>
                        <Text
                          style={[
                            styles.stopNameText,
                            {
                              color: isPassed ? colors.textSecondary : colors.text,
                              fontWeight: isCurrent ? '700' : isBoarding ? '700' : '500',
                            },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {stop.stop_name}
                        </Text>
                        {isBoarding && (
                          <StatusChip label="Your Stop" variant="neutral" />
                        )}
                      </View>

                      <View style={styles.stopMetaRow}>
                        <Text style={[styles.stopTimeText, { color: colors.textSecondary }]}>
                          {scheduleType === 'evening'
                            ? (stop.evening_time || stop.estimated_arrival || '--')
                            : (stop.morning_time || stop.estimated_arrival || '--')}
                        </Text>

                        {isPassed && (
                          <Text style={[styles.stopStatusSub, { color: colors.textMuted }]}>
                            ● Passed
                          </Text>
                        )}
                        {isCurrent && (
                          <Text style={[styles.stopStatusSub, { color: colors.primary, fontWeight: '700' }]}>
                            ■ Approaching
                          </Text>
                        )}
                        {isUpcoming && (
                          <Text style={[styles.stopStatusSub, { color: colors.textSecondary }]}>
                            □ Upcoming
                          </Text>
                        )}
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 17, fontWeight: '800' }]}>Alerts & Announcements</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, fontSize: 12 }]}>Real-time transit bulletins and notices</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {systemBroadcasts.length > 0 && (
                  <TouchableOpacity
                    style={[styles.refreshPill, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    onPress={markAllNotificationsAsRead}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>Mark read</Text>
                  </TouchableOpacity>
                )}
                {(systemBroadcasts.length > 0 || emergencyAlerts.length > 0 || swapNoticesList.length > 0) && (
                  <TouchableOpacity
                    style={[styles.refreshPill, { borderColor: colors.emergency, backgroundColor: colors.surface }]}
                    onPress={async () => {
                      setSystemBroadcasts([]);
                      setEmergencyAlerts([]);
                      setSwapNoticesList([]);
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
            </View>

            {/* Emergency SOS Alerts (Priority, functional red) */}
            {emergencyAlerts.map((alert) => (
              <Card key={alert.id} variant="emergency" style={styles.alertCard} padding="md">
                <View style={styles.alertCardHeader}>
                  <View style={styles.alertEmergencyTitleRow}>
                    <ShieldAlert size={18} color={colors.emergency} style={{ flexShrink: 0 }} />
                    <Text style={[styles.alertCardTitle, { color: colors.emergency }]}>
                      EMERGENCY: {alert.type.toUpperCase()}
                    </Text>
                  </View>
                  <StatusChip label="CRITICAL" variant="emergency" />
                </View>
                <Text style={[styles.alertCardBody, { color: colors.text }]}>
                  {alert.message}
                </Text>
                <Text style={[styles.alertCardTime, { color: colors.emergency }]}>
                  {formatEventTime(alert.created_at)}
                </Text>
              </Card>
            ))}

            {/* Standby Fleet Swaps */}
            {swapNoticesList.map((notice) => (
              <Card key={notice.id} variant="subtle" style={styles.alertCard} padding="md">
                <View style={styles.alertCardHeader}>
                  <AlertTriangle size={16} color={colors.warning} />
                  <Text style={[styles.alertCardTitle, { color: colors.text }]}>
                    FLEET NOTICE: {notice.title}
                  </Text>
                </View>
                <Text style={[styles.alertCardBody, { color: colors.textSecondary }]}>
                  {notice.message}
                </Text>
              </Card>
            ))}

            {/* System Notifications List */}
            {systemBroadcasts.length === 0 && emergencyAlerts.length === 0 ? (
              <Card style={styles.emptyCard} padding="lg">
                <Bell size={28} color={colors.textSecondary} />
                <Text style={[styles.emptyCardTitle, { color: colors.text }]}>
                  All Clear · No Active Alerts
                </Text>
                <Text style={[styles.emptyCardSub, { color: colors.textSecondary }]}>
                  Campus transit operations are currently running on schedule.
                </Text>
              </Card>
            ) : (
              systemBroadcasts.map((notif) => {
                const isRead = readNotifIds.includes(notif.id);
                return (
                  <Card
                    key={notif.id}
                    style={[styles.alertCard, isRead && { opacity: 0.7 }]}
                    padding="md"
                    onPress={() => markSingleNotificationRead(notif.id)}
                  >
                    <View style={styles.alertCardHeader}>
                      <View style={styles.alertTitleArea}>
                        <Text style={[styles.alertItemTitle, { color: colors.text }]}>
                          {notif.title}
                        </Text>
                      </View>
                      <StatusChip label={notif.type?.toUpperCase() || 'INFO'} variant="neutral" />
                    </View>
                    <Text style={[styles.alertItemBody, { color: colors.textSecondary }]}>
                      {notif.message}
                    </Text>
                    <Text style={[styles.alertItemTime, { color: colors.textMuted }]}>
                      {formatEventTime(notif.created_at)}
                    </Text>
                  </Card>
                );
              })
            )}
          </ScrollView>
        )}

        {/* ================= TAB 4: PROFILE & PASS ================= */}
        {activeTab === 'profile' && (
          <ScrollView
            style={styles.scrollPage}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 76 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Student Profile Card */}
            <Card style={styles.profileCard} padding="lg">
              <View style={styles.profileHeaderRow}>
                <View style={[styles.profileAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <Text style={[styles.avatarInitial, { color: colors.text }]}>
                    {currentStudent.name ? currentStudent.name.charAt(0).toUpperCase() : 'S'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.studentName, { color: colors.text }]}>
                    {currentStudent.name}
                  </Text>
                  <Text style={[styles.studentId, { color: colors.textSecondary }]}>
                    {currentStudent.rollNumber || '21IT045'}
                  </Text>
                  <Text style={[styles.studentDept, { color: colors.textSecondary }]}>
                    {currentStudent.department}
                  </Text>
                </View>
              </View>

              <View style={[styles.profileMetaGrid, { borderTopColor: colors.borderSubtle }]}>
                <View style={styles.profileMetaItem}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Year & Section</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    Year {currentStudent.year || 3}, Sec {currentStudent.section || 'A'}
                  </Text>
                </View>

                <View style={styles.profileMetaItem}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Assigned Bus</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {currentStudent.busNumber || 'BUS-01'}
                  </Text>
                </View>

                <View style={styles.profileMetaItem}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Assigned Route</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {currentStudent.routeName || 'Route 1'}
                  </Text>
                </View>

                <View style={styles.profileMetaItem}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Boarding Stop</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {currentStudent.boardingStopName || 'Old Bus Stand'}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Digital Campus Transit Pass */}
            <SectionHeader title="Digital Transit Pass" subtitle="Valid for academic year 2024-2025" />

            <Card style={styles.passCard} padding="lg">
              <View style={styles.passHeaderRow}>
                <Text style={[styles.passCollege, { color: colors.textSecondary }]}>
                  RAMCO INSTITUTE OF TECHNOLOGY
                </Text>
                <StatusChip label="VERIFIED PASS" variant="ontime" />
              </View>

              <View style={styles.passBody}>
                <Text style={[styles.passName, { color: colors.text }]}>
                  {currentStudent.name}
                </Text>
                <Text style={[styles.passRole, { color: colors.textSecondary }]}>
                  COMMUTER STUDENT · {currentStudent.rollNumber}
                </Text>
              </View>

              {/* Minimal Barcode Representation */}
              <View style={[styles.barcodeContainer, { backgroundColor: colors.surfaceSubtle }]}>
                <View style={styles.barcodeLines}>
                  {[3, 1, 4, 2, 5, 1, 3, 2, 4, 1, 5, 2, 3, 4, 1, 2, 4, 3, 1, 5, 2, 3, 1, 4].map((w, i) => (
                    <View
                      key={i}
                      style={{
                        width: w,
                        height: 36,
                        backgroundColor: colors.text,
                        marginHorizontal: 1.5,
                      }}
                    />
                  ))}
                </View>
                <Text style={[styles.barcodeText, { color: colors.textSecondary }]}>
                  {currentStudent.rollNumber || 'RIT-BUS-2024'}
                </Text>
              </View>
            </Card>

            {/* Leave Management Card */}
            <SectionHeader title="Transit Attendance & Leave" subtitle="Notify driver and transport desk" />

            <Card style={styles.leaveCard} padding="md">
              <View style={styles.leaveRow}>
                <View style={styles.leaveInfo}>
                  <Text style={[styles.leaveTitle, { color: colors.text }]}>
                    {currentStudent.isOnLeave ? 'On Leave Today' : 'Attending Transit Today'}
                  </Text>
                  <Text style={[styles.leaveSub, { color: colors.textSecondary }]}>
                    {currentStudent.isOnLeave
                      ? 'Driver has been notified not to wait at your stop.'
                      : 'Bus will expect you at your assigned boarding stop.'}
                  </Text>
                </View>
                <Button
                  label={currentStudent.isOnLeave ? 'Cancel Leave' : 'Apply Leave'}
                  onPress={() => setShowLeaveModal(true)}
                  variant={currentStudent.isOnLeave ? 'outline' : 'secondary'}
                  size="sm"
                />
              </View>
            </Card>

            {/* Sign Out Button */}
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

      {/* LEAVE APPLICATION MODAL */}
      <Modal
        visible={showLeaveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLeaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalHeaderTitleRow}>
                <Calendar size={18} color={colors.text} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Apply Transit Leave</Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => setShowLeaveModal(false)}
              >
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: 18 }}>
              <Text style={[styles.leaveModalDesc, { color: colors.textSecondary }]}>
                Select the day you will not be boarding the college bus:
              </Text>

              {['Today (Next Shift)', 'Tomorrow (All Day)', 'Next 2 Days'].map((dateOption) => (
                <TouchableOpacity
                  key={dateOption}
                  style={[
                    styles.dateOptionBtn,
                    {
                      backgroundColor: selectedLeaveDate === dateOption ? colors.primary : colors.surfaceSubtle,
                      borderColor: selectedLeaveDate === dateOption ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedLeaveDate(dateOption)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dateOptionText,
                      {
                        color: selectedLeaveDate === dateOption ? colors.primaryContrast : colors.text,
                        fontWeight: selectedLeaveDate === dateOption ? '700' : '500',
                      },
                    ]}
                  >
                    {dateOption}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={{ marginTop: 14 }}>
                <Button
                  label="Confirm Leave Request"
                  onPress={() => {
                    studentRosterStore.setStudentLeave(currentStudent.id, true, 'Transit Leave', selectedLeaveDate);
                    setCurrentStudent((prev) => ({ ...prev, isOnLeave: true, leaveDate: selectedLeaveDate }));
                    setShowLeaveModal(false);
                    Alert.alert('Leave Recorded', `Your transit leave for ${selectedLeaveDate} has been confirmed.`);
                  }}
                  variant="primary"
                  size="md"
                  fullWidth
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* BOTTOM TAB BAR */}
      <BottomTabBar
        tabs={studentTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* LOCATION PERMISSION MODAL */}
      <LocationPermissionModal
        visible={showPermModal}
        role="student"
        onClose={() => setShowPermModal(false)}
        onGranted={() => {
          setHasLocationPermission(true);
          setShowPermModal(false);
          checkAndFetchStudentLocation();
        }}
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
  primaryCard: {
    marginBottom: 12,
  },
  busHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  busHeaderInfoCol: {
    flex: 1,
    marginRight: 10,
    minWidth: 0,
  },
  busNumberText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  routeNameText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  headerChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
    maxWidth: '55%',
    flexShrink: 0,
  },
  etaDisplayBlock: {
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  etaLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  etaValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  etaValue: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  etaExactTime: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  nextStopCard: {
    marginBottom: 16,
  },
  nextStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextStopIcon: {
    marginRight: 10,
    flexShrink: 0,
  },
  nextStopTextCol: {
    flex: 1,
    marginRight: 8,
    minWidth: 0,
  },
  nextStopSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  nextStopTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
  refreshPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  refreshPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mapCardContainer: {
    height: 240,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  driverCard: {
    marginBottom: 16,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
  },
  driverPhoneText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  swapNoticeCard: {
    marginBottom: 16,
  },
  swapNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  swapNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  swapNoticeBody: {
    fontSize: 12,
  },
  shiftToggleRow: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  shiftBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  shiftBtnText: {
    fontSize: 12,
  },
  timelineCard: {
    marginBottom: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  timelineNodeCol: {
    alignItems: 'center',
    width: 28,
  },
  timelineNode: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  nodeCurrent: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  innerSquare: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
  nodePassed: {},
  nodeUpcoming: {},
  timelineLine: {
    width: 1.5,
    flex: 1,
    marginVertical: 2,
  },
  timelineContentCol: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 16,
  },
  stopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stopNameText: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  stopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  stopTimeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  stopStatusSub: {
    fontSize: 11,
  },
  alertCard: {
    marginBottom: 10,
  },
  alertCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  alertTitleArea: {
    flex: 1,
    marginRight: 6,
  },
  alertEmergencyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
    marginRight: 8,
  },
  alertCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  alertCardBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  alertCardTime: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  alertItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    flexWrap: 'wrap',
  },
  alertItemBody: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  alertItemTime: {
    fontSize: 11,
    marginTop: 6,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyCardSub: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  profileCard: {
    marginBottom: 16,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '800',
  },
  studentName: {
    fontSize: 17,
    fontWeight: '700',
  },
  studentId: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  studentDept: {
    fontSize: 12,
    marginTop: 2,
  },
  profileMetaGrid: {
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  profileMetaItem: {
    width: '50%',
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  passCard: {
    marginBottom: 16,
  },
  passHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passCollege: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  passBody: {
    marginVertical: 14,
  },
  passName: {
    fontSize: 18,
    fontWeight: '800',
  },
  passRole: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  barcodeContainer: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  barcodeLines: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barcodeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 6,
  },
  leaveCard: {
    marginBottom: 16,
  },
  leaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leaveInfo: {
    flex: 1,
    marginRight: 12,
  },
  leaveTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  leaveSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    maxHeight: '82%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
    minWidth: 0,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 11,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalScrollContent: {
    padding: 16,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyStateSub: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  notifItem: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  notifItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  notifItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  notifItemBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  notifItemTime: {
    fontSize: 10,
    marginTop: 6,
  },
  floatingToast: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 99,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  toastTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  toastBody: {
    fontSize: 11,
  },
  leaveModalDesc: {
    fontSize: 13,
    marginBottom: 14,
  },
  dateOptionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  dateOptionText: {
    fontSize: 13,
  },
});
