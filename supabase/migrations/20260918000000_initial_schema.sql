-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Enum Types
CREATE TYPE user_role AS ENUM ('student', 'driver', 'admin');
CREATE TYPE bus_status AS ENUM ('active', 'inactive', 'maintenance');
CREATE TYPE trip_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');
CREATE TYPE emergency_status AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');
CREATE TYPE emergency_type AS ENUM ('breakdown', 'accident', 'medical', 'emergency', 'other');
CREATE TYPE notification_type AS ENUM ('general', 'trip', 'delay', 'emergency', 'maintenance', 'announcement');
CREATE TYPE target_type AS ENUM ('all', 'route', 'bus', 'role', 'user');

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    role user_role NOT NULL DEFAULT 'student',
    profile_image TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROUTES TABLE
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_location VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    distance_km NUMERIC(6, 2) DEFAULT 0.0,
    estimated_duration VARCHAR(50) DEFAULT '45 mins',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. STOPS TABLE
CREATE TABLE IF NOT EXISTS public.stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
    stop_name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    stop_order INT NOT NULL,
    estimated_arrival VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_id VARCHAR(100) UNIQUE NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    assigned_bus_id UUID, -- Foreign key constraint added later to prevent circular dependency
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BUSES TABLE
CREATE TABLE IF NOT EXISTS public.buses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_number VARCHAR(50) UNIQUE NOT NULL,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    bus_name VARCHAR(255) NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
    assigned_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    status bus_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add circular FK for driver assigned_bus_id
ALTER TABLE public.drivers
ADD CONSTRAINT fk_driver_assigned_bus
FOREIGN KEY (assigned_bus_id) REFERENCES public.buses(id) ON DELETE SET NULL;

