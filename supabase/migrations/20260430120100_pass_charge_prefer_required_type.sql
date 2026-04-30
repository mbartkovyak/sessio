-- Pass-aware updates to two existing functions:
--   1. join_single_session — drop-in joins are gated by training.required_pass_type_id.
--   2. apply_pass_charge_for_attendance + process_pending_pass_charges —
--      when a training has a required pass, the trigger should prefer (in fact, restrict to)
--      that exact pass type instead of arbitrarily picking the oldest active pass.
--      Trainings with no required pass keep the current "first-active-pass" behaviour.
--
-- Bodies copied from current state (20260330220200 and 20260428150000) and
-- patched in-place per CLAUDE.md "copy current body, not stale" rule.

-- ── 1. join_single_session: pass gate ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_single_session(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_max_players INTEGER;
  v_confirmed INTEGER;
  v_required_pass_type_id UUID;
  v_session_date DATE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch session + training context (capacity, required pass, session date)
  SELECT t.max_players, t.required_pass_type_id, ts.session_date
    INTO v_max_players, v_required_pass_type_id, v_session_date
  FROM training_sessions ts
  JOIN trainings t ON t.id = ts.training_id
  WHERE ts.id = p_session_id
    AND ts.status = 'scheduled'
    AND t.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or cancelled';
  END IF;

  -- Pass gate: training requires a specific pass type → player must hold an active one.
  IF v_required_pass_type_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM player_abonaments pa
      WHERE pa.player_id = v_user_id
        AND pa.abonament_type_id = v_required_pass_type_id
        AND pa.status = 'active'
        AND pa.activated_at::date <= v_session_date
        AND (pa.expires_at IS NULL OR pa.expires_at::date >= v_session_date)
        AND (pa.sessions_remaining IS NULL OR pa.sessions_remaining > 0)
    ) THEN
      RAISE EXCEPTION 'PASS_REQUIRED';
    END IF;
  END IF;

  -- Capacity check
  IF v_max_players IS NOT NULL THEN
    SELECT count(*) INTO v_confirmed
    FROM session_attendance
    WHERE session_id = p_session_id AND status = 'confirmed';

    IF v_confirmed >= v_max_players THEN
      RAISE EXCEPTION 'Session is full';
    END IF;
  END IF;

  -- Insert attendance (unique constraint prevents duplicates)
  INSERT INTO session_attendance (session_id, user_id, status, confirmed_at)
  VALUES (p_session_id, v_user_id, 'confirmed', now())
  ON CONFLICT (session_id, user_id) DO NOTHING;
END;
$$;

