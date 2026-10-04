import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
  Linking,
  TextInput,
  AppState,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OSMMapView } from '../../components/OSMMapView';
import {
  locationTracker,
  getSignalQuality,
  formatDistance,
  calculateDistanceKm,
  calculateDynamicETA,
} from '../../services/locationService';
import { broadcastEmergencySOS, broadcastTripUpdate, broadcastSystemNotification, broadcastTimeHistoryUpdate, subscribeToSystemNotifications, fetchSystemNotificationsFromDB, subscribeToStops, fetchLiveStops, fetchCloudUserRegistry, isInternalRegistryNotification, onCloudRegistryUpdate, clearSystemNotification, clearAllSystemNotifications, subscribeToStaffLeave } from '../../services/supabase';
import { studentRosterStore, BusStudent } from '../../services/studentStore';
import { LocationPermissionBanner, LocationPermissionModal } from '../../components/LocationPermissionModal';
import { NotificationPermissionBanner } from '../../components/NotificationPermissionModal';
import { notificationService } from '../../services/notificationService';
import { authStorage } from '../../services/authStorage';
import { hideSplash } from '../../services/splashService';
import { Stop, SystemNotification, GPSCoordinate, timeHistoryStore, EmergencyType, EmergencyAlert, MASTER_BUSES, MASTER_ROUTES, MASTER_STOPS, INITIAL_STOPS, MASTER_STUDENTS, MASTER_STAFF_COMMUTERS } from '@college-bus/shared';
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
  Bell,
  Circle,
  Navigation,
  Users,
  Gauge,
  ShieldAlert,
  User,
  Play,
  CheckCircle2,
  Square,
  Phone,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Check,
  X,
  LogOut,
  MapPin,
  Clock,
  Compass,
} from 'lucide-react-native';

type DriverTab = 'nav' | 'students' | 'cockpit' | 'sos' | 'profile';

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

