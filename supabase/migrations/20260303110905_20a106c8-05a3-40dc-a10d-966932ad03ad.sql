
-- Fix 1: Replace broad ALL policy on confirmations with granular policies
-- This prevents players from manipulating confirmation status after deadlines

DROP POLICY IF EXISTS "Players manage own confirmations" ON public.confirmations;

-- Players can view their own confirmations
CREATE POLICY "Players view own confirmations"
ON public.confirmations FOR SELECT
USING (auth.uid() = player_id);

-- Players can insert their own confirmations
CREATE POLICY "Players create own confirmations"
ON public.confirmations FOR INSERT
WITH CHECK (auth.uid() = player_id);

-- Players can only update PENDING confirmations and only to confirmed/declined
CREATE POLICY "Players update own pending confirmations"
ON public.confirmations FOR UPDATE
USING (auth.uid() = player_id AND status = 'pending')
WITH CHECK (auth.uid() = player_id AND status IN ('confirmed', 'declined'));

-- Fix 2: Restrict process_confirmation_window to service_role only (auth.uid() IS NULL)
CREATE OR REPLACE FUNCTION public.process_confirmation_window()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session record;
  v_conf record;
  v_notifications_sent integer := 0;
BEGIN
  -- Only service_role (cron/edge function) may call this — auth.uid() is NULL for service_role
  IF auth.uid() IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'This function is reserved for automated processes');
  END IF;

  FOR v_session IN
    SELECT s.*, g.confirmation_deadline_hours, g.name as group_name, g.start_time as group_start
    FROM sessions s
    JOIN groups g ON s.group_id = g.id
    WHERE s.status = 'scheduled'
      AND s.session_date >= current_date
      AND (s.session_date::timestamp + s.start_time) - (g.confirmation_deadline_hours || ' hours')::interval <= now()
  LOOP
    FOR v_conf IN
      SELECT c.*, p.full_name
      FROM confirmations c
      JOIN profiles p ON c.player_id = p.id
      WHERE c.session_id = v_session.id
        AND c.status = 'pending'
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = v_conf.player_id
          AND related_session_id = v_session.id
          AND type = 'confirmation_request'
      ) THEN
        INSERT INTO notifications (user_id, type, title, message, related_session_id, related_group_id)
        VALUES (
          v_conf.player_id,
          'confirmation_request',
          'Can you make it? ' || v_session.group_name,
          v_session.group_name || ' — ' || to_char(v_session.session_date, 'Dy') || ' at ' || to_char(v_session.group_start, 'HH24:MI'),
          v_session.id,
          v_session.group_id
        );
        v_notifications_sent := v_notifications_sent + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('notifications_sent', v_notifications_sent);
END;
$$;

-- Fix 3: Restrict handle_no_response_deadline to service_role only
CREATE OR REPLACE FUNCTION public.handle_no_response_deadline()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conf record;
  v_spots_created integer := 0;
  v_notified integer := 0;
  v_waitlist_member record;
BEGIN
  -- Only service_role (cron/edge function) may call this
  IF auth.uid() IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'This function is reserved for automated processes');
  END IF;

  FOR v_conf IN
    SELECT c.*, s.group_id, s.session_date, s.start_time as session_start, g.name as group_name, g.confirmation_deadline_hours
    FROM confirmations c
    JOIN sessions s ON c.session_id = s.id
    JOIN groups g ON s.group_id = g.id
    WHERE c.status = 'pending'
      AND s.status = 'scheduled'
      AND (s.session_date::timestamp + s.start_time) - (g.confirmation_deadline_hours || ' hours')::interval < now()
  LOOP
    UPDATE confirmations
    SET status = 'no_response', responded_at = now()
    WHERE id = v_conf.id;

    INSERT INTO open_spots (session_id, group_id, status)
    VALUES (v_conf.session_id, v_conf.group_id, 'open')
    ON CONFLICT DO NOTHING;
    v_spots_created := v_spots_created + 1;

    FOR v_waitlist_member IN
      SELECT gm.player_id
      FROM group_members gm
      WHERE gm.group_id = v_conf.group_id
        AND gm.status IN ('waitlist', 'flex')
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = v_waitlist_member.player_id
          AND related_session_id = v_conf.session_id
          AND type = 'spot_opened'
      ) THEN
        INSERT INTO notifications (user_id, type, title, message, related_session_id, related_group_id)
        VALUES (
          v_waitlist_member.player_id,
          'spot_opened',
          'Spot available! ' || v_conf.group_name,
          v_conf.group_name || ' — ' || to_char(v_conf.session_date, 'Dy DD Mon') || ' at ' || to_char(v_conf.session_start, 'HH24:MI') || '. Tap to claim.',
          v_conf.session_id,
          v_conf.group_id
        );
        v_notified := v_notified + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('spots_created', v_spots_created, 'notified', v_notified);
END;
$$;
