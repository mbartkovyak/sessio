-- Add days_of_week array column
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS days_of_week integer[];

-- Backfill from existing day_of_week
UPDATE public.trainings SET days_of_week = ARRAY[day_of_week] WHERE days_of_week IS NULL AND day_of_week IS NOT NULL;
