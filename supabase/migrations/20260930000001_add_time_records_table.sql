-- Migration: Add time_records table for cross-admin & staff real-time persistence
CREATE TABLE IF NOT EXISTS public.time_records (
    id TEXT PRIMARY KEY,
    bus_id TEXT,
    bus_number TEXT NOT NULL,
    bus_name TEXT,
    registration_number TEXT,
    driver_id TEXT,
    driver_name TEXT NOT NULL,
    driver_phone TEXT,
    route_id TEXT,
    route_name TEXT,
    start_location TEXT,
    destination TEXT,
    shift TEXT NOT NULL,
    date TEXT NOT NULL,
    scheduled_start_time TEXT,
    scheduled_end_time TEXT,
    start_time TEXT,
    end_time TEXT,
    duration TEXT,
    distance_km NUMERIC DEFAULT 0,
    avg_speed_kmh NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'in_progress',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all time_records" ON public.time_records;
CREATE POLICY "Allow public all time_records" ON public.time_records FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.time_records REPLICA IDENTITY FULL;

-- Add to Realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.time_records;
  EXCEPTION WHEN duplicate_object THEN END;
END $$;
