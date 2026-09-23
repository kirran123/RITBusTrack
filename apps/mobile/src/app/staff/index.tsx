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
import { subscribeToTelemetry, subscribeToFleetSwap, fetchLatestBusLocation, BusTelemetryPayload, FleetSwapNotice } from '../../services/supabase';
import { GPSCoordinate, INITIAL_STOPS, SIMULATION_ROUTE_A } from '@college-bus/shared';

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
  const [activeTab, setActiveTab] = useState<StaffTab>('track');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [scheduleType, setScheduleType] = useState<'morning' | 'evening'>('morning');

  // Fleet Driver & Bus Swap Notification State
  const [activeSwapNotice, setActiveSwapNotice] = useState<FleetSwapNotice | null>(null);
  const [swapNoticesList, setSwapNoticesList] = useState<FleetSwapNotice[]>([]);

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
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const storedCurrent = localStorage.getItem('bustrack_current_mobile_staff');
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

    // 3. Seconds counter for telemetry freshness and dynamic ETA recalibration
    const secTimer = setInterval(() => {
      setLastUpdatedSec((prev) => prev + 1);
    }, 1000);

    return () => {
      unsubscribe();
      unsubSwap();
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

  const handleCallHelpline = (phone: string = '+919443012345') => {
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
      `Leave marked for ${selectedLeaveDate}. Driver Murugan M has been notified not to wait at ${staffBoardingStop.stop_name}.`,
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
      <View style={styles.topHeader}>
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
                      Driver Murugan has been notified. Bus will not hold at {staffBoardingStop.stop_name}.
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
                    {activeSwapNotice?.substituteDriverName || 'Murugan M'}
                  </Text>
                  <Text style={styles.driverRole}>
                    {activeSwapNotice?.type === 'driver_swap' ? 'Assigned Substitute Driver' : 'Primary Route Driver'} &bull; {facultyProfile.busNumber || 'BUS-01'}
                  </Text>
                  <Text style={styles.driverPhone}>
                    {activeSwapNotice?.substituteDriverPhone || '+91 98421 00001'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.callDriverBtn}
                onPress={() => handleCallDriver(activeSwapNotice?.substituteDriverPhone || '+919842100001')}
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
            <Text style={styles.sectionHeading}>Live Stop Sequence</Text>
            {INITIAL_STOPS.slice(0, 5).map((stop, idx) => {
              const isStaffStop = stop.id === staffBoardingStop.id;
              const isPassed = idx < currentStopIndex;
              const isCurrent = idx === currentStopIndex;

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
                          Scheduled Arrival: <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{stop.estimated_arrival}</Text>
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
                          {isPassed ? 'DEPARTED' : isCurrent ? 'BUS ARRIVED' : 'SCHEDULED'}
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

            {/* Active Realtime Fleet Swap Notices */}
            <Text style={styles.sectionHeading}>Driver & Standby Bus Updates ({swapNoticesList.length})</Text>
            {swapNoticesList.length === 0 ? (
              <View style={styles.emptyAlertBox}>
                <Text style={styles.emptyAlertText}>
                  🟢 No active bus or driver swaps. Regular {facultyProfile.busNumber || 'BUS-01'} & Driver Murugan are on duty.
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>☎️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.helplineTitle}>Transport Control Room</Text>
                  <Text style={styles.helplineSub}>24x7 Campus Transit Dispatch Desk</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.helplineBtn} onPress={() => handleCallHelpline()}>
                <Text style={styles.helplineBtnText}>📞 Call Dispatch (+91 94430 12345)</Text>
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
      <View style={styles.bottomTabBar}>
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
});
