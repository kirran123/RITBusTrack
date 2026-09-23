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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
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
import { subscribeToTelemetry, subscribeToFleetSwap, subscribeToSOS, fetchLatestBusLocation, BusTelemetryPayload, FleetSwapNotice } from '../../services/supabase';
import { GPSCoordinate, INITIAL_STOPS, SIMULATION_ROUTE_A, EmergencyAlert } from '@college-bus/shared';
import { studentRosterStore, BusStudent } from '../../services/studentStore';

type StudentTab = 'track' | 'stops' | 'alerts' | 'profile';

export default function StudentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<StudentTab>('track');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [scheduleType, setScheduleType] = useState<'morning' | 'evening'>('morning');

  // Emergency SOS State
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([]);

  // Fleet Driver & Bus Swap Notification State
  const [activeSwapNotice, setActiveSwapNotice] = useState<FleetSwapNotice | null>(null);
  const [swapNoticesList, setSwapNoticesList] = useState<FleetSwapNotice[]>([]);

  // Student Profile & Realtime Leave State
  const [currentStudent, setCurrentStudent] = useState<BusStudent>(() => {
    return studentRosterStore.getStudentById('s3') || studentRosterStore.getAllStudents()[0];
  });
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedLeaveDate, setSelectedLeaveDate] = useState('Today (20 Sep)');

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

  // Assigned Boarding Stop: Rajapalayam New Bus Stand
  const boardingStop = INITIAL_STOPS[0];

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const storedCurrent = localStorage.getItem('bustrack_current_mobile_student');
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
        `🚨 EMERGENCY ALERT: ${currentStudent.busNumber || 'BUS-01'}`,
        alert.message || `An urgent alert (${alert.type?.toUpperCase()}) was reported for your bus. Safety protocols active.`,
        'emergency_sos'
      );
    });

    // 4. Seconds counter for telemetry freshness and dynamic ETA recalibration
    const secTimer = setInterval(() => {
      setLastUpdatedSec((prev) => prev + 1);
    }, 1000);

    return () => {
      unsubscribe();
      unsubSwap();
      unsubSOS();
      clearInterval(secTimer);
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
    const perm = await locationTracker.checkPermissions();
    if (perm.granted) {
      setHasLocationPermission(true);
      const pos = await locationTracker.getCurrentPosition();
      if (pos) {
        setStudentLocation(pos);
      } else {
        setStudentLocation({
          latitude: 9.4468,
          longitude: 77.5442,
          accuracy: 6,
        });
      }
    } else {
      setHasLocationPermission(false);
      setStudentLocation({
        latitude: 9.4468,
        longitude: 77.5442,
        accuracy: 6,
      });
    }
  };

  const handleRequestPermission = async () => {
    const granted = await locationTracker.requestForegroundPermission();
    if (granted) {
      setHasLocationPermission(true);
      const pos = await locationTracker.getCurrentPosition();
      if (pos) setStudentLocation(pos);
      Alert.alert('✅ Location Access Active', 'Your live location is pinpointed on the map.');
    } else {
      setShowPermModal(true);
    }
  };

  const handleCallHelpline = (phone: string = '+919629284690') => {
    Linking.openURL(`tel:${phone}`);
  };

  // Distance calculations
  const distanceToBoardingStopKm = studentLocation
    ? calculateDistanceKm(
        studentLocation.latitude,
        studentLocation.longitude,
        boardingStop.latitude,
        boardingStop.longitude
      )
    : 0.35;

  const walkingMinutes = Math.max(1, Math.round((distanceToBoardingStopKm / 4.5) * 60));

  const distanceBusToStopKm = calculateDistanceKm(
    busLocation.latitude,
    busLocation.longitude,
    boardingStop.latitude,
    boardingStop.longitude
  );

  // Dynamic ETA Calculation to Assigned Boarding Stop
  const remainingStopsToBoarding = Math.max(
    0,
    INITIAL_STOPS.findIndex((s) => s.id === boardingStop.id) - currentStopIndex
  );

  const dynamicETA: DynamicETA = calculateDynamicETA(
    distanceBusToStopKm,
    busLocation.speed || 0,
    remainingStopsToBoarding,
    boardingStop.estimated_arrival
  );

  return (
    <View style={styles.screenContainer}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* TOP STATUS BAR & HEADER */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.topLogo}>
            <Text style={{ fontSize: 18 }}>🚌</Text>
          </View>
          <View style={styles.topHeaderInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.topAppName}>College Bus Track</Text>
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
          <View style={[styles.liveStatusPill, !isDriverActive && styles.standbyStatusPill]}>
            <View style={[styles.liveDot, !isDriverActive && styles.standbyDot]} />
            <Text style={[styles.liveText, !isDriverActive && styles.standbyText]}>
              {isDriverActive ? 'LIVE GPS' : 'STANDBY'}
            </Text>
          </View>
        </View>
      </View>

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
                <Text style={styles.terminalName}>Rajapalayam New Bus Stand</Text>
                <Text style={styles.terminalTime}>Dep: 07:30 AM</Text>
              </View>
              <View style={styles.terminalArrowBox}>
                <Text style={styles.terminalArrow}>➔</Text>
              </View>
              <View style={styles.terminalItem}>
                <Text style={styles.terminalLabelRed}>🏁 END POINT</Text>
                <Text style={styles.terminalName}>RIT College Campus</Text>
                <Text style={styles.terminalTime}>Arr: 08:20 AM</Text>
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
                stops={INITIAL_STOPS.slice(0, 5)}
                boardingStop={boardingStop}
                height={260}
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
                    <Text style={styles.dynamicEtaCountdown}>(in ~{dynamicETA.formattedEta})</Text>
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

            {INITIAL_STOPS.slice(0, 5).map((stop, idx) => {
              const isBoarding = stop.id === boardingStop.id;
              const isPassed = idx < currentStopIndex;
              const isNext = idx === currentStopIndex;

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
                <View key={stop.id} style={[styles.timelineCard, isBoarding && styles.timelineCardBoarding]}>
                  <View style={[styles.timelineBadge, isPassed && styles.timelineBadgePassed, isNext && styles.timelineBadgeNext]}>
                    <Text style={[styles.timelineBadgeText, (isPassed || isNext) && styles.timelineBadgeTextActive]}>
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

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Text style={styles.timelineEta}>Sched: {stop.estimated_arrival}</Text>
                      <Text style={[styles.timelineLiveEta, isPassed ? styles.timelineLiveEtaPassed : { color: stopETA.statusColor }]}>
                        &bull; {isPassed ? 'Passed' : `Expected: ${stopETA.arrivalTimeStr}`}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.statusTag, isPassed && styles.statusTagPassed, isNext && styles.statusTagNext]}>
                    <Text style={[styles.statusTagText, isPassed && styles.statusTagTextPassed, isNext && styles.statusTagTextNext]}>
                      {isPassed ? 'PASSED' : isNext ? 'APPROACHING' : stopETA.statusLabel}
                    </Text>
                  </View>
                </View>
              );
            })}
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
                    Bus: <Text style={{ color: '#fca5a5', fontWeight: 'bold' }}>{currentStudent.busNumber || 'BUS-01'}</Text> &bull; Driver: Mr. B. Moorthi &bull; Lat/Lng: [{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}]
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
            <TouchableOpacity style={styles.signOutBtn} onPress={() => router.replace('/')}>
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
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'track' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('track')}
        >
          <Text style={[styles.tabBarIcon, activeTab === 'track' && styles.tabBarIconActive]}>📍</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'track' && styles.tabBarLabelActive]}>Live Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'stops' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('stops')}
        >
          <Text style={[styles.tabBarIcon, activeTab === 'stops' && styles.tabBarIconActive]}>🚏</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'stops' && styles.tabBarLabelActive]}>Route</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'alerts' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={[styles.tabBarIcon, activeTab === 'alerts' && styles.tabBarIconActive]}>🔔</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'alerts' && styles.tabBarLabelActive]}>Alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'profile' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabBarIcon, activeTab === 'profile' && styles.tabBarIconActive]}>👤</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'profile' && styles.tabBarLabelActive]}>Profile</Text>
        </TouchableOpacity>
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
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabBarItemActive: {
    transform: [{ scale: 1.05 }],
  },
  tabBarIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  tabBarIconActive: {
    opacity: 1,
  },
  tabBarLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  tabBarLabelActive: {
    color: '#38bdf8',
    fontWeight: '800',
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
});
