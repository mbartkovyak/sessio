-- Extend the spot-free notification trigger to also fire when a confirmed
-- session_attendance row is DELETED.
--
-- The original 20260515120100 trigger only caught UPDATE confirmed→declined/no_show,
-- which covers a player using decline_session_attendance or a coach marking
-- no_show. But a regular member who LEAVES the training (useLeaveTraining) or
-- is REMOVED by the coach (useRemoveTrainingMember) takes a different path:
-- a BEFORE DELETE on training_members fires cleanup_attendance_on_member_leave,
-- which DELETEs the future session_attendance rows. Those deleted rows are real
-- freed spots — the waitlist needs to know.
--
-- delete_my_account follows the same DELETE path. Account deletion of a
-- confirmed athlete should notify pending athletes on their old sessions.
--
-- Also widens the UPDATE predicate from confirmed→declined/no_show to
-- confirmed→<anything-not-confirmed>. Future statuses (e.g. confirmed→pending
-- if someone re-introduces a "downgrade" path) get covered for free.

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
  loc record;
BEGIN
  -- Only act when a previously confirmed seat actually opens. Covers:
  --   • decline / no_show (UPDATE confirmed → not-confirmed)
  --   • member leaves or coach removes (DELETE of confirmed row via cleanup
  --     trigger)
  --   • account deletion (DELETE of confirmed row via delete_my_account)
  IF NOT (
    (TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND COALESCE(NEW.status, '') <> 'confirmed')
    OR
    (TG_OP = 'DELETE' AND OLD.status = 'confirmed')
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_freed_session_id := COALESCE(NEW.session_id, OLD.session_id);
  v_freed_user_id := COALESCE(NEW.user_id, OLD.user_id);

  -- Session + training context. Skip cancelled sessions and trainings that
  -- have been soft-deleted (is_active=false).
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

  -- Skip past sessions and the cancel-deadline window (last-minute pushes are noise).
  IF v_session_starts_at <= now() THEN RETURN COALESCE(NEW, OLD); END IF;
  IF v_cancel_deadline_hours IS NOT NULL
     AND v_session_starts_at - (v_cancel_deadline_hours || ' hours')::interval <= now() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT value INTO base_url FROM public._config WHERE key = 'supabase_url';
  IF base_url IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  v_date_label := to_char(v_session_date, 'DD.MM') || ' ' || to_char(v_session_start, 'HH24:MI');

  -- Fan out per language: one HTTP call per language group of pending athletes.
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
        'tag', 'spot-freed-' || v_freed_session_id,
        'url', '/player'
      )
    );
  END LOOP;

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Never block the original mutation if the notification fails.
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate the trigger to also fire on DELETE.
DROP TRIGGER IF EXISTS trg_notify_waitlist_on_spot_free ON public.session_attendance;
CREATE TRIGGER trg_notify_waitlist_on_spot_free
AFTER UPDATE OR DELETE ON public.session_attendance
FOR EACH ROW
EXECUTE FUNCTION public.notify_waitlist_on_spot_free();
