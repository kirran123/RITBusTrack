import { GPSCoordinate, Stop } from './types';

export interface DynamicETA {
  etaMinutes: number;
  formattedEta: string; // e.g. "14 mins"
  arrivalTimeStr: string; // e.g. "07:52 AM" (live dynamic clock time)
  scheduledTimeStr: string; // original scheduled time, e.g. "07:45 AM"
  arrivalTimestamp: Date;
  isDelayed: boolean;
  delayMinutes: number; // positive for late, negative for early
  statusTag: 'ON_TIME' | 'DELAYED' | 'EARLY' | 'ARRIVING_NOW';
  statusLabel: string; // e.g. "Delayed (+5m)" or "On Time" or "3m Early"
  statusColor: string; // Hex color code
  effectiveSpeed: number; // km/h used for calculation
  trafficCondition: 'Smooth' | 'Moderate' | 'Heavy / Congested';
  distanceKm: number;
  formattedDistance: string;
}

// Haversine formula to compute geodesic distance between two points in km
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') {
    return 0;
  }
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
  return Math.max(0, R * c);
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Calculates dynamic ETA, live arrival clock time, and delay status based on live bus speed,
 * distance, intermediate stop dwell buffers, and scheduled timings.
 */
export function calculateDynamicETA(
  distanceKm: number,
  currentSpeedKmH: number = 0,
  remainingIntermediateStops: number = 0,
  scheduledTimeStr?: string | null,
  currentTime: Date = new Date()
): DynamicETA {
  let effectiveSpeed = 24; // default urban transit speed in km/h
  let trafficCondition: 'Smooth' | 'Moderate' | 'Heavy / Congested' = 'Moderate';

  if (currentSpeedKmH >= 35) {
    effectiveSpeed = Math.min(48, Math.round(currentSpeedKmH * 0.88));
    trafficCondition = 'Smooth';
  } else if (currentSpeedKmH >= 15) {
    effectiveSpeed = Math.max(16, Math.round(currentSpeedKmH * 0.92));
    trafficCondition = 'Moderate';
  } else if (currentSpeedKmH > 0 && currentSpeedKmH < 15) {
    effectiveSpeed = Math.max(12, currentSpeedKmH);
    trafficCondition = 'Heavy / Congested';
  } else {
    // Bus is temporarily stopped at a bus stop or traffic light
    effectiveSpeed = 20;
    trafficCondition = 'Moderate';
  }

  // Add ~1.2 mins dwell buffer per remaining intermediate pickup stop
  const stopDwellMinutes = Math.max(0, remainingIntermediateStops) * 1.2;
  const travelMinutes = (Math.max(0.05, distanceKm) / effectiveSpeed) * 60;
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
    const parts = scheduledTimeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (parts) {
      let schedH = parseInt(parts[1], 10);
      const schedM = parseInt(parts[2], 10);
      const schedAmpm = parts[3] ? parts[3].toUpperCase() : (schedH >= 12 ? 'PM' : 'AM');
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
      } else if (diffMins < -2) {
        delayMinutes = diffMins;
        statusTag = 'EARLY';
        statusLabel = `${Math.abs(diffMins)}m Early`;
        statusColor = '#06b6d4';
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
    scheduledTimeStr: scheduledTimeStr || arrivalTimeStr,
    arrivalTimestamp: arrivalDate,
    isDelayed,
    delayMinutes,
    statusTag,
    statusLabel,
    statusColor,
    effectiveSpeed,
    trafficCondition,
    distanceKm,
    formattedDistance: formatDistance(distanceKm),
  };
}

/**
 * Calculates live ETA for a specific stop given the current bus position and the full stop sequence.
 */
export function calculateStopLiveETA(
  busLocation: { latitude: number; longitude: number; speed?: number } | null | undefined,
  targetStop: Stop,
  allRouteStops: Stop[] = [],
  currentTime: Date = new Date()
): DynamicETA {
  const currentSpeed = busLocation?.speed || 0;
  
  if (!busLocation || typeof busLocation.latitude !== 'number' || typeof busLocation.longitude !== 'number') {
    return {
      etaMinutes: 0,
      formattedEta: '--',
      arrivalTimeStr: targetStop.estimated_arrival || '--',
      scheduledTimeStr: targetStop.estimated_arrival || '--',
      arrivalTimestamp: currentTime,
      isDelayed: false,
      delayMinutes: 0,
      statusTag: 'ON_TIME',
      statusLabel: 'Scheduled',
      statusColor: '#64748b',
      effectiveSpeed: 0,
      trafficCondition: 'Moderate',
      distanceKm: 0,
      formattedDistance: '--',
    };
  }

  // Sort stops in route order
  const sortedStops = [...allRouteStops].sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));
  const targetIdx = sortedStops.findIndex(s => s.id === targetStop.id);

  // Calculate distance from bus to target stop along waypoints
  let totalDistanceKm = 0;
  let remainingIntermediateStops = 0;

  if (targetIdx >= 0) {
    // Distance from bus to next upcoming stop
    const directToTarget = calculateDistanceKm(
      busLocation.latitude,
      busLocation.longitude,
      targetStop.latitude,
      targetStop.longitude
    );
    totalDistanceKm = directToTarget;
    remainingIntermediateStops = Math.max(0, targetIdx);
  } else {
    totalDistanceKm = calculateDistanceKm(
      busLocation.latitude,
      busLocation.longitude,
      targetStop.latitude,
      targetStop.longitude
    );
  }

  return calculateDynamicETA(
    totalDistanceKm,
    currentSpeed,
    remainingIntermediateStops,
    targetStop.estimated_arrival,
    currentTime
  );
}
