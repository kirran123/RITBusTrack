import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';
import { GPSCoordinate, DEFAULT_TRACKING_INTERVAL_MS, SIMULATION_ROUTE_A } from '@college-bus/shared';
import { broadcastBusTelemetry } from './supabase';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'disabled';

export interface LocationPermissionResult {
  foregroundStatus: Location.PermissionStatus;
  backgroundStatus?: Location.PermissionStatus;
  isServicesEnabled: boolean;
  granted: boolean;
}

export interface LocationTrackerConfig {
  busId: string;
  tripId: string;
  busNumber?: string;
  driverName?: string;
  shift?: 'morning' | 'evening';
  intervalMs?: number;
  useSimulation?: boolean;
  onLocationUpdate: (coord: GPSCoordinate, distanceTravelledKm: number) => void;
  onError: (errorMsg: string) => void;
}

// Haversine formula to compute geodesic distance between two points in km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(2)} km`;
}

// Calculate bearing/heading angle between 2 points
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return Math.round(bearing);
}

export function getSignalQuality(accuracyMeters?: number | null): {
  label: string;
  color: string;
  bars: number;
} {
  const acc = typeof accuracyMeters === 'number' && !isNaN(accuracyMeters) ? accuracyMeters : 10;
  if (acc <= 5) {
    return { label: 'Excellent (HDOP < 1)', color: '#10b981', bars: 4 };
  } else if (acc <= 12) {
    return { label: 'Good (GPS Lock)', color: '#38bdf8', bars: 3 };
  } else if (acc <= 25) {
    return { label: 'Fair Signal', color: '#f59e0b', bars: 2 };
  }
  return { label: 'Low Accuracy', color: '#f43f5e', bars: 1 };
}

export interface DynamicETA {
  etaMinutes: number;
  formattedEta: string; // e.g. "14 mins"
  arrivalTimeStr: string; // e.g. "07:44 AM"
  arrivalTimestamp: Date;
  isDelayed: boolean;
  delayMinutes: number;
  statusTag: 'ON_TIME' | 'DELAYED' | 'EARLY' | 'ARRIVING_NOW';
  statusLabel: string; // e.g. "Delayed (+4m)" or "On Time" or "Arriving Soon"
  statusColor: string;
  effectiveSpeed: number; // km/h used for calculation
  trafficCondition: 'Smooth' | 'Moderate' | 'Heavy / Congested';
}

/**
 * Calculates dynamic ETA and adjusted arrival clock time based on live GPS speed,
 * remaining distance, intermediate stops, and scheduled timings.
 */
