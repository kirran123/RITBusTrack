import { RouteSimulationPoint, Stop } from './types';

// Default College Location (Ramco Institute of Technology, Rajapalayam)
export const COLLEGE_LOCATION = {
  latitude: 9.4520,
  longitude: 77.5535,
  name: "Ramco Institute of Technology",
};

export const DEFAULT_TRACKING_INTERVAL_MS = 5000; // 5 seconds interval

// Standard Initial Stops for Route 1 (Rajapalayam to Campus)
export const INITIAL_STOPS: Stop[] = [
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

// Sample simulation route coordinates for Bus 01 (Rajapalayam Town to College Campus)
export const SIMULATION_ROUTE_A: RouteSimulationPoint[] = [
  { latitude: 9.4475, longitude: 77.5450, speed: 25, heading: 45, accuracy: 5, stop_name: "Rajapalayam New Bus Stand" },
  { latitude: 9.4490, longitude: 77.5472, speed: 30, heading: 40, accuracy: 4, stop_name: "Gandhi Statue Junction" },
  { latitude: 9.4505, longitude: 77.5495, speed: 35, heading: 35, accuracy: 5, stop_name: "PACR Mill Circle" },
  { latitude: 9.4512, longitude: 77.5510, speed: 28, heading: 30, accuracy: 6, stop_name: "Samsigapuram Road Turn" },
  { latitude: 9.4520, longitude: 77.5535, speed: 10, heading: 0, accuracy: 3, stop_name: "College Main Gate" },
];

export const SIMULATION_ROUTE_B: RouteSimulationPoint[] = [
  { latitude: 9.4300, longitude: 77.5600, speed: 40, heading: 310, accuracy: 4, stop_name: "Srivilliputhur Arch" },
  { latitude: 9.4380, longitude: 77.5570, speed: 45, heading: 315, accuracy: 5, stop_name: "Krishnankoil Bus Stop" },
  { latitude: 9.4460, longitude: 77.5540, speed: 38, heading: 320, accuracy: 4, stop_name: "Venkateswara Nagar" },
  { latitude: 9.4520, longitude: 77.5535, speed: 15, heading: 330, accuracy: 3, stop_name: "College Main Gate" },
];