-- ── 2. apply_pass_charge_for_attendance: scope by required pass when set ─
CREATE OR REPLACE FUNCTION public.apply_pass_charge_for_attendance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
  v_session_date DATE;
  v_required_pass_type_id UUID;
  v_user_id UUID;
  v_session_id UUID;
  v_old_charged BOOLEAN;
  v_new_charged BOOLEAN;
  v_pass_id UUID;
  v_remaining INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_session_id := OLD.session_id;
    v_old_charged := OLD.status IN ('confirmed', 'no_show');
    v_new_charged := false;
  ELSIF TG_OP = 'INSERT' THEN
    v_user_id := NEW.user_id;
    v_session_id := NEW.session_id;
    v_old_charged := false;
    v_new_charged := NEW.status IN ('confirmed', 'no_show');
  ELSE
    v_user_id := NEW.user_id;
    v_session_id := NEW.session_id;
    v_old_charged := OLD.status IN ('confirmed', 'no_show');
    v_new_charged := NEW.status IN ('confirmed', 'no_show');
  END IF;

  IF v_old_charged = v_new_charged THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT t.school_id, ts.session_date, t.required_pass_type_id
    INTO v_school_id, v_session_date, v_required_pass_type_id
  FROM training_sessions ts
  JOIN trainings t ON t.id = ts.training_id
  WHERE ts.id = v_session_id;

  IF v_school_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_new_charged THEN
    -- DEDUCT: only for sessions within the 14-day window.
    IF v_session_date > CURRENT_DATE + INTERVAL '14 days' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;

    -- When training has a required pass, restrict candidates to that exact type.
    -- Otherwise (legacy / no-pass training), pick any active pass for school.
    SELECT pa.id, pa.sessions_remaining
    INTO v_pass_id, v_remaining
    FROM player_abonaments pa
    WHERE pa.school_id = v_school_id
      AND pa.player_id = v_user_id
      AND pa.status = 'active'
      AND pa.activated_at::date <= v_session_date
      AND (pa.expires_at IS NULL OR pa.expires_at::date >= v_session_date)
      AND (pa.sessions_remaining IS NULL OR pa.sessions_remaining > 0)
      AND (v_required_pass_type_id IS NULL OR pa.abonament_type_id = v_required_pass_type_id)
    ORDER BY pa.created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_pass_id IS NOT NULL THEN
      INSERT INTO abonament_usage (player_abonament_id, session_id)
      VALUES (v_pass_id, v_session_id)
      ON CONFLICT (player_abonament_id, session_id) DO NOTHING;

      IF FOUND AND v_remaining IS NOT NULL THEN
        UPDATE player_abonaments
        SET sessions_remaining = v_remaining - 1,
            status = CASE WHEN v_remaining - 1 <= 0 THEN 'used_up' ELSE status END
        WHERE id = v_pass_id;
      END IF;
    END IF;
  ELSE
    -- REFUND: bump the matching pass and remove the usage row.
    UPDATE player_abonaments pa
    SET sessions_remaining = CASE
                              WHEN pa.sessions_total IS NULL THEN NULL
                              ELSE COALESCE(pa.sessions_remaining, 0) + 1
                            END,
        status = 'active'
    FROM abonament_usage au
    WHERE au.session_id = v_session_id
      AND au.player_abonament_id = pa.id
      AND pa.player_id = v_user_id
      AND pa.school_id = v_school_id;

    DELETE FROM abonament_usage au
    USING player_abonaments pa
    WHERE au.session_id = v_session_id
      AND au.player_abonament_id = pa.id
      AND pa.player_id = v_user_id
      AND pa.school_id = v_school_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── 3. process_pending_pass_charges: same scoping for daily promoter ─────
CREATE OR REPLACE FUNCTION public.process_pending_pass_charges()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_att RECORD;
  v_pass_id UUID;
  v_remaining INTEGER;
BEGIN
  FOR v_att IN
    SELECT sa.session_id, sa.user_id, ts.session_date, t.school_id, t.required_pass_type_id
    FROM session_attendance sa
    JOIN training_sessions ts ON ts.id = sa.session_id
    JOIN trainings t ON t.id = ts.training_id
    WHERE sa.status IN ('confirmed', 'no_show')
      AND ts.status = 'scheduled'
      AND ts.session_date >= CURRENT_DATE
      AND ts.session_date <= CURRENT_DATE + INTERVAL '14 days'
      AND NOT EXISTS (
        SELECT 1 FROM abonament_usage au
        JOIN player_abonaments pa ON pa.id = au.player_abonament_id
        WHERE au.session_id = sa.session_id
          AND pa.player_id = sa.user_id
          AND pa.school_id = t.school_id
      )
  LOOP
    SELECT pa.id, pa.sessions_remaining
    INTO v_pass_id, v_remaining
    FROM player_abonaments pa
    WHERE pa.school_id = v_att.school_id
      AND pa.player_id = v_att.user_id
      AND pa.status = 'active'
      AND pa.activated_at::date <= v_att.session_date
      AND (pa.expires_at IS NULL OR pa.expires_at::date >= v_att.session_date)
      AND (pa.sessions_remaining IS NULL OR pa.sessions_remaining > 0)
      AND (v_att.required_pass_type_id IS NULL OR pa.abonament_type_id = v_att.required_pass_type_id)
    ORDER BY pa.created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_pass_id IS NOT NULL THEN
      INSERT INTO abonament_usage (player_abonament_id, session_id)
      VALUES (v_pass_id, v_att.session_id)
      ON CONFLICT (player_abonament_id, session_id) DO NOTHING;

      IF FOUND THEN
        IF v_remaining IS NOT NULL THEN
          UPDATE player_abonaments
          SET sessions_remaining = v_remaining - 1,
              status = CASE WHEN v_remaining - 1 <= 0 THEN 'used_up' ELSE status END
          WHERE id = v_pass_id;
        END IF;
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;
