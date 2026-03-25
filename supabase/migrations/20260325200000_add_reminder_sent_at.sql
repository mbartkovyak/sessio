-- Add reminder_sent_at to prevent duplicate confirmation push notifications.
-- The automation edge function sets this when a reminder is sent.
ALTER TABLE public.session_attendance
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
