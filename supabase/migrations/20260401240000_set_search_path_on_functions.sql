-- Fix "Function Search Path Mutable" warnings for all 9 flagged functions.
-- Adding SET search_path = public prevents search-path injection attacks.
-- Each function body is unchanged — only the SET clause is added.

-- 1. add_session_attendee_to_conversation
CREATE OR REPLACE FUNCTION public.add_session_attendee_to_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT c.id, NEW.user_id
  FROM public.training_sessions ts
  JOIN public.conversations c ON c.training_id = ts.training_id
  WHERE ts.id = NEW.session_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. is_school_owner_of_training
CREATE OR REPLACE FUNCTION public.is_school_owner_of_training(p_training_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trainings t
    JOIN public.schools s ON s.id = t.school_id
    WHERE t.id = p_training_id
    AND s.owner_id = auth.uid()
  );
$$;

-- 3. owns_school
CREATE OR REPLACE FUNCTION public.owns_school(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.schools WHERE id = p_school_id AND owner_id = auth.uid()
  );
$$;

-- 4. sync_full_name
CREATE OR REPLACE FUNCTION public.sync_full_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name := trim(coalesce(NEW.first_name, '') || ' ' || coalesce(NEW.last_name, ''));
  END IF;
  RETURN NEW;
END;
$$;

-- 5. add_member_to_conversation
CREATE OR REPLACE FUNCTION public.add_member_to_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT c.id, NEW.user_id
  FROM public.conversations c
  WHERE c.training_id = NEW.training_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 6. create_training_conversation
CREATE OR REPLACE FUNCTION public.create_training_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conv_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.conversations (id, training_id) VALUES (_conv_id, NEW.id);
  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (_conv_id, NEW.coach_id);
  RETURN NEW;
END;
$$;

-- 7. notify_new_message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_url text;
BEGIN
  SELECT value INTO base_url FROM public._config WHERE key = 'supabase_url';
  IF base_url IS NULL THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/send-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'action', 'notify_message',
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'message_preview', left(NEW.content, 100)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- 8. generate_sessions_for_training
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

  v_end_date := LEAST(
    COALESCE(v_training.end_date, CURRENT_DATE + INTERVAL '90 days'),
    CURRENT_DATE + INTERVAL '90 days'
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

-- 9. create_attendance_for_new_member
CREATE OR REPLACE FUNCTION public.create_attendance_for_new_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