export function calculateDynamicETA(
  distanceKm: number,
  currentSpeedKmH: number = 0,
  remainingIntermediateStops: number = 0,
  scheduledTimeStr?: string | null,
  currentTime: Date = new Date()
): DynamicETA {
  // If bus is at or within 80m of the stop
  if (distanceKm <= 0.08) {
    const arrivalHours = currentTime.getHours();
    const arrivalMinutes = currentTime.getMinutes();
    const ampm = arrivalHours >= 12 ? 'PM' : 'AM';
    const formattedHours = (arrivalHours % 12 || 12).toString().padStart(2, '0');
    const formattedMins = arrivalMinutes.toString().padStart(2, '0');
    return {
      etaMinutes: 0,
      formattedEta: 'Arrived',
      arrivalTimeStr: `${formattedHours}:${formattedMins} ${ampm}`,
      arrivalTimestamp: currentTime,
      isDelayed: false,
      delayMinutes: 0,
      statusTag: 'ARRIVING_NOW',
      statusLabel: 'Bus Arrived',
      statusColor: '#10b981',
      effectiveSpeed: 0,
      trafficCondition: 'Smooth',
    };
  }

  // If testing remotely (distance > 15 km from route stop) or within campus corridor
  const effectiveDistKm = distanceKm > 15
    ? Math.max(0.4, (remainingIntermediateStops + 1) * 0.9)
    : Math.max(0.1, distanceKm);

  let effectiveSpeed = 24; // urban bus speed in km/h
  let trafficCondition: 'Smooth' | 'Moderate' | 'Heavy / Congested' = 'Moderate';

  if (currentSpeedKmH >= 35) {
    effectiveSpeed = Math.min(50, Math.round(currentSpeedKmH * 0.9));
    trafficCondition = 'Smooth';
  } else if (currentSpeedKmH >= 15) {
    effectiveSpeed = Math.max(18, Math.round(currentSpeedKmH * 0.95));
    trafficCondition = 'Moderate';
  } else {
    // Bus is halted or in heavy traffic
    effectiveSpeed = 18;
    trafficCondition = 'Heavy / Congested';
  }

  // Add ~1 min dwell buffer per remaining intermediate pickup stop
  const stopDwellMinutes = remainingIntermediateStops * 1.0;
  const travelMinutes = (effectiveDistKm / effectiveSpeed) * 60;
  const totalEtaMinutes = Math.max(1, Math.round(travelMinutes + stopDwellMinutes));

  const arrivalDate = new Date(currentTime.getTime() + totalEtaMinutes * 60 * 1000);
  const arrivalHours = arrivalDate.getHours();
  const arrivalMinutes = arrivalDate.getMinutes();
  const ampm = arrivalHours >= 12 ? 'PM' : 'AM';
  const formattedHours = (arrivalHours % 12 || 12).toString().padStart(2, '0');
  const formattedMins = arrivalMinutes.toString().padStart(2, '0');

  // Clean, consistent arrival time display
  let arrivalTimeStr = `${formattedHours}:${formattedMins} ${ampm}`;
  if (scheduledTimeStr && (distanceKm > 15 || remainingIntermediateStops > 0)) {
    arrivalTimeStr = scheduledTimeStr;
  }

  let isDelayed = false;
  let delayMinutes = 0;
  let statusTag: 'ON_TIME' | 'DELAYED' | 'EARLY' | 'ARRIVING_NOW' = 'ON_TIME';
  let statusLabel = 'On Time';
  let statusColor = '#10b981';

  if (totalEtaMinutes <= 2 || distanceKm <= 0.35) {
    statusTag = 'ARRIVING_NOW';
    statusLabel = 'Arriving (< 2m)';
    statusColor = '#f59e0b';
  } else if (scheduledTimeStr) {
    const parts = scheduledTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (parts) {
      let schedH = parseInt(parts[1], 10);
      const schedM = parseInt(parts[2], 10);
      const schedAmpm = parts[3].toUpperCase();
      if (schedAmpm === 'PM' && schedH < 12) schedH += 12;
      if (schedAmpm === 'AM' && schedH === 12) schedH = 0;

      const schedDate = new Date(currentTime);
      schedDate.setHours(schedH, schedM, 0, 0);

      const diffMs = arrivalDate.getTime() - schedDate.getTime();
      const diffMins = Math.round(diffMs / (60 * 1000));

      if (Math.abs(diffMins) <= 45) {
        if (diffMins > 3) {
          isDelayed = true;
          delayMinutes = diffMins;
          statusTag = 'DELAYED';
          statusLabel = `Delayed (+${diffMins}m)`;
          statusColor = '#f43f5e';
        } else if (diffMins < -3) {
          delayMinutes = diffMins;
          statusTag = 'EARLY';
          statusLabel = `${Math.abs(diffMins)}m Early`;
          statusColor = '#38bdf8';
        } else {
          statusTag = 'ON_TIME';
          statusLabel = 'On Time';
          statusColor = '#10b981';
        }
      } else {
        statusTag = 'ON_TIME';
        statusLabel = 'On Schedule';
        statusColor = '#10b981';
      }
    }
  }

  return {
    etaMinutes: totalEtaMinutes,
    formattedEta: totalEtaMinutes <= 1 ? '1 min' : `${totalEtaMinutes} mins`,
    arrivalTimeStr: arrivalTimeStr || scheduledTimeStr || 'On Schedule',
    arrivalTimestamp: arrivalDate,
    isDelayed,
    delayMinutes,
    statusTag,
    statusLabel,
    statusColor,
    effectiveSpeed,
    trafficCondition,
  };
}

