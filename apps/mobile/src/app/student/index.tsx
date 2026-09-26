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
} from '../../services/supabase';
import { GPSCoordinate, INITIAL_STOPS, SIMULATION_ROUTE_A, EmergencyAlert, SystemNotification, Stop } from '@college-bus/shared';
import { studentRosterStore, BusStudent } from '../../services/studentStore';
import { authStorage } from '../../services/authStorage';

const MORNING_ROUTE_STOPS: Stop[] = [
  {
    id: 'stop_1',
    route_id: 'r1',
    stop_name: 'Rajapalayam New Bus Stand',
    latitude: 9.4475,
    longitude: 77.5450,
    stop_order: 1,
    estimated_arrival: '07:45 AM',
    status: 'active',
  },
  {
    id: 'stop_2',
    route_id: 'r1',
    stop_name: 'Gandhi Statue Junction',
    latitude: 9.4490,
    longitude: 77.5472,
    stop_order: 2,
    estimated_arrival: '07:52 AM',
    status: 'active',
  },
  {
    id: 'stop_3',
    route_id: 'r1',
    stop_name: 'PACR Mill Circle',
    latitude: 9.4505,
    longitude: 77.5495,
    stop_order: 3,
    estimated_arrival: '08:00 AM',
    status: 'active',
  },
  {
    id: 'stop_4',
    route_id: 'r1',
    stop_name: 'Samsigapuram Road Turn',
    latitude: 9.4512,
    longitude: 77.5510,
    stop_order: 4,
    estimated_arrival: '08:08 AM',
    status: 'active',
  },
  {
    id: 'stop_5',
    route_id: 'r1',
    stop_name: 'College Main Gate',
    latitude: 9.4520,
    longitude: 77.5535,
    stop_order: 5,
    estimated_arrival: '08:20 AM',
    status: 'active',
  },
];

const EVENING_ROUTE_STOPS: Stop[] = [
  {
    id: 'stop_5',
    route_id: 'r1',
    stop_name: 'College Main Gate (Campus Hub)',
    latitude: 9.4520,
    longitude: 77.5535,
    stop_order: 1,
    estimated_arrival: '04:30 PM',
    status: 'active',
  },
  {
    id: 'stop_4',
    route_id: 'r1',
    stop_name: 'Samsigapuram Road Turn',
    latitude: 9.4512,
    longitude: 77.5510,
    stop_order: 2,
    estimated_arrival: '04:42 PM',
    status: 'active',
  },
  {
    id: 'stop_3',
    route_id: 'r1',
    stop_name: 'PACR Mill Circle',
    latitude: 9.4505,
    longitude: 77.5495,
    stop_order: 3,
    estimated_arrival: '04:55 PM',
    status: 'active',
  },
  {
    id: 'stop_2',
    route_id: 'r1',
    stop_name: 'Gandhi Statue Junction',
    latitude: 9.4490,
    longitude: 77.5472,
    stop_order: 4,
    estimated_arrival: '05:08 PM',
    status: 'active',
  },
  {
    id: 'stop_1',
    route_id: 'r1',
    stop_name: 'Rajapalayam New Bus Stand',
    latitude: 9.4475,
    longitude: 77.5450,
    stop_order: 5,
    estimated_arrival: '05:25 PM',
    status: 'active',
  },
];

type StudentTab = 'track' | 'stops' | 'alerts' | 'profile';

