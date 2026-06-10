-- Unify the training-level waitlist with per-session 'pending' rows.
--
-- Root cause of "waitlisted athletes never hear about freed spots": joining a
-- FULL training — via the invite-link join_training RPC or the in-app
-- recurring join — stores training_members.role='waitlist', and
-- create_attendance_for_new_member early-returned for any non-'regular' role.
-- Waitlist members therefore had ZERO session_attendance rows, which made
-- them invisible to:
--   • the spot-free notify trigger (recipients = sa.status='pending'),
--   • get_my_upcoming_sessions (player home/calendar — nothing to claim).
-- The per-session waitlist (join_single_session on a full session) already
-- uses status='pending' and gets all of that for free. This migration gives
-- training-level waitlist members the same representation.
--
-- Safe by construction:
--   • 'pending' never counts toward capacity (enforce_session_capacity acts
--     on 'confirmed' only) and charges no pass (apply_pass_charge_for_attendance
--     charges 'confirmed'/'no_show' only). Claiming (pending→confirmed via
--     confirm_session_attendance) stays capacity-enforced and deducts then.
--   • cleanup_attendance_on_member_leave removes the rows when the member
--     leaves; pending deletes don't fire the spot-free notify
--     (OLD.status='confirmed' guard).
--   • The trigger fires on INSERT OR UPDATE of training_members. There is no
--     waitlist→regular promote UI today; if one is added, note that existing
--     'pending' rows stay pending (ON CONFLICT DO NOTHING) and would need a
--     promotion pass.
--
-- Function bodies copied from current state per CLAUDE.md rule #1:
--   • create_attendance_for_new_member — 20260506100000_capacity_guardrails_audit.sql
--   • generate_sessions_for_training  — 20260507160000_extend_session_horizon_to_180_days.sql

-- ── 1. create_attendance_for_new_member: add the waitlist branch ──────────

CREATE OR REPLACE FUNCTION public.create_attendance_for_new_member()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'regular' THEN
    -- Acquire the same lock the BEFORE trigger uses, so the count we see is stable.
    PERFORM 1 FROM public.trainings WHERE id = NEW.training_id FOR UPDATE;

    INSERT INTO public.session_attendance (session_id, user_id, status, confirmed_at)
    SELECT ts.id, NEW.user_id,
           CASE WHEN COALESCE(c.cnt, 0) < COALESCE(t.max_players, 2147483647)
                THEN 'confirmed' ELSE 'pending' END,
           CASE WHEN COALESCE(c.cnt, 0) < COALESCE(t.max_players, 2147483647)
                THEN now() ELSE NULL END
    FROM public.training_sessions ts
    JOIN public.trainings t ON t.id = ts.training_id
    LEFT JOIN LATERAL (
      SELECT count(*) AS cnt FROM public.session_attendance sa
      WHERE sa.session_id = ts.id AND sa.status = 'confirmed'
    ) c ON true
    WHERE ts.training_id = NEW.training_id
      AND ts.session_date >= CURRENT_DATE
      AND ts.status = 'scheduled'
    ON CONFLICT (session_id, user_id) DO NOTHING;

  ELSIF NEW.role = 'waitlist' THEN
    -- Waitlist members materialise as 'pending' on every upcoming session —
    -- same shape as the per-session waitlist. No capacity lock needed:
    -- 'pending' never affects the confirmed count.
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

-- ── 2. generate_sessions_for_training: keep waitlist rows rolling forward ──
-- The hourly cron generates new sessions as the 180-day horizon advances.
-- Without this change those new sessions would get attendance rows for
-- regulars only and the unified waitlist would silently decay. All three
-- attendance INSERT sites now cover role IN ('regular','waitlist') with the
-- status CASE; regular behavior is byte-identical.

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
          SELECT v_session_id, tm.user_id,
                 CASE WHEN tm.role = 'regular' THEN 'confirmed' ELSE 'pending' END,
                 CASE WHEN tm.role = 'regular' THEN now() ELSE NULL END
          FROM public.training_members tm
          WHERE tm.training_id = p_training_id AND tm.role IN ('regular', 'waitlist')
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
          SELECT v_session_id, tm.user_id,
                 CASE WHEN tm.role = 'regular' THEN 'confirmed' ELSE 'pending' END,
                 CASE WHEN tm.role = 'regular' THEN now() ELSE NULL END
          FROM public.training_members tm
          WHERE tm.training_id = p_training_id AND tm.role IN ('regular', 'waitlist')
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
      SELECT v_session_id, tm.user_id,
             CASE WHEN tm.role = 'regular' THEN 'confirmed' ELSE 'pending' END,
             CASE WHEN tm.role = 'regular' THEN now() ELSE NULL END
      FROM public.training_members tm
      WHERE tm.training_id = p_training_id AND tm.role IN ('regular', 'waitlist')
      ON CONFLICT (session_id, user_id) DO NOTHING;

      v_created := v_created + 1;
    END IF;
  END IF;

  RETURN jsonb_build_object('created', v_created);
END;
$$;

-- ── 3. Backfill existing waitlist members ─────────────────────────────────
-- Existing role='waitlist' members get 'pending' rows for upcoming sessions
-- so they start receiving spot-free pushes and can claim from their home
-- screen immediately, not only after re-joining. Idempotent.
-- (No notify fires here: the spot-free triggers cover UPDATE/DELETE, not INSERT.)

INSERT INTO public.session_attendance (session_id, user_id, status)
SELECT ts.id, tm.user_id, 'pending'
FROM public.training_members tm
JOIN public.training_sessions ts ON ts.training_id = tm.training_id
WHERE tm.role = 'waitlist'
  AND ts.session_date >= CURRENT_DATE
  AND ts.status = 'scheduled'
ON CONFLICT (session_id, user_id) DO NOTHING;