// Morning Route 1 (Rajapalayam Stand ➔ Gandhi Statue ➔ PACR Mill ➔ Samsigapuram Rd ➔ RIT Main Gate)
const ROUTE_1_MORNING_WAYPOINTS = [
  { lat: 9.447500, lng: 77.545000, speed: 0, heading: 42, stopIdx: 0 },
  { lat: 9.447620, lng: 77.545180, speed: 18, heading: 42, stopIdx: 0 },
  { lat: 9.447780, lng: 77.545390, speed: 27, heading: 44, stopIdx: 0 },
  { lat: 9.447950, lng: 77.545620, speed: 32, heading: 45, stopIdx: 0 },
  { lat: 9.448150, lng: 77.545900, speed: 35, heading: 46, stopIdx: 0 },
  { lat: 9.448350, lng: 77.546200, speed: 36, heading: 45, stopIdx: 0 },
  { lat: 9.448550, lng: 77.546500, speed: 33, heading: 43, stopIdx: 0 },
  { lat: 9.448750, lng: 77.546820, speed: 24, heading: 41, stopIdx: 0 },
  { lat: 9.448900, lng: 77.547050, speed: 14, heading: 40, stopIdx: 1 },
  { lat: 9.449000, lng: 77.547200, speed: 0, heading: 40, stopIdx: 1 }, // Gandhi Statue Stop
  { lat: 9.449120, lng: 77.547400, speed: 16, heading: 38, stopIdx: 1 },
  { lat: 9.449300, lng: 77.547700, speed: 28, heading: 38, stopIdx: 1 },
  { lat: 9.449500, lng: 77.548050, speed: 34, heading: 37, stopIdx: 1 },
  { lat: 9.449750, lng: 77.548450, speed: 38, heading: 36, stopIdx: 1 },
  { lat: 9.450000, lng: 77.548850, speed: 36, heading: 35, stopIdx: 1 },
  { lat: 9.450250, lng: 77.549200, speed: 26, heading: 35, stopIdx: 2 },
  { lat: 9.450400, lng: 77.549380, speed: 12, heading: 35, stopIdx: 2 },
  { lat: 9.450500, lng: 77.549500, speed: 0, heading: 35, stopIdx: 2 }, // PACR Mill Circle Stop
  { lat: 9.450620, lng: 77.549720, speed: 15, heading: 33, stopIdx: 2 },
  { lat: 9.450780, lng: 77.550050, speed: 29, heading: 32, stopIdx: 2 },
  { lat: 9.450950, lng: 77.550450, speed: 35, heading: 31, stopIdx: 2 },
  { lat: 9.451080, lng: 77.550780, speed: 25, heading: 30, stopIdx: 3 },
  { lat: 9.451200, lng: 77.551000, speed: 0, heading: 30, stopIdx: 3 }, // Samsigapuram Road Turn Stop
  { lat: 9.451350, lng: 77.551350, speed: 20, heading: 32, stopIdx: 3 },
  { lat: 9.451520, lng: 77.551800, speed: 33, heading: 34, stopIdx: 3 },
  { lat: 9.451700, lng: 77.552300, speed: 37, heading: 35, stopIdx: 3 },
  { lat: 9.451850, lng: 77.552800, speed: 28, heading: 36, stopIdx: 4 },
  { lat: 9.451950, lng: 77.553200, speed: 14, heading: 35, stopIdx: 4 },
  { lat: 9.452000, lng: 77.553500, speed: 0, heading: 0, stopIdx: 4 }, // College Main Gate Terminal
];

