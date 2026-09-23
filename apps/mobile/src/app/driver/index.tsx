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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { OSMMapView } from '../../components/OSMMapView';
import {
  locationTracker,
  getSignalQuality,
  formatDistance,
  calculateDistanceKm,
  calculateDynamicETA,
} from '../../services/locationService';
import { broadcastEmergencySOS } from '../../services/supabase';
import { studentRosterStore, BusStudent } from '../../services/studentStore';
import { LocationPermissionBanner, LocationPermissionModal } from '../../components/LocationPermissionModal';
import { NotificationPermissionBanner } from '../../components/NotificationPermissionModal';
import { notificationService } from '../../services/notificationService';
import { GPSCoordinate, INITIAL_STOPS, EmergencyType, EmergencyAlert } from '@college-bus/shared';

type DriverTab = 'nav' | 'students' | 'cockpit' | 'sos' | 'profile';

export default function DriverDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DriverTab>('nav');
  const [shift, setShift] = useState<'morning' | 'evening'>(() => {
    const hr = new Date().getHours();
    return hr >= 13 ? 'evening' : 'morning';
  });
  const [isTripActive, setIsTripActive] = useState(false);
  const [useSimulation, setUseSimulation] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [driverBusNumber, setDriverBusNumber] = useState('BUS-01');

  const [driverProfile, setDriverProfile] = useState({
    id: 'dr1',
    name: 'Mr. B. Moorthi',
    employeeId: 'EMP-DRV-01',
    phone: '+91 9894668646',
    licenseNumber: 'TN-67-2015-001',
    busNumber: 'BUS-01',
    registrationNumber: 'TN 67 AM 9785',
    routeName: 'Route 1 (Old Bus Stand, RJPM ➔ RIT)',
    role: 'Driver',
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('bustrack_current_mobile_driver');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.name || parsed.profile?.name)) {
            setDriverProfile(prev => ({
              ...prev,
              id: parsed.id || prev.id,
              name: parsed.profile?.name || parsed.name || prev.name,
              employeeId: parsed.employee_id || prev.employeeId,
              phone: parsed.phone || parsed.profile?.phone || prev.phone,
              licenseNumber: parsed.license_number || prev.licenseNumber,
              busNumber: parsed.bus?.bus_number || parsed.bus_number || prev.busNumber,
              registrationNumber: parsed.bus?.registration_number || parsed.registration_number || prev.registrationNumber,
              routeName: parsed.route_name || prev.routeName,
            }));
            if (parsed.bus?.bus_number || parsed.bus_number) {
              setDriverBusNumber(parsed.bus?.bus_number || parsed.bus_number);
            }
          }
        }
      } catch {}
    }
  }, []);

  // Real-time Students Roster State
  const [students, setStudents] = useState<BusStudent[]>(studentRosterStore.getStudents('b1'));
  const [studentSearch, setStudentSearch] = useState('');
  const [filterStopId, setFilterStopId] = useState('all');

  // Sync with Admin additions / removals in real-time
  useEffect(() => {
    const unsubscribe = studentRosterStore.subscribe(() => {
      setStudents(studentRosterStore.getStudents('b1'));
    });
    return unsubscribe;
  }, []);

  // Active stops sequence based on shift
  const currentStops = shift === 'evening'
    ? [...INITIAL_STOPS].reverse()
    : INITIAL_STOPS;

  // Live Telemetry state
  const [currentLoc, setCurrentLoc] = useState<GPSCoordinate | null>({
    latitude: 9.4475,
    longitude: 77.545,
    speed: 0,
    heading: 0,
    accuracy: 3.5,
  });
  const [distanceTravelledKm, setDistanceTravelledKm] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentStopIdx, setCurrentStopIdx] = useState(0);

  // Completed stops tracking
  const [completedStopIds, setCompletedStopIds] = useState<string[]>([]);

  // Trip Summary data
  const [tripSummary, setTripSummary] = useState({
    duration: '00:00',
    distance: '0.00 km',
    avgSpeed: 0,
    startTime: '',
    endTime: '',
  });

  const timerRef = useRef<any>(null);

  // Check location and notification permissions on load
  useEffect(() => {
    checkPermissionStatus();
    checkNotificationPermissionStatus();
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
    const result = await locationTracker.checkPermissions();
    setHasPermission(result.granted);
  };

  const handleRequestPermission = async () => {
    const granted = await locationTracker.requestForegroundPermission();
    if (granted) {
      await locationTracker.requestBackgroundPermission();
      setHasPermission(true);
      Alert.alert('✅ GPS Access Granted', 'Hardware location sensor is enabled.');
    } else {
      setShowPermModal(true);
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
    if (!useSimulation && !hasPermission) {
      const granted = await locationTracker.requestForegroundPermission();
      if (!granted) {
        setShowPermModal(true);
        return;
      }
      setHasPermission(true);
    }

    setDistanceTravelledKm(0);
    setElapsedSeconds(0);
    setCurrentStopIdx(0);
    setCompletedStopIds([]);

    const success = await locationTracker.startTracking({
      busId: 'b1',
      tripId: 'trip_' + Date.now(),
      busNumber: driverProfile.busNumber || 'BUS-01',
      driverName: driverProfile.name || 'Mr. B. Moorthi',
      useSimulation,
      onLocationUpdate: (coord, distKm) => {
        setCurrentLoc(coord);
        setDistanceTravelledKm(distKm);
      },
      onError: (err) => {
        Alert.alert('GPS Notice', err);
      },
    });

    if (success) {
      setIsTripActive(true);
    }
  };

  const handleMarkStopReached = (stopId: string, idx: number) => {
    if (!completedStopIds.includes(stopId)) {
      setCompletedStopIds((prev) => [...prev, stopId]);
      setCurrentStopIdx(idx + 1);
    }
  };

  const handleEndTrip = () => {
    const doComplete = () => {
      locationTracker.stopTracking();
      setIsTripActive(false);

      const avgSpd =
        elapsedSeconds > 0
          ? Math.round(distanceTravelledKm / (Math.max(1, elapsedSeconds) / 3600))
          : 0;

      setTripSummary({
        duration: formatTimer(elapsedSeconds),
        distance: formatDistance(distanceTravelledKm),
        avgSpeed: avgSpd,
        startTime: new Date(Date.now() - elapsedSeconds * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

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
      latitude: currentLoc?.latitude || 9.4475,
      longitude: currentLoc?.longitude || 77.545,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    await broadcastEmergencySOS(alertPayload);

    Alert.alert(
      '🚨 SOS BROADCAST ACTIVE',
      `Emergency alert dispatched to Campus Security & Transport Admins.\n\nType: ${type.toUpperCase()}\nLocation: [${currentLoc?.latitude?.toFixed(4)}, ${currentLoc?.longitude?.toFixed(4)}]`
    );
  };

  const handleCallHelpline = (phone: string = '+919443012345') => {
    Linking.openURL(`tel:${phone}`);
  };

  const signal = getSignalQuality(currentLoc?.accuracy);

  // Dynamic Next Stop & Proximity Calculations
  const isAllStopsReached = currentStopIdx >= INITIAL_STOPS.length || completedStopIds.length >= INITIAL_STOPS.length;
  let targetStopIdx = Math.min(currentStopIdx, INITIAL_STOPS.length - 1);
  if (currentLoc && currentStopIdx === 0 && !isTripActive) {
    targetStopIdx = 1; // When at start terminal ready to depart, next target is stop #2
  }
  const nextStop = INITIAL_STOPS[targetStopIdx];
  const isFinalStop = targetStopIdx === INITIAL_STOPS.length - 1;
  const rawDist = currentLoc
    ? calculateDistanceKm(currentLoc.latitude, currentLoc.longitude, nextStop.latitude, nextStop.longitude)
    : 1.4;

  const isAtStop = completedStopIds.includes(nextStop.id) || rawDist <= 0.08 || isAllStopsReached;
  const distToNextStop = isAtStop ? 0 : (rawDist < 0.05 && currentStopIdx === 0 && !isTripActive ? 1.4 : rawDist);

  const nextStopETA = calculateDynamicETA(
    distToNextStop,
    currentLoc?.speed || 0,
    0,
    nextStop.estimated_arrival
  );

  // Automatic Boarding Status: When bus crosses or reaches a stop, all students for that stop are marked as Boarded
  const getStudentBoardingStatus = (student: BusStudent) => {
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
    };
    const studentStopIdx = stopOrderMap[student.boardingStopId] ?? 0;
    const isStopPassed =
      completedStopIds.includes(student.boardingStopId) ||
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

  const onLeaveStudents = students.filter((s) => s.isOnLeave);
  const onLeaveCount = onLeaveStudents.length;

  const boardedStudentsCount = students.filter(
    (s) => !s.isOnLeave && getStudentBoardingStatus(s).status === 'boarded'
  ).length;

  const awaitingStudentsCount = students.filter(
    (s) => !s.isOnLeave && getStudentBoardingStatus(s).status !== 'boarded'
  ).length;

  const displayedStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.department.toLowerCase().includes(studentSearch.toLowerCase());
    
    if (filterStopId === 'on_leave') {
      return matchesSearch && s.isOnLeave;
    }
    const matchesStop = filterStopId === 'all' || s.boardingStopId === filterStopId;
    return matchesSearch && matchesStop;
  });

  const studentsAtNextStopOnLeave = students.filter(
    (s) => s.boardingStopId === nextStop.id && s.isOnLeave
  );

  return (
    <View style={styles.screenContainer}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* TOP HEADER */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.topLogo}>
            <Text style={{ fontSize: 18 }}>👨‍✈️</Text>
          </View>
          <View style={styles.topHeaderInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.topAppName}>Driver Cockpit</Text>
              <View style={styles.topBusBadge}>
                <Text style={styles.topBusBadgeText}>{driverProfile.busNumber || driverBusNumber}</Text>
              </View>
            </View>
            <Text style={styles.topSub} numberOfLines={1} ellipsizeMode="tail">
              {driverProfile.routeName} &bull; {driverProfile.registrationNumber}
            </Text>
          </View>
        </View>

        <View style={styles.topHeaderRight}>
          <View style={[styles.liveStatusPill, !isTripActive && styles.standbyStatusPill]}>
            <View style={[styles.liveDot, !isTripActive && styles.standbyDot]} />
            <Text style={[styles.liveText, !isTripActive && styles.standbyText]}>
              {isTripActive ? 'TRANSMITTING' : 'STANDBY'}
            </Text>
          </View>
        </View>
      </View>

      {/* SHIFT SELECTOR BAR */}
      <View style={styles.shiftSelectorBar}>
        <TouchableOpacity
          onPress={() => {
            setShift('morning');
            setCurrentStopIdx(0);
          }}
          style={[styles.shiftSelectBtn, shift === 'morning' && styles.shiftSelectBtnActiveMorning]}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 13 }}>🌅</Text>
          <Text style={[styles.shiftSelectBtnText, shift === 'morning' && styles.shiftSelectBtnTextActive]}>
            MORNING SHIFT (Pickup ➔ RIT)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setShift('evening');
            setCurrentStopIdx(0);
          }}
          style={[styles.shiftSelectBtn, shift === 'evening' && styles.shiftSelectBtnActiveEvening]}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 13 }}>🌆</Text>
          <Text style={[styles.shiftSelectBtnText, shift === 'evening' && styles.shiftSelectBtnTextActive]}>
            EVENING SHIFT (RIT ➔ Town Drop)
          </Text>
        </TouchableOpacity>
      </View>

      {/* MAIN TAB CONTENT */}
      <View style={styles.mainContent}>
        {/* ================= TAB 1: LIVE NAVIGATION MAP WITH CURSOR & STOPS ================= */}
        {activeTab === 'nav' && (
          <ScrollView style={styles.scrollPage} contentContainerStyle={{ padding: 14 }}>
            {/* Push Notification Permission Prompt Banner if not allowed */}
            {!hasNotificationPermission && (
              <NotificationPermissionBanner
                isGranted={hasNotificationPermission}
                onRequestPermission={handleRequestNotificationPermission}
              />
            )}

            {/* Location Permission Prompt Banner if not allowed */}
            {!hasPermission && (
              <LocationPermissionBanner
                role="driver"
                isGranted={hasPermission}
                onRequestPermission={handleRequestPermission}
                onOpenSettings={() => locationTracker.openSettings()}
              />
            )}

            {/* Designated Route Terminals Banner */}
            <View style={styles.routeTerminalCard}>
              <View style={styles.terminalItem}>
                <Text style={styles.terminalLabelGreen}>🟢 START POINT</Text>
                <Text style={styles.terminalName}>
                  {shift === 'morning' ? 'Rajapalayam New Bus Stand' : 'RIT College Campus Hub'}
                </Text>
                <Text style={styles.terminalTime}>
                  Dep: {shift === 'morning' ? '07:30 AM' : '04:30 PM'}
                </Text>
              </View>
              <View style={styles.terminalArrowBox}>
                <Text style={styles.terminalArrow}>➔</Text>
              </View>
              <View style={styles.terminalItem}>
                <Text style={styles.terminalLabelRed}>🏁 END POINT</Text>
                <Text style={styles.terminalName}>
                  {shift === 'morning' ? 'RIT College Campus Hub' : 'Rajapalayam New Bus Stand'}
                </Text>
                <Text style={styles.terminalTime}>
                  Arr: {shift === 'morning' ? '08:20 AM' : '05:25 PM'}
                </Text>
              </View>
            </View>

            {/* DEDICATED ABSENTEES / 1-DAY LEAVE SMALL BOX DIRECTLY UP OF MAP */}
            <View style={[styles.absenteesCardBox, onLeaveStudents.length > 0 && styles.absenteesCardBoxActive]}>
              <View style={styles.absenteesHeaderRow}>
                <View style={styles.absenteesHeaderLeft}>
                  <View style={[styles.absenteesIconCircle, onLeaveStudents.length > 0 ? styles.absenteesIconCircleActive : styles.absenteesIconCircleEmpty]}>
                    <Text style={{ fontSize: 13 }}>{onLeaveStudents.length > 0 ? '⛔' : '✅'}</Text>
                  </View>
                  <View>
                    <Text style={[styles.absenteesHeading, onLeaveStudents.length > 0 ? { color: '#f87171' } : { color: '#34d399' }]}>
                      {onLeaveStudents.length > 0
                        ? `TODAY'S ABSENTEES (${onLeaveStudents.length})`
                        : "TODAY'S ABSENTEES (0)"}
                    </Text>
                    <Text style={styles.absenteesSub}>
                      {onLeaveStudents.length > 0
                        ? 'Student(s) on 1-day leave — Skip pickup at their stops'
                        : 'All assigned passengers boarding today'}
                    </Text>
                  </View>
                </View>
                {onLeaveStudents.length > 0 ? (
                  <View style={styles.absentPillCount}>
                    <Text style={styles.absentPillCountText}>{onLeaveStudents.length} ON LEAVE</Text>
                  </View>
                ) : (
                  <View style={styles.allPresentPill}>
                    <Text style={styles.allPresentPillText}>ALL PRESENT</Text>
                  </View>
                )}
              </View>

              {onLeaveStudents.length > 0 ? (
                <View style={styles.absenteesListWrap}>
                  {onLeaveStudents.map((st) => (
                    <View key={st.id} style={styles.absenteeMiniCard}>
                      <View style={styles.absenteeAvatarBox}>
                        <Text style={styles.absenteeAvatarText}>
                          {st.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.absenteeName} numberOfLines={1}>
                          {st.name} <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: 'normal' }}>({st.rollNumber})</Text>
                        </Text>
                        <Text style={styles.absenteeStop} numberOfLines={1}>
                          📍 {st.boardingStopName}
                        </Text>
                      </View>
                      <View style={styles.absenteeLeaveBadge}>
                        <Text style={styles.absenteeLeaveText}>ON LEAVE</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noAbsenteesBox}>
                  <Text style={styles.noAbsenteesText}>
                    ✨ No students have marked leave. Full route pickup scheduled.
                  </Text>
                </View>
              )}
            </View>

            {/* Compact Professional Map Frame */}
            <View style={styles.compactMapWrapper}>
              <OSMMapView
                busLocation={currentLoc}
                busNumber="BUS-01"
                routeNumber="Route 1"
                routeColor="#2563eb"
                stops={INITIAL_STOPS.slice(0, 5)}
                boardingStop={nextStop}
                height={260}
              />
            </View>

            {/* Driver Next Stop & Live Actions Card */}
            <View style={styles.driverNavCard}>
              {/* Telemetry quick bar */}
              <View style={styles.driverHudQuickBar}>
                <View style={styles.hudStatBox}>
                  <Text style={styles.hudStatVal}>{Math.round(currentLoc?.speed || 0)}</Text>
                  <Text style={styles.hudStatLabel}>KM/H</Text>
                </View>
                <View style={styles.hudStatBox}>
                  <Text style={styles.hudStatVal}>{distanceTravelledKm.toFixed(1)}</Text>
                  <Text style={styles.hudStatLabel}>KM LOGGED</Text>
                </View>
                <View style={styles.hudStatBox}>
                  <Text style={styles.hudStatVal}>{isTripActive ? formatTimer(elapsedSeconds) : 'READY'}</Text>
                  <Text style={styles.hudStatLabel}>TIMER</Text>
                </View>
                <View style={styles.hudStatBox}>
                  <Text style={styles.hudStatVal}>&plusmn;{currentLoc?.accuracy?.toFixed(0) || '4'}m</Text>
                  <Text style={styles.hudStatLabel}>GPS LOCK</Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              {/* Dynamic Stop Status Banner */}
              {isAllStopsReached ? (
                <View style={styles.nextStopHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nextStopPrefix, { color: '#10b981' }]}>
                      🏁 FINAL TERMINAL REACHED (5/5) &bull; BUS-01
                    </Text>
                    <Text style={styles.nextStopName}>College Main Gate (Campus Hub)</Text>
                    <Text style={[styles.nextStopEtaText, { color: '#34d399', fontWeight: 'bold' }]}>
                      0 m &bull; Arrived at Campus Destination
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.reachedBtn, { backgroundColor: '#10b981' }]}
                    onPress={handleEndTrip}
                  >
                    <Text style={styles.reachedBtnText}>FINISH{'\n'}TRIP</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.nextStopHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nextStopPrefix}>
                      {isFinalStop ? 'FINAL STOP (5/5)' : `NEXT STOP (${Math.min(currentStopIdx + 1, 5)}/5)`} &bull; BUS-01
                    </Text>
                    <Text style={styles.nextStopName}>{nextStop.stop_name}</Text>
                    <Text style={styles.nextStopEtaText}>
                      {isAtStop
                        ? `0 m ahead \u2022 Arrived at ${nextStop.stop_name}`
                        : `${formatDistance(distToNextStop)} ahead \u2022 Arrival: ${nextStopETA.arrivalTimeStr} (${nextStopETA.statusLabel})`}
                    </Text>

                    {/* Warning if any student at next stop is on leave */}
                    {studentsAtNextStopOnLeave.length > 0 && (
                      <View style={styles.nextStopLeaveNotice}>
                        <Text style={styles.nextStopLeaveText}>
                          ⚠️ {studentsAtNextStopOnLeave.map((s) => s.name).join(', ')} marked on leave at this stop.
                        </Text>
                      </View>
                    )}
                  </View>

                  {isTripActive ? (
                    <TouchableOpacity
                      style={styles.reachedBtn}
                      onPress={() => handleMarkStopReached(nextStop.id, currentStopIdx)}
                    >
                      <Text style={styles.reachedBtnText}>
                        {isFinalStop ? 'MARK\nARRIVED' : 'MARK\nARRIVED'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.startTripQuickBtn} onPress={handleStartTrip}>
                      <Text style={styles.startTripQuickText}>START{'\n'}TRIP</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.mapQuickActionRow}>
                <TouchableOpacity style={styles.mapSosQuickBtn} onPress={() => setActiveTab('sos')}>
                  <Text style={styles.mapSosQuickText}>🚨 EMERGENCY SOS</Text>
                </TouchableOpacity>
                {isTripActive && (
                  <TouchableOpacity style={styles.mapEndQuickBtn} onPress={handleEndTrip}>
                    <Text style={styles.mapEndQuickText}>🏁 FINISH TRIP</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        )}

        {/* ================= TAB 2: STUDENTS MANIFEST & PASSENGER ROSTER ================= */}
        {activeTab === 'students' && (
          <ScrollView style={styles.scrollPage} contentContainerStyle={{ padding: 14 }}>
            {/* Auto Boarding Info Pill */}
            <View style={styles.autoBoardInfoBox}>
              <Text style={{ fontSize: 13, marginRight: 6 }}>ℹ️</Text>
              <Text style={styles.autoBoardInfoText}>
                Students automatically transition to <Text style={{ color: '#34d399', fontWeight: 'bold' }}>✓ BOARDED</Text> as the bus reaches and passes their respective designated boarding stops.
              </Text>
            </View>

            {/* Search Input */}
            <View style={styles.studentSearchWrap}>
              <Text style={{ fontSize: 14, marginRight: 6 }}>🔍</Text>
              <TextInput
                style={styles.studentSearchInput}
                placeholder="Search by student name, roll no, department..."
                placeholderTextColor="#64748b"
                value={studentSearch}
                onChangeText={setStudentSearch}
              />
              {studentSearch.length > 0 && (
                <TouchableOpacity onPress={() => setStudentSearch('')}>
                  <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Boarding Stop Quick Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.filterPill, filterStopId === 'all' && styles.filterPillActive]}
                onPress={() => setFilterStopId('all')}
              >
                <Text style={[styles.filterPillText, filterStopId === 'all' && styles.filterPillTextActive]}>
                  All Stops ({students.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  filterStopId === 'on_leave' && styles.filterPillLeaveActive,
                  onLeaveCount > 0 && filterStopId !== 'on_leave' && styles.filterPillLeaveHasCount,
                ]}
                onPress={() => setFilterStopId('on_leave')}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    filterStopId === 'on_leave' ? styles.filterPillTextActive : { color: '#f87171' },
                  ]}
                >
                  ⛔ On Leave ({onLeaveCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterPill, filterStopId === 'st1' && styles.filterPillActive]}
                onPress={() => setFilterStopId('st1')}
              >
                <Text style={[styles.filterPillText, filterStopId === 'st1' && styles.filterPillTextActive]}>
                  Stop 1 ({students.filter((s) => s.boardingStopId === 'st1').length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterPill, filterStopId === 'st2' && styles.filterPillActive]}
                onPress={() => setFilterStopId('st2')}
              >
                <Text style={[styles.filterPillText, filterStopId === 'st2' && styles.filterPillTextActive]}>
                  Stop 2 ({students.filter((s) => s.boardingStopId === 'st2').length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterPill, filterStopId === 'st3' && styles.filterPillActive]}
                onPress={() => setFilterStopId('st3')}
              >
                <Text style={[styles.filterPillText, filterStopId === 'st3' && styles.filterPillTextActive]}>
                  Stop 3 ({students.filter((s) => s.boardingStopId === 'st3').length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterPill, filterStopId === 'st4' && styles.filterPillActive]}
                onPress={() => setFilterStopId('st4')}
              >
                <Text style={[styles.filterPillText, filterStopId === 'st4' && styles.filterPillTextActive]}>
                  Stop 4 ({students.filter((s) => s.boardingStopId === 'st4').length})
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Students Passenger Cards List */}
            <View style={styles.studentsListWrap}>
              {displayedStudents.length === 0 ? (
                <View style={styles.emptyStudentsBox}>
                  <Text style={{ color: '#64748b', fontSize: 13, textAlign: 'center' }}>
                    No students matched the search criteria.
                  </Text>
                </View>
              ) : (
                displayedStudents.map((student) => {
                  const boardStatus = getStudentBoardingStatus(student);

                  return (
                    <View key={student.id} style={styles.studentCard}>
                      <View style={[styles.studentAvatarBox, { backgroundColor: student.avatarBg || '#1e3a8a' }]}>
                        <Text style={styles.studentAvatarText}>
                          {student.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.studentCardName}>{student.name}</Text>
                          <View style={[styles.boardBadge, boardStatus.badgeStyle]}>
                            <Text style={[styles.boardBadgeText, boardStatus.textStyle]}>
                              {boardStatus.label}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.studentCardRoll}>
                          Roll: {student.rollNumber} &bull; {student.department} (Yr {student.year})
                        </Text>

                        <View style={styles.studentCardStopRow}>
                          <Text style={styles.studentCardStop}>📍 {student.boardingStopName}</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.callStudentBtn}
                        onPress={() => Linking.openURL(`tel:${student.phone}`)}
                      >
                        <Text style={{ fontSize: 16 }}>📞</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        )}

        {/* ================= TAB 2: TRIP COCKPIT & STOP CHECKLIST ================= */}
        {activeTab === 'cockpit' && (
          <ScrollView style={styles.scrollPage} contentContainerStyle={{ padding: 16 }}>
            {/* Location Permission Prompt Banner if needed */}
            {!hasPermission && (
              <View style={{ marginBottom: 12 }}>
                <LocationPermissionBanner
                  role="driver"
                  isGranted={hasPermission}
                  onRequestPermission={handleRequestPermission}
                  onOpenSettings={() => locationTracker.openSettings()}
                />
              </View>
            )}

            {/* Trip Standby or Active Control Box */}
            {!isTripActive ? (
              <View style={styles.standbyCard}>
                <View style={styles.standbyIconCircle}>
                  <Text style={{ fontSize: 32 }}>🚦</Text>
                </View>
                <Text style={styles.standbyTitle}>Ready for Departure</Text>
                <Text style={styles.standbyDesc}>
                  Verify passenger boarding at Rajapalayam Stand and tap START TRIP to begin live satellite telemetry broadcast.
                </Text>

                <TouchableOpacity style={styles.startTripBtn} onPress={handleStartTrip}>
                  <Text style={styles.startTripBtnText}>START LIVE TRIP ➔</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.activeCockpit}>
                <View style={styles.cockpitHeader}>
                  <View>
                    <Text style={styles.cockpitTitle}>TRIP IN PROGRESS &bull; BUS-01</Text>
                    <Text style={styles.timerText}>Duration: {formatTimer(elapsedSeconds)}</Text>
                  </View>
                  <View style={styles.transmittingBadge}>
                    <View style={styles.transmittingDot} />
                    <Text style={styles.transmittingText}>BROADCASTING</Text>
                  </View>
                </View>

                {/* Speedometer & Distance Gauge Grid */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Speed</Text>
                    <Text style={styles.metricValue}>{Math.round(currentLoc?.speed || 0)}</Text>
                    <Text style={styles.metricUnit}>km/h</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Distance</Text>
                    <Text style={styles.metricValue}>{distanceTravelledKm.toFixed(2)}</Text>
                    <Text style={styles.metricUnit}>km logged</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Accuracy</Text>
                    <Text style={styles.metricValue}>&plusmn;{currentLoc?.accuracy || 4}</Text>
                    <Text style={styles.metricUnit}>meters</Text>
                  </View>
                </View>

                {/* Coordinates & Compass */}
                <View style={styles.coordStrip}>
                  <View style={styles.coordCol}>
                    <Text style={styles.coordLabel}>Latitude</Text>
                    <Text style={styles.coordVal}>{currentLoc?.latitude?.toFixed(6)}</Text>
                  </View>
                  <View style={styles.coordCol}>
                    <Text style={styles.coordLabel}>Longitude</Text>
                    <Text style={styles.coordVal}>{currentLoc?.longitude?.toFixed(6)}</Text>
                  </View>
                  <View style={styles.coordCol}>
                    <Text style={styles.coordLabel}>Heading</Text>
                    <Text style={styles.coordVal}>{currentLoc?.heading || 0}&deg;</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.completeBtn} onPress={handleEndTrip}>
                  <Text style={styles.completeBtnText}>FINISH & LOG TRIP</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Stop Progression Checklist with Dynamic ETAs */}
            <View style={styles.stopSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.stopSectionTitle}>Route Stop Progression & Dynamic ETAs</Text>
                <View style={styles.heartbeatTag}>
                  <View style={styles.heartbeatDot} />
                  <Text style={styles.heartbeatText}>1m GPS Sync</Text>
                </View>
              </View>

              {INITIAL_STOPS.slice(0, 5).map((stop, idx) => {
                const isCompleted = completedStopIds.includes(stop.id);
                const isCurrent = currentStopIdx === idx;

                const distToStop = currentLoc
                  ? calculateDistanceKm(currentLoc.latitude, currentLoc.longitude, stop.latitude, stop.longitude)
                  : 1.0;

                const dynamicETA = calculateDynamicETA(
                  distToStop,
                  currentLoc?.speed || 0,
                  Math.max(0, idx - currentStopIdx),
                  stop.estimated_arrival
                );

                return (
                  <TouchableOpacity
                    key={stop.id}
                    style={[
                      styles.stopRow,
                      isCompleted && styles.stopRowCompleted,
                      isCurrent && styles.stopRowCurrent,
                    ]}
                    onPress={() => handleMarkStopReached(stop.id, idx)}
                  >
                    <View style={[styles.stopBadge, isCompleted && styles.stopBadgeCompleted]}>
                      <Text style={styles.stopBadgeText}>{isCompleted ? '✓' : idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stopItemName, isCompleted && styles.stopItemNameCompleted]}>
                        {stop.stop_name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={styles.stopItemEta}>Sched: {stop.estimated_arrival}</Text>
                        <Text style={[styles.stopDynamicEta, isCompleted ? { color: '#64748b' } : { color: dynamicETA.statusColor }]}>
                          &bull; {isCompleted ? 'Passed' : `Live: ${dynamicETA.arrivalTimeStr}`}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.stopActionPill, isCurrent && { backgroundColor: '#1e3a8a' }]}>
                      <Text style={[styles.stopActionText, isCurrent && { color: '#60a5fa' }]}>
                        {isCompleted ? 'ARRIVED' : isCurrent ? 'NEXT STOP' : dynamicETA.statusLabel}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ================= TAB 3: EMERGENCY SOS & INCIDENTS ================= */}
        {activeTab === 'sos' && (
          <ScrollView style={styles.scrollPage} contentContainerStyle={{ padding: 16 }}>
            <View style={styles.sosBannerCard}>
              <Text style={{ fontSize: 32 }}>🚨</Text>
              <Text style={styles.sosBannerTitle}>Emergency Incident Dispatch</Text>
              <Text style={styles.sosBannerDesc}>
                Tap any category below to immediately broadcast your bus coordinates and emergency status to Campus Transport Control & Security.
              </Text>
            </View>

            <Text style={styles.sectionHeader}>Instant Incident Categories</Text>

            {[
              { type: 'breakdown' as EmergencyType, label: '🔧 Vehicle Breakdown / Engine Trouble', desc: 'Mechanical defect, tire puncture, or engine breakdown' },
              { type: 'medical' as EmergencyType, label: '🚑 Medical Emergency / Passenger Illness', desc: 'Student or driver injury requiring ambulance dispatch' },
              { type: 'accident' as EmergencyType, label: '⚠️ Road Collision / Accident', desc: 'Minor or major vehicular collision on route' },
              { type: 'emergency' as EmergencyType, label: '🚧 Severe Traffic Gridlock / Roadblock', desc: 'Road blockage or police diversion delaying route' },
            ].map((item) => (
              <TouchableOpacity
                key={item.type}
                style={styles.sosCategoryCard}
                onPress={() => handleDispatchSOS(item.type, item.label)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.sosCategoryTitle}>{item.label}</Text>
                  <Text style={styles.sosCategoryDesc}>{item.desc}</Text>
                </View>
                <Text style={styles.sosSendTag}>BROADCAST</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionHeader}>Campus Transport Authority & Security</Text>
            
            <TouchableOpacity style={styles.hotlineCard} onPress={() => handleCallHelpline('+919629284690')}>
              <Text style={{ fontSize: 22 }}>👨‍💼</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.hotlineTitle}>Transport Incharge: N.Govindaraju</Text>
                <Text style={styles.hotlinePhone}>Mob.No: +91 96292 84690 &bull; Transport Head</Text>
              </View>
              <Text style={styles.callPill}>CALL</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.hotlineCard} onPress={() => handleCallHelpline('+919715540479')}>
              <Text style={{ fontSize: 22 }}>👨‍🏫</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.hotlineTitle}>Transport Coordinator: L.Karthikeyan</Text>
                <Text style={styles.hotlinePhone}>AP/Mech &bull; Mob.No: +91 97155 40479</Text>
              </View>
              <Text style={styles.callPill}>CALL</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.hotlineCard} onPress={() => handleCallHelpline('+919443099999')}>
              <Text style={{ fontSize: 22 }}>🛡️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.hotlineTitle}>Campus Security Main Gate</Text>
                <Text style={styles.hotlinePhone}>+91 94430 99999 &bull; Emergency Dispatch</Text>
              </View>
              <Text style={styles.callPill}>CALL</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ================= TAB 4: DRIVER PROFILE & VEHICLE ALLOCATION ================= */}
        {activeTab === 'profile' && (
          <ScrollView style={styles.scrollPage} contentContainerStyle={{ padding: 16 }}>
            {/* Driver Hero Card */}
            <View style={styles.driverHeroCard}>
              <View style={styles.driverAvatar}>
                <Text style={{ fontSize: 32 }}>👨‍✈️</Text>
              </View>
              <Text style={styles.driverHeroName}>{driverProfile.name}</Text>
              <Text style={styles.driverHeroMeta}>Employee ID: {driverProfile.employeeId}</Text>
              <View style={styles.busAllocationPill}>
                <Text style={styles.busAllocationPillText}>ASSIGNED BUS: {driverProfile.busNumber} &bull; ROUTE 1</Text>
              </View>
            </View>

            {/* Active Duty Shift Timetable */}
            <Text style={styles.sectionHeader}>Assigned Duty Shifts</Text>
            <View style={styles.shiftCard}>
              <View style={styles.shiftRow}>
                <View style={styles.shiftDotActive} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shiftTitle}>Morning Express Trip (Trip 1)</Text>
                  <Text style={styles.shiftSub}>07:30 AM – 08:20 AM &bull; Old Bus Stand ➔ RIT Campus</Text>
                </View>
                <View style={styles.shiftTagCurrent}>
                  <Text style={styles.shiftTagTextCurrent}>CURRENT</Text>
                </View>
              </View>
              <View style={styles.shiftCardDivider} />
              <View style={styles.shiftRow}>
                <View style={styles.shiftDotUpcoming} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shiftTitle}>Evening Return Trip (Trip 2)</Text>
                  <Text style={styles.shiftSub}>04:30 PM – 05:25 PM &bull; RIT Campus ➔ Old Bus Stand</Text>
                </View>
                <View style={styles.shiftTagUpcoming}>
                  <Text style={styles.shiftTagTextUpcoming}>UPCOMING</Text>
                </View>
              </View>
            </View>

            {/* Vehicle & Assignment Table */}
            <Text style={styles.sectionHeader}>Vehicle & Fleet Allocation</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Assigned Bus Number</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={styles.busPillSmall}>
                    <Text style={styles.busPillSmallText}>{driverProfile.busNumber}</Text>
                  </View>
                  <Text style={styles.infoVal}>{driverProfile.registrationNumber}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Designated Route</Text>
                <Text style={styles.infoVal}>{driverProfile.routeName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Driving License</Text>
                <Text style={styles.infoVal}>{driverProfile.licenseNumber} (Heavy Vehicle)</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Driver Contact</Text>
                <Text style={styles.infoVal}>{driverProfile.phone}</Text>
              </View>
            </View>

            {/* Transport Authority & Coordinator Contacts */}
            <Text style={styles.sectionHeader}>Transport Incharge & Coordinator</Text>
            <View style={styles.infoCard}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}
                onPress={() => handleCallHelpline('+919629284690')}
              >
                <View>
                  <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800' }}>Mr. N. Govindaraju (Transport Incharge)</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Mob.No: +91 96292 84690</Text>
                </View>
                <View style={{ backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '900' }}>CALL</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.infoRowDivider} />

              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}
                onPress={() => handleCallHelpline('+919715540479')}
              >
                <View>
                  <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800' }}>Mr. L. Karthikeyan (AP/Mech)</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Transport Coordinator &bull; Mob.No: +91 97155 40479</Text>
                </View>
                <View style={{ backgroundColor: '#0284c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '900' }}>CALL</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Sign out */}
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

      {/* ================= BOTTOM NAVIGATION BAR ================= */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'nav' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('nav')}
        >
          <Text style={[styles.tabBarIcon, activeTab === 'nav' && styles.tabBarIconActive]}>📍</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'nav' && styles.tabBarLabelActive]}>Live Nav</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'students' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('students')}
        >
          <View style={{ position: 'relative' }}>
            <Text style={[styles.tabBarIcon, activeTab === 'students' && styles.tabBarIconActive]}>👥</Text>
            <View style={styles.tabCountPill}>
              <Text style={styles.tabCountPillText}>{students.length}</Text>
            </View>
          </View>
          <Text style={[styles.tabBarLabel, activeTab === 'students' && styles.tabBarLabelActive]}>Students</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'cockpit' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('cockpit')}
        >
          <Text style={[styles.tabBarIcon, activeTab === 'cockpit' && styles.tabBarIconActive]}>🚏</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'cockpit' && styles.tabBarLabelActive]}>Cockpit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'sos' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('sos')}
        >
          <Text style={[styles.tabBarIcon, activeTab === 'sos' && styles.tabBarIconActive]}>🚨</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'sos' && styles.tabBarLabelActive]}>SOS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'profile' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabBarIcon, activeTab === 'profile' && styles.tabBarIconActive]}>👤</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'profile' && styles.tabBarLabelActive]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Location Permission Modal */}
      <LocationPermissionModal
        visible={showPermModal}
        role="driver"
        onClose={() => setShowPermModal(false)}
        onGranted={() => {
          setHasPermission(true);
          setShowPermModal(false);
        }}
      />

      {/* Post-Trip Summary Report Modal */}
      <Modal visible={showSummaryModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconWrap}>
              <Text style={{ fontSize: 32 }}>🏆</Text>
            </View>
            <Text style={styles.summaryTitle}>Trip Completed Successfully</Text>
            <Text style={styles.summaryRoute}>Route 1 &bull; BUS-01 (TN 84 AX 1001)</Text>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryBoxLabel}>Total Distance</Text>
                <Text style={styles.summaryBoxVal}>{tripSummary.distance}</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryBoxLabel}>Duration</Text>
                <Text style={styles.summaryBoxVal}>{tripSummary.duration}</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryBoxLabel}>Avg Speed</Text>
                <Text style={styles.summaryBoxVal}>{tripSummary.avgSpeed} km/h</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryBoxLabel}>Completed At</Text>
                <Text style={styles.summaryBoxVal}>{tripSummary.endTime}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeSummaryBtn} onPress={() => setShowSummaryModal(false)}>
              <Text style={styles.closeSummaryBtnText}>Acknowledge & Close Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  topBusBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  topBusBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  topSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  topHeaderRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
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
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  terminalItem: {
    flex: 1,
  },
  terminalLabelGreen: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  terminalLabelRed: {
    color: '#ef4444',
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
    color: '#64748b',
    fontSize: 14,
    fontWeight: '900',
  },
  compactMapWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  driverNavCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  driverHudQuickBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 10,
  },
  hudStatBox: {
    alignItems: 'center',
  },
  hudStatVal: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '900',
  },
  hudStatLabel: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 10,
  },
  nextStopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  nextStopPrefix: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  nextStopName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  nextStopEtaText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  reachedBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  reachedBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 12,
  },
  startTripQuickBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  startTripQuickText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 12,
  },
  mapQuickActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  mapSosQuickBtn: {
    flex: 1,
    backgroundColor: '#e11d48',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  mapSosQuickText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  mapEndQuickBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  mapEndQuickText: {
    color: '#f43f5e',
    fontSize: 11,
    fontWeight: '800',
  },
  scrollPage: {
    flex: 1,
  },
  modeCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modeTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  signalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  signalText: {
    fontSize: 10,
    fontWeight: '800',
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  modeToggleBtnActive: {
    backgroundColor: '#2563eb',
  },
  modeToggleText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  modeToggleTextActive: {
    color: '#ffffff',
  },
  standbyCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  standbyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  standbyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  standbyDesc: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  startTripBtn: {
    width: '100%',
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  startTripBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  activeCockpit: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 18,
    borderWidth: 2,
    borderColor: '#10b981',
    marginBottom: 14,
  },
  cockpitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cockpitTitle: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '900',
  },
  timerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  transmittingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
  },
  transmittingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34d399',
  },
  transmittingText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  metricUnit: {
    color: '#94a3b8',
    fontSize: 10,
  },
  coordStrip: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    justifyContent: 'space-around',
  },
  coordCol: {
    alignItems: 'center',
  },
  coordLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  coordVal: {
    color: '#38bdf8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  completeBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#f43f5e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#f43f5e',
    fontWeight: '900',
    fontSize: 13,
  },
  stopSection: {
    marginBottom: 16,
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  stopSectionTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heartbeatTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064e3b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#059669',
  },
  heartbeatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  heartbeatText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '800',
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  stopRowCompleted: {
    opacity: 0.6,
  },
  stopRowCurrent: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  stopBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopBadgeCompleted: {
    backgroundColor: '#059669',
  },
  stopBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  stopItemName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  stopItemNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  stopItemEta: {
    color: '#64748b',
    fontSize: 10,
  },
  stopDynamicEta: {
    fontSize: 10,
    fontWeight: '800',
  },
  stopActionPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#0f172a',
  },
  stopActionText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
  },
  sosBannerCard: {
    backgroundColor: '#450a0a',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
    marginBottom: 16,
  },
  sosBannerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  sosBannerDesc: {
    color: '#fecaca',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  sectionHeader: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  sosCategoryCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 10,
  },
  sosCategoryTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  sosCategoryDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  sosSendTag: {
    backgroundColor: '#e11d48',
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  hotlineCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  hotlineTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  hotlinePhone: {
    color: '#38bdf8',
    fontSize: 11,
    marginTop: 2,
  },
  callPill: {
    backgroundColor: '#0284c7',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  driverHeroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  driverHeroName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  driverHeroMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  busAllocationPill: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 10,
  },
  busAllocationPillText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  driverRatingCard: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  ratingStat: {
    alignItems: 'center',
  },
  ratingVal: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  ratingLabel: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  ratingDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1e293b',
  },
  shiftCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  shiftDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  shiftDotUpcoming: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#64748b',
  },
  shiftTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  shiftSub: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  shiftTagCurrent: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  shiftTagTextCurrent: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '900',
  },
  shiftTagUpcoming: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  shiftTagTextUpcoming: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
  },
  shiftCardDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 10,
  },
  infoCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  infoVal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  busPillSmall: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  busPillSmallText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  summaryIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#064e3b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  summaryRoute: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginBottom: 20,
  },
  summaryBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  summaryBoxLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryBoxVal: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  tabCountPill: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#0f172a',
  },
  tabCountPillText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
  rosterKpiCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  rosterKpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rosterKpiTitle: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rosterKpiSub: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: '#059669',
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  syncText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '900',
  },
  rosterGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  rosterStatBox: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  rosterStatVal: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  rosterStatLabel: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  studentSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  studentSearchInput: {
    flex: 1,
    color: '#ffffff',
    paddingVertical: 10,
    fontSize: 12,
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterPill: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterPillActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#3b82f6',
  },
  filterPillText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  studentsListWrap: {
    gap: 8,
    marginBottom: 16,
  },
  emptyStudentsBox: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  studentCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  studentAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  studentCardName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  studentCardRoll: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  studentCardStopRow: {
    marginTop: 4,
  },
  studentCardStop: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  boardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  boardBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  boardBadgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  boardBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  boardBadgeTextActive: {
    color: '#34d399',
  },
  boardBadgeTextPending: {
    color: '#fbbf24',
  },
  autoBoardInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    marginBottom: 10,
  },
  autoBoardInfoText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 10,
    lineHeight: 14,
  },
  boardBadgeApproaching: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  boardBadgeTextApproaching: {
    color: '#38bdf8',
  },
  callStudentBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#064e3b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#059669',
  },
  closeSummaryBtn: {
    width: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeSummaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  absenteesCardBox: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  absenteesCardBoxActive: {
    backgroundColor: '#1c0f12',
    borderColor: '#ef4444',
  },
  absenteesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  absenteesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  absenteesIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  absenteesIconCircleActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  absenteesIconCircleEmpty: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#059669',
  },
  absenteesHeading: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  absenteesSub: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 1,
  },
  absentPillCount: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  absentPillCountText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  allPresentPill: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#059669',
  },
  allPresentPillText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '900',
  },
  absenteesListWrap: {
    marginTop: 8,
    gap: 6,
  },
  absenteeMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderRadius: 10,
    padding: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  absenteeAvatarBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#7f1d1d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  absenteeAvatarText: {
    color: '#fecaca',
    fontSize: 10,
    fontWeight: '900',
  },
  absenteeName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  absenteeStop: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  absenteeLeaveBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  absenteeLeaveText: {
    color: '#fca5a5',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  absenteeReasonBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  absenteeReasonText: {
    color: '#fca5a5',
    fontSize: 9,
    fontWeight: '800',
  },
  noAbsenteesBox: {
    marginTop: 6,
    paddingVertical: 2,
  },
  noAbsenteesText: {
    color: '#64748b',
    fontSize: 10,
    fontStyle: 'italic',
  },
  driverLeaveBanner: {
    backgroundColor: '#450a0a',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    marginBottom: 10,
  },
  driverLeaveBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  driverLeaveIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  driverLeaveTitle: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  driverLeaveSub: {
    color: '#fca5a5',
    fontSize: 10,
    marginTop: 1,
  },
  driverLeaveList: {
    gap: 6,
  },
  driverLeaveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f1315',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  driverLeaveItemName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  driverLeaveItemStop: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  driverLeaveReasonPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  driverLeaveReasonText: {
    color: '#fca5a5',
    fontSize: 9,
    fontWeight: '800',
  },
  nextStopLeaveNotice: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  nextStopLeaveText: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: '700',
  },
  boardBadgeLeave: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  boardBadgeTextLeave: {
    color: '#f87171',
  },
  filterPillLeaveActive: {
    backgroundColor: '#7f1d1d',
    borderColor: '#ef4444',
  },
  filterPillLeaveHasCount: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  shiftSelectorBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  shiftSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 6,
  },
  shiftSelectBtnActiveMorning: {
    backgroundColor: '#451a03',
    borderColor: '#f59e0b',
  },
  shiftSelectBtnActiveEvening: {
    backgroundColor: '#1e1b4b',
    borderColor: '#6366f1',
  },
  shiftSelectBtnText: {
    color: '#94a3b8',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  shiftSelectBtnTextActive: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
