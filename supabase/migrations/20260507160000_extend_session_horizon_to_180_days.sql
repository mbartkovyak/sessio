-- Extend the recurring-session generation horizon from 90 → 180 days, and let
-- a coach-set training.end_date push it out to ~1 year (sanity-capped).
--
-- Background: athletes were only seeing ~3 months ahead in the calendar even
-- when their coach has a class running every week indefinitely. The cap on
-- the cron-driven session generator was the bottleneck.
--
-- Body copied from the current state in 20260401240000_set_search_path_on_functions.sql
-- per the "copy current body, not stale" rule. Only the v_end_date computation
-- changes — everything else is unchanged.
--
-- Perf note: the per-training cost grows linearly with the horizon. For a
-- weekly recurring training, 180 days = ~26 INSERT attempts (most no-op via
-- the IF NOT EXISTS guard). The hourly automation cron is the only caller in
-- the steady state; user-facing RPCs do not invoke this function.

CREATE OR REPLACE FUNCTION public.generate_sessions_for_training(p_training_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- end_date null → look 180 days ahead (default for "every week, no end").
  -- end_date set → respect it, but never generate more than 365 days at once
  -- (sanity cap; an open-ended class with a far-future end_date would otherwise
  -- create thousands of rows in a single cron tick).
  v_end_date := LEAST(
    COALESCE(v_training.end_date, CURRENT_DATE + INTERVAL '180 days'),
    CURRENT_DATE + INTERVAL '365 days'
  )::DATE;

  IF v_training.is_recurring THEN
    v_target_date := GREATEST(v_training.start_date, CURRENT_DATE);

    WHILE v_target_date <= v_end_date LOOP
      v_dow := EXTRACT(ISODOW FROM v_target_date)::INT - 1;

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
    v_target_date := v_training.start_date;
    IF v_target_date IS NOT NULL AND v_target_date >= CURRENT_DATE AND NOT EXISTS (
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
