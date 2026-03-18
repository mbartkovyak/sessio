-- One-off: backfill attendance for existing members who joined before the trigger existed
INSERT INTO public.session_attendance (session_id, user_id, status)
SELECT ts.id, tm.user_id, 'pending'
FROM public.training_members tm
JOIN public.training_sessions ts ON ts.training_id = tm.training_id
WHERE tm.role = 'regular'
  AND ts.session_date >= CURRENT_DATE
  AND ts.status = 'scheduled'
ON CONFLICT (session_id, user_id) DO NOTHING;
