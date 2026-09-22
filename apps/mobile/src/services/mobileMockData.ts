import { EmergencyAlert } from '@college-bus/shared';

export const INITIAL_EMERGENCIES: EmergencyAlert[] = [
  {
    id: 'e1',
    bus_id: 'b1',
    driver_id: 'dr1',
    trip_id: 't1',
    type: 'breakdown',
    message: 'Tire puncture near Gandhi Statue Junction. Assistance requested.',
    latitude: 9.4490,
    longitude: 77.5472,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  }
];