export default function DriverDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<DriverTab>('nav');
  const [shift, setShift] = useState<'morning' | 'evening'>(() => {
    const hr = new Date().getHours();
    return hr >= 13 ? 'evening' : 'morning';
  });
  const [isTripActive, setIsTripActive] = useState(false);
  const [useSimulation, setUseSimulation] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLocationPermanentlyDenied, setIsLocationPermanentlyDenied] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean | null>(null);
  const [showPermModal, setShowPermModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [driverBusNumber, setDriverBusNumber] = useState('BUS-01');

  useEffect(() => {
    hideSplash();
  }, []);

  // System Broadcasts from Admin / Transport Control
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

  const [driverProfile, setDriverProfile] = useState({
    id: 'dr1',
    name: 'Mr. B. Moorthi',
    employeeId: 'EMP-DRV-01',
    phone: '+91 9894668646',
    licenseNumber: 'TN-67-2015-001',
    assignedBusId: 'b1',
    busNumber: 'BUS-01',
    routeId: 'r1',
    registrationNumber: 'TN 67 AM 9785',
    routeName: 'Route 1 (Old Bus Stand, RJPM ➔ RIT)',
    role: 'Driver',
  });

  useEffect(() => {
    const loadSavedDriver = async () => {
      try {
        const session = await authStorage.getSession();
        const parsed = (session && session.role === 'driver' && session.user)
          ? session.user as any
          : null;

        // Fetch dynamic cloud registry and stops on launch
        fetchCloudUserRegistry(true).then(() => {
          loadPassengersForBus();
        }).catch(() => {});

        if (parsed) {
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

          const bId = parsed.bus_id || parsed.busId || parsed.assigned_bus_id || parsed.assignedBusId || parsed.bus?.id || 'b1';
          const busObj = allBuses.find(b =>
            (b.id && (b.id === bId || b.bus_number === parsed.bus_number || b.bus_number === parsed.busNumber)) ||
            (b.assigned_driver_id && (b.assigned_driver_id === parsed.id || b.assigned_driver_id === parsed.employee_id))
          );
          const bNum = parsed.bus?.bus_number || parsed.bus_number || parsed.busNumber || busObj?.bus_number || 'BUS-01';
          const rId = parsed.route_id || parsed.routeId || parsed.route?.id || busObj?.route_id || 'r1';
          const rObj = allRoutes.find(r => r.id === rId);
          const rName = parsed.route_name || parsed.routeName || parsed.route?.route_name || rObj?.route_name || (rObj ? `${rObj.route_name}` : `Route ${rId}`);
          const regNum = parsed.bus?.registration_number || parsed.registration_number || parsed.registrationNumber || busObj?.registration_number || 'TN 67 AM 9785';

          setDriverProfile((prev) => ({
            ...prev,
            id: parsed.id || prev.id,
            name: parsed.profile?.name || parsed.name || prev.name,
            employeeId: parsed.employee_id || parsed.employeeId || prev.employeeId,
            phone: parsed.phone || parsed.profile?.phone || prev.phone,
            licenseNumber: parsed.license_number || parsed.licenseNumber || prev.licenseNumber,
            assignedBusId: bId,
            busNumber: bNum,
            routeId: rId,
            registrationNumber: regNum,
            routeName: rName,
          }));
          setDriverBusNumber(bNum);
        }
      } catch (e) {
        console.warn('Driver session load error:', e);
      }
    };
    loadSavedDriver();
  }, []);

  // Real-time Passengers (Students + Staff) Roster State for Assigned Bus
  const resolvedBusId = driverProfile.assignedBusId || 'b1';
  const [students, setStudents] = useState<BusStudent[]>(() => studentRosterStore.getStudents(resolvedBusId));
  const [staffPassengers, setStaffPassengers] = useState<any[]>([]);
  const [passengerFilterType, setPassengerFilterType] = useState<'all' | 'students' | 'staff'>('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [filterStopId, setFilterStopId] = useState('all');

  // Load only allocated students and staff for driver's bus
  const loadPassengersForBus = async () => {
    const busId = driverProfile.assignedBusId || 'b1';
    const bNum = driverProfile.busNumber || 'BUS-01';
    const cleanTarget = (busId || bNum).toLowerCase().replace(/[- ]/g, '');
    const cleanBusNum = bNum.toLowerCase().replace(/[- ]/g, '');
    const rId = (driverProfile.routeId || '').toLowerCase().trim();

    // 1. Students - Load from synced registry if available, else master data
    let allSt: any[] = [];
    try {
      const rawSt = await authStorage.getItem('bustrack_students_v1');
      if (rawSt) {
        const parsed = JSON.parse(rawSt);
        if (Array.isArray(parsed) && parsed.length > 0) allSt = parsed;
      }
    } catch {}
    if (allSt.length === 0) {
      allSt = [...MASTER_STUDENTS];
    }

    const matchedStudents: BusStudent[] = allSt
      .filter((s: any) => {
        const sBusId = (s.bus_id || s.busId || '').toLowerCase().replace(/[- ]/g, '');
        const sBusNum = (s.bus_number || s.busNumber || s.bus?.bus_number || '').toLowerCase().replace(/[- ]/g, '');
        const sRoute = (s.route_id || s.routeId || s.route?.id || '').toLowerCase().trim();
        if (sBusNum && cleanBusNum && sBusNum === cleanBusNum) return true;
        if (sBusId && cleanTarget && sBusId === cleanTarget) return true;
        if (sRoute && rId && sRoute === rId) return true;
        return false;
      })
      .map((s: any, idx: number) => ({
        id: s.id || `s_${idx}`,
        name: s.profile?.name || s.name || 'Student',
        rollNumber: s.register_number || s.rollNumber || s.roll_number || 'N/A',
        department: s.department || 'B.Tech Information Tech.',
        year: s.year || 3,
        section: s.section || 'A',
        boardingStopId: s.boarding_stop_id || s.boardingStopId || 'st1',
        boardingStopName: s.boarding_stop?.stop_name || s.boardingStopName || 'Assigned Stop',
        phone: s.profile?.phone || s.phone || '+91 98421 00000',
        email: s.profile?.email || s.email || '',
        busId: s.bus_id || s.busId || busId,
        busNumber: s.bus_number || s.busNumber || bNum,
        routeId: s.route_id || s.routeId || rId,
        isBoarded: false,
        isOnLeave: Boolean(s.is_on_leave || s.isOnLeave),
        leaveDate: s.leave_date || s.leaveDate,
        leaveReason: s.leave_reason || s.leaveReason,
        avatarBg: '#1e3a8a',
      }));

    setStudents(matchedStudents);

    // 2. Staff Commuters - Load from synced registry if available, else master data
    let allStaff: any[] = [];
    try {
      const rawSc = await authStorage.getItem('bustrack_staff_commuters_v1');
      if (rawSc) {
        const parsed = JSON.parse(rawSc);
        if (Array.isArray(parsed) && parsed.length > 0) allStaff = parsed;
      }
    } catch {}
    if (allStaff.length === 0) {
      allStaff = [...MASTER_STAFF_COMMUTERS];
    }

    const matchedStaff = allStaff
      .filter((sc: any) => {
        const scBusId = (sc.bus_id || sc.busId || '').toLowerCase().replace(/[- ]/g, '');
        const scBusNum = (sc.bus_number || sc.busNumber || sc.bus?.bus_number || '').toLowerCase().replace(/[- ]/g, '');
        const scRoute = (sc.route_id || sc.routeId || sc.route?.id || '').toLowerCase().trim();
        if (scBusNum && cleanBusNum && scBusNum === cleanBusNum) return true;
        if (scBusId && cleanTarget && scBusId === cleanTarget) return true;
        if (scRoute && rId && scRoute === rId) return true;
        return false;
      })
      .map((sc: any, idx: number) => ({
        id: sc.id || `sc_${idx}`,
        name: sc.profile?.name || sc.name || 'Faculty Member',
        staffId: sc.employee_id || sc.staffId || 'FAC',
        department: sc.department || 'Academic Department',
        designation: sc.designation || 'Staff Commuter',
        boardingStopId: sc.boarding_stop_id || sc.boardingStopId || 'st1',
        boardingStopName: typeof sc.boarding_stop === 'object' ? sc.boarding_stop?.stop_name : (sc.boardingStopName || sc.boarding_stop || 'Assigned Stop'),
        phone: sc.profile?.phone || sc.phone || '+91 94432 00000',
        email: sc.profile?.email || sc.email || '',
        busId: sc.bus_id || sc.busId || busId,
        busNumber: sc.bus_number || sc.busNumber || bNum,
        isBoarded: false,
        isOnLeave: Boolean(sc.is_on_leave || sc.isOnLeave),
        leaveDate: sc.leave_date || sc.leaveDate,
        leaveReason: sc.leave_reason || sc.leaveReason,
        avatarBg: '#7c3aed',
      }));

    setStaffPassengers(matchedStaff);
  };

  // Sync with Admin additions / removals in real-time for driver's assigned bus
  useEffect(() => {
    loadPassengersForBus();
    const unsubscribe = studentRosterStore.subscribe(() => {
      loadPassengersForBus();
    });
    return unsubscribe;
  }, [driverProfile.assignedBusId, driverProfile.busNumber, driverProfile.routeId]);

  // Live Sync with Admin Web updates (Routes, Buses, Stops, Driver Assignment & Passengers)
  useEffect(() => {
    const unsubRegistry = onCloudRegistryUpdate((payload) => {
      if (!payload) return;

      // 1. Update driver profile if admin changed assigned bus or route
      if (Array.isArray(payload.drivers)) {
        const cleanName = (driverProfile.name || '').trim().toLowerCase();
        const cleanPhone = (driverProfile.phone || '').replace(/\D/g, '');
        const matchedD = payload.drivers.find((d: any) =>
          d.id === driverProfile.id ||
          (d.employee_id && d.employee_id === driverProfile.employeeId) ||
          (d.profile?.name && d.profile.name.trim().toLowerCase() === cleanName) ||
          (d.phone && d.phone.replace(/\D/g, '') === cleanPhone)
        );

        if (matchedD) {
          const md = matchedD as any;
          const allB = Array.isArray(payload.buses) && payload.buses.length > 0 ? payload.buses : MASTER_BUSES;
          const allR = Array.isArray(payload.routes) && payload.routes.length > 0 ? payload.routes : MASTER_ROUTES;
          const bId = md.bus_id || md.busId || md.assigned_bus_id || driverProfile.assignedBusId;
          const busObj = allB.find((b: any) => b.id === bId || b.bus_number === (md.bus_number || md.busNumber));
          const bNum = md.bus?.bus_number || md.bus_number || md.busNumber || busObj?.bus_number || driverProfile.busNumber;
          const rId = md.route_id || md.routeId || busObj?.route_id || driverProfile.routeId;
          const rObj = allR.find((r: any) => r.id === rId);
          const rName = md.route_name || md.routeName || md.route?.route_name || rObj?.route_name || driverProfile.routeName;
          const regNum = md.bus?.registration_number || md.registration_number || busObj?.registration_number || driverProfile.registrationNumber;

          setDriverProfile((prev) => ({
            ...prev,
            name: md.profile?.name || md.name || prev.name,
            phone: md.phone || md.profile?.phone || prev.phone,
            assignedBusId: bId,
            busNumber: bNum,
            routeId: rId,
            routeName: rName,
            registrationNumber: regNum,
          }));
          setDriverBusNumber(bNum);
        }
      }

      // 2. Update stops if admin modified stops
      if (Array.isArray(payload.stops) && payload.stops.length > 0) {
        setAllStops(payload.stops);
      }

      // 3. Immediately refresh passengers list for driver's bus
      loadPassengersForBus();
    });

    const unsubStaffLeave = subscribeToStaffLeave((leavePayload) => {
      if (!leavePayload) return;
      setStaffPassengers((prev) =>
        prev.map((sp) =>
          sp.id === leavePayload.commuterId || sp.staffId === leavePayload.commuterId
            ? { ...sp, isOnLeave: leavePayload.isOnLeave }
            : sp
        )
      );
    });

    return () => {
      unsubRegistry();
      unsubStaffLeave();
    };
  }, [driverProfile.id, driverProfile.employeeId, driverProfile.name, driverProfile.phone, driverProfile.assignedBusId, driverProfile.busNumber, driverProfile.routeId]);

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

  // Dynamic route stops based on driver's assigned route
  const driverRouteStops: Stop[] = React.useMemo(() => {
    const rId = driverProfile.routeId || 'r1';
    const isRoute033Or1 = rId === 'r1' || rId === 'r33' || rId === 'r033' || rId === 'route_033' || (driverProfile.routeName && (driverProfile.routeName.includes('033') || driverProfile.routeName.includes('Route 1')));
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
  }, [allStops, driverProfile.routeId, driverProfile.routeName]);

  // Active stops sequence based on shift
  const currentStops = React.useMemo(() => {
    const baseStops = [...driverRouteStops].sort((a, b) => (a.stop_order ?? 0) - (b.stop_order ?? 0));
    if (shift === 'evening') {
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
  }, [driverRouteStops, shift]);

  // Live Telemetry state
  const [currentLoc, setCurrentLoc] = useState<GPSCoordinate | null>(() => {
    const isEve = new Date().getHours() >= 13;
    return isEve
      ? { latitude: 9.4520, longitude: 77.5535, speed: 0, heading: 215, accuracy: 3.5 }
      : { latitude: 9.4475, longitude: 77.5450, speed: 0, heading: 42, accuracy: 3.5 };
  });
  const [distanceTravelledKm, setDistanceTravelledKm] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentStopIdx, setCurrentStopIdx] = useState(0);

  const [completedStopIds, setCompletedStopIds] = useState<string[]>([]);
  const [driverDeviceLoc, setDriverDeviceLoc] = useState<GPSCoordinate | null>(null);
  const [dismissNotifBanner, setDismissNotifBanner] = useState(false);

  // Trip Summary data
  const [tripSummary, setTripSummary] = useState({
    duration: '00:00',
    distance: '0.00 km',
    avgSpeed: 0,
    startTime: '',
    endTime: '',
  });

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);
  const unreadNotifCount = (systemBroadcasts || []).filter((n) => n && n.id && !readNotifIds.includes(n.id)).length;

  // Restore persisted read notification IDs on mount
  useEffect(() => {
    authStorage.getItem('bustrack_driver_read_notifs').then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setReadNotifIds(parsed);
        } catch {}
      }
    }).catch(() => {});
  }, []);

  const markAllNotificationsAsRead = () => {
    const allIds = (systemBroadcasts || []).map((n) => n.id);
    setReadNotifIds(allIds);
    authStorage.setItem('bustrack_driver_read_notifs', JSON.stringify(allIds)).catch(() => {});
    setShowNotifModal(false);
  };

  const markSingleNotificationRead = (notifId: string) => {
    setReadNotifIds((prev) => {
      const updated = prev.includes(notifId) ? prev : [...prev, notifId];
      authStorage.setItem('bustrack_driver_read_notifs', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const handleClearAllNotifications = async () => {
    const allIds = (systemBroadcasts || []).map((n) => n.id);
    setSystemBroadcasts([]);
    await clearAllSystemNotifications(allIds);
  };

  const handleClearSingleNotification = async (notifId: string) => {
    setSystemBroadcasts((prev) => prev.filter((n) => n.id !== notifId));
    await clearSystemNotification(notifId);
  };

  const timerRef = useRef<any>(null);

  // Continuously track driver device GPS when trip is in standby (shows Driver Blue Dot before trip start / after finish)
  useEffect(() => {
    let isMounted = true;
    locationTracker.getCurrentPosition().then((pos) => {
      if (isMounted && pos) {
        setDriverDeviceLoc(pos);
      }
    }).catch(() => {});

    const devLocTimer = setInterval(async () => {
      if (!isTripActive && isMounted) {
        const pos = await locationTracker.getCurrentPosition().catch(() => null);
        if (pos && isMounted) {
          setDriverDeviceLoc(pos);
        }
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(devLocTimer);
    };
  }, [isTripActive]);

  // Check location and notification permissions on load and subscribe to admin broadcasts
  useEffect(() => {
    checkPermissionStatus();
    checkNotificationPermissionStatus();

    const unsubNotifs = subscribeToSystemNotifications((notif: SystemNotification) => {
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

      notificationService.sendPushNotification(
        `📢 ${notif.title}`,
        notif.message,
        notif.type || 'broadcast'
      );
    });

    // Fetch announcements from Supabase DB and local storage
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

    // Initial fetch on mount
    syncAnnouncements();

    // Polling sync every 3.5 seconds
    const notifPollTimer = setInterval(() => {
      syncAnnouncements();
    }, 3500);

    // Foreground sync when app is reopened or focused
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncAnnouncements();
      }
    });

    return () => {
      unsubNotifs();
      clearInterval(notifPollTimer);
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
        '🔔 Driver Notifications Active',
        'You will now receive instant SOS broadcast alerts and route dispatch updates in your notification bar.'
      );
    }
  };

  // Trip timer stopwatch
  useEffect(() => {
    if (isTripActive) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTripActive]);

  const checkPermissionStatus = async () => {
    try {
      const result = await locationTracker.checkPermissions();
      if (result.granted) {
        setHasPermission(true);
        setIsLocationPermanentlyDenied(false);
      } else {
        setHasPermission(false);
        setIsLocationPermanentlyDenied(result.canAskAgain === false && result.foregroundStatus === 'denied');
      }
    } catch {
      setHasPermission(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      const res = await locationTracker.requestForegroundPermissionDetailed();
      if (res.granted) {
        await locationTracker.requestBackgroundPermission();
        setHasPermission(true);
        setIsLocationPermanentlyDenied(false);
        Alert.alert('✅ GPS Access Granted', 'Hardware location sensor is enabled.');
      } else {
        setHasPermission(false);
        if (res.canAskAgain === false) {
          setIsLocationPermanentlyDenied(true);
        }
      }
    } catch {
      setHasPermission(false);
    }
  };

  const formatTimer = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTrip = async () => {
    if (!hasPermission) {
      const res = await locationTracker.requestForegroundPermissionDetailed();
      if (!res.granted) {
        if (res.canAskAgain === false) {
          setIsLocationPermanentlyDenied(true);
        }
        setShowPermModal(true);
        return;
      }
      setHasPermission(true);
      setIsLocationPermanentlyDenied(false);
    }

    const busId = driverProfile.assignedBusId || (driverProfile.id.startsWith('dr') ? 'b' + driverProfile.id.replace('dr', '') : 'b1');
    const tripId = 'trip_' + Date.now();

    setDistanceTravelledKm(0);
    setElapsedSeconds(0);
    setCurrentStopIdx(0);
    setCompletedStopIds([]);

    const success = await locationTracker.startTracking({
      busId,
      tripId,
      busNumber: driverProfile.busNumber || 'BUS-01',
      driverName: driverProfile.name || 'Mr. B. Moorthi',
      shift,
      useSimulation: false,
      onLocationUpdate: (coord, distKm) => {
        setCurrentLoc(coord);
        setDistanceTravelledKm(distKm);

        // Auto-advance stop checklist and passenger boarding when physically reaching stops
        currentStops.slice(0, 5).forEach((stop, sIdx) => {
          const d = calculateDistanceKm(coord.latitude, coord.longitude, stop.latitude, stop.longitude);
          if (d <= 0.08 && sIdx > 0) {
            setCompletedStopIds((prev) => {
              if (prev.includes(stop.id)) return prev;
              const nextCompleted = [...prev, stop.id];
              broadcastTripUpdate({
                busId,
                isTripActive: true,
                currentStopIdx: Math.max(sIdx, currentStopIdx),
                completedStopIds: nextCompleted,
                shift,
              });
              return nextCompleted;
            });
            setCurrentStopIdx((prev) => Math.max(prev, sIdx));
          }
        });
      },
      onError: (err) => {
        Alert.alert('GPS Notice', err);
      },
    });

    if (success) {
      setIsTripActive(true);
      broadcastTripUpdate({
        busId,
        isTripActive: true,
        currentStopIdx: 0,
        completedStopIds: [],
        shift,
      });

      // Broadcast Trip Started Notification to All Passengers (Student & Staff) and Transport Admin
      try {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const startPointName = shift === 'evening' ? 'RIT College Campus' : 'Rajapalayam New Bus Stand';
        const destName = shift === 'evening' ? 'Rajapalayam New Bus Stand' : 'RIT College Campus';
        const notifTitle = `🚌 ${driverProfile.busNumber || 'BUS-01'} Trip Started — ${shift === 'evening' ? 'Evening Return' : 'Morning Pickup'}`;
        const notifMsg = `Driver ${driverProfile.name || 'Mr. B. Moorthi'} has departed ${startPointName} at ${timeStr}. Live GPS tracking is active. Estimated arrival at ${destName}.`;

        const tripStartNotif: SystemNotification = {
          id: 'trip_start_' + Date.now(),
          title: notifTitle,
          message: notifMsg,
          type: 'trip',
          target_type: 'bus',
          target_id: busId,
          created_at: new Date().toISOString(),
        };

        // 1. Broadcast to all connected passengers and admin
        broadcastSystemNotification(tripStartNotif);

        // 2. Also fire a native push notification directly on the driver's device
        notificationService.sendPushNotification(
          notifTitle,
          notifMsg,
          'trip_start',
          'trip_start'
        );
      } catch (notifErr) {
        console.warn('Trip start broadcast notice:', notifErr);
      }

      // Record Start Time in Time History for Admin Time History page
      try {
        const startParams = {
          busId,
          busNumber: driverProfile.busNumber || 'BUS-01',
          registrationNumber: driverProfile.registrationNumber || 'TN 67 AM 9785',
          driverId: driverProfile.id || 'dr1',
          driverName: driverProfile.name || 'Mr. B. Moorthi',
          driverPhone: driverProfile.phone || '+91 9894668646',
          routeName: driverProfile.routeName || 'Route 1 (Old Bus Stand, RJPM ➔ RIT)',
          startLocation: shift === 'evening' ? 'RIT College Campus' : 'Old Bus Stand, Rajapalayam',
          destination: shift === 'evening' ? 'Old Bus Stand, Rajapalayam' : 'RIT College Campus',
          shift,
        };
        timeHistoryStore.recordTripStart(startParams);
        broadcastTimeHistoryUpdate('start', startParams);
      } catch (e) {
        console.warn('Time history start recording note:', e);
      }
    }
  };

  const handleMarkStopReached = (stopId: string, idx: number) => {
    if (!completedStopIds.includes(stopId)) {
      const nextCompleted = [...completedStopIds, stopId];
      setCompletedStopIds(nextCompleted);
      setCurrentStopIdx(idx + 1);
      broadcastTripUpdate({
        busId: 'b1',
        isTripActive: true,
        currentStopIdx: idx + 1,
        completedStopIds: nextCompleted,
      });
    }
  };

  const handleEndTrip = () => {
    const doComplete = () => {
      // Capture exact location where End Trip was clicked
      const finalLoc: GPSCoordinate = currentLoc || locationTracker.getLastCoord() || {
        latitude: shift === 'evening' ? 9.4475 : 9.4520,
        longitude: shift === 'evening' ? 77.5450 : 77.5535,
        speed: 0,
        heading: 0,
        accuracy: 3.5,
        timestamp: new Date().toISOString(),
      };

      // Decouple driver's device GPS from the bus and pin bus location at final terminal location
      locationTracker.stopTracking(finalLoc);
      setCurrentLoc({
        ...finalLoc,
        speed: 0,
        timestamp: new Date().toISOString(),
      });
      setIsTripActive(false);
      setCurrentStopIdx(0);
      setCompletedStopIds([]);

      const avgSpd =
        elapsedSeconds > 0
          ? Math.round(distanceTravelledKm / (Math.max(1, elapsedSeconds) / 3600))
          : 0;

      const endFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const startFormatted = new Date(Date.now() - Math.max(1, elapsedSeconds) * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setTripSummary({
        duration: formatTimer(elapsedSeconds),
        distance: formatDistance(distanceTravelledKm),
        avgSpeed: avgSpd,
        startTime: startFormatted,
        endTime: endFormatted,
      });

      // Broadcast Arrival / Finish Trip Notification to Passengers and Admin
      try {
        const actualBusId = driverProfile.id.startsWith('dr') ? 'b' + driverProfile.id.replace('dr', '') : 'b1';
        const destName = shift === 'evening' ? 'Rajapalayam New Bus Stand' : 'RIT College Campus';
        const notifTitle = `🏁 ${driverProfile.busNumber || 'BUS-01'} Trip Completed — ${shift === 'evening' ? 'Evening Return' : 'Morning Pickup'}`;
        const notifMsg = `Bus ${driverProfile.busNumber || 'BUS-01'} has safely arrived at ${destName} at ${endFormatted}. Total duration: ${formatTimer(elapsedSeconds)}, Distance: ${formatDistance(distanceTravelledKm)}.`;

        const tripEndNotif: SystemNotification = {
          id: 'trip_end_' + Date.now(),
          title: notifTitle,
          message: notifMsg,
          type: 'trip',
          target_type: 'bus',
          target_id: actualBusId,
          created_at: new Date().toISOString(),
        };

        // 1. Broadcast to all connected passengers and admin
        broadcastSystemNotification(tripEndNotif);

        // 2. Also fire a native push notification directly on the driver's device
        notificationService.sendPushNotification(
          notifTitle,
          notifMsg,
          'trip_end',
          'trip_status'
        );
      } catch (notifErr) {
        console.warn('Trip end broadcast notice:', notifErr);
      }

      // Record End Time in Time History for Admin Time History page
      try {
        const actualBusId = driverProfile.id.startsWith('dr') ? 'b' + driverProfile.id.replace('dr', '') : 'b1';
        const endParams = {
          busId: actualBusId,
          busNumber: driverProfile.busNumber || 'BUS-01',
          registrationNumber: driverProfile.registrationNumber || 'TN 67 AM 9785',
          driverId: driverProfile.id || 'dr1',
          driverName: driverProfile.name || 'Mr. B. Moorthi',
          driverPhone: driverProfile.phone || '+91 9894668646',
          routeName: driverProfile.routeName || 'Route 1 (Old Bus Stand, RJPM ➔ RIT)',
          startLocation: shift === 'evening' ? 'RIT College Campus' : 'Old Bus Stand, Rajapalayam',
          destination: shift === 'evening' ? 'Old Bus Stand, Rajapalayam' : 'RIT College Campus',
          shift,
          customEndTime: endFormatted,
          duration: formatTimer(elapsedSeconds),
          distanceKm: parseFloat(distanceTravelledKm.toFixed(2)),
          avgSpeedKmh: avgSpd,
        };
        timeHistoryStore.recordTripEnd(endParams);
        broadcastTimeHistoryUpdate('end', endParams);
      } catch (e) {
        console.warn('Time history end recording note:', e);
      }

      setDistanceTravelledKm(0);
      setElapsedSeconds(0);
      setShowSummaryModal(true);
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Complete this bus trip and finalize driver route log?');
      if (confirmed) {
        doComplete();
      }
    } else {
      Alert.alert(
        'End Trip Confirmation',
        'Complete this bus trip and finalize driver route log?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm & Complete',
            style: 'destructive',
            onPress: doComplete,
          },
        ]
      );
    }
  };

  const handleDispatchSOS = async (type: EmergencyType, message: string) => {
    const alertPayload: EmergencyAlert = {
      id: 'sos_' + Date.now(),
      bus_id: 'b1',
      driver_id: 'dr1',
      type,
      message,
      latitude: currentLoc?.latitude || (shift === 'evening' ? 9.4520 : 9.4475),
      longitude: currentLoc?.longitude || (shift === 'evening' ? 77.5535 : 77.5450),
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    await broadcastEmergencySOS(alertPayload);

    Alert.alert(
      '🚨 SOS BROADCAST ACTIVE',
      `Emergency alert dispatched to Campus Security & Transport Admins.\n\nType: ${type.toUpperCase()}\nLocation: [${Number(currentLoc?.latitude || 9.4475).toFixed(4)}, ${Number(currentLoc?.longitude || 77.5450).toFixed(4)}]`
    );
  };

  const handleCallHelpline = (phone: string = '+919443012345') => {
    Linking.openURL(`tel:${phone}`);
  };

  const signal = getSignalQuality(currentLoc?.accuracy);

  // Dynamic Next Stop & Proximity Calculations
  const isAllStopsReached = isTripActive && (currentStopIdx >= currentStops.length - 1 || completedStopIds.length >= currentStops.length);
  let targetStopIdx = Math.min(Math.max(0, currentStopIdx), Math.max(0, currentStops.length - 1));
  if (currentLoc && currentStopIdx === 0 && !isTripActive && currentStops.length > 1) {
    targetStopIdx = 1; // When at start terminal ready to depart, next target is stop #2
  }
  const nextStop = currentStops[targetStopIdx] || currentStops[0] || MORNING_ROUTE_STOPS[0];
  const isFinalStop = targetStopIdx === currentStops.length - 1;
  const rawDist = currentLoc && nextStop && typeof currentLoc.latitude === 'number' && typeof nextStop.latitude === 'number'
    ? calculateDistanceKm(currentLoc.latitude, currentLoc.longitude, nextStop.latitude, nextStop.longitude)
    : 1.4;

  const isAtStop = (nextStop && completedStopIds.includes(nextStop.id)) || rawDist <= 0.08 || isAllStopsReached;
  const distToNextStop = isAtStop ? 0 : (rawDist < 0.05 && currentStopIdx === 0 && !isTripActive ? 1.4 : rawDist);

  const nextStopETA = calculateDynamicETA(
    distToNextStop,
    Number(currentLoc?.speed || 0),
    0,
    nextStop?.estimated_arrival || '07:45 AM'
  );

  // Automatic Boarding Status: When bus crosses or reaches a stop, all students for that stop are marked as Boarded
  const getStudentBoardingStatus = (student: BusStudent) => {
    if (!student) {
      return {
        status: 'awaiting',
        label: '⏳ AWAITING',
        detail: 'Waiting at Stop',
        badgeStyle: styles.boardBadgePending,
        textStyle: styles.boardBadgeTextPending,
      };
    }
    if (student.isOnLeave) {
      return {
        status: 'on_leave',
        label: '⛔ ON LEAVE',
        detail: 'Absent Today',
        badgeStyle: styles.boardBadgeLeave,
        textStyle: styles.boardBadgeTextLeave,
      };
    }

    const stopOrderMap: Record<string, number> = {
      st1: 0,
      st2: 1,
      st3: 2,
      st4: 3,
      st5: 4,
      stop_1: 0,
      stop_2: 1,
      stop_3: 2,
      stop_4: 3,
      stop_5: 4,
    };
    const bStopId = student.boardingStopId || 'st1';
    const studentStopIdx = stopOrderMap[bStopId] ?? 0;
    const isStopPassed =
      completedStopIds.includes(bStopId) ||
      currentStopIdx > studentStopIdx ||
      (isTripActive && currentStopIdx >= 1 && studentStopIdx === 0);

    if (isStopPassed) {
      return {
        status: 'boarded',
        label: '✓ BOARDED',
        detail: 'Bus Passed Stop',
        badgeStyle: styles.boardBadgeActive,
        textStyle: styles.boardBadgeTextActive,
      };
    }

    if (isTripActive && currentStopIdx === studentStopIdx) {
      return {
        status: 'approaching',
        label: '⚡ APPROACHING',
        detail: 'Arriving at Stop',
        badgeStyle: styles.boardBadgeApproaching,
        textStyle: styles.boardBadgeTextApproaching,
      };
    }

    return {
      status: 'awaiting',
      label: '⏳ AWAITING',
      detail: 'Waiting at Stop',
      badgeStyle: styles.boardBadgePending,
      textStyle: styles.boardBadgeTextPending,
    };
  };

  const onLeaveStudents = (students || []).filter((s) => s && s.isOnLeave);
  const onLeaveStaff = (staffPassengers || []).filter((sc) => sc && sc.isOnLeave);
  const onLeaveCount = onLeaveStudents.length + onLeaveStaff.length;

  const boardedStudentsCount = (students || []).filter(
    (s) => s && !s.isOnLeave && getStudentBoardingStatus(s).status === 'boarded'
  ).length;

  const awaitingStudentsCount = (students || []).filter(
    (s) => s && !s.isOnLeave && getStudentBoardingStatus(s).status !== 'boarded'
  ).length;

  const displayedStudents = (students || []).filter((s) => {
    if (!s) return false;
    const sName = (s.name || s.profile?.name || '').toLowerCase();
    const sRoll = (s.rollNumber || s.register_number || '').toLowerCase();
    const sDept = (s.department || '').toLowerCase();
    const q = (studentSearch || '').toLowerCase();
    const matchesSearch = !q || sName.includes(q) || sRoll.includes(q) || sDept.includes(q);
    
    if (filterStopId === 'on_leave') {
      return matchesSearch && !!s.isOnLeave;
    }
    const matchesStop = filterStopId === 'all' || s.boardingStopId === filterStopId;
    return matchesSearch && matchesStop;
  });

  const displayedStaff = (staffPassengers || []).filter((sc) => {
    if (!sc) return false;
    const scName = (sc.name || sc.profile?.name || '').toLowerCase();
    const scId = (sc.staffId || sc.employee_id || '').toLowerCase();
    const scDept = (sc.department || '').toLowerCase();
    const q = (studentSearch || '').toLowerCase();
    const matchesSearch = !q || scName.includes(q) || scId.includes(q) || scDept.includes(q);
    
    if (filterStopId === 'on_leave') {
      return matchesSearch && !!sc.isOnLeave;
    }
    const matchesStop = filterStopId === 'all' || sc.boardingStopId === filterStopId;
    return matchesSearch && matchesStop;
  });

  const studentsAtNextStopOnLeave = (students || []).filter(
    (s) => s && nextStop && s.boardingStopId === nextStop.id && s.isOnLeave
  );

  const [confirmingSOSType, setConfirmingSOSType] = useState<EmergencyType | null>(null);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapReason, setSwapReason] = useState('');

  const handleRequestSwap = (reason: string) => {
    Alert.alert('Standby Request Submitted', 'Transport office notified: ' + (reason || 'Vehicle substitution'));
    setShowSwapModal(false);
    setSwapReason('');
  };

  const handleTriggerSOS = (type: EmergencyType, msg: string) => {
    handleDispatchSOS(type, msg);
  };

  const toggleAttendance = (studentId: string) => {
    const st = students.find((s) => s.id === studentId);
    if (!st) return;
    studentRosterStore.setStudentLeave(
      studentId,
      !st.isOnLeave,
      st.isOnLeave ? undefined : 'Driver marked leave',
      new Date().toISOString().split('T')[0]
    );
  };

  const toggleStaffAttendance = (staffId: string) => {
    setStaffPassengers((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, isOnLeave: !s.isOnLeave } : s))
    );
  };

  const staffBoardingStatus = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    staffPassengers.forEach((sc) => {
      map[sc.id] = completedStopIds.includes(sc.boardingStopId);
    });
    return map;
  }, [staffPassengers, completedStopIds]);

  const driverTabs: TabItem<DriverTab>[] = [
    { id: 'nav', label: 'Live Nav', icon: Navigation },
    { id: 'students', label: 'Passengers', icon: Users, badge: students.length + staffPassengers.length },
    { id: 'cockpit', label: 'Cockpit', icon: Gauge },
    { id: 'sos', label: 'SOS', icon: ShieldAlert, isEmergency: true },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* TOP HEADER */}
      <AppHeader
        title="RITBusTrack Driver"
        subtitle={`${driverBusNumber || 'BUS-01'} · ${driverProfile.routeName || 'Route 1'}`}
        roleBadge="DRIVER"
        isLive={isTripActive}
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
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Transport Broadcasts</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    Announcements from Admin & Dispatch
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
                  <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No broadcasts</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>Dispatcher and campus alerts will appear here.</Text>
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

      {/* CONFIRM EMERGENCY SOS MODAL */}
      <Modal
        visible={!!confirmingSOSType}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmingSOSType(null)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={[styles.confirmModalCard, { backgroundColor: colors.surface, borderColor: colors.emergency }]}>
            <View style={[styles.confirmModalIconWrap, { backgroundColor: colors.emergencyBg }]}>
              <ShieldAlert size={32} color={colors.emergency} />
            </View>
            <Text style={[styles.confirmModalTitle, { color: colors.emergency }]}>
              CONFIRM EMERGENCY ALERT
            </Text>
            <Text style={[styles.confirmModalDesc, { color: colors.text }]}>
              Are you sure you want to broadcast a {confirmingSOSType?.toUpperCase()} alert to the Transport Office and all passengers?
            </Text>
            <View style={styles.confirmModalBtnRow}>
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => setConfirmingSOSType(null)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                label="BROADCAST NOW"
                variant="danger"
                onPress={() => {
                  if (confirmingSOSType) {
                    handleTriggerSOS(confirmingSOSType, 'Emergency ' + confirmingSOSType.toUpperCase() + ' reported by driver.');
                    setConfirmingSOSType(null);
                  }
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MAIN VIEW CONTENT */}
      <View style={styles.mainContent}>
        {/* ================= TAB 1: LIVE NAV ================= */}
        {activeTab === 'nav' && (
          <ScrollView
            style={styles.scrollPage}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 76 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* GPS Signal Banner if needed */}
            {!hasPermission && (
              <LocationPermissionBanner
                role="driver"
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

            {/* Live Metrics HUD */}
            <View style={styles.metricsGrid}>
              <StatBadge
                label="Speed"
                value={Math.round(currentLoc?.speed || 0)}
                unit="km/h"
                style={{ flex: 1 }}
              />
              <StatBadge
                label="Distance"
                value={distanceTravelledKm.toFixed(1)}
                unit="km"
                style={{ flex: 1 }}
              />
              <StatBadge
                label="Signal"
                value={signal.label.split(' ')[0]}
                style={{ flex: 1 }}
              />
            </View>

            {/* Current & Next Stop Card */}
            <Card style={styles.hudCard} padding="lg">
              <View style={styles.stopInfoBlock}>
                <Text style={[styles.stopBlockLabel, { color: colors.textSecondary }]}>CURRENT STOP</Text>
                <Text style={[styles.stopBlockTitle, { color: colors.text }]}>
                  {currentStops[currentStopIdx]?.stop_name || 'Departing Origin'}
                </Text>
              </View>

              <View style={[styles.stopInfoDivider, { backgroundColor: colors.borderSubtle }]} />

              <View style={styles.stopInfoBlock}>
                <Text style={[styles.stopBlockLabel, { color: colors.textSecondary }]}>NEXT STOP</Text>
                <Text style={[styles.stopBlockTitle, { color: colors.text }]}>
                  {nextStop?.stop_name || 'Terminal Campus Gate'}
                </Text>
              </View>

              {/* Action Button: Large Touch Target */}
              <View style={{ marginTop: 16 }}>
                {!isTripActive ? (
                  <Button
                    label="START ROUTE"
                    onPress={handleStartTrip}
                    size="lg"
                    variant="primary"
                    icon={<Play size={18} color={colors.primaryContrast} />}
                    fullWidth
                  />
                ) : (
                  <View style={{ gap: 8 }}>
                    <Button
                      label="ARRIVED AT NEXT STOP"
                      onPress={() => handleMarkStopReached(nextStop.id, targetStopIdx)}
                      size="lg"
                      variant="primary"
                      icon={<CheckCircle2 size={18} color={colors.primaryContrast} />}
                      fullWidth
                    />
                    <Button
                      label="END ROUTE"
                      onPress={handleEndTrip}
                      size="md"
                      variant="outline"
                      icon={<Square size={16} color={colors.text} />}
                      fullWidth
                    />
                  </View>
                )}
              </View>
            </Card>

            {/* Live Navigation Map */}
            <SectionHeader
              title="Navigation Map"
              subtitle="Broadcasting live telemetry to student mobile app"
              rightElement={
                <TouchableOpacity
                  style={[styles.simToggleBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => setUseSimulation(!useSimulation)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.simToggleText, { color: colors.textSecondary }]}>
                    {useSimulation ? 'GPS: Sim Mode' : 'GPS: Live Device'}
                  </Text>
                </TouchableOpacity>
              }
            />

            <View style={[styles.mapCardContainer, { borderColor: colors.border }]}>
              <OSMMapView
                busLocation={currentLoc}
                busNumber={driverBusNumber}
                routeNumber={driverProfile.routeName}
                stops={currentStops}
                height={240}
              />
            </View>
          </ScrollView>
        )}

        {/* ================= TAB 2: PASSENGERS ================= */}
        {activeTab === 'students' && (
          <ScrollView
            style={styles.scrollPage}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 76 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Search Input */}
            <Input
              value={studentSearch}
              onChangeText={setStudentSearch}
              placeholder="Search by student name or roll no..."
              leftIcon={<Search size={16} color={colors.textSecondary} />}
            />

            {/* Stop Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterStopId === 'all'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setFilterStopId('all')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: filterStopId === 'all' ? colors.primaryContrast : colors.textSecondary },
                  ]}
                >
                  All ({students.length + staffPassengers.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterStopId === 'on_leave'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setFilterStopId('on_leave')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: filterStopId === 'on_leave' ? colors.primaryContrast : colors.textSecondary },
                  ]}
                >
                  On Leave ({onLeaveCount})
                </Text>
              </TouchableOpacity>

              {currentStops.map((stop: Stop) => (
                <TouchableOpacity
                  key={stop.id}
                  style={[
                    styles.filterChip,
                    filterStopId === stop.id
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => setFilterStopId(stop.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: filterStopId === stop.id ? colors.primaryContrast : colors.textSecondary },
                    ]}
                  >
                    {stop.stop_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <SectionHeader
              title="Students Roster"
              subtitle={`${displayedStudents.length} students on this route`}
            />

            {/* Student Cards */}
            {displayedStudents.map((st) => {
              const bStatus = getStudentBoardingStatus(st);
              const isBoarded = bStatus.status === 'boarded';
              const isOnLeave = !!st.isOnLeave;

              return (
                <Card key={st.id} style={styles.passengerCard} padding="md">
                  <View style={styles.passengerRow}>
                    <View style={[styles.passengerAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                      <Text style={[styles.passengerAvatarText, { color: colors.text }]}>
                        {st.name ? st.name.charAt(0).toUpperCase() : 'S'}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.passengerName, { color: colors.text }]}>{st.name}</Text>
                      <Text style={[styles.passengerRoll, { color: colors.textSecondary }]}>
                        {st.rollNumber} · {st.department}
                      </Text>
                      <Text style={[styles.passengerStop, { color: colors.textMuted }]}>
                        {st.boardingStopName || 'Assigned Stop'}
                      </Text>
                    </View>

                    {isOnLeave ? (
                      <StatusChip label="ON LEAVE" variant="warning" />
                    ) : (
                      <Button
                        label={isBoarded ? 'Boarded' : 'Mark Boarded'}
                        icon={isBoarded ? <Check size={14} color={colors.primaryContrast} /> : undefined}
                        variant={isBoarded ? 'primary' : 'outline'}
                        size="sm"
                        onPress={() => toggleAttendance(st.id)}
                      />
                    )}
                  </View>
                </Card>
              );
            })}

            {/* Staff Commuters */}
            {displayedStaff.length > 0 && (
              <>
                <SectionHeader
                  title="Staff & Faculty Commuters"
                  subtitle={`${displayedStaff.length} faculty members`}
                  style={{ marginTop: 20 }}
                />

                {displayedStaff.map((sc) => {
                  const isBoarded = staffBoardingStatus[sc.id] ?? false;
                  return (
                    <Card key={sc.id} style={styles.passengerCard} padding="md">
                      <View style={styles.passengerRow}>
                        <View style={[styles.passengerAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                          <Text style={[styles.passengerAvatarText, { color: colors.text }]}>
                            {sc.name ? sc.name.charAt(0).toUpperCase() : 'F'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.passengerName, { color: colors.text }]}>{sc.name}</Text>
                          <Text style={[styles.passengerRoll, { color: colors.textSecondary }]}>
                            {sc.designation} · {sc.department}
                          </Text>
                          <Text style={[styles.passengerStop, { color: colors.textMuted }]}>
                            {sc.boardingStopName || 'Faculty Point'}
                          </Text>
                        </View>
                        {sc.isOnLeave ? (
                          <StatusChip label="ON LEAVE" variant="warning" />
                        ) : (
                          <Button
                            label={isBoarded ? 'Boarded' : 'Mark Boarded'}
                            icon={isBoarded ? <Check size={14} color={colors.primaryContrast} /> : undefined}
                            variant={isBoarded ? 'primary' : 'outline'}
                            size="sm"
                            onPress={() => toggleStaffAttendance(sc.id)}
                          />
                        )}
                      </View>
                    </Card>
                  );
                })}
              </>
            )}
          </ScrollView>
        )}

        {/* ================= TAB 3: COCKPIT HUD ================= */}
        {activeTab === 'cockpit' && (
          <ScrollView
            style={styles.scrollPage}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 76 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Prominent Cockpit Display */}
            <Card style={styles.cockpitHeroCard} padding="lg">
              <View style={styles.cockpitTopRow}>
                <View>
                  <Text style={[styles.cockpitBusText, { color: colors.text }]}>
                    {driverBusNumber || 'BUS 14'}
                  </Text>
                  <Text style={[styles.cockpitRouteText, { color: colors.textSecondary }]}>
                    {driverProfile.routeName || 'ROUTE 03'}
                  </Text>
                </View>
                <StatusChip
                  label={isTripActive ? 'ACTIVE' : 'SCHEDULED'}
                  variant={isTripActive ? 'ontime' : 'neutral'}
                  dot
                />
              </View>

              <View style={[styles.cockpitStopCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.cockpitStopLbl, { color: colors.textSecondary }]}>Current Stop</Text>
                <Text style={[styles.cockpitStopVal, { color: colors.text }]}>
                  {currentStops[currentStopIdx]?.stop_name || 'Engineering Block'}
                </Text>
              </View>

              <View style={[styles.cockpitStopCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, marginTop: 8 }]}>
                <Text style={[styles.cockpitStopLbl, { color: colors.textSecondary }]}>Next Stop</Text>
                <Text style={[styles.cockpitStopVal, { color: colors.text }]}>
                  {nextStop?.stop_name || 'Main Gate'}
                </Text>
              </View>

              {/* Large Touch Target Controls */}
              <View style={{ marginTop: 18 }}>
                {!isTripActive ? (
                  <Button
                    label="START ROUTE"
                    size="lg"
                    variant="primary"
                    icon={<Play size={20} color={colors.primaryContrast} />}
                    onPress={handleStartTrip}
                    fullWidth
                  />
                ) : (
                  <View style={{ gap: 10 }}>
                    <Button
                      label="ARRIVED"
                      size="lg"
                      variant="primary"
                      icon={<CheckCircle2 size={20} color={colors.primaryContrast} />}
                      onPress={() => handleMarkStopReached(nextStop.id, targetStopIdx)}
                      fullWidth
                    />
                    <Button
                      label="END ROUTE"
                      size="lg"
                      variant="outline"
                      icon={<Square size={18} color={colors.text} />}
                      onPress={handleEndTrip}
                      fullWidth
                    />
                  </View>
                )}
              </View>
            </Card>

            {/* Shift Switcher */}
            <View style={[styles.shiftToggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.shiftBtn, shift === 'morning' && { backgroundColor: colors.primary }]}
                onPress={() => setShift('morning')}
                activeOpacity={0.8}
              >
                <Text style={[styles.shiftBtnText, { color: shift === 'morning' ? colors.primaryContrast : colors.textSecondary, fontWeight: shift === 'morning' ? '700' : '500' }]}>
                  Morning Shift
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shiftBtn, shift === 'evening' && { backgroundColor: colors.primary }]}
                onPress={() => setShift('evening')}
                activeOpacity={0.8}
              >
                <Text style={[styles.shiftBtnText, { color: shift === 'evening' ? colors.primaryContrast : colors.textSecondary, fontWeight: shift === 'evening' ? '700' : '500' }]}>
                  Evening Shift
                </Text>
              </TouchableOpacity>
            </View>

            {/* Stops Checklist */}
            <SectionHeader title="Route Stop Sequence" subtitle={`${completedStopIds.length} of ${currentStops.length} stops cleared`} />

            <Card style={styles.checklistCard} padding="md">
              {currentStops.map((stop: Stop, idx: number) => {
                const isCleared = completedStopIds.includes(stop.id) || idx < currentStopIdx;
                const isCurrent = idx === currentStopIdx;
                return (
                  <View key={stop.id} style={styles.checklistRow}>
                    <View style={styles.checkIconWrap}>
                      {isCleared ? (
                        <CheckCircle2 size={18} color={colors.success} />
                      ) : isCurrent ? (
                        <Square size={18} color={colors.primary} />
                      ) : (
                        <Circle size={18} color={colors.border} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.checklistStopName, { color: isCleared ? colors.textSecondary : colors.text, fontWeight: isCurrent ? '700' : '500' }]}>
                        {stop.stop_name}
                      </Text>
                      <Text style={[styles.checklistStopTime, { color: colors.textMuted }]}>
                        {shift === 'evening' ? (stop.evening_time || '--') : (stop.morning_time || '--')}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          </ScrollView>
        )}

        {/* ================= TAB 4: SOS (EMERGENCY) ================= */}
        {activeTab === 'sos' && (
          <ScrollView
            style={styles.scrollPage}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 76 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Extremely Clear Emergency Header */}
            <Card variant="emergency" style={styles.sosWarningCard} padding="lg">
              <View style={styles.sosWarningHeader}>
                <ShieldAlert size={28} color={colors.emergency} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.sosWarningTitle, { color: colors.emergency }]}>
                    EMERGENCY SOS SYSTEM
                  </Text>
                  <Text style={[styles.sosWarningSub, { color: colors.text }]}>
                    Use these buttons ONLY in case of genuine transit emergencies. Dispatch alerts go to the Transport Wing immediately.
                  </Text>
                </View>
              </View>
            </Card>

            <SectionHeader
              title="Emergency Categories"
              subtitle="Select category to trigger confirmation and broadcast"
            />

            {/* Emergency Action Buttons: Large Touch Targets, Functional Red */}
            <View style={{ gap: 12, marginTop: 4 }}>
              <Button
                label="BREAKDOWN"
                size="lg"
                variant="danger"
                icon={<AlertTriangle size={22} color="#FFFFFF" />}
                onPress={() => setConfirmingSOSType('breakdown')}
                fullWidth
              />

              <Button
                label="MEDICAL EMERGENCY"
                size="lg"
                variant="danger"
                icon={<ShieldAlert size={22} color="#FFFFFF" />}
                onPress={() => setConfirmingSOSType('medical')}
                fullWidth
              />

              <Button
                label="ACCIDENT"
                size="lg"
                variant="danger"
                icon={<ShieldAlert size={22} color="#FFFFFF" />}
                onPress={() => setConfirmingSOSType('accident')}
                fullWidth
              />
            </View>

            {/* Standby Vehicle Request */}
            <SectionHeader
              title="Standby Vehicle / Driver Swap"
              subtitle="Request a substitute vehicle from transport pool"
              style={{ marginTop: 24 }}
            />

            <Button
              label="Request Standby Vehicle"
              variant="outline"
              size="md"
              onPress={() => setShowSwapModal(true)}
              fullWidth
            />
          </ScrollView>
        )}

        {/* ================= TAB 5: PROFILE ================= */}
        {activeTab === 'profile' && (
          <ScrollView
            style={styles.scrollPage}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 76 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Driver Profile Card */}
            <Card style={styles.profileCard} padding="lg">
              <View style={styles.profileHeaderRow}>
                <View style={[styles.profileAvatar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <User size={24} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.driverProfileName, { color: colors.text }]}>{driverProfile.name}</Text>
                  <Text style={[styles.driverProfileId, { color: colors.textSecondary }]}>
                    ID: {driverProfile.employeeId || 'DRV-01'} · License: {driverProfile.licenseNumber || 'DL-TN-67-2018'}
                  </Text>
                </View>
              </View>

              <View style={[styles.profileMetaGrid, { borderTopColor: colors.borderSubtle }]}>
                <View style={styles.profileMetaItem}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Assigned Bus</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>{driverBusNumber}</Text>
                </View>

                <View style={styles.profileMetaItem}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Assigned Route</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>{driverProfile.routeName}</Text>
                </View>

                <View style={styles.profileMetaItem}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Phone</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>{driverProfile.phone}</Text>
                </View>

                <View style={styles.profileMetaItem}>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Status</Text>
                  <Text style={[styles.metaValue, { color: colors.success }]}>Active Duty</Text>
                </View>
              </View>
            </Card>

            {/* Helpline Contacts */}
            <SectionHeader title="Transport Office Contacts" subtitle="Dispatch and maintenance coordinators" />

            <Card style={styles.contactCard} padding="md">
              <View style={styles.contactRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactName, { color: colors.text }]}>N. Govindaraju (Transport Incharge)</Text>
                  <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>+91 96292 84690</Text>
                </View>
                <Button
                  label="Call"
                  size="sm"
                  variant="outline"
                  icon={<Phone size={14} color={colors.text} />}
                  onPress={() => Linking.openURL('tel:+919629284690')}
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

      {/* TRIP SUMMARY MODAL */}
      <Modal
        visible={showSummaryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSummaryModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={[styles.confirmModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.confirmModalTitle, { color: colors.text }]}>Trip Completed</Text>
            <Text style={[styles.confirmModalDesc, { color: colors.textSecondary }]}>
              Shift summary logged. Total distance: {distanceTravelledKm.toFixed(1)} km.
            </Text>
            <Button
              label="Acknowledge & Close"
              variant="primary"
              size="md"
              onPress={() => {
                setShowSummaryModal(false);
                router.replace('/driver');
              }}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* SWAP / STANDBY MODAL */}
      <Modal
        visible={showSwapModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSwapModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={[styles.confirmModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.confirmModalTitle, { color: colors.text }]}>Request Standby Bus</Text>
            <Text style={[styles.confirmModalDesc, { color: colors.textSecondary }]}>
              Enter reason for requesting vehicle substitute or shift relief:
            </Text>
            <Input
              value={swapReason}
              onChangeText={setSwapReason}
              placeholder="e.g. Engine overheat at junction"
              style={{ marginBottom: 16 }}
            />
            <View style={styles.confirmModalBtnRow}>
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => setShowSwapModal(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                label="Submit Request"
                variant="primary"
                onPress={() => {
                  handleRequestSwap(swapReason);
                  setShowSwapModal(false);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* BOTTOM TAB BAR */}
      <BottomTabBar
        tabs={driverTabs}
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
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  hudCard: {
    marginBottom: 20,
  },
  stopInfoBlock: {
    paddingVertical: 4,
  },
  stopBlockLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  stopBlockTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  stopInfoDivider: {
    height: 1,
    marginVertical: 12,
  },
  simToggleBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  simToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mapCardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 20,
  },
  filterScroll: {
    marginVertical: 12,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  passengerCard: {
    marginBottom: 8,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  passengerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passengerAvatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  passengerRoll: {
    fontSize: 12,
    marginTop: 2,
  },
  passengerStop: {
    fontSize: 11,
    marginTop: 2,
  },
  cockpitHeroCard: {
    marginBottom: 16,
  },
  cockpitTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cockpitBusText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cockpitRouteText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  cockpitStopCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  cockpitStopLbl: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cockpitStopVal: {
    fontSize: 16,
    fontWeight: '700',
  },
  shiftToggleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
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
  checklistCard: {
    marginBottom: 20,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  checkIconWrap: {
    width: 24,
    alignItems: 'center',
  },
  checklistStopName: {
    fontSize: 14,
  },
  checklistStopTime: {
    fontSize: 11,
    marginTop: 2,
  },
  sosWarningCard: {
    marginBottom: 16,
  },
  sosWarningHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sosWarningTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sosWarningSub: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverProfileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  driverProfileId: {
    fontSize: 13,
    marginTop: 3,
  },
  profileMetaGrid: {
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 10,
  },
  profileMetaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  contactCard: {
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
  },
  contactPhone: {
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
  confirmModalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    alignSelf: 'center',
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmModalDesc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmModalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  boardBadgePending: {
    backgroundColor: '#F2F2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  boardBadgeTextPending: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777777',
  },
  boardBadgeLeave: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  boardBadgeTextLeave: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  boardBadgeActive: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  boardBadgeTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  boardBadgeApproaching: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  boardBadgeTextApproaching: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
});
