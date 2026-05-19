-- The spot-free push now leads with the training name and switches the body
-- to an action-oriented "be first to claim" line. Trigger definition is
-- unchanged (AFTER UPDATE OR DELETE, gated on OLD.status='confirmed') — only
-- the function body is replaced.
--
-- Body otherwise identical to the v3 in 20260515120200_extend_spot_free_trigger_to_delete.sql
-- per CLAUDE.md "copy current body" rule.

CREATE OR REPLACE FUNCTION public.notify_waitlist_on_spot_free()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_url text;
  v_freed_session_id uuid;
  v_freed_user_id uuid;
  v_training_id uuid;
  v_session_date date;
  v_session_start time;
  v_session_status text;
  v_training_name text;
  v_cancel_deadline_hours integer;
  v_session_starts_at timestamptz;
  v_date_label text;
  v_time_label text;
  loc record;
BEGIN
  IF NOT (
    (TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND COALESCE(NEW.status, '') <> 'confirmed')
    OR
    (TG_OP = 'DELETE' AND OLD.status = 'confirmed')
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_freed_session_id := COALESCE(NEW.session_id, OLD.session_id);
  v_freed_user_id := COALESCE(NEW.user_id, OLD.user_id);

  SELECT ts.training_id, ts.session_date, ts.start_time, ts.status,
         t.name, t.cancel_deadline_hours
    INTO v_training_id, v_session_date, v_session_start, v_session_status,
         v_training_name, v_cancel_deadline_hours
  FROM training_sessions ts
  JOIN trainings t ON t.id = ts.training_id
  WHERE ts.id = v_freed_session_id
    AND t.is_active = true;

  IF NOT FOUND OR v_session_status <> 'scheduled' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_session_starts_at := (v_session_date::text || ' ' || v_session_start::text)::timestamptz;

  IF v_session_starts_at <= now() THEN RETURN COALESCE(NEW, OLD); END IF;
  IF v_cancel_deadline_hours IS NOT NULL
     AND v_session_starts_at - (v_cancel_deadline_hours || ' hours')::interval <= now() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT value INTO base_url FROM public._config WHERE key = 'supabase_url';
  IF base_url IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  v_date_label := to_char(v_session_date, 'DD.MM');
  v_time_label := to_char(v_session_start, 'HH24:MI');

  FOR loc IN
    SELECT
      COALESCE(p.language, 'en') AS lang,
      array_agg(sa.user_id) AS recipients
    FROM session_attendance sa
    JOIN profiles p ON p.id = sa.user_id
    WHERE sa.session_id = v_freed_session_id
      AND sa.status = 'pending'
    GROUP BY COALESCE(p.language, 'en')
  LOOP
    PERFORM net.http_post(
      url := base_url || '/functions/v1/send-push',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'action', 'notify',
        'sender_id', v_freed_user_id,
        'user_ids', loc.recipients,
        'title', CASE loc.lang
          WHEN 'uk' THEN format('Звільнилось місце: %s', v_training_name)
          WHEN 'pl' THEN format('Zwolniło się miejsce — %s', v_training_name)
          WHEN 'de' THEN format('Ein Platz wurde frei — %s', v_training_name)
          ELSE format('A spot opened up — %s', v_training_name)
        END,
        'body', CASE loc.lang
          WHEN 'uk' THEN format('%s о %s. Встигни забронювати першим.', v_date_label, v_time_label)
          WHEN 'pl' THEN format('%s o %s. Bądź pierwszy, zajmij miejsce.', v_date_label, v_time_label)
          WHEN 'de' THEN format('%s um %s. Sei der Erste — schnapp ihn dir.', v_date_label, v_time_label)
          ELSE format('%s at %s. Be first to claim the spot.', v_date_label, v_time_label)
        END,
        'tag', 'spot-freed-' || v_freed_session_id,
        'url', '/player'
      )
    );
  END LOOP;

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RETURN COALESCE(NEW, OLD);
END;
$$;
