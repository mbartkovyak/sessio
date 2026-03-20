-- One-off: generate sessions for all active trainings that may be missing future sessions
DO $$
DECLARE
  t RECORD;
  result JSONB;
BEGIN
  FOR t IN SELECT id, name FROM public.trainings WHERE is_active = true LOOP
    result := public.generate_sessions_for_training(t.id);
    RAISE NOTICE 'Training % (%): created % sessions', t.name, t.id, result->>'created';
  END LOOP;
END;
$$;

-- Also backfill attendance for members who may have joined before sessions existed
INSERT INTO public.session_attendance (session_id, user_id, status)
SELECT ts.id, tm.user_id, 'pending'
FROM public.training_members tm
JOIN public.training_sessions ts ON ts.training_id = tm.training_id
WHERE tm.role = 'regular'
  AND ts.session_date >= CURRENT_DATE
  AND ts.status = 'scheduled'
ON CONFLICT (session_id, user_id) DO NOTHING;