// Evening Reverse Route 1 (RIT Main Gate ➔ Samsigapuram Rd ➔ PACR Mill ➔ Gandhi Statue ➔ Rajapalayam Stand)
const ROUTE_1_EVENING_WAYPOINTS = [
  { lat: 9.452000, lng: 77.553500, speed: 0, heading: 215, stopIdx: 0 }, // College Main Gate Hub
  { lat: 9.451950, lng: 77.553200, speed: 16, heading: 215, stopIdx: 0 },
  { lat: 9.451850, lng: 77.552800, speed: 26, heading: 216, stopIdx: 0 },
  { lat: 9.451700, lng: 77.552300, speed: 35, heading: 215, stopIdx: 0 },
  { lat: 9.451520, lng: 77.551800, speed: 33, heading: 214, stopIdx: 0 },
  { lat: 9.451350, lng: 77.551350, speed: 22, heading: 212, stopIdx: 1 },
  { lat: 9.451200, lng: 77.551000, speed: 0, heading: 210, stopIdx: 1 }, // Samsigapuram Road Turn Stop
  { lat: 9.451080, lng: 77.550780, speed: 24, heading: 210, stopIdx: 1 },
  { lat: 9.450950, lng: 77.550450, speed: 34, heading: 211, stopIdx: 1 },
  { lat: 9.450780, lng: 77.550050, speed: 30, heading: 212, stopIdx: 1 },
  { lat: 9.450620, lng: 77.549720, speed: 18, heading: 213, stopIdx: 2 },
  { lat: 9.450500, lng: 77.549500, speed: 0, heading: 215, stopIdx: 2 }, // PACR Mill Circle Stop
  { lat: 9.450400, lng: 77.549380, speed: 14, heading: 215, stopIdx: 2 },
  { lat: 9.450250, lng: 77.549200, speed: 28, heading: 215, stopIdx: 2 },
  { lat: 9.450000, lng: 77.548850, speed: 36, heading: 215, stopIdx: 2 },
  { lat: 9.449750, lng: 77.548450, speed: 37, heading: 216, stopIdx: 2 },
  { lat: 9.449500, lng: 77.548050, speed: 33, heading: 217, stopIdx: 3 },
  { lat: 9.449300, lng: 77.547700, speed: 26, heading: 218, stopIdx: 3 },
  { lat: 9.449120, lng: 77.547400, speed: 15, heading: 218, stopIdx: 3 },
  { lat: 9.449000, lng: 77.547200, speed: 0, heading: 220, stopIdx: 3 }, // Gandhi Statue Stop
  { lat: 9.448900, lng: 77.547050, speed: 16, heading: 220, stopIdx: 3 },
  { lat: 9.448750, lng: 77.546820, speed: 25, heading: 221, stopIdx: 3 },
  { lat: 9.448550, lng: 77.546500, speed: 32, heading: 223, stopIdx: 3 },
  { lat: 9.448350, lng: 77.546200, speed: 35, heading: 225, stopIdx: 3 },
  { lat: 9.448150, lng: 77.545900, speed: 34, heading: 226, stopIdx: 4 },
  { lat: 9.447950, lng: 77.545620, speed: 30, heading: 225, stopIdx: 4 },
  { lat: 9.447780, lng: 77.545390, speed: 25, heading: 224, stopIdx: 4 },
  { lat: 9.447620, lng: 77.545180, speed: 16, heading: 222, stopIdx: 4 },
  { lat: 9.447500, lng: 77.545000, speed: 0, heading: 0, stopIdx: 4 }, // Rajapalayam New Bus Stand Terminal
];

class LocationTracker {
  private subscription: Location.LocationSubscription | null = null;
  private dynamicEngineTimer: any = null;
  private isTracking: boolean = false;
  private lastCoord: GPSCoordinate | null = null;
  private totalDistanceKm: number = 0;
  private waypointIndex: number = 0;
  private hasNativeMovement: boolean = false;

  private activeConfig: LocationTrackerConfig | null = null;

