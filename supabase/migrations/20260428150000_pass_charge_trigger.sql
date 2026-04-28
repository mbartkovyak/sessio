-- Pass charges follow attendance-status transitions, not coach-marked attendance.
-- Sign-up (status confirmed) deducts. Cancellation (status declined) refunds.
-- No-show stays charged (policy: no-shows pay).
-- Coach can refund a specific session via the existing undo_abonament_deduction RPC
-- exposed by the Refund button on the Passes page.
--
-- Charged statuses: 'confirmed', 'no_show'. Otherwise non-charged.
-- Transition rule: deduct on F→T, refund on T→F, otherwise no-op.
--
-- Date window: a session is only deducted when it is within 14 days of today.
-- Sessions further out wait — a daily promoter sweeps them in as the date approaches.
-- This avoids surprising bulk deductions when joining recurring trainings.

CREATE OR REPLACE FUNCTION public.apply_pass_charge_for_attendance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
  v_session_date DATE;
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

  SELECT t.school_id, ts.session_date INTO v_school_id, v_session_date
  FROM training_sessions ts
  JOIN trainings t ON t.id = ts.training_id
  WHERE ts.id = v_session_id;

  IF v_school_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_new_charged THEN
    -- DEDUCT: only for sessions within the 14-day window.
    -- Anything further out waits for the daily promoter (process_pending_pass_charges).
    IF v_session_date > CURRENT_DATE + INTERVAL '14 days' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT pa.id, pa.sessions_remaining
    INTO v_pass_id, v_remaining
    FROM player_abonaments pa
    WHERE pa.school_id = v_school_id
      AND pa.player_id = v_user_id
      AND pa.status = 'active'
      AND pa.activated_at::date <= v_session_date
      AND (pa.expires_at IS NULL OR pa.expires_at::date >= v_session_date)
      AND (pa.sessions_remaining IS NULL OR pa.sessions_remaining > 0)
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
    -- Idempotent: if no usage row exists (session was outside the window when signed up
    -- and hasn't been promoted yet), this is a no-op.
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

DROP TRIGGER IF EXISTS trg_pass_charge_session_attendance ON public.session_attendance;
CREATE TRIGGER trg_pass_charge_session_attendance
AFTER INSERT OR UPDATE OR DELETE ON public.session_attendance
FOR EACH ROW EXECUTE FUNCTION public.apply_pass_charge_for_attendance();

-- Daily sweep: deduct passes for confirmed/no_show attendances on sessions that
-- have just entered the 14-day window. Idempotent — skips already-charged sessions.
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
    SELECT sa.session_id, sa.user_id, ts.session_date, t.school_id
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

-- When a coach cancels a session, refund every pass entry that was charged for it.
-- Single-statement bulk refund — much cheaper than firing per-attendee triggers.
CREATE OR REPLACE FUNCTION public.refund_passes_for_cancelled_session()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE player_abonaments pa
    SET sessions_remaining = CASE
                              WHEN pa.sessions_total IS NULL THEN NULL
                              ELSE COALESCE(pa.sessions_remaining, 0) + 1
                            END,
        status = 'active'
    FROM abonament_usage au
    WHERE au.session_id = NEW.id
      AND au.player_abonament_id = pa.id;

    DELETE FROM abonament_usage WHERE session_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refund_passes_on_session_cancel ON public.training_sessions;
CREATE TRIGGER trg_refund_passes_on_session_cancel
AFTER UPDATE ON public.training_sessions
FOR EACH ROW EXECUTE FUNCTION public.refund_passes_for_cancelled_session();

-- Schedule the daily promoter. Runs at 03:00 UTC (~05:00 Warsaw) — before any school
-- would open, so coaches see correctly-deducted passes from the start of the day.
DO $$
BEGIN
  PERFORM cron.unschedule('daily-pass-charge-promotion');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'daily-pass-charge-promotion',
  '0 3 * * *',
  $$ SELECT public.process_pending_pass_charges(); $$
);
