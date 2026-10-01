-- ============================================================================
-- Migration: Add morning_time and evening_time to stops table
-- Supports individual morning and evening shift schedules per stop
-- ============================================================================

ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS morning_time VARCHAR(50);
ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS evening_time VARCHAR(50);

-- Backfill morning_time with existing estimated_arrival if null
UPDATE public.stops 
SET morning_time = estimated_arrival 
WHERE morning_time IS NULL AND estimated_arrival IS NOT NULL;
