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

export function getSignalQuality(accuracyMeters: number = 10): {
  label: string;
  color: string;
  bars: number;
} {
  if (accuracyMeters <= 5) {
    return { label: 'Excellent (HDOP < 1)', color: '#10b981', bars: 4 };
  } else if (accuracyMeters <= 12) {
    return { label: 'Good (GPS Lock)', color: '#38bdf8', bars: 3 };
  } else if (accuracyMeters <= 25) {
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
  let effectiveSpeed = 22; // default urban bus speed in km/h
  let trafficCondition: 'Smooth' | 'Moderate' | 'Heavy / Congested' = 'Moderate';

  if (currentSpeedKmH >= 35) {
    effectiveSpeed = Math.min(50, Math.round(currentSpeedKmH * 0.85));
    trafficCondition = 'Smooth';
  } else if (currentSpeedKmH >= 15) {
    effectiveSpeed = Math.max(16, Math.round(currentSpeedKmH * 0.9));
    trafficCondition = 'Moderate';
  } else {
    // Bus is stopped at signal or in crawling traffic
    effectiveSpeed = 16;
    trafficCondition = 'Heavy / Congested';
  }

  // Add ~1.2 mins dwell buffer per remaining intermediate pickup stop
  const stopDwellMinutes = remainingIntermediateStops * 1.2;
  const travelMinutes = (distanceKm / effectiveSpeed) * 60;
  const totalEtaMinutes = Math.max(1, Math.round(travelMinutes + stopDwellMinutes));

  const arrivalDate = new Date(currentTime.getTime() + totalEtaMinutes * 60 * 1000);
  const arrivalHours = arrivalDate.getHours();
  const arrivalMinutes = arrivalDate.getMinutes();
  const ampm = arrivalHours >= 12 ? 'PM' : 'AM';
  const formattedHours = (arrivalHours % 12 || 12).toString().padStart(2, '0');
  const formattedMins = arrivalMinutes.toString().padStart(2, '0');
  const arrivalTimeStr = `${formattedHours}:${formattedMins} ${ampm}`;

  let isDelayed = false;
  let delayMinutes = 0;
  let statusTag: 'ON_TIME' | 'DELAYED' | 'EARLY' | 'ARRIVING_NOW' = 'ON_TIME';
  let statusLabel = 'On Time';
  let statusColor = '#10b981';

  if (totalEtaMinutes <= 2) {
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

      if (diffMins > 2) {
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
    }
  }

  return {
    etaMinutes: totalEtaMinutes,
    formattedEta: totalEtaMinutes <= 1 ? '1 min' : `${totalEtaMinutes} mins`,
    arrivalTimeStr,
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

class LocationTracker {
  private subscription: Location.LocationSubscription | null = null;
  private simulationTimer: any = null;
  private heartbeatTimer: any = null;
  private isTracking: boolean = false;
  private lastCoord: GPSCoordinate | null = null;
  private totalDistanceKm: number = 0;
  private pendingOfflineQueue: GPSCoordinate[] = [];

  async checkPermissions(): Promise<LocationPermissionResult> {
    try {
      const isServicesEnabled = await Location.hasServicesEnabledAsync();
      const foreground = await Location.getForegroundPermissionsAsync();

      let backgroundStatus: Location.PermissionStatus | undefined;
      if (Platform.OS !== 'web') {
        try {
          const bg = await Location.getBackgroundPermissionsAsync();
          backgroundStatus = bg.status;
        } catch {
          // Background permissions check may not be supported on all targets
        }
      }

      return {
        foregroundStatus: foreground.status,
        backgroundStatus,
        isServicesEnabled,
        granted: foreground.status === Location.PermissionStatus.GRANTED && isServicesEnabled,
      };
    } catch (err: any) {
      console.warn('Error checking location permissions:', err);
      return {
        foregroundStatus: Location.PermissionStatus.UNDETERMINED,
        isServicesEnabled: false,
        granted: false,
      };
    }
  }

  async requestForegroundPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        return false;
      }
      const isEnabled = await Location.hasServicesEnabledAsync();
      return isEnabled;
    } catch (err) {
      console.error('Failed to request foreground location permission:', err);
      return false;
    }
  }

  async requestBackgroundPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') return true;
      const fgResult = await Location.requestForegroundPermissionsAsync();
      if (fgResult.status !== Location.PermissionStatus.GRANTED) {
        return false;
      }
      const bgResult = await Location.requestBackgroundPermissionsAsync();
      return bgResult.status === Location.PermissionStatus.GRANTED;
    } catch (err) {
      console.error('Failed to request background location permission:', err);
      return false;
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
      });

      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        speed: loc.coords.speed ? Math.max(0, loc.coords.speed * 3.6) : 0,
        heading: loc.coords.heading || 0,
        accuracy: loc.coords.accuracy || 5,
        timestamp: new Date(loc.timestamp).toISOString(),
      };
    } catch (err) {
      console.warn('Failed to obtain current position:', err);
      return null;
    }
  }

  async startTracking(config: LocationTrackerConfig): Promise<boolean> {
    const {
      busId,
      tripId,
      busNumber = 'BUS-01',
      driverName = 'Mr. B. Moorthi',
      intervalMs = DEFAULT_TRACKING_INTERVAL_MS,
      useSimulation = false,
      onLocationUpdate,
      onError,
    } = config;

    this.stopTracking();
    this.isTracking = true;
    this.totalDistanceKm = 0;
    this.lastCoord = null;

    if (useSimulation) {
      console.log('Starting GPS Simulation Engine...');
      let index = 0;
      const initialPoint = SIMULATION_ROUTE_A[0];
      const initialCoord: GPSCoordinate = {
        latitude: initialPoint.latitude,
        longitude: initialPoint.longitude,
        speed: initialPoint.speed || 30,
        heading: initialPoint.heading || 0,
        accuracy: initialPoint.accuracy || 4,
        timestamp: new Date().toISOString(),
      };

      this.lastCoord = initialCoord;
      onLocationUpdate(initialCoord, this.totalDistanceKm);

      broadcastBusTelemetry({
        busId,
        tripId,
        coordinate: initialCoord,
        busNumber,
        driverName,
        distanceKm: this.totalDistanceKm,
        currentStopIndex: index,
        status: 'active',
      });

      this.simulationTimer = setInterval(() => {
        if (!this.isTracking) return;
        const prevPoint = SIMULATION_ROUTE_A[index];
        index = (index + 1) % SIMULATION_ROUTE_A.length;
        const currentPoint = SIMULATION_ROUTE_A[index];

        const heading = calculateBearing(
          prevPoint.latitude,
          prevPoint.longitude,
          currentPoint.latitude,
          currentPoint.longitude
        );

        const deltaKm = calculateDistanceKm(
          prevPoint.latitude,
          prevPoint.longitude,
          currentPoint.latitude,
          currentPoint.longitude
        );
        this.totalDistanceKm += deltaKm;

        const coord: GPSCoordinate = {
          latitude: currentPoint.latitude,
          longitude: currentPoint.longitude,
          speed: currentPoint.speed || 30,
          heading,
          accuracy: currentPoint.accuracy || 4,
          timestamp: new Date().toISOString(),
        };

        this.lastCoord = coord;
        onLocationUpdate(coord, this.totalDistanceKm);

        broadcastBusTelemetry({
          busId,
          tripId,
          coordinate: coord,
          busNumber,
          driverName,
          distanceKm: this.totalDistanceKm,
          currentStopIndex: index,
          status: 'active',
        });
      }, intervalMs);
      return true;
    }

    try {
      const isGpsEnabled = await Location.hasServicesEnabledAsync();
      if (!isGpsEnabled) {
        onError('Device location services are off. Please enable GPS in device settings.');
        return false;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        onError('Location permission denied. Please grant location access to broadcast coordinates.');
        return false;
      }

      // Initial instant fix
      try {
        const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const initCoord: GPSCoordinate = {
          latitude: first.coords.latitude,
          longitude: first.coords.longitude,
          speed: first.coords.speed ? Math.max(0, first.coords.speed * 3.6) : 0,
          heading: first.coords.heading || 0,
          accuracy: first.coords.accuracy || 5,
          timestamp: new Date(first.timestamp).toISOString(),
        };
        this.lastCoord = initCoord;
        onLocationUpdate(initCoord, this.totalDistanceKm);
        broadcastBusTelemetry({
          busId,
          tripId,
          coordinate: initCoord,
          busNumber,
          driverName,
          distanceKm: this.totalDistanceKm,
          status: 'active',
        });
      } catch (e) {
        console.log('Initial fix waiting on watcher...');
      }

      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: intervalMs,
          distanceInterval: 5, // update every 5m movement
        },
        (loc) => {
          if (!this.isTracking) return;

          let heading = loc.coords.heading || 0;
          if (this.lastCoord) {
            const dist = calculateDistanceKm(
              this.lastCoord.latitude,
              this.lastCoord.longitude,
              loc.coords.latitude,
              loc.coords.longitude
            );
            if (dist > 0.005) {
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
            speed: loc.coords.speed ? Math.max(0, loc.coords.speed * 3.6) : 0,
            heading,
            accuracy: loc.coords.accuracy || 5,
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
            distanceKm: this.totalDistanceKm,
            status: 'active',
          });
        }
      );

      // Guaranteed 1-minute (60s) periodic heartbeat broadcast while traveling
      // even when bus is idling at a stop or waiting at a traffic signal
      this.heartbeatTimer = setInterval(async () => {
        if (!this.isTracking) return;
        try {
          const freshLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null);
          const activeCoord: GPSCoordinate = freshLoc
            ? {
                latitude: freshLoc.coords.latitude,
                longitude: freshLoc.coords.longitude,
                speed: freshLoc.coords.speed ? Math.max(0, freshLoc.coords.speed * 3.6) : (this.lastCoord?.speed || 0),
                heading: freshLoc.coords.heading || (this.lastCoord?.heading || 0),
                accuracy: freshLoc.coords.accuracy || 5,
                timestamp: new Date(freshLoc.timestamp).toISOString(),
              }
            : this.lastCoord || {
                latitude: 9.4475,
                longitude: 77.545,
                speed: 0,
                heading: 0,
                accuracy: 5,
                timestamp: new Date().toISOString(),
              };

          this.lastCoord = activeCoord;
          broadcastBusTelemetry({
            busId,
            tripId,
            coordinate: activeCoord,
            busNumber,
            driverName,
            distanceKm: this.totalDistanceKm,
            status: 'active',
          });
        } catch (hbErr) {
          console.log('Heartbeat cycle:', hbErr);
        }
      }, 60000); // 1 minute periodic GPS broadcast

      return true;
    } catch (err: any) {
      onError('Location tracking failed: ' + (err.message || 'GPS hardware error'));
      return false;
    }
  }

  stopTracking() {
    this.isTracking = false;
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    console.log('GPS Tracking Terminated.');
  }

  getIsTracking(): boolean {
    return this.isTracking;
  }

  getTotalDistance(): number {
    return this.totalDistanceKm;
  }
}

export const locationTracker = new LocationTracker();
