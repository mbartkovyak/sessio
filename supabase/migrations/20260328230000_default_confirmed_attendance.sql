-- Flip confirmation model: athletes are auto-enrolled (confirmed) by default.
-- They cancel if they can't make it, instead of confirming they're coming.

-- 1. Replace generate_sessions_for_training() — insert 'confirmed' instead of 'pending'
CREATE OR REPLACE FUNCTION public.generate_sessions_for_training(p_training_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_training RECORD;
  v_target_date DATE;
  v_end_date DATE;
  v_start_time TIME;
  v_end_time TIME;
  v_session_id UUID;
  v_created INT := 0;
  v_dow INT;
  v_day_key TEXT;
  v_sched JSONB;
BEGIN
  SELECT * INTO v_training FROM public.trainings WHERE id = p_training_id;
  IF NOT FOUND OR v_training.is_active = false THEN
    RETURN jsonb_build_object('created', 0);
  END IF;

  v_end_date := LEAST(
    COALESCE(v_training.end_date, CURRENT_DATE + INTERVAL '90 days'),
    CURRENT_DATE + INTERVAL '90 days'
  )::DATE;

  IF v_training.is_recurring THEN
    v_target_date := GREATEST(v_training.start_date, CURRENT_DATE);

    WHILE v_target_date <= v_end_date LOOP
      v_dow := EXTRACT(ISODOW FROM v_target_date)::INT;

      IF v_training.days_of_week IS NOT NULL AND ARRAY[v_dow] <@ v_training.days_of_week THEN
        v_day_key := v_dow::TEXT;
        v_sched := v_training.day_schedules;

        IF v_sched IS NOT NULL AND v_sched ? v_day_key THEN
          v_start_time := (v_sched->v_day_key->>'start_time')::TIME;
          v_end_time   := (v_sched->v_day_key->>'end_time')::TIME;
        ELSE
          v_start_time := v_training.start_time;
          v_end_time   := v_training.end_time;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM public.training_sessions
          WHERE training_id = p_training_id AND session_date = v_target_date
        ) THEN
          INSERT INTO public.training_sessions (training_id, session_date, start_time, end_time, status)
          VALUES (p_training_id, v_target_date, v_start_time, v_end_time, 'scheduled')
          RETURNING id INTO v_session_id;

          INSERT INTO public.session_attendance (session_id, user_id, status, confirmed_at)
          SELECT v_session_id, tm.user_id, 'confirmed', now() FROM public.training_members tm
          WHERE tm.training_id = p_training_id AND tm.role = 'regular'
          ON CONFLICT (session_id, user_id) DO NOTHING;

          v_created := v_created + 1;
        END IF;
      ELSIF v_training.day_of_week IS NOT NULL AND v_dow = v_training.day_of_week THEN
        v_start_time := v_training.start_time;
        v_end_time   := v_training.end_time;

        IF NOT EXISTS (
          SELECT 1 FROM public.training_sessions
          WHERE training_id = p_training_id AND session_date = v_target_date
        ) THEN
          INSERT INTO public.training_sessions (training_id, session_date, start_time, end_time, status)
          VALUES (p_training_id, v_target_date, v_start_time, v_end_time, 'scheduled')
          RETURNING id INTO v_session_id;

          INSERT INTO public.session_attendance (session_id, user_id, status, confirmed_at)
          SELECT v_session_id, tm.user_id, 'confirmed', now() FROM public.training_members tm
          WHERE tm.training_id = p_training_id AND tm.role = 'regular'
          ON CONFLICT (session_id, user_id) DO NOTHING;

          v_created := v_created + 1;
        END IF;
      END IF;

      v_target_date := v_target_date + 1;
    END LOOP;
  ELSE
    v_target_date := COALESCE(v_training.one_off_date, v_training.start_date);
    IF v_target_date >= CURRENT_DATE AND NOT EXISTS (
      SELECT 1 FROM public.training_sessions
      WHERE training_id = p_training_id AND session_date = v_target_date
    ) THEN
      INSERT INTO public.training_sessions (training_id, session_date, start_time, end_time, status)
      VALUES (p_training_id, v_target_date, v_training.start_time, v_training.end_time, 'scheduled')
      RETURNING id INTO v_session_id;

      INSERT INTO public.session_attendance (session_id, user_id, status, confirmed_at)
      SELECT v_session_id, tm.user_id, 'confirmed', now() FROM public.training_members tm
      WHERE tm.training_id = p_training_id AND tm.role = 'regular'
      ON CONFLICT (session_id, user_id) DO NOTHING;

      v_created := v_created + 1;
    END IF;
  END IF;

  RETURN jsonb_build_object('created', v_created);
END;
$$;

-- 2. Replace create_attendance_for_new_member() trigger — insert 'confirmed' instead of 'pending'
CREATE OR REPLACE FUNCTION public.create_attendance_for_new_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create attendance for regular members (not waitlist)
  IF NEW.role = 'regular' THEN
    INSERT INTO public.session_attendance (session_id, user_id, status, confirmed_at)
    SELECT ts.id, NEW.user_id, 'confirmed', now()
    FROM public.training_sessions ts
    WHERE ts.training_id = NEW.training_id
      AND ts.session_date >= CURRENT_DATE
      AND ts.status = 'scheduled'
    ON CONFLICT (session_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Backfill: convert existing pending attendance for future sessions to confirmed
UPDATE public.session_attendance
SET status = 'confirmed', confirmed_at = now(), reminder_count = 0
WHERE status = 'pending'
  AND session_id IN (
    SELECT id FROM public.training_sessions
    WHERE session_date >= CURRENT_DATE AND status = 'scheduled'
  );
