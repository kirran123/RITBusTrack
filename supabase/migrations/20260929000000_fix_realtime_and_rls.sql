-- ============================================================================
-- Fix Realtime Replication and RLS Policies for Notifications, Emergencies, Locations, Trips
-- ============================================================================

-- 1. Add missing enum values
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'sos';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'urgent';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'route_change';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'broadcast';
ALTER TYPE emergency_type ADD VALUE IF NOT EXISTS 'sos';

-- 2. Relax emergency_alerts constraints so missing coords/nulls never break
ALTER TABLE public.emergency_alerts ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE public.emergency_alerts ALTER COLUMN longitude DROP NOT NULL;
ALTER TABLE public.emergency_alerts ALTER COLUMN latitude SET DEFAULT 9.4475;
ALTER TABLE public.emergency_alerts ALTER COLUMN longitude SET DEFAULT 77.5450;
ALTER TABLE public.emergency_alerts ALTER COLUMN bus_id DROP NOT NULL;
ALTER TABLE public.emergency_alerts ALTER COLUMN driver_id DROP NOT NULL;

-- 3. RLS Policies: Allow public anon + authenticated to SELECT, INSERT, UPDATE notifications
DROP POLICY IF EXISTS "Anyone can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public all notifications" ON public.notifications;
CREATE POLICY "Allow public all notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- Allow public anon + authenticated to SELECT, INSERT, UPDATE emergency_alerts
DROP POLICY IF EXISTS "Anyone can view emergency alerts" ON public.emergency_alerts;
DROP POLICY IF EXISTS "Drivers can raise emergency alerts" ON public.emergency_alerts;
DROP POLICY IF EXISTS "Admins can update emergency alerts" ON public.emergency_alerts;
DROP POLICY IF EXISTS "Allow public all emergency_alerts" ON public.emergency_alerts;
CREATE POLICY "Allow public all emergency_alerts" ON public.emergency_alerts FOR ALL USING (true) WITH CHECK (true);

-- Allow public anon + authenticated to SELECT, INSERT, UPDATE current_bus_locations
DROP POLICY IF EXISTS "Anyone can view current bus locations" ON public.current_bus_locations;
DROP POLICY IF EXISTS "Drivers and Admin can update current bus location" ON public.current_bus_locations;
DROP POLICY IF EXISTS "Allow public all current_bus_locations" ON public.current_bus_locations;
CREATE POLICY "Allow public all current_bus_locations" ON public.current_bus_locations FOR ALL USING (true) WITH CHECK (true);

-- Allow public access on students (leave toggle)
DROP POLICY IF EXISTS "Allow public select students" ON public.students;
DROP POLICY IF EXISTS "Allow public update students" ON public.students;
CREATE POLICY "Allow public select students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow public update students" ON public.students FOR ALL USING (true) WITH CHECK (true);

-- Allow public access on trips
DROP POLICY IF EXISTS "Allow public trips" ON public.trips;
CREATE POLICY "Allow public trips" ON public.trips FOR ALL USING (true) WITH CHECK (true);

-- 4. Enable REPLICA IDENTITY FULL for complete Realtime payload updates
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.emergency_alerts REPLICA IDENTITY FULL;
ALTER TABLE public.current_bus_locations REPLICA IDENTITY FULL;
ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.trips REPLICA IDENTITY FULL;

-- 5. Add tables to supabase_realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_alerts;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.current_bus_locations;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  EXCEPTION WHEN duplicate_object THEN END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
  EXCEPTION WHEN duplicate_object THEN END;
END $$;
