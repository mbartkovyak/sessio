-- Fix: When a member joins, ensure sessions exist so attendance can be created.
-- Also update generate_sessions_for_training to handle days_of_week array
-- and allow members (not just coaches) to call it.

-- 1. Update generate_sessions_for_training to handle multi-day + relax auth
CREATE OR REPLACE FUNCTION public.generate_sessions_for_training(p_training_id UUID)
RETURNS JSONB LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_training public.trainings%ROWTYPE;
  v_target_date DATE;
  v_today DATE := current_date;
  v_end_date DATE := current_date + 14;
  v_session_id UUID;
  v_created INTEGER := 0;
  v_dow INTEGER;
  v_days INTEGER[];
BEGIN
  SELECT * INTO v_training FROM public.trainings WHERE id = p_training_id;
  IF NOT FOUND OR NOT v_training.is_active THEN RETURN jsonb_build_object('created', 0); END IF;

  -- Use days_of_week array if available, fall back to single day_of_week
  v_days := COALESCE(v_training.days_of_week, ARRAY[v_training.day_of_week]);

  FOREACH v_dow IN ARRAY v_days LOOP
    -- Postgres DOW: Sunday=0, our days: Monday=0 → convert
    v_target_date := v_today;
    -- Find next occurrence of this day of week
    WHILE EXTRACT(DOW FROM v_target_date)::INTEGER != ((v_dow + 1) % 7) LOOP
      v_target_date := v_target_date + 1;
    END LOOP;

    WHILE v_target_date <= v_end_date LOOP
      IF NOT EXISTS (SELECT 1 FROM public.training_sessions WHERE training_id = p_training_id AND session_date = v_target_date) THEN
        INSERT INTO public.training_sessions (training_id, session_date, start_time, end_time, status)
        VALUES (p_training_id, v_target_date, v_training.start_time, v_training.end_time, 'scheduled')
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

-- 2. Update the trigger to also generate sessions before creating attendance
CREATE OR REPLACE FUNCTION public.create_attendance_for_new_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'regular' THEN
    -- Ensure future sessions exist (idempotent)
    PERFORM public.generate_sessions_for_training(NEW.training_id);

    -- Create attendance for all future scheduled sessions
    INSERT INTO public.session_attendance (session_id, user_id, status)
    SELECT ts.id, NEW.user_id, 'pending'
    FROM public.training_sessions ts
    WHERE ts.training_id = NEW.training_id
      AND ts.session_date >= CURRENT_DATE
      AND ts.status = 'scheduled'
    ON CONFLICT (session_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. School owners can view profiles of members in their school's trainings
CREATE POLICY "School owners view training member profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trainings t
    JOIN public.schools s ON s.id = t.school_id
    JOIN public.training_members tm ON tm.training_id = t.id
    WHERE s.owner_id = auth.uid() AND tm.user_id = profiles.id
  )
);

NOTIFY pgrst, 'reload schema';
