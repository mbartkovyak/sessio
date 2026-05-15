-- When a confirmed attendee declines (or is marked no_show), push every
-- waitlisted athlete on that session: "spot opened, first to confirm gets it."
-- First-come-first-serve is resolved by the existing enforce_session_capacity
-- BEFORE INSERT/UPDATE trigger (migration 20260506100000) — whoever taps
-- "Going" first wins, others get SESSION_FULL.
--
-- Two guards: skip if the session is already in the past, and skip if we're
-- already inside the cancel-deadline window (last-minute pushes are noise).

CREATE OR REPLACE FUNCTION public.notify_waitlist_on_spot_free()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_url text;
  v_training_id uuid;
  v_session_date date;
  v_session_start time;
  v_session_status text;
  v_training_name text;
  v_cancel_deadline_hours integer;
  v_session_starts_at timestamptz;
  v_date_label text;
  loc record;
BEGIN
  -- Only act when a previously confirmed seat actually opens.
  IF NOT (TG_OP = 'UPDATE'
          AND OLD.status = 'confirmed'
          AND NEW.status IN ('declined', 'no_show')) THEN
    RETURN NEW;
  END IF;

  -- Session + training context. status='scheduled' guard catches the case
  -- where a cancellation cascade flips attendance rows during a session cancel.
  SELECT ts.training_id, ts.session_date, ts.start_time, ts.status,
         t.name, t.cancel_deadline_hours
    INTO v_training_id, v_session_date, v_session_start, v_session_status,
         v_training_name, v_cancel_deadline_hours
  FROM training_sessions ts
  JOIN trainings t ON t.id = ts.training_id
  WHERE ts.id = NEW.session_id;

  IF v_session_status <> 'scheduled' THEN RETURN NEW; END IF;

  v_session_starts_at := (v_session_date::text || ' ' || v_session_start::text)::timestamptz;

  -- Skip past sessions.
  IF v_session_starts_at <= now() THEN RETURN NEW; END IF;

  -- Skip the cancel-deadline window.
  IF v_cancel_deadline_hours IS NOT NULL
     AND v_session_starts_at - (v_cancel_deadline_hours || ' hours')::interval <= now() THEN
    RETURN NEW;
  END IF;

  SELECT value INTO base_url FROM public._config WHERE key = 'supabase_url';
  IF base_url IS NULL THEN RETURN NEW; END IF;

  v_date_label := to_char(v_session_date, 'DD.MM') || ' ' || to_char(v_session_start, 'HH24:MI');

  -- Fan out per language: one HTTP call per language group.
  FOR loc IN
    SELECT
      COALESCE(p.language, 'en') AS lang,
      array_agg(sa.user_id) AS recipients
    FROM session_attendance sa
    JOIN profiles p ON p.id = sa.user_id
    WHERE sa.session_id = NEW.session_id
      AND sa.status = 'pending'
    GROUP BY COALESCE(p.language, 'en')
  LOOP
    PERFORM net.http_post(
      url := base_url || '/functions/v1/send-push',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'action', 'notify',
        'sender_id', NEW.user_id,  -- the athlete who freed the spot
        'user_ids', loc.recipients,
        'title', CASE loc.lang
          WHEN 'uk' THEN format('Звільнилось місце на %s', v_date_label)
          WHEN 'pl' THEN format('Zwolniło się miejsce na %s', v_date_label)
          WHEN 'de' THEN format('Ein Platz wurde frei am %s', v_date_label)
          ELSE format('A spot opened up for %s', v_date_label)
        END,
        'body', CASE loc.lang
          WHEN 'uk' THEN 'Хто перший підтвердить — той і йде.'
          WHEN 'pl' THEN 'Kto pierwszy potwierdzi, ten idzie.'
          WHEN 'de' THEN 'Wer zuerst bestätigt, bekommt den Platz.'
          ELSE 'First to confirm gets it.'
        END,
        'tag', 'spot-freed-' || NEW.session_id,
        'url', '/player'
      )
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the original status change if the notification fails.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_waitlist_on_spot_free ON public.session_attendance;
CREATE TRIGGER trg_notify_waitlist_on_spot_free
AFTER UPDATE ON public.session_attendance
FOR EACH ROW
EXECUTE FUNCTION public.notify_waitlist_on_spot_free();
