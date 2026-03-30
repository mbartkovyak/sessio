-- Add attendance marking support to training_sessions
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS attendance_marked_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attendance_reminder_sent boolean NOT NULL DEFAULT FALSE;
