-- 1. RPC to delete orphan sessions when training days are removed
-- Deletes future scheduled sessions whose day-of-week is in the removed list.
-- Cascade on session_attendance FK handles attendance cleanup automatically.
CREATE OR REPLACE FUNCTION public.delete_orphan_sessions(
  p_training_id UUID,
  p_removed_isodows INT[]  -- ISODOW encoding: Mon=1..Sun=7
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.training_sessions
  WHERE training_id = p_training_id
    AND status = 'scheduled'
    AND session_date >= CURRENT_DATE
    AND EXTRACT(ISODOW FROM session_date)::INT = ANY(p_removed_isodows);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 2. RPC to expire stale abonaments (called from automation cron)
-- Marks passes as 'expired' when their expires_at has passed,
-- and 'used_up' when sessions_remaining hits 0.
CREATE OR REPLACE FUNCTION public.expire_stale_abonaments()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired INT;
  v_used_up INT;
BEGIN
  -- Expire passes whose time ran out
  UPDATE public.player_abonaments
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  GET DIAGNOSTICS v_expired = ROW_COUNT;

  -- Mark passes with 0 sessions remaining as used_up
  UPDATE public.player_abonaments
  SET status = 'used_up'
  WHERE status = 'active'
    AND sessions_remaining IS NOT NULL
    AND sessions_remaining <= 0;
  GET DIAGNOSTICS v_used_up = ROW_COUNT;

  RETURN jsonb_build_object('expired', v_expired, 'used_up', v_used_up);
END;
$$;