-- 6. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    register_number VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    year INT NOT NULL CHECK (year BETWEEN 1 AND 5),
    section VARCHAR(10) DEFAULT 'A',
    route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
    bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
    boarding_stop_id UUID REFERENCES public.stops(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TRIPS TABLE
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id UUID REFERENCES public.buses(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    status trip_status DEFAULT 'active',
    start_latitude DOUBLE PRECISION,
    start_longitude DOUBLE PRECISION,
    end_latitude DOUBLE PRECISION,
    end_longitude DOUBLE PRECISION,
    distance_travelled NUMERIC(6, 2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CURRENT BUS LOCATIONS (Optimized for Realtime Live Map)
CREATE TABLE IF NOT EXISTS public.current_bus_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id UUID UNIQUE REFERENCES public.buses(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    speed NUMERIC(5, 2) DEFAULT 0.0,
    heading NUMERIC(5, 2) DEFAULT 0.0,
    accuracy NUMERIC(5, 2) DEFAULT 0.0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BUS LOCATIONS (Historical Telemetry Log)
CREATE TABLE IF NOT EXISTS public.bus_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    bus_id UUID REFERENCES public.buses(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    speed NUMERIC(5, 2) DEFAULT 0.0,
    heading NUMERIC(5, 2) DEFAULT 0.0,
    accuracy NUMERIC(5, 2) DEFAULT 0.0,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for fast querying & optimization
CREATE INDEX idx_bus_locations_bus_id ON public.bus_locations(bus_id);
CREATE INDEX idx_bus_locations_trip_id ON public.bus_locations(trip_id);
CREATE INDEX idx_bus_locations_timestamp ON public.bus_locations(timestamp DESC);
CREATE INDEX idx_current_bus_locations_bus_id ON public.current_bus_locations(bus_id);
CREATE INDEX idx_trips_status ON public.trips(status);
CREATE INDEX idx_students_bus_id ON public.students(bus_id);

-- 10. EMERGENCY ALERTS
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bus_id UUID REFERENCES public.buses(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    type emergency_type DEFAULT 'emergency',
    message TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status emergency_status DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'general',
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_type target_type DEFAULT 'all',
    target_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- 12. STUDENT BUS ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.student_bus_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    bus_id UUID REFERENCES public.buses(id) ON DELETE CASCADE,
    route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
    stop_id UUID REFERENCES public.stops(id) ON DELETE CASCADE,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIGGER FOR AUTOMATIC CURRENT_BUS_LOCATIONS UPSERT
CREATE OR REPLACE FUNCTION public.sync_current_bus_location()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.current_bus_locations (bus_id, trip_id, latitude, longitude, speed, heading, accuracy, updated_at)
    VALUES (NEW.bus_id, NEW.trip_id, NEW.latitude, NEW.longitude, NEW.speed, NEW.heading, NEW.accuracy, NEW.timestamp)
    ON CONFLICT (bus_id) DO UPDATE SET
        trip_id = EXCLUDED.trip_id,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        speed = EXCLUDED.speed,
        heading = EXCLUDED.heading,
        accuracy = EXCLUDED.accuracy,
        updated_at = EXCLUDED.updated_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_current_bus_location
AFTER INSERT ON public.bus_locations
FOR EACH ROW EXECUTE FUNCTION public.sync_current_bus_location();

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_bus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_bus_assignments ENABLE ROW LEVEL SECURITY;

-- Helper function to check role from profiles table
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS POLICIES FOR PROFILES
CREATE POLICY "Public profiles read access" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = auth_user_id);
CREATE POLICY "Admin full profile management" ON public.profiles FOR ALL USING (public.get_auth_user_role() = 'admin');

-- RLS POLICIES FOR BUSES, ROUTES, STOPS
CREATE POLICY "Anyone can view buses" ON public.buses FOR SELECT USING (true);
CREATE POLICY "Admin can modify buses" ON public.buses FOR ALL USING (public.get_auth_user_role() = 'admin');

CREATE POLICY "Anyone can view routes" ON public.routes FOR SELECT USING (true);
CREATE POLICY "Admin can modify routes" ON public.routes FOR ALL USING (public.get_auth_user_role() = 'admin');

CREATE POLICY "Anyone can view stops" ON public.stops FOR SELECT USING (true);
CREATE POLICY "Admin can modify stops" ON public.stops FOR ALL USING (public.get_auth_user_role() = 'admin');

-- RLS POLICIES FOR TRIPS
CREATE POLICY "Anyone can view active/completed trips" ON public.trips FOR SELECT USING (true);
CREATE POLICY "Drivers can insert/update own trips" ON public.trips FOR ALL USING (public.get_auth_user_role() = 'driver' OR public.get_auth_user_role() = 'admin');

-- RLS POLICIES FOR GPS LOCATIONS
CREATE POLICY "Anyone can view current bus locations" ON public.current_bus_locations FOR SELECT USING (true);
CREATE POLICY "Drivers and Admin can update current bus location" ON public.current_bus_locations FOR ALL USING (public.get_auth_user_role() = 'driver' OR public.get_auth_user_role() = 'admin');

CREATE POLICY "Anyone can view historical bus locations" ON public.bus_locations FOR SELECT USING (true);
CREATE POLICY "Drivers and Admin can insert location history" ON public.bus_locations FOR INSERT WITH CHECK (public.get_auth_user_role() = 'driver' OR public.get_auth_user_role() = 'admin');

-- RLS POLICIES FOR EMERGENCY ALERTS
CREATE POLICY "Anyone can view emergency alerts" ON public.emergency_alerts FOR SELECT USING (true);
CREATE POLICY "Drivers can raise emergency alerts" ON public.emergency_alerts FOR INSERT WITH CHECK (public.get_auth_user_role() = 'driver' OR public.get_auth_user_role() = 'admin');
CREATE POLICY "Admins can update emergency alerts" ON public.emergency_alerts FOR UPDATE USING (public.get_auth_user_role() = 'admin');

-- RLS POLICIES FOR NOTIFICATIONS
CREATE POLICY "Anyone can view notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Admin can create notifications" ON public.notifications FOR ALL USING (public.get_auth_user_role() = 'admin');
