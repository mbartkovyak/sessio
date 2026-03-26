ALTER TABLE public.session_attendance
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0;

-- Backfill: rows that already have reminder_sent_at get count = 1
UPDATE public.session_attendance
  SET reminder_count = 1
  WHERE reminder_sent_at IS NOT NULL;
