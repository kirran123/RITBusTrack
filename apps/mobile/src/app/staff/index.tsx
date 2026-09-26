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
  fetchSystemNotificationsFromDB,
  fetchLatestBusLocation, 
  BusTelemetryPayload, 
  FleetSwapNotice 
} from '../../services/supabase';
import { GPSCoordinate, INITIAL_STOPS, SIMULATION_ROUTE_A, EmergencyAlert, SystemNotification } from '@college-bus/shared';

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
  const [activeTab, setActiveTab] = useState<StaffTab>('track');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [scheduleType, setScheduleType] = useState<'morning' | 'evening'>('morning');

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

  // Commuter Faculty Profile & Realtime Leave State
  const [facultyProfile, setFacultyProfile] = useState<FacultyCommuter>({
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
    routeId: 'Route 1 (Rajapalayam - RIT)',
    passNumber: 'FAC-PASS-2024-88',
    isOnLeave: false,
  });

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedLeaveDate, setSelectedLeaveDate] = useState('Today (20 Sep)');

  // Notification / App preferences
  const [proximityAlerts, setProximityAlerts] = useState(true);
  const [swapAlerts, setSwapAlerts] = useState(true);
  const [announcementAlerts, setAnnouncementAlerts] = useState(true);

  // Staff device GPS location
  const [staffLocation, setStaffLocation] = useState<GPSCoordinate | null>(null);

  // Live Bus Location (synced from Driver via Supabase Realtime / Simulation)
  const [busLocation, setBusLocation] = useState<GPSCoordinate>({
    latitude: SIMULATION_ROUTE_A[0].latitude,
    longitude: SIMULATION_ROUTE_A[0].longitude,
    speed: SIMULATION_ROUTE_A[0].speed,
    heading: 45,
  });

  const [currentStopIndex, setCurrentStopIndex] = useState(1);
  const [lastUpdatedSec, setLastUpdatedSec] = useState(1);
  const [isDriverActive, setIsDriverActive] = useState(true);

  // Assigned Faculty Boarding Stop: PACR Mill Circle (Stop 3)
  const staffBoardingStop = INITIAL_STOPS[2] || INITIAL_STOPS[0];

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const storedCurrent = window.localStorage.getItem('bustrack_current_mobile_staff');
        if (storedCurrent) {
          const parsed = JSON.parse(storedCurrent);
          if (parsed && parsed.name) {
            setFacultyProfile(prev => ({
              ...prev,
              id: parsed.id || prev.id,
              name: parsed.name || prev.name,
              staffId: parsed.employee_id || prev.staffId,
              designation: parsed.designation || prev.designation,
              department: parsed.department || prev.department,
              phone: parsed.phone || prev.phone,
              email: parsed.email || prev.email,
              busNumber: parsed.bus?.bus_number || parsed.bus_id || prev.busNumber,
              boardingStopName: parsed.boarding_stop?.stop_name || prev.boardingStopName,
              isOnLeave: parsed.is_on_leave || false,
            }));
          }
        }
      } catch (e) {}
    }

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

    // 6. Polling sync for cross-client notifications
    const notifPollTimer = setInterval(() => {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem('bustrack_notifications_v1');
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.length > 0) {
              setSystemBroadcasts((prev) => {
                const prevIds = new Set(prev.map((n) => n.id));
                const newItems = list.filter((n: any) => !prevIds.has(n.id));
                if (newItems.length > 0) {
                  const newest = newItems[0];
                  setIncomingAlertModal(newest);
                  setIncomingToast(newest);
                  notificationService.sendPushNotification(`📢 ${newest.title}`, newest.message, newest.type || 'broadcast');
                  return [...newItems, ...prev];
                }
                return prev;
              });
            }
          }
        } catch {}
      }
    }, 2500);

    // 7. Seconds counter for telemetry freshness and dynamic ETA recalibration
    const secTimer = setInterval(() => {
      setLastUpdatedSec((prev) => prev + 1);
    }, 1000);

    return () => {
      unsubscribe();
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
        '🔔 Staff Push Notifications Active',
        'You will now receive live bus arrival notices, driver updates, and standby vehicle swap alerts in your mobile notification bar!'
      );
    }
  };

  const checkAndFetchStaffLocation = async () => {
    const perm = await locationTracker.checkPermissions();
    if (perm.granted) {
      setHasLocationPermission(true);
      const pos = await locationTracker.getCurrentPosition();
      if (pos) {
        setStaffLocation(pos);
      } else {
        setStaffLocation({
          latitude: 9.4490,
          longitude: 77.5480,
          accuracy: 6,
        });
      }
    } else {
      setHasLocationPermission(false);
      setStaffLocation({
        latitude: 9.4490,
        longitude: 77.5480,
        accuracy: 6,
      });
    }
  };

  const handleRequestPermission = async () => {
    const granted = await locationTracker.requestForegroundPermission();
    if (granted) {
      setHasLocationPermission(true);
      const pos = await locationTracker.getCurrentPosition();
      if (pos) setStaffLocation(pos);
      Alert.alert('✅ Location Access Active', 'Your faculty live location is pinpointed on the map.');
    } else {
      setShowPermModal(true);
    }
  };

  const handleCallDriver = (phone: string = '+919842100001') => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleCallHelpline = (phone: string = '+919629284690') => {
    Linking.openURL(`tel:${phone}`);
  };

  // Distance calculations
  const distanceToBoardingStopKm = staffLocation
    ? calculateDistanceKm(
        staffLocation.latitude,
        staffLocation.longitude,
        staffBoardingStop.latitude,
        staffBoardingStop.longitude
      )
    : 0.28;

  const walkingMinutes = Math.max(1, Math.round((distanceToBoardingStopKm / 4.5) * 60));

  const distanceBusToStopKm = calculateDistanceKm(
    busLocation.latitude,
    busLocation.longitude,
    staffBoardingStop.latitude,
    staffBoardingStop.longitude
  );

  const remainingStopsToBoarding = Math.max(
    0,
    INITIAL_STOPS.findIndex((s) => s.id === staffBoardingStop.id) - currentStopIndex
  );

  // Dynamic ETA
  const dynamicETA: DynamicETA = calculateDynamicETA(
    distanceBusToStopKm,
    busLocation.speed || 0,
    remainingStopsToBoarding,
    staffBoardingStop.estimated_arrival
  );

  const walkingDistanceFormatted = formatDistance(distanceToBoardingStopKm);

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

  return (
    <View style={styles.screenContainer}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* TOP STATUS HEADER */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.topLogo}>
            <Text style={{ fontSize: 18 }}>👔</Text>
          </View>
          <View>
            <Text style={styles.topAppName}>Faculty Bus Tracking</Text>
            <Text style={styles.topSubtitle}>
              {facultyProfile.name} &bull; {facultyProfile.department}
            </Text>
          </View>
        </View>

        <View style={styles.topHeaderRight}>
          <View style={styles.liveStatusPill}>
            <View style={[styles.liveDot, { backgroundColor: isDriverActive ? '#34d399' : '#f59e0b' }]} />
            <Text style={styles.liveText}>{isDriverActive ? 'LIVE GPS' : 'STANDBY'}</Text>
          </View>
        </View>
      </View>

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

      {/* NOTIFICATION PERMISSION BANNER */}
      {!hasNotificationPermission && (
        <NotificationPermissionBanner
          isGranted={hasNotificationPermission}
          onRequestPermission={handleRequestNotificationPermission}
        />
      )}

      {/* LOCATION PERMISSION BANNER */}
      {!hasLocationPermission && (
        <LocationPermissionBanner
          role="student"
          isGranted={hasLocationPermission}
          onRequestPermission={handleRequestPermission}
          onOpenSettings={() => locationTracker.openSettings()}
        />
      )}

      {/* MAIN CONTENT AREA */}
      <View style={styles.mainContent}>
        {/* ================= TAB 1: 📍 TRACK & LIVE PROXIMITY RADAR ================= */}
        {activeTab === 'track' && (
          <ScrollView style={styles.scrollPage} contentContainerStyle={{ padding: 14 }}>
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
                      Bus: {facultyProfile.busNumber || 'BUS-01'} &bull; {new Date(emergencyAlerts[0].created_at).toLocaleTimeString()}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.emergencySosCallBtn}
                  onPress={() => Linking.openURL('tel:+919629284690')}
                >
                  <Text style={styles.emergencySosCallBtnText}>📞 Call Transport Incharge: N.Govindaraju (+91 96292 84690)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* REAL-TIME FLEET DRIVER / VEHICLE SWAP NOTICE BANNER */}
            {activeSwapNotice && (
              <View style={styles.swapNoticeCard}>
                <View style={styles.swapNoticeHeader}>
                  <View style={styles.swapNoticeIconWrap}>
                    <Text style={{ fontSize: 18 }}>{activeSwapNotice.type === 'driver_swap' ? '👨‍✈️' : '🔄'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.swapNoticeTitle}>{activeSwapNotice.title}</Text>
                    <Text style={styles.swapNoticeMessage}>{activeSwapNotice.message}</Text>
                    {activeSwapNotice.reason && (
                      <Text style={styles.swapNoticeReason}>
                        Reason: <Text style={{ color: '#fef08a' }}>{activeSwapNotice.reason}</Text>
                      </Text>
                    )}
                  </View>
                </View>
                {activeSwapNotice.substituteDriverPhone && (
                  <TouchableOpacity
                    style={styles.callSubDriverBtn}
                    onPress={() => handleCallDriver(activeSwapNotice.substituteDriverPhone)}
                  >
                    <Text style={styles.callSubDriverBtnText}>
                      📞 Call Sub Driver ({activeSwapNotice.substituteDriverPhone})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* LEAVE NOTICE BANNER (If Faculty Marked 1-Day Leave) */}
            {facultyProfile.isOnLeave && (
              <View style={styles.facultyLeaveNoticeCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>🏖️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leaveNoticeTitle}>1-Day Leave Active ({facultyProfile.leaveDate})</Text>
                    <Text style={styles.leaveNoticeSubtitle}>
                      Driver Mr. B. Moorthi has been notified. Bus will not hold at {staffBoardingStop.stop_name}.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.cancelLeaveSmallBtn} onPress={handleCancelStaffLeave}>
                  <Text style={styles.cancelLeaveSmallBtnText}>Cancel Leave</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* DESIGNATED ROUTE START & TERMINAL BANNER */}
            <View style={styles.routeTerminalCard}>
              <View style={styles.terminalItem}>
                <Text style={styles.terminalLabelGreen}>🟢 ORIGIN</Text>
                <Text style={styles.terminalName}>Rajapalayam New Bus Stand</Text>
                <Text style={styles.terminalTime}>Dep: 07:30 AM</Text>
              </View>
              <View style={styles.terminalArrowBox}>
                <Text style={styles.terminalArrow}>➔</Text>
              </View>
              <View style={styles.terminalItem}>
                <Text style={styles.terminalLabelRed}>🏁 DESTINATION</Text>
                <Text style={styles.terminalName}>RIT College Campus Hub</Text>
                <Text style={styles.terminalTime}>Arr: 08:20 AM</Text>
              </View>
            </View>

            {/* LIVE MOVING MAP */}
            <View style={styles.mapWrapper}>
              <OSMMapView
                busLocation={busLocation}
                userLocation={staffLocation || undefined}
                boardingStop={staffBoardingStop}
                busNumber={activeSwapNotice?.replacementBusNumber || facultyProfile.busNumber}
                routeNumber="Route 1"
                routeColor="#2563eb"
                stops={INITIAL_STOPS.slice(0, 5)}
                height={260}
              />
            </View>

            {/* TELEMETRY FRESHNESS BAR */}
            <View style={styles.freshnessBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.pulseDot, { backgroundColor: isDriverActive ? '#34d399' : '#f59e0b' }]} />
                <Text style={styles.freshnessText}>
                  {isDriverActive ? 'Live Driver GPS Connected' : 'Simulated GPS Stream'} &bull; Updated {lastUpdatedSec}s ago
                </Text>
              </View>
              <Text style={styles.speedText}>{Math.round(busLocation.speed || 32)} km/h</Text>
            </View>

            {/* DYNAMIC COMMUTER RADAR CARD */}
            <View style={styles.radarCard}>
              <View style={styles.radarTopRow}>
                <View>
                  <Text style={styles.radarSubLabel}>STAFF BOARDING RADAR</Text>
                  <Text style={styles.radarStopTitle}>{staffBoardingStop.stop_name}</Text>
                </View>
                <View style={styles.radarStatusPill}>
                  <Text style={styles.radarStatusText}>
                    {dynamicETA.statusTag === 'ON_TIME' ? 'ON TIME' : dynamicETA.statusTag === 'DELAYED' ? 'DELAYED' : 'NEARBY'}
                  </Text>
                </View>
              </View>

              <View style={styles.etaHighlightBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.etaTimeText}>{dynamicETA.arrivalTimeStr}</Text>
                  <Text style={styles.etaRelativeText}>
                    Estimated in ~{dynamicETA.etaMinutes} mins &bull; {formatDistance(distanceBusToStopKm)} away
                  </Text>
                </View>
                <View style={styles.busAvatarBox}>
                  <Text style={{ fontSize: 24 }}>🚌</Text>
                  <Text style={styles.busAvatarNum}>
                    {activeSwapNotice?.replacementBusNumber || facultyProfile.busNumber}
                  </Text>
                </View>
              </View>



              {/* Traffic / Delay Condition */}
              <View style={styles.trafficStrip}>
                <Text style={{ fontSize: 13 }}>🟢</Text>
                <Text style={styles.trafficText}>Normal morning traffic corridor. Smooth progression expected.</Text>
              </View>
            </View>

            {/* LIVE DRIVER CARD WITH DIRECT CALL */}
            <View style={styles.driverContactCard}>
              <View style={styles.driverInfoLeft}>
                <View style={styles.driverAvatar}>
                  <Text style={{ fontSize: 20 }}>👨‍✈️</Text>
                </View>
                <View>
                  <Text style={styles.driverName}>
                    {activeSwapNotice?.substituteDriverName || 'Mr. B. Moorthi'}
                  </Text>
                  <Text style={styles.driverRole}>
                    {activeSwapNotice?.type === 'driver_swap' ? 'Assigned Substitute Driver' : 'Primary Route Driver'} &bull; {facultyProfile.busNumber || 'BUS-01'}
                  </Text>
                  <Text style={styles.driverPhone}>
                    {activeSwapNotice?.substituteDriverPhone || '+91 9894668646'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.callDriverBtn}
                onPress={() => handleCallDriver(activeSwapNotice?.substituteDriverPhone || '+919894668646')}
              >
                <Text style={styles.callDriverBtnText}>📞 CALL</Text>
              </TouchableOpacity>
            </View>

            {/* QUICK 1-DAY LEAVE ACTION */}
            {!facultyProfile.isOnLeave && (
              <TouchableOpacity
                style={styles.quickLeaveBtn}
                onPress={() => setShowLeaveModal(true)}
              >
                <Text style={{ fontSize: 16 }}>📝</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickLeaveBtnTitle}>Not taking the bus today?</Text>
                  <Text style={styles.quickLeaveBtnSub}>Mark 1-Day Leave so the driver doesn't wait at your stop.</Text>
                </View>
                <Text style={styles.quickLeaveBtnArrow}>➔</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* ================= TAB 2: 🚏 ROUTE STOPS & TIMELINE ================= */}
        {activeTab === 'stops' && (
          <ScrollView style={styles.scrollPage} contentContainerStyle={{ padding: 14 }}>
            {/* Morning vs Evening Toggle */}
            <View style={styles.scheduleToggleBar}>
              <TouchableOpacity
                style={[styles.scheduleToggleBtn, scheduleType === 'morning' && styles.scheduleToggleBtnActive]}
                onPress={() => setScheduleType('morning')}
              >
                <Text style={[styles.scheduleToggleText, scheduleType === 'morning' && styles.scheduleToggleTextActive]}>
                  🌅 Morning (To Campus &bull; 07:30 AM)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scheduleToggleBtn, scheduleType === 'evening' && styles.scheduleToggleBtnActive]}
                onPress={() => setScheduleType('evening')}
              >
                <Text style={[styles.scheduleToggleText, scheduleType === 'evening' && styles.scheduleToggleTextActive]}>
                  🌆 Evening (Return &bull; 04:45 PM)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Route Summary Card */}
            <View style={styles.routeHeaderCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.routeHeaderTitle}>Route 1: Rajapalayam to RIT Campus</Text>
                  <Text style={styles.routeHeaderSub}>Via Gandhi Statue &bull; PACR Mill &bull; Samsigapuram Rd</Text>
                </View>
                <View style={styles.busTagPill}>
                  <Text style={styles.busTagPillText}>{facultyProfile.busNumber || 'BUS-01'}</Text>
                </View>
              </View>
            </View>

            {/* Stops Timeline */}
            <Text style={styles.sectionHeading}>Live Stop Sequence & Dynamic Arrival Radar</Text>
            {INITIAL_STOPS.slice(0, 5).map((stop, idx) => {
              const isStaffStop = stop.id === staffBoardingStop.id;
              const isPassed = idx < currentStopIndex;
              const isCurrent = idx === currentStopIndex;

              const stopDist = calculateDistanceKm(
                busLocation.latitude,
                busLocation.longitude,
                stop.latitude,
                stop.longitude
              );

              const stopETA = calculateDynamicETA(
                stopDist,
                busLocation.speed || 0,
                Math.max(0, idx - currentStopIndex),
                stop.estimated_arrival
              );

              return (
                <View
                  key={stop.id}
                  style={[
                    styles.stopTimelineCard,
                    isStaffStop && styles.stopTimelineCardStaff,
                    isCurrent && styles.stopTimelineCardCurrent,
                  ]}
                >
                  <View style={styles.timelineLeftColumn}>
                    <View
                      style={[
                        styles.stopBadgeCircle,
                        isPassed && styles.stopBadgePassed,
                        isCurrent && styles.stopBadgeCurrent,
                        isStaffStop && styles.stopBadgeStaff,
                      ]}
                    >
                      <Text style={styles.stopBadgeText}>{isPassed ? '✓' : idx + 1}</Text>
                    </View>
                    {idx < 4 && <View style={[styles.timelineLine, isPassed && styles.timelineLinePassed]} />}
                  </View>

                  <View style={styles.timelineContent}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[styles.stopNameText, isStaffStop && styles.stopNameTextStaff]}>
                            {stop.stop_name}
                          </Text>
                          {isStaffStop && (
                            <View style={styles.staffStopBadge}>
                              <Text style={styles.staffStopBadgeText}>⭐ YOUR DESIGNATED STOP</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.stopTimeText}>
                          Sched: {stop.estimated_arrival} &bull; <Text style={{ color: isPassed ? '#64748b' : stopETA.statusColor, fontWeight: 'bold' }}>{isPassed ? 'Passed' : `Expected: ${stopETA.arrivalTimeStr}`}</Text> ({formatDistance(stopDist)})
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.stopStatusBadge,
                          isPassed && styles.stopStatusPassed,
                          isCurrent && styles.stopStatusCurrent,
                        ]}
                      >
                        <Text style={styles.stopStatusBadgeText}>
                          {isPassed ? 'DEPARTED' : isCurrent ? 'BUS ARRIVED' : stopETA.statusLabel}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* ================= TAB 3: 🔔 ALERTS & BROADCASTS ================= */}
        {activeTab === 'alerts' && (
          <ScrollView style={styles.scrollPage} contentContainerStyle={{ padding: 14 }}>
            {/* Quick Trigger for Mobile Notification Bar */}
            <View style={styles.testNotificationCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>📱</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testNotificationTitle}>Push Notifications to Mobile Bar</Text>
                  <Text style={styles.testNotificationSub}>
                    Driver changes, bus swaps, and announcements deliver directly to your phone's notification bar.
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.sendTestPushBtn} onPress={triggerTestNotification}>
                <Text style={styles.sendTestPushBtnText}>🔔 Send Test Push to Mobile Bar</Text>
              </TouchableOpacity>
            </View>

            {/* Active Realtime Emergency SOS Broadcasts */}
            {systemBroadcasts.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.sectionHeading}>Campus Transport Broadcasts ({systemBroadcasts.length})</Text>
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
                    <View key={notif.id} style={[styles.emergencyNotifCard, { borderColor: badge.bg, backgroundColor: '#0f172a' }]}>
                      <View style={styles.emergencyNotifHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Text style={{ fontSize: 16 }}>{badge.icon}</Text>
                          <Text style={[styles.emergencyNotifTitle, { color: '#ffffff', flex: 1 }]} numberOfLines={1}>{notif.title}</Text>
                        </View>
                        <View style={{ backgroundColor: badge.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ color: badge.text, fontSize: 9, fontWeight: '900' }}>{badge.label}</Text>
                        </View>
                      </View>
                      <Text style={[styles.emergencyNotifBody, { color: '#cbd5e1' }]}>{notif.message}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#1e293b' }}>
                        <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '600' }}>
                          Target: {(notif.target_type || 'all').toUpperCase()}
                        </Text>
                        <Text style={{ color: '#94a3b8', fontSize: 10 }}>
                          {notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Active Realtime Emergency SOS Broadcasts */}
            {emergencyAlerts.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.sectionHeading, { color: '#f87171' }]}>🚨 Active Critical Emergencies ({emergencyAlerts.length})</Text>
                {emergencyAlerts.map((alert) => (
                  <View key={alert.id} style={styles.emergencyNotifCard}>
                    <View style={styles.emergencyNotifHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.emergencyNotifTitle}>
                          🚨 EMERGENCY: {alert.type?.toUpperCase() || 'CRITICAL INCIDENT'}
                        </Text>
                      </View>
                      <Text style={styles.emergencyNotifUrgentBadge}>URGENT</Text>
                    </View>
                    <Text style={styles.emergencyNotifBody}>{alert.message}</Text>
                    <View style={styles.emergencyMetaRow}>
                      <Text style={styles.emergencyMetaText}>
                        Bus: <Text style={{ color: '#fca5a5', fontWeight: 'bold' }}>{facultyProfile.busNumber || 'BUS-01'}</Text> &bull; Driver: Mr. B. Moorthi &bull; Lat/Lng: [{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}]
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.notifCallEmergencyBtn}
                      onPress={() => Linking.openURL('tel:+919629284690')}
                    >
                      <Text style={styles.notifCallEmergencyBtnText}>📞 Contact Transport Incharge: N.Govindaraju (+91 96292 84690)</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Active Realtime Fleet Swap Notices */}
            <Text style={styles.sectionHeading}>Driver & Standby Bus Updates ({swapNoticesList.length})</Text>
            {swapNoticesList.length === 0 ? (
              <View style={styles.emptyAlertBox}>
                <Text style={styles.emptyAlertText}>
                  🟢 No active bus or driver swaps. Regular {facultyProfile.busNumber || 'BUS-01'} & Driver Mr. B. Moorthi are on duty.
                </Text>
              </View>
            ) : (
              swapNoticesList.map((notice) => (
                <View key={notice.id} style={styles.swapAlertCard}>
                  <View style={styles.swapAlertHeader}>
                    <Text style={{ fontSize: 18 }}>{notice.type === 'driver_swap' ? '👨‍✈️' : '🔄'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.swapAlertTitle}>{notice.title}</Text>
                      <Text style={styles.swapAlertTimestamp}>
                        {new Date(notice.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={styles.swapBadgePill}>
                      <Text style={styles.swapBadgePillText}>
                        {notice.type === 'driver_swap' ? 'DRIVER CHANGE' : 'VEHICLE SWAP'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.swapAlertBody}>{notice.message}</Text>
                  {notice.substituteDriverPhone && (
                    <TouchableOpacity
                      style={styles.callSubDriverBtn}
                      onPress={() => handleCallDriver(notice.substituteDriverPhone)}
                    >
                      <Text style={styles.callSubDriverBtnText}>
                        📞 Contact {notice.substituteDriverName} ({notice.substituteDriverPhone})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}

            {/* Transport Office Official Announcements */}
            <Text style={[styles.sectionHeading, { marginTop: 14 }]}>Official College Transit Broadcasts</Text>
            <View style={styles.announcementCard}>
              <View style={styles.announcementTop}>
                <Text style={styles.announcementTag}>CAMPUS ADVISORY</Text>
                <Text style={styles.announcementTime}>Today &bull; 06:45 AM</Text>
              </View>
              <Text style={styles.announcementTitle}>Morning Corridor Clearance & Route 1 Update</Text>
              <Text style={styles.announcementBody}>
                All college buses on Route 1 are operating under normal schedule. Staff and students are requested to reach their designated stops 5 minutes prior to ETA.
              </Text>
            </View>

            <View style={styles.announcementCard}>
              <View style={styles.announcementTop}>
                <Text style={styles.announcementTag}>EXAM SCHEDULE</Text>
                <Text style={styles.announcementTime}>Yesterday</Text>
              </View>
              <Text style={styles.announcementTitle}>Special Evening Departure for End-Semester Duties</Text>
              <Text style={styles.announcementBody}>
                Evening faculty buses will operate an additional return service at 05:30 PM for invigilation staff during internal assessments.
              </Text>
            </View>

            {/* Emergency Transport Helpline */}
            <View style={styles.helplineCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text style={{ fontSize: 20 }}>☎️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.helplineTitle}>Transport Help Desk & Coordinators</Text>
                  <Text style={styles.helplineSub}>Official Incharge & Department Faculty Coordinator</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.helplineBtn} onPress={() => handleCallHelpline('+919629284690')}>
                <Text style={styles.helplineBtnText}>📞 Transport Incharge: N.Govindaraju (+91 96292 84690)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.helplineBtn, { marginTop: 8, backgroundColor: '#0284c7' }]} onPress={() => handleCallHelpline('+919715540479')}>
                <Text style={styles.helplineBtnText}>📞 Transport Coordinator: L.Karthikeyan, AP/Mech (+91 97155 40479)</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ================= TAB 4: 👤 FACULTY PASS & SETTINGS ================= */}
        {activeTab === 'profile' && (
          <ScrollView style={styles.scrollPage} contentContainerStyle={{ padding: 14 }}>
            {/* Faculty Digital Bus Pass Card */}
            <View style={styles.busPassCard}>
              <View style={styles.busPassHeader}>
                <View>
                  <Text style={styles.busPassCollege}>RAMCO INSTITUTE OF TECHNOLOGY</Text>
                  <Text style={styles.busPassType}>FACULTY BUS TRANSPORT PASS</Text>
                </View>
                <View style={styles.busPassSeal}>
                  <Text style={{ fontSize: 16 }}>🏛️</Text>
                </View>
              </View>

              <View style={styles.busPassBody}>
                <View style={styles.busPassAvatar}>
                  <Text style={{ fontSize: 28 }}>👔</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.passHolderName}>{facultyProfile.name}</Text>
                  <Text style={styles.passHolderDesignation}>{facultyProfile.designation}</Text>
                  <Text style={styles.passHolderDept}>{facultyProfile.department}</Text>
                  <Text style={styles.passHolderId}>Staff ID: {facultyProfile.staffId}</Text>
                </View>
              </View>

              <View style={styles.busPassDetailsGrid}>
                <View style={styles.passGridItem}>
                  <Text style={styles.passGridLabel}>Assigned Bus</Text>
                  <Text style={styles.passGridVal}>{facultyProfile.busNumber}</Text>
                </View>
                <View style={styles.passGridItem}>
                  <Text style={styles.passGridLabel}>Route</Text>
                  <Text style={styles.passGridVal}>Route 1</Text>
                </View>
                <View style={styles.passGridItem}>
                  <Text style={styles.passGridLabel}>Staff Boarding Stop</Text>
                  <Text style={styles.passGridVal}>{facultyProfile.boardingStopName}</Text>
                </View>
              </View>

              <View style={styles.passFooter}>
                <View style={styles.passValidBadge}>
                  <Text style={styles.passValidText}>VALID FOR ACADEMIC YEAR 2024-2025</Text>
                </View>
              </View>
            </View>

            {/* 1-Day Faculty Leave Section */}
            <View style={styles.leaveSectionCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 18 }}>📝</Text>
                <Text style={styles.leaveSectionTitle}>1-Day Bus Leave Declaration</Text>
              </View>
              <Text style={styles.leaveSectionSub}>
                If you are taking personal leave, official travel, or commuting via private vehicle, declare your 1-day absence so the bus does not hold up schedule at your stop.
              </Text>

              {facultyProfile.isOnLeave ? (
                <View style={styles.activeLeaveBox}>
                  <Text style={styles.activeLeaveText}>
                    ✅ Leave active for <Text style={{ fontWeight: 'bold' }}>{facultyProfile.leaveDate}</Text>
                  </Text>
                  <TouchableOpacity style={styles.restoreBtn} onPress={handleCancelStaffLeave}>
                    <Text style={styles.restoreBtnText}>Cancel & Mark Present</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.applyLeaveBtn} onPress={() => setShowLeaveModal(true)}>
                  <Text style={styles.applyLeaveBtnText}>Apply 1-Day Leave for Today</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Push Notification Preferences */}
            <View style={styles.prefCard}>
              <Text style={styles.prefSectionTitle}>Notification Settings</Text>

              <View style={styles.prefRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prefLabel}>Proximity & Arrival Alerts</Text>
                  <Text style={styles.prefSub}>Receive alert when bus is 500m / 5 mins away</Text>
                </View>
                <Switch
                  value={proximityAlerts}
                  onValueChange={setProximityAlerts}
                  thumbColor={proximityAlerts ? '#3b82f6' : '#64748b'}
                />
              </View>

              <View style={styles.prefRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prefLabel}>Driver & Vehicle Swap Alerts</Text>
                  <Text style={styles.prefSub}>Instant push notification when driver or bus is replaced</Text>
                </View>
                <Switch
                  value={swapAlerts}
                  onValueChange={setSwapAlerts}
                  thumbColor={swapAlerts ? '#3b82f6' : '#64748b'}
                />
              </View>

              <View style={styles.prefRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prefLabel}>Campus Transit Announcements</Text>
                  <Text style={styles.prefSub}>Official route schedule updates & delay advisories</Text>
                </View>
                <Switch
                  value={announcementAlerts}
                  onValueChange={setAnnouncementAlerts}
                  thumbColor={announcementAlerts ? '#3b82f6' : '#64748b'}
                />
              </View>
            </View>

            {/* Transport Helpline Contacts */}
            <View style={[styles.prefCard, { marginTop: 14 }]}>
              <Text style={styles.prefSectionTitle}>Transport Support & Helplines</Text>
              <TouchableOpacity
                style={[styles.helplineBtn, { marginTop: 8 }]}
                onPress={() => handleCallHelpline('+919629284690')}
              >
                <Text style={styles.helplineBtnText}>👨‍💼 Transport Incharge: N.Govindaraju (+91 96292 84690)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.helplineBtn, { marginTop: 8, backgroundColor: '#0284c7' }]}
                onPress={() => handleCallHelpline('+919715540479')}
              >
                <Text style={styles.helplineBtnText}>👨‍🏫 Transport Coordinator: L.Karthikeyan, AP/Mech (+91 97155 40479)</Text>
              </TouchableOpacity>
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity style={styles.signOutBtn} onPress={() => router.replace('/')}>
              <Text style={styles.signOutBtnText}>Sign Out &bull; Switch Portal</Text>
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

      {/* ================= BOTTOM COMMUTER NAVIGATION BAR ================= */}
      <View style={[styles.bottomTabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'track' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('track')}
        >
          <Text style={styles.tabBarIcon}>📍</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'track' && styles.tabBarLabelActive]}>Track</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'stops' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('stops')}
        >
          <Text style={styles.tabBarIcon}>🚏</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'stops' && styles.tabBarLabelActive]}>Stops</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'alerts' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={styles.tabBarIcon}>🔔</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'alerts' && styles.tabBarLabelActive]}>Alerts</Text>
          {swapNoticesList.length > 0 && <View style={styles.alertDotBadge} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'profile' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={styles.tabBarIcon}>👤</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'profile' && styles.tabBarLabelActive]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* ================= 1-DAY LEAVE SUBMISSION MODAL ================= */}
      <Modal visible={showLeaveModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Faculty 1-Day Bus Leave</Text>
              <TouchableOpacity onPress={() => setShowLeaveModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Select the date you will not be traveling on <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>{facultyProfile.busNumber || 'BUS-01'}</Text>.
            </Text>

            <View style={styles.dateSelectorRow}>
              {['Today (20 Sep)', 'Tomorrow (21 Sep)'].map((dateOpt) => (
                <TouchableOpacity
                  key={dateOpt}
                  style={[styles.dateOptionBtn, selectedLeaveDate === dateOpt && styles.dateOptionBtnSelected]}
                  onPress={() => setSelectedLeaveDate(dateOpt)}
                >
                  <Text
                    style={[styles.dateOptionText, selectedLeaveDate === dateOpt && styles.dateOptionTextSelected]}
                  >
                    {dateOpt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalInfoNotice}>
              <Text style={styles.modalInfoNoticeText}>
                📌 Marking leave updates the driver's manifest immediately. The bus will skip waiting at {staffBoardingStop.stop_name}.
              </Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLeaveModal(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleApplyStaffLeave}>
                <Text style={styles.modalConfirmBtnText}>Confirm Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LOCATION PERMISSION EXPLANATION MODAL */}
      <LocationPermissionModal
        visible={showPermModal}
        onClose={() => setShowPermModal(false)}
        onGranted={() => setHasLocationPermission(true)}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#3b0764',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topAppName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  topBadge: {
    backgroundColor: '#c084fc',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  topBadgeText: {
    color: '#1e1b4b',
    fontSize: 8,
    fontWeight: '900',
  },
  topSubtitle: {
    color: '#94a3b8',
    fontSize: 10,
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
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  liveText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '800',
  },
  mainContent: {
    flex: 1,
  },
  scrollPage: {
    flex: 1,
  },
  swapNoticeCard: {
    backgroundColor: '#78350f',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#f59e0b',
  },
  swapNoticeHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  swapNoticeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#b45309',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapNoticeTitle: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '900',
  },
  swapNoticeMessage: {
    color: '#fef3c7',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  swapNoticeReason: {
    color: '#cbd5e1',
    fontSize: 10,
    marginTop: 4,
  },
  callSubDriverBtn: {
    backgroundColor: '#15803d',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  callSubDriverBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  facultyLeaveNoticeCard: {
    backgroundColor: '#3b0764',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#a855f7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leaveNoticeTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  leaveNoticeSubtitle: {
    color: '#e9d5ff',
    fontSize: 10,
    marginTop: 2,
  },
  cancelLeaveSmallBtn: {
    backgroundColor: '#7e22ce',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelLeaveSmallBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  routeTerminalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
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
  },
  terminalLabelRed: {
    color: '#f43f5e',
    fontSize: 9,
    fontWeight: '900',
  },
  terminalName: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  terminalTime: {
    color: '#94a3b8',
    fontSize: 9,
  },
  terminalArrowBox: {
    paddingHorizontal: 6,
  },
  terminalArrow: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '900',
  },
  mapWrapper: {
    marginBottom: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  freshnessBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  freshnessText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  speedText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '900',
  },
  radarCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  radarTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  radarSubLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  radarStopTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  radarStatusPill: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#059669',
  },
  radarStatusText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '900',
  },
  etaHighlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  etaTimeText: {
    color: '#38bdf8',
    fontSize: 22,
    fontWeight: '900',
  },
  etaRelativeText: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 2,
  },
  busAvatarBox: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  busAvatarNum: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
  },
  guidanceStrip: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  guidanceItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guidanceIcon: {
    fontSize: 16,
  },
  guidanceVal: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  guidanceLabel: {
    color: '#64748b',
    fontSize: 9,
  },
  guidanceDivider: {
    width: 1,
    backgroundColor: '#1e293b',
    marginHorizontal: 8,
  },
  trafficStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  trafficText: {
    color: '#94a3b8',
    fontSize: 10,
    flex: 1,
  },
  driverContactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  driverInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  driverRole: {
    color: '#94a3b8',
    fontSize: 9.5,
    marginTop: 1,
  },
  driverPhone: {
    color: '#38bdf8',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 1,
  },
  callDriverBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callDriverBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  quickLeaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#4338ca',
    marginBottom: 16,
  },
  quickLeaveBtnTitle: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  quickLeaveBtnSub: {
    color: '#c7d2fe',
    fontSize: 9.5,
    marginTop: 1,
  },
  quickLeaveBtnArrow: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '900',
  },
  scheduleToggleBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  scheduleToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  scheduleToggleBtnActive: {
    backgroundColor: '#2563eb',
  },
  scheduleToggleText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  scheduleToggleTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
  routeHeaderCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  routeHeaderTitle: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '900',
  },
  routeHeaderSub: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  busTagPill: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  busTagPillText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
  },
  sectionHeading: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  stopTimelineCard: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  stopTimelineCardStaff: {
    borderColor: '#a855f7',
    backgroundColor: '#2e1065',
  },
  stopTimelineCardCurrent: {
    borderColor: '#38bdf8',
  },
  timelineLeftColumn: {
    alignItems: 'center',
    marginRight: 10,
    width: 28,
  },
  stopBadgeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopBadgePassed: {
    backgroundColor: '#064e3b',
  },
  stopBadgeCurrent: {
    backgroundColor: '#0284c7',
  },
  stopBadgeStaff: {
    backgroundColor: '#9333ea',
  },
  stopBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#1e293b',
    marginTop: 4,
  },
  timelineLinePassed: {
    backgroundColor: '#059669',
  },
  timelineContent: {
    flex: 1,
  },
  stopNameText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  stopNameTextStaff: {
    color: '#f0abfc',
  },
  staffStopBadge: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  staffStopBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
  stopTimeText: {
    color: '#94a3b8',
    fontSize: 9.5,
    marginTop: 2,
  },
  stopStatusBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stopStatusPassed: {
    backgroundColor: '#064e3b',
  },
  stopStatusCurrent: {
    backgroundColor: '#0284c7',
  },
  stopStatusBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
  testNotificationCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  testNotificationTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  testNotificationSub: {
    color: '#94a3b8',
    fontSize: 9.5,
    marginTop: 1,
  },
  sendTestPushBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  sendTestPushBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyAlertBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  emptyAlertText: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
  },
  swapAlertCard: {
    backgroundColor: '#78350f',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
    marginBottom: 10,
  },
  swapAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  swapAlertTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  swapAlertTimestamp: {
    color: '#fde68a',
    fontSize: 9,
  },
  swapBadgePill: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  swapBadgePillText: {
    color: '#000000',
    fontSize: 8,
    fontWeight: '900',
  },
  swapAlertBody: {
    color: '#fef3c7',
    fontSize: 10.5,
    lineHeight: 15,
  },
  announcementCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  announcementTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  announcementTag: {
    color: '#38bdf8',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  announcementTime: {
    color: '#64748b',
    fontSize: 9,
  },
  announcementTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  announcementBody: {
    color: '#94a3b8',
    fontSize: 10,
    lineHeight: 14,
  },
  helplineCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 6,
  },
  helplineTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  helplineSub: {
    color: '#94a3b8',
    fontSize: 9.5,
  },
  helplineBtn: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  helplineBtnText: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '800',
  },
  busPassCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#6366f1',
    marginBottom: 14,
  },
  busPassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#312e81',
    paddingBottom: 8,
    marginBottom: 10,
  },
  busPassCollege: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  busPassType: {
    color: '#a5b4fc',
    fontSize: 8.5,
    fontWeight: '800',
    marginTop: 1,
  },
  busPassSeal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#312e81',
    justifyContent: 'center',
    alignItems: 'center',
  },
  busPassBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  busPassAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#312e81',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#818cf8',
  },
  passHolderName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  passHolderDesignation: {
    color: '#c7d2fe',
    fontSize: 10.5,
    marginTop: 1,
  },
  passHolderDept: {
    color: '#94a3b8',
    fontSize: 9.5,
  },
  passHolderId: {
    color: '#818cf8',
    fontSize: 9.5,
    fontWeight: '800',
    marginTop: 2,
  },
  busPassDetailsGrid: {
    backgroundColor: '#0f0e2a',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  passGridItem: {
    width: '47%',
  },
  passGridLabel: {
    color: '#64748b',
    fontSize: 8.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  passGridVal: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: 1,
  },
  passFooter: {
    alignItems: 'center',
  },
  passValidBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  passValidText: {
    color: '#34d399',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  leaveSectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  leaveSectionTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  leaveSectionSub: {
    color: '#94a3b8',
    fontSize: 9.5,
    lineHeight: 14,
    marginBottom: 10,
  },
  activeLeaveBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#3b0764',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a855f7',
  },
  activeLeaveText: {
    color: '#f5d0fe',
    fontSize: 10.5,
  },
  restoreBtn: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  restoreBtnText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '800',
  },
  applyLeaveBtn: {
    backgroundColor: '#4338ca',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyLeaveBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  prefCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  prefSectionTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  prefLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  prefSub: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 1,
  },
  adminInfoCard: {
    backgroundColor: '#1c1917',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#78350f',
    marginBottom: 14,
  },
  adminInfoTitle: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
  },
  adminInfoText: {
    color: '#d6d3d1',
    fontSize: 9.5,
    lineHeight: 14,
  },
  signOutBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  signOutBtnText: {
    color: '#f43f5e',
    fontSize: 12,
    fontWeight: '800',
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 8,
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  tabBarItemActive: {},
  tabBarIcon: {
    fontSize: 18,
  },
  tabBarLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  tabBarLabelActive: {
    color: '#38bdf8',
    fontWeight: '900',
  },
  alertDotBadge: {
    position: 'absolute',
    top: 0,
    right: '32%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  modalCloseText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '900',
  },
  modalSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 15,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dateOptionBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dateOptionBtnSelected: {
    backgroundColor: '#4338ca',
    borderColor: '#818cf8',
  },
  dateOptionText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  dateOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '900',
  },
  modalInfoNotice: {
    backgroundColor: '#020617',
    borderRadius: 8,
    padding: 8,
    marginBottom: 14,
  },
  modalInfoNoticeText: {
    color: '#94a3b8',
    fontSize: 9.5,
    lineHeight: 13,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#4338ca',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
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
  emergencyNotifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
});