export default function StudentDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<StudentTab>('track');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
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
          if (Array.isArray(list)) return list;
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

  // Student Profile & Realtime Leave State
  const [currentStudent, setCurrentStudent] = useState<BusStudent>(() => {
    return studentRosterStore.getStudentById('s3') || studentRosterStore.getAllStudents()[0];
  });
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedLeaveDate, setSelectedLeaveDate] = useState('Today (20 Sep)');

  // Load saved student profile from persistent session
  useEffect(() => {
    const loadSavedStudent = async () => {
      try {
        const session = await authStorage.getSession();
        if (session && session.role === 'student' && session.user) {
          setCurrentStudent((prev) => ({ ...prev, ...session.user }));
        }
      } catch (e) {
        console.warn('Student session load error:', e);
      }
    };
    loadSavedStudent();
  }, []);

  // Sync with Student Roster Store
  useEffect(() => {
    const unsubscribe = studentRosterStore.subscribe(() => {
      const updated = studentRosterStore.getStudentById(currentStudent.id);
      if (updated) setCurrentStudent(updated);
    });
    return unsubscribe;
  }, [currentStudent.id]);

  // Notification / App preferences
  const [proximityAlerts, setProximityAlerts] = useState(true);
  const [delayAlerts, setDelayAlerts] = useState(true);

  // Student device GPS location
  const [studentLocation, setStudentLocation] = useState<GPSCoordinate | null>(null);

  // Live Bus Location (synced from Driver via Supabase Realtime / Simulation)
  const [busLocation, setBusLocation] = useState<GPSCoordinate>({
    latitude: SIMULATION_ROUTE_A[0].latitude,
    longitude: SIMULATION_ROUTE_A[0].longitude,
    speed: SIMULATION_ROUTE_A[0].speed,
    heading: 45,
  });

  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [lastUpdatedSec, setLastUpdatedSec] = useState(1);
  const [isDriverActive, setIsDriverActive] = useState(true);

  // Active stops sequence based on schedule shift
  const activeStops = scheduleType === 'evening' ? EVENING_ROUTE_STOPS : MORNING_ROUTE_STOPS;
  const boardingStop = (activeStops && (
    activeStops.find(s => s.id === (currentStudent.boardingStopId || 'st1') || s.id === 'stop_1') ||
    activeStops.find(s => s.stop_name.toLowerCase().includes((currentStudent.boardingStopName || '').toLowerCase().slice(0, 6)))
  )) || activeStops[0];

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const storedCurrent = window.localStorage.getItem('bustrack_current_mobile_student');
        if (storedCurrent) {
          const parsed = JSON.parse(storedCurrent);
          if (parsed && (parsed.name || parsed.profile?.name)) {
            setCurrentStudent({
              id: parsed.id || 's3',
              name: parsed.profile?.name || parsed.name || 'Kishore ST',
              rollNumber: parsed.register_number || parsed.rollNumber || '21IT045',
              department: parsed.department || 'B.Tech Information Tech.',
              year: parsed.year || 3,
              section: parsed.section || 'A',
              boardingStopId: parsed.boarding_stop_id || parsed.boardingStopId || 'st1',
              boardingStopName: parsed.boarding_stop?.stop_name || parsed.boardingStopName || 'Old Bus Stand, RJPM (Stop 1)',
              phone: parsed.profile?.phone || parsed.phone || '+91 98421 23456',
              email: parsed.profile?.email || parsed.email || 'kishore.it@ritrjpm.ac.in',
              busId: parsed.bus_id || parsed.busId || 'b1',
              busNumber: parsed.bus?.bus_number || parsed.busNumber || (parsed.bus_id === 'b1' ? 'BUS-01' : 'BUS-01'),
              routeId: parsed.route_id || parsed.routeId || 'r1',
              isBoarded: false,
              isOnLeave: Boolean(parsed.is_on_leave),
              leaveDate: parsed.leave_date,
              leaveReason: parsed.leave_reason,
              avatarBg: '#059669',
            });
          }
        }
      } catch (e) {}
    }

    checkAndFetchStudentLocation();
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
          setBusLocation((prev) => {
            if (
              Math.abs(prev.latitude - latest.latitude) > 0.00005 ||
              Math.abs(prev.longitude - latest.longitude) > 0.00005 ||
              prev.speed !== latest.speed
            ) {
              setLastUpdatedSec(1);
              return latest;
            }
            return prev;
          });
        }
      } catch {}
    }, 3000);

    // 1. Subscribe to Live Driver Broadcasts via Supabase Realtime Channel
    const unsubscribe = subscribeToTelemetry((payload: BusTelemetryPayload) => {
      setBusLocation(payload.coordinate);
      if (typeof payload.currentStopIndex === 'number') {
        setCurrentStopIndex(payload.currentStopIndex);
      }
      setIsDriverActive(payload.status === 'active');
      setLastUpdatedSec(1);
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
      setEmergencyAlerts((prev) => [alert, ...prev]);
      
      // Deliver High-Priority Push Notification to Mobile Notification Bar
      notificationService.sendPushNotification(
        `🚨 EMERGENCY ALERT: ${currentStudent.busNumber || 'BUS-01'}`,
        alert.message || `An urgent alert (${alert.type?.toUpperCase()}) was reported for your bus. Safety protocols active.`,
        'emergency_sos'
      );
    });

    // 4. Subscribe to Live Admin Broadcast Announcements
    const unsubSystemNotif = subscribeToSystemNotifications((notif: SystemNotification) => {
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

    // 5. Initial fetch of active admin announcements from Supabase DB
    fetchSystemNotificationsFromDB().then((notifs) => {
      if (notifs && notifs.length > 0) {
        setSystemBroadcasts((prev) => {
          const ids = new Set(prev.map((n) => n.id));
          const fresh = notifs.filter((n) => !ids.has(n.id));
          return [...fresh, ...prev];
        });
      }
    }).catch(() => {});

    // 6. Polling sync for cross-client notifications (checks every 2.5s for native mobile & web)
    const notifPollTimer = setInterval(() => {
      authStorage.getItem('bustrack_notifications_v1').then((raw) => {
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.length > 0) {
              setSystemBroadcasts((prev) => {
                const prevIds = new Set(prev.map((n) => n.id));
                const newItems = list.filter((n: any) => !prevIds.has(n.id));
                if (newItems.length > 0) {
                  const newest = newItems[0];
                  setIncomingAlertModal(newest);
                  setIncomingToast(newest);
                  notificationService.sendPushNotification(
                    `📢 ${newest.title}`,
                    newest.message,
                    newest.type || 'broadcast'
                  );
                  return [...newItems, ...prev];
                }
                return prev;
              });
            }
          } catch {}
        }
      }).catch(() => {});
    }, 2500);

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
  const distanceToBoardingStopKm = studentLocation && boardingStop && typeof studentLocation.latitude === 'number' && typeof boardingStop.latitude === 'number'
    ? calculateDistanceKm(
        studentLocation.latitude,
        studentLocation.longitude,
        boardingStop.latitude,
        boardingStop.longitude
      )
    : 0.35;

  const walkingMinutes = Math.max(1, Math.round((distanceToBoardingStopKm / 4.5) * 60));

  const distanceBusToStopKm = busLocation && boardingStop && typeof busLocation.latitude === 'number' && typeof boardingStop.latitude === 'number'
    ? calculateDistanceKm(
        busLocation.latitude,
        busLocation.longitude,
        boardingStop.latitude,
        boardingStop.longitude
      )
    : 1.2;

  // Dynamic ETA Calculation to Assigned Boarding Stop
  const remainingStopsToBoarding = Math.max(
    0,
    activeStops.findIndex((s) => s.id === (boardingStop?.id || 'stop_1')) - currentStopIndex
  );

  const dynamicETA: DynamicETA = calculateDynamicETA(
    distanceBusToStopKm,
    Number(busLocation?.speed || 0),
    remainingStopsToBoarding,
    boardingStop?.estimated_arrival || '07:52 AM'
  );

  return (
    <View style={styles.screenContainer}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* TOP STATUS BAR & HEADER */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.topLogo}>
            <Text style={{ fontSize: 18 }}>🚌</Text>
          </View>
          <View style={styles.topHeaderInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.topAppName}>Student Bus Track</Text>
              <View style={styles.topBusNumberBadge}>
                <Text style={styles.topBusNumberText}>{currentStudent.busNumber || 'BUS-01'}</Text>
              </View>
            </View>
            <Text style={styles.topRouteSubtitle} numberOfLines={1} ellipsizeMode="tail">
              Route 1 &bull; Old Bus Stand ➔ Campus &bull; TN 67 AM 9785
            </Text>
          </View>
        </View>

        <View style={styles.topHeaderRight}>
          <TouchableOpacity
            style={styles.headerBellBtn}
            onPress={() => setShowNotifModal(true)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 18 }}>🔔</Text>
            {unreadNotifCount > 0 && (
              <View style={styles.headerBellBadge}>
                <Text style={styles.headerBellBadgeText}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={[styles.liveStatusPill, !isDriverActive && styles.standbyStatusPill]}>
            <View style={[styles.liveDot, !isDriverActive && styles.standbyDot]} />
            <Text style={[styles.liveText, !isDriverActive && styles.standbyText]}>
              {isDriverActive ? 'LIVE GPS' : 'STANDBY'}
            </Text>
          </View>
        </View>
      </View>

      {/* STUDENT NOTIFICATIONS & BROADCASTS MODAL */}
      <Modal
        visible={showNotifModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotifModal(false)}
      >
        <View style={styles.notifModalOverlay}>
          <View style={styles.notifModalContent}>
            <View style={styles.notifModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22 }}>🔔</Text>
                <View>
                  <Text style={styles.notifModalTitle}>Student Notifications</Text>
                  <Text style={styles.notifModalSub}>Campus transport announcements & alerts</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.notifModalClose}
                onPress={() => setShowNotifModal(false)}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380, padding: 14 }}>
              {systemBroadcasts.length === 0 ? (
                <View style={styles.notifEmptyBox}>
                  <Text style={{ fontSize: 28, marginBottom: 8 }}>📭</Text>
                  <Text style={styles.notifEmptyText}>No notifications yet</Text>
                  <Text style={styles.notifEmptySub}>All bus announcements and dispatch alerts will appear here.</Text>
                </View>
              ) : (
                systemBroadcasts.map((notif) => {
                  const isRead = readNotifIds.includes(notif.id);
                  return (
                    <TouchableOpacity
                      key={notif.id}
                      style={[styles.notifCardItem, isRead && { opacity: 0.65 }]}
                      onPress={() => setReadNotifIds((prev) => (prev.includes(notif.id) ? prev : [...prev, notif.id]))}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={styles.notifCardTitle}>{notif.title}</Text>
                        <View style={styles.notifBadgeTag}>
                          <Text style={styles.notifBadgeTagText}>{notif.type?.toUpperCase() || 'INFO'}</Text>
                        </View>
                      </View>
                      <Text style={styles.notifCardBody}>{notif.message}</Text>
                      <Text style={styles.notifCardTime}>
                        {notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.notifModalFooter}>
              <TouchableOpacity
                style={styles.markAllReadBtn}
                onPress={() => {
                  setReadNotifIds(systemBroadcasts.map((n) => n.id));
                  setShowNotifModal(false);
                }}
              >
                <Text style={styles.markAllReadText}>✓ Mark All as Read</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FLOATING LIVE BROADCAST TOAST */}
      {incomingToast && (
        <TouchableOpacity
          style={[styles.incomingToastBanner, { top: Math.max(insets.top + 60, 70) }]}
          onPress={() => {
            setActiveTab('alerts');
            setIncomingToast(null);
          }}
          activeOpacity={0.9}
        >
          <View style={styles.toastIconWrap}>
            <Text style={{ fontSize: 16 }}>📢</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.toastTitle} numberOfLines={1}>NEW BROADCAST: {incomingToast.title}</Text>
              <Text style={styles.toastBadge}>LIVE</Text>
            </View>
            <Text style={styles.toastBody} numberOfLines={2}>{incomingToast.message}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* EXPLICIT IN-APP BROADCAST ALERT BOX MODAL */}
      {incomingAlertModal && (
        <Modal transparent animationType="fade" visible={!!incomingAlertModal} onRequestClose={() => setIncomingAlertModal(null)}>
          <View style={styles.alertModalOverlay}>
            <View style={styles.alertModalCard}>
              <View style={styles.alertModalIconCircle}>
                <Text style={{ fontSize: 26 }}>📢</Text>
              </View>
              <Text style={styles.alertModalBadge}>OFFICIAL TRANSPORT BROADCAST</Text>
              <Text style={styles.alertModalTitle}>{incomingAlertModal.title}</Text>
              <View style={styles.alertModalMessageWrap}>
                <Text style={styles.alertModalMessage}>{incomingAlertModal.message}</Text>
              </View>
              <View style={styles.alertModalFooter}>
                <TouchableOpacity
                  style={styles.alertModalCloseBtn}
                  onPress={() => setIncomingAlertModal(null)}
                >
                  <Text style={styles.alertModalCloseText}>✓ Acknowledge Alert</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MAIN VIEW CONTENT (SWITCHED BY BOTTOM TABS) */}
      <View style={styles.mainContent}>
        {/* ================= TAB 1: LIVE TRACK & PROXIMITY RADAR ================= */}
        {activeTab === 'track' && (
          <ScrollView style={styles.scrollPage} contentContainerStyle={{ padding: 14 }}>
            {/* Location Permission Prompt Banner if not allowed */}
            {!hasLocationPermission && (
              <View style={{ marginBottom: 10 }}>
                <LocationPermissionBanner
                  role="student"
                  isGranted={hasLocationPermission}
                  onRequestPermission={handleRequestPermission}
                  onOpenSettings={() => locationTracker.openSettings()}
                />
              </View>
            )}

            {/* Push Notification Permission Banner */}
            {!hasNotificationPermission && (
              <NotificationPermissionBanner
                isGranted={hasNotificationPermission}
                onRequestPermission={handleRequestNotificationPermission}
              />
            )}

            {/* REAL-TIME EMERGENCY SOS ALERT BANNER */}
            {emergencyAlerts.length > 0 && (
              <View style={styles.emergencySosBanner}>
                <View style={styles.emergencySosHeader}>
                  <View style={styles.emergencySosIconWrap}>
                    <Text style={{ fontSize: 20 }}>🚨</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.emergencySosTitle}>
                        CRITICAL ALERT: {emergencyAlerts[0].type?.toUpperCase() || 'EMERGENCY SOS'}
                      </Text>
                      <Text style={styles.emergencySosActiveBadge}>ACTIVE</Text>
                    </View>
                    <Text style={styles.emergencySosMsg}>{emergencyAlerts[0].message}</Text>
                    <Text style={styles.emergencySosMeta}>
                      Bus: {currentStudent.busNumber || 'BUS-01'} &bull; {new Date(emergencyAlerts[0].created_at).toLocaleTimeString()}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.emergencySosCallBtn}
                  onPress={() => handleCallHelpline('+919629284690')}
                >
                  <Text style={styles.emergencySosCallBtnText}>📞 Call Transport Incharge: N.Govindaraju (+91 96292 84690)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Designated Route Terminals Banner */}
            <View style={styles.routeTerminalCard}>
              <View style={styles.terminalItem}>
                <Text style={styles.terminalLabelGreen}>🟢 START POINT</Text>
                <Text style={styles.terminalName}>
                  {scheduleType === 'evening' ? 'RIT College Campus' : 'Rajapalayam New Bus Stand'}
                </Text>
                <Text style={styles.terminalTime}>
                  {scheduleType === 'evening' ? 'Dep: 04:30 PM' : 'Dep: 07:30 AM'}
                </Text>
              </View>
              <View style={styles.terminalArrowBox}>
                <Text style={styles.terminalArrow}>➔</Text>
              </View>
              <View style={styles.terminalItem}>
                <Text style={styles.terminalLabelRed}>🏁 END POINT</Text>
                <Text style={styles.terminalName}>
                  {scheduleType === 'evening' ? 'Rajapalayam New Bus Stand' : 'RIT College Campus'}
                </Text>
                <Text style={styles.terminalTime}>
                  {scheduleType === 'evening' ? 'Arr: 05:25 PM' : 'Arr: 08:20 AM'}
                </Text>
              </View>
            </View>

            {/* REAL-TIME FLEET DRIVER / VEHICLE SWAP NOTICE BANNER */}
            {activeSwapNotice && (
              <View style={styles.swapNoticeCard}>
                <View style={styles.swapNoticeHeader}>
                  <View style={styles.swapNoticeIconWrap}>
                    <Text style={{ fontSize: 16 }}>{activeSwapNotice.type === 'driver_swap' ? '👨‍✈️' : '🔄'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.swapNoticeTitle}>{activeSwapNotice.title}</Text>
                    <Text style={styles.swapNoticeMessage}>{activeSwapNotice.message}</Text>
                    {activeSwapNotice.reason && (
                      <Text style={styles.swapNoticeReason}>
                        Notice: <Text style={{ color: '#fef08a' }}>{activeSwapNotice.reason}</Text>
                      </Text>
                    )}
                  </View>
                </View>
                {activeSwapNotice.substituteDriverPhone && (
                  <TouchableOpacity
                    style={styles.callSubDriverBtn}
                    onPress={() => handleCallHelpline(activeSwapNotice.substituteDriverPhone)}
                  >
                    <Text style={styles.callSubDriverBtnText}>📞 Call Sub Driver ({activeSwapNotice.substituteDriverPhone})</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* One-Day Leave Active Banner on Live Map */}
            {currentStudent.isOnLeave && (
              <View style={styles.studentLeaveNoticeCard}>
                <View style={styles.leaveNoticeHeader}>
                  <View style={styles.leaveNoticeIconWrap}>
                    <Text style={{ fontSize: 16 }}>⛔</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leaveNoticeTitle}>1-DAY LEAVE ACTIVE ({currentStudent.leaveDate || 'TODAY'})</Text>
                    <Text style={styles.leaveNoticeSub}>
                      Driver Mr. B. Moorthi & Transport Admin are notified not to stop for your pickup at <Text style={{ color: '#fde68a', fontWeight: 'bold' }}>{currentStudent.boardingStopName}</Text>.
                    </Text>
                  </View>
                </View>
                <View style={styles.leaveReasonPill}>
                  <Text style={styles.leaveReasonText}>Status: 1-Day Leave (Not Boarding)</Text>
                  <TouchableOpacity
                    style={styles.cancelLeaveQuickBtn}
                    onPress={() => {
                      studentRosterStore.setStudentLeave(currentStudent.id, false);
                      Alert.alert('✅ Leave Cancelled', 'Your regular boarding pickup has been restored.');
                    }}
                  >
                    <Text style={styles.cancelLeaveQuickText}>Cancel Leave</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Compact Professional Map Frame */}
            <View style={styles.compactMapWrapper}>
              <OSMMapView
                busLocation={busLocation}
                userLocation={studentLocation}
                busNumber={activeSwapNotice?.replacementBusNumber || currentStudent.busNumber || "BUS-01"}
                routeNumber="Route 1"
                routeColor="#2563eb"
                stops={activeStops}
                boardingStop={boardingStop}
                height={280}
              />
            </View>

            {/* Dynamic Proximity Radar Card */}
            <View style={styles.studentRadarCard}>
              <View style={styles.radarHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <View style={[styles.busNumberHeroChip, activeSwapNotice?.type === 'bus_swap' && { backgroundColor: '#7c3aed' }]}>
                      <Text style={styles.busNumberHeroChipText}>
                        {activeSwapNotice?.replacementBusNumber || currentStudent.busNumber || 'BUS-01'}
                      </Text>
                    </View>
                    {activeSwapNotice?.type === 'bus_swap' && (
                      <View style={styles.standbyReplacementPill}>
                        <Text style={styles.standbyReplacementText}>STANDBY SWAP</Text>
                      </View>
                    )}
                    {activeSwapNotice?.type === 'driver_swap' && (
                      <View style={styles.subDriverActivePill}>
                        <Text style={styles.subDriverActiveText}>SUB DRIVER: {activeSwapNotice.substituteDriverName}</Text>
                      </View>
                    )}
                    <Text style={styles.radarBusPlate}>{activeSwapNotice?.replacementRegistrationNumber || 'TN 84 AX 1001'}</Text>
                    <View style={styles.speedPill}>
                      <Text style={styles.speedPillText}>{Math.round(busLocation.speed || 0)} km/h</Text>
                    </View>
                    <View style={[styles.trafficTag, dynamicETA.trafficCondition === 'Smooth' ? styles.trafficSmooth : dynamicETA.trafficCondition === 'Moderate' ? styles.trafficMod : styles.trafficHeavy]}>
                      <Text style={styles.trafficTagText}>{dynamicETA.trafficCondition}</Text>
                    </View>
                  </View>
                  <Text style={styles.radarDistanceText}>
                    {formatDistance(distanceBusToStopKm)} to your stop &bull; Live GPS: {lastUpdatedSec < 60 ? `${lastUpdatedSec}s ago` : `${Math.floor(lastUpdatedSec / 60)}m ago`}
                  </Text>
                </View>
              </View>

              {/* Dynamic Arrival Time Highlight Row */}
              <View style={styles.dynamicEtaBanner}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dynamicEtaSub}>DYNAMIC ARRIVAL TIME</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <Text style={styles.dynamicEtaClock}>{dynamicETA.arrivalTimeStr}</Text>
                    <Text style={styles.dynamicEtaCountdown}>
                      {dynamicETA.etaMinutes === 0 || dynamicETA.formattedEta.toLowerCase().includes('arrive')
                        ? '(At Stop)'
                        : `(in ~${dynamicETA.formattedEta})`}
                    </Text>
                  </View>
                </View>

                <View style={[styles.delayBadge, { backgroundColor: dynamicETA.statusTag === 'DELAYED' ? '#450a0a' : dynamicETA.statusTag === 'ARRIVING_NOW' ? '#451a03' : '#022c22', borderColor: dynamicETA.statusColor }]}>
                  <Text style={[styles.delayBadgeText, { color: dynamicETA.statusColor }]}>
                    {dynamicETA.statusLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.stopInfoBox}>
                <View style={styles.stopInfoDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stopLabel}>Assigned Boarding Stop</Text>
                  <Text style={styles.stopNameText}>{boardingStop.stop_name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.stopLabel}>Scheduled Pickup</Text>
                  <Text style={styles.stopTimeText}>{boardingStop.estimated_arrival}</Text>
                </View>
              </View>
            </View>

            {/* Quick Info Row */}
            <View style={styles.quickInfoRow}>
              <View style={styles.quickInfoCard}>
                <Text style={styles.quickInfoIcon}>🚶</Text>
                <Text style={styles.quickInfoValue}>{walkingMinutes} min</Text>
                <Text style={styles.quickInfoLabel}>Walk to Stop</Text>
              </View>
              <View style={styles.quickInfoCard}>
                <Text style={styles.quickInfoIcon}>📏</Text>
                <Text style={styles.quickInfoValue}>{formatDistance(distanceBusToStopKm)}</Text>
                <Text style={styles.quickInfoLabel}>Bus Distance</Text>
              </View>
              <View style={styles.quickInfoCard}>
                <Text style={styles.quickInfoIcon}>🕐</Text>
                <Text style={styles.quickInfoValue}>{dynamicETA.formattedEta === 'Arrived' ? 'Here!' : dynamicETA.formattedEta}</Text>
                <Text style={styles.quickInfoLabel}>ETA</Text>
              </View>
              <View style={styles.quickInfoCard}>
                <Text style={styles.quickInfoIcon}>⚡</Text>
                <Text style={styles.quickInfoValue}>{Math.round(busLocation.speed || 0)}</Text>
                <Text style={styles.quickInfoLabel}>km/h</Text>
              </View>
            </View>

            {/* Driver Contact Card */}
            <View style={styles.driverContactCard}>
              <View style={styles.driverContactLeft}>
                <View style={styles.driverAvatar}>
                  <Text style={{ fontSize: 18 }}>👨‍✈️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverContactName}>Mr. B. Moorthi</Text>
                  <Text style={styles.driverContactRole}>Bus Driver • Route 1</Text>
                  <Text style={styles.driverContactReg}>🚌 TN 67 AM 9785</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.driverCallBtn}
                onPress={() => handleCallHelpline('+919894668646')}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14 }}>📞</Text>
                <Text style={styles.driverCallBtnText}>Call</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ================= TAB 2: ROUTE STOPS & TIMELINE ================= */}
        {activeTab === 'stops' && (
          <ScrollView style={styles.scrollPage} contentContainerStyle={{ padding: 16 }}>
            {/* Prominent Assigned Bus Banner */}
            <View style={styles.busSummaryCard}>
              <View style={styles.busSummaryBadge}>
                <Text style={styles.busSummaryBadgeSub}>BUS</Text>
                <Text style={styles.busSummaryBadgeNum}>{currentStudent.busNumber?.replace('BUS-', '') || '01'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.busSummaryTitle}>Route 1 &bull; Rajapalayam ➔ Campus</Text>
                <Text style={styles.busSummaryVehicle}>Vehicle: TN 67 AM 9785</Text>
                <Text style={styles.busSummaryDriver}>Driver: Mr. B. Moorthi (+91 9894668646)</Text>
              </View>
            </View>

            {/* Schedule Toggle */}
            <View style={styles.scheduleToggleCard}>
              <TouchableOpacity
                style={[styles.toggleBtn, scheduleType === 'morning' && styles.toggleBtnActive]}
                onPress={() => setScheduleType('morning')}
              >
                <Text style={[styles.toggleBtnText, scheduleType === 'morning' && styles.toggleBtnTextActive]}>
                  🌅 Morning Pickup (07:30 AM)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, scheduleType === 'evening' && styles.toggleBtnActive]}
                onPress={() => setScheduleType('evening')}
              >
                <Text style={[styles.toggleBtnText, scheduleType === 'evening' && styles.toggleBtnTextActive]}>
                  🌆 Evening Return (04:45 PM)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.speedAdjustmentAdvisory}>
              <Text style={styles.speedAdjustmentText}>
                ⚡ Real-time speed ({Math.round(busLocation.speed || 0)} km/h) & traffic conditions actively adjust arrival timings below.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>{currentStudent.busNumber || 'BUS-01'} &bull; Stop Sequence & Dynamic Timings</Text>

            {(() => {
              const activeStops = scheduleType === 'evening' ? EVENING_ROUTE_STOPS : MORNING_ROUTE_STOPS;
              return activeStops.map((stop, idx) => {
                const isBoarding = stop.id === boardingStop.id;
                const stopDist = calculateDistanceKm(
                  busLocation.latitude,
                  busLocation.longitude,
                  stop.latitude,
                  stop.longitude
                );
                const stopDistFormatted = formatDistance(stopDist);
                const isAtStop = stopDist <= 0.08;
                const isPassed = completedStopIds.includes(stop.id) || idx < currentStopIndex;
                const isCurrent = !isPassed && (isAtStop || idx === currentStopIndex);
                const isNext = !isPassed && !isCurrent && idx === currentStopIndex + 1;

                const stopETA = calculateDynamicETA(
                  stopDist,
                  busLocation.speed || 0,
                  Math.max(0, idx - currentStopIndex),
                  stop.estimated_arrival
                );

                const statusText = isPassed
                  ? 'DEPARTED'
                  : isAtStop
                  ? 'BUS ARRIVED'
                  : isCurrent
                  ? 'APPROACHING'
                  : isNext
                  ? 'NEXT STOP'
                  : stopETA.statusLabel;

                return (
                  <View key={stop.id} style={[styles.timelineCard, isBoarding && styles.timelineCardBoarding]}>
                    <View style={[styles.timelineBadge, isPassed && styles.timelineBadgePassed, (isCurrent || isNext) && styles.timelineBadgeNext]}>
                      <Text style={[styles.timelineBadgeText, (isPassed || isCurrent || isNext) && styles.timelineBadgeTextActive]}>
                        {isPassed ? '✓' : idx + 1}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.timelineStopName, isPassed && styles.timelineStopNamePassed]}>
                          {stop.stop_name}
                        </Text>
                        {isBoarding && <Text style={styles.yourStopTag}>YOUR STOP</Text>}
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <Text style={styles.timelineEta}>Sched: {stop.estimated_arrival}</Text>
                        <Text style={[styles.timelineLiveEta, isPassed ? styles.timelineLiveEtaPassed : { color: stopETA.statusColor }]}>
                          &bull; {isPassed ? 'Passed' : `Expected: ${stopETA.arrivalTimeStr}`}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '700' }}>
                          ({stopDistFormatted})
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.statusTag, isPassed && styles.statusTagPassed, (isCurrent || isNext) && styles.statusTagNext]}>
                      <Text style={[styles.statusTagText, isPassed && styles.statusTagTextPassed, (isCurrent || isNext) && styles.statusTagTextNext]}>
                        {statusText}
                      </Text>
                    </View>
                  </View>
                );
              });
            })()}
          </ScrollView>
        )}

        {/* ================= TAB 3: ALERTS & BROADCASTS ================= */}
        {activeTab === 'alerts' && (
          <ScrollView style={styles.scrollPage} contentContainerStyle={{ padding: 16 }}>
            {/* Bus Alert Header */}
            <View style={styles.busAlertInfoBox}>
              <Text style={styles.busAlertInfoText}>Showing notifications for <Text style={{ color: '#f59e0b', fontWeight: '900' }}>{currentStudent.busNumber || 'BUS-01'}</Text> (Route 1)</Text>
            </View>

            <Text style={styles.sectionTitle}>Transport Broadcasts & Delay Notices</Text>

            {/* REAL-TIME ADMIN BROADCASTS */}
            {systemBroadcasts.map((notif) => {
              const badge = notif.type === 'emergency'
                ? { bg: '#ef4444', text: '#ffffff', label: 'EMERGENCY', icon: '🚨' }
                : notif.type === 'delay'
                ? { bg: '#f59e0b', text: '#000000', label: 'DELAY NOTICE', icon: '⏳' }
                : notif.type === 'trip'
                ? { bg: '#10b981', text: '#ffffff', label: 'TRIP UPDATE', icon: '🚌' }
                : notif.type === 'maintenance'
                ? { bg: '#8b5cf6', text: '#ffffff', label: 'MAINTENANCE', icon: '🔧' }
                : { bg: '#3b82f6', text: '#ffffff', label: 'ANNOUNCEMENT', icon: '📢' };

              return (
                <View key={notif.id} style={[styles.notifCard, { borderColor: badge.bg, borderWidth: 1.5 }]}>
                  <View style={styles.notifHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Text style={{ fontSize: 15 }}>{badge.icon}</Text>
                      <Text style={[styles.notifTitle, { flex: 1 }]} numberOfLines={1}>{notif.title}</Text>
                    </View>
                    <View style={{ backgroundColor: badge.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: badge.text, fontSize: 9, fontWeight: '900' }}>{badge.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.notifBody}>{notif.message}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#1e293b' }}>
                    <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '600' }}>
                      Audience: {(notif.target_type || 'all').toUpperCase()}
                    </Text>
                    <Text style={{ color: '#94a3b8', fontSize: 10 }}>
                      {notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* REAL-TIME EMERGENCY SOS BROADCASTS */}
            {emergencyAlerts.map((alert) => (
              <View key={alert.id} style={styles.emergencyNotifCard}>
                <View style={styles.notifHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.emergencyNotifTitle}>
                      🚨 EMERGENCY SOS: {alert.type?.toUpperCase() || 'URGENT INCIDENT'}
                    </Text>
                  </View>
                  <Text style={styles.emergencyNotifUrgentBadge}>URGENT</Text>
                </View>
                <Text style={styles.emergencyNotifBody}>{alert.message}</Text>
                <View style={styles.emergencyMetaRow}>
                  <Text style={styles.emergencyMetaText}>
                    Bus: <Text style={{ color: '#fca5a5', fontWeight: 'bold' }}>{currentStudent.busNumber || 'BUS-01'}</Text> • Driver: Mr. B. Moorthi • Lat/Lng: [{Number(alert?.latitude || 9.449).toFixed(4)}, {Number(alert?.longitude || 77.5472).toFixed(4)}]
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.notifCallEmergencyBtn}
                  onPress={() => handleCallHelpline('+919629284690')}
                >
                  <Text style={styles.notifCallEmergencyBtnText}>📞 Contact Transport Incharge: N.Govindaraju (+91 96292 84690)</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* REAL-TIME SWAP & VEHICLE CHANGE NOTIFICATIONS */}
            {swapNoticesList.map((notice) => (
              <View key={notice.id} style={styles.swapNotifCard}>
                <View style={styles.notifHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.swapNotifTitle}>
                      {notice.type === 'driver_swap' ? '👨‍✈️' : '🔄'} {notice.title}
                    </Text>
                  </View>
                  <Text style={styles.swapNotifTimeBadge}>REALTIME</Text>
                </View>
                <Text style={styles.swapNotifBody}>{notice.message}</Text>
                {notice.substituteDriverPhone && (
                  <TouchableOpacity
                    style={styles.notifCallBtn}
                    onPress={() => handleCallHelpline(notice.substituteDriverPhone)}
                  >
                    <Text style={styles.notifCallBtnText}>📞 Call Substitute Driver: {notice.substituteDriverPhone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <View style={styles.notifCard}>
              <View style={styles.notifHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.notifTitle}>🚌 {currentStudent.busNumber || 'BUS-01'} Departed</Text>
                </View>
                <Text style={styles.notifTime}>Just now</Text>
              </View>
              <Text style={styles.notifBody}>
                {currentStudent.busNumber || 'BUS-01'} (TN 84 AX 1001) has departed Old Bus Stand, RJPM on time. Next pickup is at Gandhi Statue Junction.
              </Text>
            </View>

            <View style={styles.notifCard}>
              <View style={styles.notifHeader}>
                <Text style={styles.notifTitle}>⚠️ Morning Traffic Advisory</Text>
                <Text style={styles.notifTime}>15 mins ago</Text>
              </View>
              <Text style={styles.notifBody}>
                Traffic clearance active on Route 1. Bus operating with optimal telemetry dispatch.
              </Text>
            </View>

            <View style={styles.notifCard}>
              <View style={styles.notifHeader}>
                <Text style={styles.notifTitle}>🔔 Evening Departure Schedule</Text>
                <Text style={styles.notifTime}>Today 08:00 AM</Text>
              </View>
              <Text style={styles.notifBody}>
                Evening return bus ({currentStudent.busNumber || 'BUS-01'}) will depart from the Main Campus Circle sharply at 04:45 PM after laboratory sessions.
              </Text>
            </View>
          </ScrollView>
        )}

        {/* ================= TAB 4: STUDENT PROFILE & SETTINGS ================= */}
        {activeTab === 'profile' && (
          <ScrollView style={styles.scrollPage} contentContainerStyle={{ padding: 16 }}>
            {/* Student Profile Card */}
            <View style={styles.profileHeroCard}>
              <View style={styles.profileAvatar}>
                <Text style={{ fontSize: 32 }}>🎓</Text>
              </View>
              <Text style={styles.profileName}>{currentStudent.name}</Text>
              <Text style={styles.profileMeta}>
                Reg: {currentStudent.rollNumber} &bull; {currentStudent.department} (Yr {currentStudent.year})
              </Text>
              <View style={styles.profileBusHeroBadge}>
                <Text style={styles.profileBusHeroBadgeText}>
                  ASSIGNED BUS: {currentStudent.busNumber || 'BUS-01'}
                </Text>
              </View>
            </View>

            {/* 1-Day Leave Reporting Section */}
            <Text style={styles.settingsSectionTitle}>Today's Attendance & Leave Pass</Text>
            <View style={[styles.leaveControlCard, currentStudent.isOnLeave && styles.leaveControlCardActive]}>
              <View style={styles.leaveControlHeader}>
                <View>
                  <Text style={styles.leaveControlTitle}>One-Day Leave Notice</Text>
                  <Text style={styles.leaveControlSub}>
                    Notify Driver Mr. B. Moorthi and Admin if you will not board today.
                  </Text>
                </View>
                <View style={[styles.leaveStatusTag, currentStudent.isOnLeave ? styles.leaveStatusTagActive : styles.leaveStatusTagInactive]}>
                  <Text style={[styles.leaveStatusTagText, currentStudent.isOnLeave ? styles.leaveStatusTagTextActive : styles.leaveStatusTagTextInactive]}>
                    {currentStudent.isOnLeave ? '⛔ ON LEAVE' : '🟢 TRAVELLING'}
                  </Text>
                </View>
              </View>

              {currentStudent.isOnLeave ? (
                <View style={styles.leaveActiveInfoBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.leaveDetailLabel}>Leave Scheduled Date:</Text>
                    <Text style={styles.leaveDetailVal}>{currentStudent.leaveDate || 'Today (20 Sep)'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.leaveDetailLabel}>Boarding Stop Excluded:</Text>
                    <Text style={styles.leaveDetailVal}>{currentStudent.boardingStopName}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.revokeLeaveBtn}
                    onPress={() => {
                      studentRosterStore.setStudentLeave(currentStudent.id, false);
                      Alert.alert('✅ Leave Revoked', 'You are marked as regular travelling for today.');
                    }}
                  >
                    <Text style={styles.revokeLeaveBtnText}>Cancel Leave &bull; Travelling Today</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.applyLeaveBtn}
                  onPress={() => setShowLeaveModal(true)}
                >
                  <Text style={styles.applyLeaveBtnText}>📝 Apply 1-Day Leave / Not Boarding Today</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Transport Details Section */}
            <Text style={styles.settingsSectionTitle}>Transport Allocation</Text>
            <View style={styles.settingsCard}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Assigned Bus Number</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={styles.busNumberInlineBadge}>
                    <Text style={styles.busNumberInlineText}>{currentStudent.busNumber}</Text>
                  </View>
                  <Text style={styles.settingVal}>TN 67 AM 9785</Text>
                </View>
              </View>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Route Assignment</Text>
                <Text style={styles.settingVal}>Route 1 (Old Bus Stand, RJPM ➔ RIT)</Text>
              </View>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Driver Name</Text>
                <Text style={styles.settingVal}>Mr. B. Moorthi (+91 9894668646)</Text>
              </View>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Boarding Stop</Text>
                <Text style={styles.settingVal}>{currentStudent.boardingStopName}</Text>
              </View>
            </View>

            {/* Preferences Section */}
            <Text style={styles.settingsSectionTitle}>Notifications & GPS</Text>
            <View style={styles.settingsCard}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Proximity Walk Alerts</Text>
                  <Text style={styles.switchSub}>Notify when {currentStudent.busNumber || 'BUS-01'} is 2 stops away</Text>
                </View>
                <Switch
                  value={proximityAlerts}
                  onValueChange={setProximityAlerts}
                  trackColor={{ false: '#334155', true: '#2563eb' }}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Service Delay Broadcasts</Text>
                  <Text style={styles.switchSub}>Instant alerts for {currentStudent.busNumber || 'BUS-01'} schedule shifts</Text>
                </View>
                <Switch
                  value={delayAlerts}
                  onValueChange={setDelayAlerts}
                  trackColor={{ false: '#334155', true: '#2563eb' }}
                />
              </View>
            </View>

            {/* Emergency & Transport Coordinator Helpline Section */}
            <Text style={styles.settingsSectionTitle}>Transport Support & Helplines</Text>
            
            <TouchableOpacity style={styles.helplineBtn} onPress={() => handleCallHelpline('+919629284690')}>
              <Text style={styles.helplineIcon}>👨‍💼</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.helplineTitle}>Transport Incharge: N.Govindaraju</Text>
                <Text style={styles.helplinePhone}>Mob.No: +91 96292 84690 &bull; Transport Head</Text>
              </View>
              <Text style={styles.callTag}>CALL</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.helplineBtn, { marginTop: 8 }]} onPress={() => handleCallHelpline('+919715540479')}>
              <Text style={styles.helplineIcon}>👨‍🏫</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.helplineTitle}>Transport Coordinator: L.Karthikeyan</Text>
                <Text style={styles.helplinePhone}>AP/Mech &bull; Mob.No: +91 97155 40479</Text>
              </View>
              <Text style={styles.callTag}>CALL</Text>
            </TouchableOpacity>

            {/* Logout / Switch Role */}
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={async () => {
                await authStorage.clearSession();
                router.replace('/');
              }}
            >
              <Text style={styles.signOutText}>Sign Out &bull; Switch Portal</Text>
            </TouchableOpacity>

            {/* Developer Credit */}
            <View style={{ alignItems: 'center', marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1e293b' }}>
              <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700' }}>
                Designed and Developed by <Text style={{ color: '#38bdf8', fontWeight: '900' }}>Kirran S T</Text>
              </Text>
              <Text style={{ color: '#64748b', fontSize: 9.5, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Department of Information Technology
              </Text>
            </View>
          </ScrollView>
        )}
      </View>

      {/* 1-Day Leave Submission Modal */}
      {showLeaveModal && (
        <View style={styles.leaveModalBackdrop}>
          <View style={styles.leaveModalCard}>
            <View style={styles.leaveModalHeader}>
              <View>
                <Text style={styles.leaveModalTitle}>Apply 1-Day Leave</Text>
                <Text style={styles.leaveModalSub}>Notify Driver Mr. B. Moorthi & Admin Portal</Text>
              </View>
              <TouchableOpacity onPress={() => setShowLeaveModal(false)}>
                <Text style={{ color: '#94a3b8', fontSize: 16, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.leaveModalInfoStrip}>
              <Text style={styles.leaveModalInfoText}>
                Assigned Bus: <Text style={{ color: '#f59e0b', fontWeight: 'bold' }}>{currentStudent.busNumber}</Text> &bull; Boarding Stop:{' '}
                <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>{currentStudent.boardingStopName}</Text>
              </Text>
            </View>

            <Text style={styles.leaveFieldLabel}>Select Leave Date:</Text>
            <View style={styles.dateOptionRow}>
              {['Today (20 Sep)', 'Tomorrow (21 Sep)'].map((dateOpt) => (
                <TouchableOpacity
                  key={dateOpt}
                  style={[styles.dateOptionBtn, selectedLeaveDate === dateOpt && styles.dateOptionBtnActive]}
                  onPress={() => setSelectedLeaveDate(dateOpt)}
                >
                  <Text style={[styles.dateOptionText, selectedLeaveDate === dateOpt && styles.dateOptionTextActive]}>
                    {dateOpt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.leaveModalActions}>
              <TouchableOpacity style={styles.leaveModalCancelBtn} onPress={() => setShowLeaveModal(false)}>
                <Text style={styles.leaveModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.leaveModalSubmitBtn}
                onPress={() => {
                  studentRosterStore.setStudentLeave(
                    currentStudent.id,
                    true,
                    '',
                    selectedLeaveDate
                  );
                  setShowLeaveModal(false);
                  Alert.alert(
                    '✅ 1-Day Leave Confirmed',
                    `Your 1-day leave for ${selectedLeaveDate} has been registered.\n\nAssigned Bus: ${currentStudent.busNumber}\nBoarding Stop: ${currentStudent.boardingStopName}\n\nDriver & Admin have been notified.`
                  );
                }}
              >
                <Text style={styles.leaveModalSubmitText}>Confirm 1-Day Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ================= BOTTOM NAVIGATION BAR ================= */}
      <View style={[styles.bottomTabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {(['track', 'stops', 'alerts', 'profile'] as StudentTab[]).map((tab) => {
          const isActive = activeTab === tab;
          const icons: Record<StudentTab, string> = { track: '📍', stops: '🚏', alerts: '🔔', profile: '👤' };
          const labels: Record<StudentTab, string> = { track: 'Live Map', stops: 'Route', alerts: 'Alerts', profile: 'Profile' };
          const hasAlertBadge = tab === 'alerts' && unreadNotifCount > 0;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.tabBarItem}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              {isActive && <View style={styles.tabActiveIndicator} />}
              <View style={styles.tabIconWrap}>
                <Text style={[styles.tabBarIcon, isActive && styles.tabBarIconActive]}>{icons[tab]}</Text>
                {hasAlertBadge && (
                  <View style={styles.tabBadgeDot}>
                    <Text style={styles.tabBadgeDotText}>{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabBarLabel, isActive && styles.tabBarLabelActive]}>{labels[tab]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Permission Modal */}
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
    backgroundColor: '#080c14',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  topHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  topHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  topLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  topAppName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  topBusNumberBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  topBusNumberText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  topRouteSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  topHeaderRight: {
    alignItems: 'flex-end',
  },
  liveStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#059669',
  },
  standbyStatusPill: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  standbyDot: {
    backgroundColor: '#94a3b8',
  },
  liveText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
  },
  standbyText: {
    color: '#94a3b8',
  },
  mainContent: {
    flex: 1,
  },
  routeTerminalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#1e3a8a',
    marginBottom: 12,
  },
  terminalItem: {
    flex: 1,
  },
  terminalLabelGreen: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  terminalLabelRed: {
    color: '#f43f5e',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  terminalName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  terminalTime: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 1,
  },
  terminalArrowBox: {
    paddingHorizontal: 8,
  },
  terminalArrow: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '900',
  },
  compactMapWrapper: {
    marginBottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
  },
  studentRadarCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  radarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  busNumberHeroChip: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  busNumberHeroChipText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  radarBusPlate: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  speedPill: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  speedPillText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '800',
  },
  radarDistanceText: {
    color: '#38bdf8',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  walkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
    gap: 6,
  },
  walkIcon: {
    fontSize: 16,
  },
  walkTime: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '800',
  },
  walkDist: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '600',
  },
  trafficTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  trafficSmooth: {
    backgroundColor: '#064e3b',
    borderColor: '#059669',
  },
  trafficMod: {
    backgroundColor: '#1e3a8a',
    borderColor: '#3b82f6',
  },
  trafficHeavy: {
    backgroundColor: '#7f1d1d',
    borderColor: '#ef4444',
  },
  trafficTagText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  dynamicEtaBanner: {
    backgroundColor: '#020617',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  dynamicEtaSub: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  dynamicEtaClock: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  dynamicEtaCountdown: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  delayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  delayBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  stopInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  stopInfoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  stopLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stopNameText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  stopTimeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
  },
  scrollPage: {
    flex: 1,
  },
  busSummaryCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#f59e0b',
  },
  busSummaryBadge: {
    backgroundColor: '#f59e0b',
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  busSummaryBadgeSub: {
    color: '#000000',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  busSummaryBadgeNum: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  busSummaryTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  busSummaryVehicle: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  busSummaryDriver: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  speedAdjustmentAdvisory: {
    backgroundColor: '#0c4a6e',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  speedAdjustmentText: {
    color: '#e0f2fe',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  scheduleToggleCard: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#2563eb',
  },
  toggleBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  toggleBtnTextActive: {
    color: '#ffffff',
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  timelineCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  timelineCardBoarding: {
    borderColor: '#f59e0b',
    backgroundColor: '#17130a',
  },
  timelineBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineBadgePassed: {
    backgroundColor: '#059669',
  },
  timelineBadgeNext: {
    backgroundColor: '#f59e0b',
  },
  timelineBadgeText: {
    color: '#38bdf8',
    fontWeight: '900',
    fontSize: 12,
  },
  timelineBadgeTextActive: {
    color: '#ffffff',
  },
  timelineStopName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  timelineStopNamePassed: {
    color: '#94a3b8',
  },
  yourStopTag: {
    backgroundColor: '#f59e0b',
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timelineEta: {
    color: '#64748b',
    fontSize: 11,
  },
  timelineLiveEta: {
    fontSize: 11,
    fontWeight: '700',
  },
  timelineLiveEtaPassed: {
    color: '#64748b',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1e293b',
  },
  statusTagPassed: {
    backgroundColor: '#064e3b',
  },
  statusTagNext: {
    backgroundColor: '#78350f',
  },
  statusTagText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
  },
  statusTagTextPassed: {
    color: '#34d399',
  },
  statusTagTextNext: {
    color: '#fbbf24',
  },
  busAlertInfoBox: {
    backgroundColor: '#172554',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e40af',
  },
  busAlertInfoText: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '600',
  },
  notifCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notifTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  notifTime: {
    color: '#64748b',
    fontSize: 10,
  },
  notifBody: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
  },
  profileHeroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  profileName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  profileMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  profileBusHeroBadge: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  profileBusHeroBadgeText: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  settingsSectionTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  leaveControlCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  leaveControlCardActive: {
    borderColor: '#ef4444',
    backgroundColor: '#1a0d10',
  },
  leaveControlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  leaveControlTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  leaveControlSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    maxWidth: 200,
  },
  leaveStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  leaveStatusTagActive: {
    backgroundColor: '#450a0a',
    borderColor: '#ef4444',
  },
  leaveStatusTagInactive: {
    backgroundColor: '#064e3b',
    borderColor: '#059669',
  },
  leaveStatusTagText: {
    fontSize: 10,
    fontWeight: '900',
  },
  leaveStatusTagTextActive: {
    color: '#f87171',
  },
  leaveStatusTagTextInactive: {
    color: '#34d399',
  },
  leaveActiveInfoBox: {
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 4,
  },
  leaveDetailLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  leaveDetailVal: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  revokeLeaveBtn: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  revokeLeaveBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  applyLeaveBtn: {
    backgroundColor: '#e11d48',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  applyLeaveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  settingsCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  settingLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  settingVal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  busNumberInlineBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  busNumberInlineText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  switchSub: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  helplineBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  helplineIcon: {
    fontSize: 22,
  },
  helplineTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  helplinePhone: {
    color: '#38bdf8',
    fontSize: 11,
    marginTop: 2,
  },
  callTag: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  signOutBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  signOutText: {
    color: '#f43f5e',
    fontWeight: '800',
    fontSize: 13,
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingVertical: 6,
    paddingBottom: Platform.OS === 'ios' ? 20 : 6,
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  tabActiveIndicator: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 3,
    borderRadius: 2,
    backgroundColor: '#38bdf8',
  },
  tabIconWrap: {
    position: 'relative',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  tabBadgeDot: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#ef4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: '#0f172a',
  },
  tabBadgeDotText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
  tabBarItemActive: {
    // handled by tabActiveIndicator
  },
  tabBarIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabBarIconActive: {
    opacity: 1,
  },
  tabBarLabel: {
    color: '#64748b',
    fontSize: 9.5,
    fontWeight: '700',
  },
  tabBarLabelActive: {
    color: '#38bdf8',
    fontWeight: '800',
  },
  // Quick Info Row
  quickInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  quickInfoCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  quickInfoIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  quickInfoValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  quickInfoLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  // Driver Contact Card
  driverContactCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  driverContactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  driverContactName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  driverContactRole: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 1,
  },
  driverContactReg: {
    color: '#38bdf8',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  driverCallBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
  },
  driverCallBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  studentLeaveNoticeCard: {
    backgroundColor: '#450a0a',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    marginBottom: 12,
  },
  leaveNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  leaveNoticeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaveNoticeTitle: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '900',
  },
  leaveNoticeSub: {
    color: '#e2e8f0',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  leaveReasonPill: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaveReasonText: {
    color: '#fde68a',
    fontSize: 11,
    fontWeight: '700',
  },
  cancelLeaveQuickBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cancelLeaveQuickText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  leaveModalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 99,
  },
  leaveModalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#334155',
  },
  leaveModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leaveModalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  leaveModalSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  leaveModalInfoStrip: {
    backgroundColor: '#020617',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  leaveModalInfoText: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  leaveFieldLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  dateOptionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dateOptionBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dateOptionBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#60a5fa',
  },
  dateOptionText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  dateOptionTextActive: {
    color: '#ffffff',
  },
  leaveModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  leaveModalCancelBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  leaveModalCancelText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  leaveModalSubmitBtn: {
    flex: 2,
    backgroundColor: '#e11d48',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  leaveModalSubmitText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  swapNoticeCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#818cf8',
    marginBottom: 12,
  },
  swapNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  swapNoticeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(129, 140, 248, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapNoticeTitle: {
    color: '#c7d2fe',
    fontSize: 12,
    fontWeight: '900',
  },
  swapNoticeMessage: {
    color: '#e2e8f0',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  swapNoticeReason: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 3,
  },
  callSubDriverBtn: {
    backgroundColor: '#4338ca',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  callSubDriverBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  standbyReplacementPill: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  standbyReplacementText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  subDriverActivePill: {
    backgroundColor: '#d97706',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subDriverActiveText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  swapNotifCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#818cf8',
  },
  swapNotifTitle: {
    color: '#c7d2fe',
    fontSize: 13,
    fontWeight: '900',
  },
  swapNotifTimeBadge: {
    backgroundColor: '#6366f1',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  swapNotifBody: {
    color: '#e0e7ff',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  notifCallBtn: {
    backgroundColor: '#4338ca',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  notifCallBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  emergencySosBanner: {
    backgroundColor: '#450a0a',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  emergencySosHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  emergencySosIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#7f1d1d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencySosTitle: {
    color: '#fecaca',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  emergencySosActiveBadge: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emergencySosMsg: {
    color: '#fee2e2',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    lineHeight: 16,
  },
  emergencySosMeta: {
    color: '#f87171',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  emergencySosCallBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  emergencySosCallBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  emergencyNotifCard: {
    backgroundColor: '#2a080c',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#f87171',
  },
  emergencyNotifTitle: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '900',
  },
  emergencyNotifUrgentBadge: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emergencyNotifBody: {
    color: '#fee2e2',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
    fontWeight: '600',
  },
  emergencyMetaRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#450a0a',
  },
  emergencyMetaText: {
    color: '#fca5a5',
    fontSize: 10,
    fontWeight: '600',
  },
  notifCallEmergencyBtn: {
    backgroundColor: '#b91c1c',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  notifCallEmergencyBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  incomingToastBanner: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  toastIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    flex: 1,
  },
  toastBadge: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  toastBody: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  alertModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 99999,
  },
  alertModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  alertModalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1e3a8a',
    borderWidth: 2,
    borderColor: '#60a5fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertModalBadge: {
    backgroundColor: '#1d4ed8',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  alertModalTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  alertModalMessageWrap: {
    backgroundColor: '#090d16',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    width: '100%',
    marginBottom: 16,
  },
  alertModalMessage: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  alertModalFooter: {
    width: '100%',
  },
  alertModalCloseBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  alertModalCloseText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  headerBellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 6,
  },
  headerBellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#0f172a',
  },
  headerBellBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  notifModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  notifModalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  notifModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#090d16',
  },
  notifModalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  notifModalSub: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  notifModalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifEmptyBox: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  notifEmptyText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  notifEmptySub: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  notifCardItem: {
    backgroundColor: '#0a0e17',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  notifCardTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  notifBadgeTag: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  notifBadgeTagText: {
    color: '#60a5fa',
    fontSize: 8.5,
    fontWeight: '900',
  },
  notifCardBody: {
    color: '#cbd5e1',
    fontSize: 11.5,
    marginTop: 4,
    lineHeight: 16,
  },
  notifCardTime: {
    color: '#64748b',
    fontSize: 9.5,
    marginTop: 6,
    fontWeight: '600',
  },
  notifModalFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#090d16',
  },
  markAllReadBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  markAllReadText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
  },
});