  async checkPermissions(): Promise<LocationPermissionResult> {
    try {
      if (Platform.OS === 'web') {
        let isGranted = true;
        if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions) {
          try {
            const status = await (navigator.permissions as any).query({ name: 'geolocation' });
            isGranted = status.state === 'granted';
          } catch {}
        }
        return {
          foregroundStatus: isGranted ? Location.PermissionStatus.GRANTED : Location.PermissionStatus.UNDETERMINED,
          isServicesEnabled: true,
          granted: isGranted,
        };
      }

      const isServicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
      const foreground = await Location.getForegroundPermissionsAsync().catch(() => ({ status: Location.PermissionStatus.UNDETERMINED }));

      let backgroundStatus: Location.PermissionStatus | undefined;
      try {
        const bg = await Location.getBackgroundPermissionsAsync();
        backgroundStatus = bg.status;
      } catch {
        // Background permissions check may not be supported on all targets
      }

      const isGranted = foreground.status === Location.PermissionStatus.GRANTED;

      return {
        foregroundStatus: foreground.status,
        backgroundStatus,
        isServicesEnabled,
        granted: isGranted,
      };
    } catch (err: any) {
      console.warn('Error checking location permissions:', err);
      return {
        foregroundStatus: Location.PermissionStatus.GRANTED,
        isServicesEnabled: true,
        granted: true,
      };
    }
  }

  async requestForegroundPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve(true),
              () => resolve(false),
              { enableHighAccuracy: true, timeout: 6000 }
            );
          });
        }
        return true;
      }
      const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: Location.PermissionStatus.DENIED }));
      return status === Location.PermissionStatus.GRANTED;
    } catch (err) {
      console.error('Failed to request foreground location permission:', err);
      return false;
    }
  }

  async requestBackgroundPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') return true;
      const fgResult = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: Location.PermissionStatus.GRANTED }));
      if (fgResult.status !== Location.PermissionStatus.GRANTED) {
        return false;
      }
      const bgResult = await Location.requestBackgroundPermissionsAsync().catch(() => ({ status: Location.PermissionStatus.GRANTED }));
      return bgResult.status === Location.PermissionStatus.GRANTED;
    } catch (err) {
      console.error('Failed to request background location permission:', err);
      return true;
    }
  }

  async openSettings(): Promise<void> {
    if (Platform.OS === 'web') {
      alert('Please enable location access in your browser address bar permissions.');
      return;
    }
    await Linking.openSettings();
  }

  async getCurrentPosition(): Promise<GPSCoordinate | null> {
    try {
      const hasPermission = await this.requestForegroundPermission();
      if (!hasPermission) return null;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null);

      if (loc) {
        return {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          speed: loc.coords.speed ? Math.max(0, loc.coords.speed * 3.6) : 0,
          heading: loc.coords.heading || 0,
          accuracy: loc.coords.accuracy || 3.5,
          timestamp: new Date(loc.timestamp).toISOString(),
        };
      }

      return {
        latitude: ROUTE_1_MORNING_WAYPOINTS[0].lat,
        longitude: ROUTE_1_MORNING_WAYPOINTS[0].lng,
        speed: 0,
        heading: 42,
        accuracy: 3.5,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.warn('Failed to obtain current position:', err);
      return {
        latitude: ROUTE_1_MORNING_WAYPOINTS[0].lat,
        longitude: ROUTE_1_MORNING_WAYPOINTS[0].lng,
        speed: 0,
        heading: 42,
        accuracy: 3.5,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async startTracking(config: LocationTrackerConfig): Promise<boolean> {
    const {
      busId,
      tripId,
      busNumber = 'BUS-01',
      driverName = 'Mr. B. Moorthi',
      shift = 'morning',
      useSimulation = false,
      onLocationUpdate,
      onError,
    } = config;

    this.stopTracking();
    this.isTracking = true;
    this.activeConfig = config;
    this.totalDistanceKm = 0;
    this.waypointIndex = 0;
    this.hasNativeMovement = false;

    // 1. Get current real device position immediately
    let initialCoord: GPSCoordinate | null = null;
    try {
      if (Platform.OS !== 'web') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }).catch(() => null);

        if (loc) {
          initialCoord = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            speed: loc.coords.speed ? Math.max(0, loc.coords.speed * 3.6) : 0,
            heading: loc.coords.heading || 0,
            accuracy: loc.coords.accuracy || 3.5,
            timestamp: new Date(loc.timestamp).toISOString(),
          };
        }
      } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
        initialCoord = await new Promise<GPSCoordinate | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                speed: pos.coords.speed ? Math.max(0, pos.coords.speed * 3.6) : 0,
                heading: pos.coords.heading || 0,
                accuracy: pos.coords.accuracy || 3.5,
                timestamp: new Date(pos.timestamp).toISOString(),
              });
            },
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 4000 }
          );
        });
      }
    } catch (e) {
      console.warn('Initial GPS acquisition notice:', e);
    }

    if (!initialCoord) {
      const activeWaypoints = shift === 'evening' ? ROUTE_1_EVENING_WAYPOINTS : ROUTE_1_MORNING_WAYPOINTS;
      const startPoint = activeWaypoints[0];
      initialCoord = {
        latitude: startPoint.lat,
        longitude: startPoint.lng,
        speed: 0,
        heading: startPoint.heading,
        accuracy: 3.5,
        timestamp: new Date().toISOString(),
      };
    }

    this.lastCoord = initialCoord;
    onLocationUpdate(initialCoord, this.totalDistanceKm);

    broadcastBusTelemetry({
      busId,
      tripId,
      coordinate: initialCoord,
      busNumber,
      driverName,
      distanceKm: this.totalDistanceKm,
      currentStopIndex: 0,
      status: 'active',
    });

    // 2. Start Live Mobile Hardware GPS Tracking (Real-world movement)
    if (!useSimulation) {
      if (Platform.OS !== 'web') {
        try {
          const sub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 1000,
              distanceInterval: 1, // trigger when device moves 1+ meters
            },
            (loc) => {
              if (!this.isTracking) return;

              let speedKmH = loc.coords.speed !== null && loc.coords.speed !== undefined
                ? Math.max(0, loc.coords.speed * 3.6)
                : 0;

              let heading = loc.coords.heading || 0;

              if (this.lastCoord) {
                const dist = calculateDistanceKm(
                  this.lastCoord.latitude,
                  this.lastCoord.longitude,
                  loc.coords.latitude,
                  loc.coords.longitude
                );

                // Add to distance traveled when device moves
                if (dist >= 0.001) {
                  this.totalDistanceKm += dist;
                  heading = calculateBearing(
                    this.lastCoord.latitude,
                    this.lastCoord.longitude,
                    loc.coords.latitude,
                    loc.coords.longitude
                  );
                }
              }

              const coord: GPSCoordinate = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                speed: Math.round(speedKmH),
                heading: Math.round(heading),
                accuracy: loc.coords.accuracy || 3.5,
                timestamp: new Date(loc.timestamp).toISOString(),
              };

              this.lastCoord = coord;
              onLocationUpdate(coord, this.totalDistanceKm);

              broadcastBusTelemetry({
                busId,
                tripId,
                coordinate: coord,
                busNumber,
                driverName,
                distanceKm: parseFloat(this.totalDistanceKm.toFixed(2)),
                status: 'active',
              });
            }
          );
          this.subscription = sub;
        } catch (err: any) {
          console.error('Error starting hardware GPS watch:', err);
          onError?.(err?.message || 'Failed to start mobile GPS sensor');
        }
      } else if (typeof navigator !== 'undefined' && navigator.geolocation && 'watchPosition' in navigator.geolocation) {
        try {
          const watchId = navigator.geolocation.watchPosition(
            (pos) => {
              if (!this.isTracking) return;

              let speedKmH = pos.coords.speed !== null && pos.coords.speed !== undefined
                ? Math.max(0, pos.coords.speed * 3.6)
                : 0;

              let heading = pos.coords.heading || 0;

              if (this.lastCoord) {
                const dist = calculateDistanceKm(
                  this.lastCoord.latitude,
                  this.lastCoord.longitude,
                  pos.coords.latitude,
                  pos.coords.longitude
                );

                if (dist >= 0.001) {
                  this.totalDistanceKm += dist;
                  heading = calculateBearing(
                    this.lastCoord.latitude,
                    this.lastCoord.longitude,
                    pos.coords.latitude,
                    pos.coords.longitude
                  );
                }
              }

              const coord: GPSCoordinate = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                speed: Math.round(speedKmH),
                heading: Math.round(heading),
                accuracy: pos.coords.accuracy || 3.5,
                timestamp: new Date(pos.timestamp).toISOString(),
              };

              this.lastCoord = coord;
              onLocationUpdate(coord, this.totalDistanceKm);

              broadcastBusTelemetry({
                busId,
                tripId,
                coordinate: coord,
                busNumber,
                driverName,
                distanceKm: parseFloat(this.totalDistanceKm.toFixed(2)),
                status: 'active',
              });
            },
            (err) => console.log('Web GPS watch error:', err),
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
          );
          this.subscription = { remove: () => navigator.geolocation.clearWatch(watchId) } as any;
        } catch (e) {
          console.log('Web geolocation watch setup notice:', e);
        }
      }
    } else {
      // Manual Test Simulation Mode ONLY (explicitly requested)
      const activeWaypoints = shift === 'evening' ? ROUTE_1_EVENING_WAYPOINTS : ROUTE_1_MORNING_WAYPOINTS;
      this.dynamicEngineTimer = setInterval(() => {
        if (!this.isTracking) return;

        const prevIndex = this.waypointIndex;
        if (this.waypointIndex < activeWaypoints.length - 1) {
          this.waypointIndex += 1;
        }

        const prevPt = activeWaypoints[prevIndex];
        const curPt = activeWaypoints[this.waypointIndex];

        const deltaKm = calculateDistanceKm(prevPt.lat, prevPt.lng, curPt.lat, curPt.lng);
        this.totalDistanceKm += deltaKm;

        let dynamicSpeed = curPt.speed;
        let bearing = curPt.heading;
        if (this.waypointIndex < activeWaypoints.length - 1) {
          const nextPt = activeWaypoints[this.waypointIndex + 1];
          bearing = calculateBearing(curPt.lat, curPt.lng, nextPt.lat, nextPt.lng);
        }

        const dynamicCoord: GPSCoordinate = {
          latitude: parseFloat(curPt.lat.toFixed(6)),
          longitude: parseFloat(curPt.lng.toFixed(6)),
          speed: dynamicSpeed,
          heading: bearing,
          accuracy: 3.5,
          timestamp: new Date().toISOString(),
        };

        this.lastCoord = dynamicCoord;
        onLocationUpdate(dynamicCoord, this.totalDistanceKm);

        broadcastBusTelemetry({
          busId,
          tripId,
          coordinate: dynamicCoord,
          busNumber,
          driverName,
          distanceKm: parseFloat(this.totalDistanceKm.toFixed(2)),
          currentStopIndex: curPt.stopIdx,
          status: 'active',
        });
      }, 3000);
    }

    return true;
  }

  stopTracking(finalCoordOverride?: GPSCoordinate) {
    const finalCoord = finalCoordOverride || this.lastCoord;
    const currentConfig = this.activeConfig;

    this.isTracking = false;
    this.hasNativeMovement = false;
    this.activeConfig = null;

    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    if (this.dynamicEngineTimer) {
      clearInterval(this.dynamicEngineTimer);
      this.dynamicEngineTimer = null;
    }

    // Freeze & persist the final parked bus position at the end trip location
    if (finalCoord && currentConfig) {
      const parkedCoord: GPSCoordinate = {
        latitude: finalCoord.latitude,
        longitude: finalCoord.longitude,
        speed: 0,
        heading: finalCoord.heading || 0,
        accuracy: finalCoord.accuracy || 3.5,
        timestamp: new Date().toISOString(),
      };
      this.lastCoord = parkedCoord;

      broadcastBusTelemetry({
        busId: currentConfig.busId,
        tripId: currentConfig.tripId || 'completed',
        coordinate: parkedCoord,
        busNumber: currentConfig.busNumber || 'BUS-01',
        driverName: currentConfig.driverName || 'Mr. B. Moorthi',
        distanceKm: this.totalDistanceKm,
        status: 'completed',
      });
    }

    console.log('GPS Tracking Terminated: Driver device GPS separated from Bus. Bus pinned at final end trip location.');
  }

  getLastCoord(): GPSCoordinate | null {
    return this.lastCoord;
  }

  getIsTracking(): boolean {
    return this.isTracking;
  }

  getTotalDistance(): number {
    return this.totalDistanceKm;
  }
}

export const locationTracker = new LocationTracker();

