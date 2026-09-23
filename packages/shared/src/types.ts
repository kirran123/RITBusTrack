export type UserRole = 'student' | 'driver' | 'admin' | 'staff';

export type StaffAccessLevel = 'edit' | 'view';

export interface StaffUser {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  department: string;
  designation: string;
  access_level: StaffAccessLevel; // 'edit' | 'view'
  assigned_route_ids?: string[];
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
  last_login?: string;
}

export type BusStatus = 'active' | 'inactive' | 'maintenance';

export type TripStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export type EmergencyStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export type EmergencyType = 'breakdown' | 'accident' | 'medical' | 'emergency' | 'other';

export type NotificationType = 'general' | 'trip' | 'delay' | 'emergency' | 'maintenance' | 'announcement';

export type NotificationTargetType = 'all' | 'route' | 'bus' | 'role' | 'user';

export interface UserProfile {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  access_level?: StaffAccessLevel;
  profile_image?: string | null;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface StudentLeave {
  id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  department?: string;
  year?: number;
  bus_id: string;
  bus_number: string;
  stop_id: string;
  stop_name: string;
  leave_date: string;
  reason?: string;
  status: 'active' | 'cancelled';
  created_at: string;
}

export interface Student {
  id: string;
  user_id: string;
  register_number: string;
  department: string;
  year: number;
  section: string;
  route_id?: string | null;
  bus_id?: string | null;
  boarding_stop_id?: string | null;
  status: 'active' | 'inactive';
  is_on_leave?: boolean;
  leave_info?: StudentLeave | null;
  created_at?: string;
  updated_at?: string;
  // Joined fields
  profile?: UserProfile;
  route?: Route;
  bus?: Bus;
  boarding_stop?: Stop;
}

export interface Driver {
  id: string;
  user_id: string;
  employee_id: string;
  license_number: string;
  phone: string;
  password?: string;
  assigned_bus_id?: string | null;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
  // Joined fields
  profile?: UserProfile;
  bus?: Bus;
}

export type TripShift = 'morning' | 'evening';

export interface Bus {
  id: string;
  bus_number: string;
  registration_number: string;
  bus_name: string;
  capacity: number;
  route_id?: string | null;
  assigned_driver_id?: string | null;
  substitute_driver_id?: string | null;
  substitute_driver?: Driver | null;
  is_standby_replacement?: boolean;
  original_bus_id?: string | null;
  swapped_with_bus_id?: string | null;
  original_route_id?: string | null;
  substitution_reason?: string | null;
  substitution_date?: string | null;
  status: BusStatus;
  created_at?: string;
  updated_at?: string;
  // Joined fields
  route?: Route;
  driver?: Driver;
  current_location?: CurrentBusLocation;
}

export interface Route {
  id: string;
  route_name: string;
  description?: string | null;
  start_location: string;
  destination: string;
  distance_km: number;
  estimated_duration: string;
  route_color?: string;
  start_time?: string;
  end_time?: string;
  evening_start_time?: string;
  evening_end_time?: string;
  google_maps_link?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
  stops?: Stop[];
}

export interface Stop {
  id: string;
  route_id: string;
  stop_name: string;
  latitude: number;
  longitude: number;
  stop_order: number;
  estimated_arrival?: string | null;
  google_maps_link?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface Trip {
  id: string;
  bus_id: string;
  driver_id: string;
  route_id: string;
  start_time: string;
  end_time?: string | null;
  status: TripStatus;
  start_latitude?: number | null;
  start_longitude?: number | null;
  end_latitude?: number | null;
  end_longitude?: number | null;
  distance_travelled?: number | null;
  created_at?: string;
  updated_at?: string;
  // Joined fields
  bus?: Bus;
  driver?: Driver;
  route?: Route;
}

export interface CurrentBusLocation {
  id: string;
  bus_id: string;
  trip_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  updated_at: string;
  bus?: Bus;
}

export interface BusLocation {
  id: string;
  trip_id: string;
  bus_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: string;
}

export interface EmergencyAlert {
  id: string;
  bus_id: string;
  driver_id: string;
  trip_id?: string | null;
  type: EmergencyType;
  message: string;
  latitude: number;
  longitude: number;
  status: EmergencyStatus;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  bus?: Bus;
  driver?: Driver;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  sender_id?: string | null;
  target_type: NotificationTargetType;
  target_id?: string | null;
  created_at: string;
  read_at?: string | null;
}

export interface StudentBusAssignment {
  id: string;
  student_id: string;
  bus_id: string;
  route_id: string;
  stop_id: string;
  start_date: string;
  end_date?: string | null;
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface GPSCoordinate {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp?: string;
}

export interface RouteSimulationPoint extends GPSCoordinate {
  stop_name?: string;
}
