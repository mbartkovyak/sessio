-- Extend session generation from 14 days to 90 days (or training end_date)
-- Previously sessions were only generated 2 weeks ahead, making the calendar useless beyond that

CREATE OR REPLACE FUNCTION public.generate_sessions_for_training(p_training_id UUID)
RETURNS JSONB LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_training public.trainings%ROWTYPE;
  v_target_date DATE;
  v_start DATE;
  v_end_date DATE;
  v_session_id UUID;
  v_created INTEGER := 0;
  v_dow INTEGER;
  v_days INTEGER[];
  v_start_time TIME;
  v_end_time TIME;
  v_day_sched JSONB;
BEGIN
  SELECT * INTO v_training FROM public.trainings WHERE id = p_training_id;
  IF NOT FOUND OR NOT v_training.is_active THEN RETURN jsonb_build_object('created', 0); END IF;

  -- Start from today or training start_date, whichever is later
  v_start := GREATEST(current_date, COALESCE(v_training.start_date, current_date));

  -- End date: use training's end_date, capped at 90 days for recurring
  -- Non-recurring (one-off) always uses the exact end_date without cap
  IF v_training.is_recurring = false THEN
    v_end_date := COALESCE(v_training.end_date, current_date + 90);
  ELSE
    v_end_date := LEAST(
      COALESCE(v_training.end_date, current_date + 90),
      current_date + 90
    );
  END IF;

  v_days := COALESCE(v_training.days_of_week, ARRAY[v_training.day_of_week]);

  FOREACH v_dow IN ARRAY v_days LOOP
    -- Per-day times from day_schedules, fallback to training defaults
    IF v_training.day_schedules IS NOT NULL AND v_training.day_schedules ? v_dow::text THEN
      v_day_sched := v_training.day_schedules -> v_dow::text;
      v_start_time := (v_day_sched ->> 'start_time')::TIME;
      v_end_time := (v_day_sched ->> 'end_time')::TIME;
    ELSE
      v_start_time := v_training.start_time;
      v_end_time := v_training.end_time;
    END IF;

    -- Find first occurrence of this day-of-week on or after v_start
    v_target_date := v_start;
    WHILE EXTRACT(DOW FROM v_target_date)::INTEGER != ((v_dow + 1) % 7) LOOP
      v_target_date := v_target_date + 1;
    END LOOP;

    WHILE v_target_date <= v_end_date LOOP
      IF NOT EXISTS (SELECT 1 FROM public.training_sessions WHERE training_id = p_training_id AND session_date = v_target_date) THEN
        INSERT INTO public.training_sessions (training_id, session_date, start_time, end_time, status)
        VALUES (p_training_id, v_target_date, v_start_time, v_end_time, 'scheduled')
        RETURNING id INTO v_session_id;

        INSERT INTO public.session_attendance (session_id, user_id, status)
        SELECT v_session_id, tm.user_id, 'pending' FROM public.training_members tm
        WHERE tm.training_id = p_training_id AND tm.role = 'regular'
        ON CONFLICT (session_id, user_id) DO NOTHING;

        v_created := v_created + 1;
      END IF;
      v_target_date := v_target_date + 7;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('created', v_created);
END;
$$;

-- Backfill: generate extended sessions for all active trainings
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

-- Backfill attendance for members who joined before new sessions existed
INSERT INTO public.session_attendance (session_id, user_id, status)
SELECT ts.id, tm.user_id, 'pending'
FROM public.training_members tm
JOIN public.training_sessions ts ON ts.training_id = tm.training_id
WHERE tm.role = 'regular'
  AND ts.session_date >= CURRENT_DATE
  AND ts.status = 'scheduled'
ON CONFLICT (session_id, user_id) DO NOTHING;
