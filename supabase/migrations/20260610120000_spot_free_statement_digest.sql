-- Spot-free notifications: ROW-level trigger → STATEMENT-level digest.
--
-- Root cause of the "~30 notifications at once" bug: when a member leaves a
-- training (or is removed / deletes their account), cleanup_attendance_on_member_leave
-- deletes ALL their future session_attendance rows in ONE statement. Sessions
-- are generated 180 days ahead (~26-37 rows for a weekly training), and the
-- old row-level trigger fired once per row with per-session tags
-- ('spot-freed-{session_id}') — no OS collapse, so every pending athlete got
-- a push per future session.
--
-- This migration replaces it with two statement-level triggers (transition
-- tables allow exactly one event per trigger in Postgres) feeding one core
-- sender that groups freed sessions per (training, recipient language) and
-- sends ONE push per group.
--
-- Three behavior fixes ride along, all deliberate:
--   1. The cancel-deadline window guard is REMOVED. Claiming a freed spot is
--      allowed until the session ends (confirm_session_attendance has no time
--      gate, the player UI shows "Claim" until then), so suppressing the push
--      in the last cancel_deadline_hours was exactly backwards — waitlisted
--      athletes complained they never heard about last-minute frees.
--   2. The future-session check now converts Warsaw wall-clock properly
--      (session_date + start_time are naive local values; the old
--      `::timestamptz` cast read them as UTC, skewing all time guards by 1-2h).
--      Same Europe/Warsaw convention the automation Edge Function uses.
--   3. Only sessions with an actually claimable seat notify:
--      confirmed_count < max_players. The old trigger pushed even when the
--      session stayed full (e.g. freeing one seat of a historical overbook),
--      sending athletes to a dead-end "Заповнено" screen.
--
-- Old function body reference: 20260519160200_spot_free_push_with_training_name.sql
-- (dropped wholesale here; single-session strings copied from it verbatim).

-- ── 1. Drop the row-level trigger + function ──────────────────────────────

DROP TRIGGER IF EXISTS trg_notify_waitlist_on_spot_free ON public.session_attendance;
DROP FUNCTION IF EXISTS public.notify_waitlist_on_spot_free();

-- ── 2. Core digest sender ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_waitlist_spots_freed(
  p_session_ids uuid[],
  p_freed_user_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_url text;
  grp record;
BEGIN
  IF p_session_ids IS NULL OR array_length(p_session_ids, 1) IS NULL THEN RETURN; END IF;

  -- delete_my_account sets this around its coach-owned-trainings cascade:
  -- those sessions are deleted moments later in the same transaction, so a
  -- "spot opened" push for them would be wrong.
  IF COALESCE(current_setting('sessio.suppress_spot_notify', true), '') = 'on' THEN RETURN; END IF;

  SELECT value INTO base_url FROM public._config WHERE key = 'supabase_url';
  IF base_url IS NULL THEN RETURN; END IF;

  -- One push per (training, recipient language). A recipient pending on a
  -- single freed session gets the dated per-session copy; a recipient whose
  -- waitlisted sessions freed in bulk (member left) gets one digest instead
  -- of ~30 separate pushes.
  FOR grp IN
    WITH freed_sessions AS (
      SELECT DISTINCT ts.id, ts.training_id, t.name AS training_name,
             ts.session_date, ts.start_time
      FROM training_sessions ts
      JOIN trainings t ON t.id = ts.training_id
      WHERE ts.id = ANY (p_session_ids)
        AND ts.status = 'scheduled'
        AND t.is_active = true
        -- Future only, Warsaw wall-clock (see header note 2).
        AND ((ts.session_date + ts.start_time) AT TIME ZONE 'Europe/Warsaw') > now()
        -- Claimable only: a seat must actually be free post-mutation
        -- (AFTER trigger → counts reflect the new state).
        AND (t.max_players IS NULL OR
             (SELECT count(*) FROM session_attendance c
                WHERE c.session_id = ts.id AND c.status = 'confirmed') < t.max_players)
    ),
    per_recipient AS (
      SELECT fs.training_id,
             min(fs.training_name) AS training_name,
             sa.user_id,
             count(*) AS freed_count,
             min(fs.session_date + fs.start_time) AS first_start
      FROM freed_sessions fs
      JOIN session_attendance sa ON sa.session_id = fs.id AND sa.status = 'pending'
      WHERE NOT (sa.user_id = ANY (p_freed_user_ids))
      GROUP BY fs.training_id, sa.user_id
    )
    SELECT pr.training_id,
           min(pr.training_name) AS training_name,
           COALESCE(p.language, 'en') AS lang,
           (pr.freed_count = 1) AS single,
           CASE WHEN pr.freed_count = 1 THEN pr.first_start END AS single_start,
           array_agg(pr.user_id) AS recipients
    FROM per_recipient pr
    JOIN profiles p ON p.id = pr.user_id
    GROUP BY pr.training_id, COALESCE(p.language, 'en'),
             (pr.freed_count = 1),
             CASE WHEN pr.freed_count = 1 THEN pr.first_start END
  LOOP
    PERFORM net.http_post(
      url := base_url || '/functions/v1/send-push',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'action', 'notify',
        'sender_id', p_freed_user_ids[1],
        'user_ids', grp.recipients,
        -- Single-session strings copied verbatim from 20260519160200.
        'title', CASE grp.lang
          WHEN 'uk' THEN CASE WHEN grp.single THEN format('Звільнилось місце: %s', grp.training_name)
                              ELSE format('Звільнились місця: %s', grp.training_name) END
          WHEN 'pl' THEN CASE WHEN grp.single THEN format('Zwolniło się miejsce — %s', grp.training_name)
                              ELSE format('Zwolniły się miejsca — %s', grp.training_name) END
          WHEN 'de' THEN CASE WHEN grp.single THEN format('Ein Platz wurde frei — %s', grp.training_name)
                              ELSE format('Plätze wurden frei — %s', grp.training_name) END
          ELSE           CASE WHEN grp.single THEN format('A spot opened up — %s', grp.training_name)
                              ELSE format('Spots opened up — %s', grp.training_name) END
        END,
        'body', CASE grp.lang
          WHEN 'uk' THEN CASE WHEN grp.single THEN format('%s о %s. Встигни забронювати першим.', to_char(grp.single_start, 'DD.MM'), to_char(grp.single_start, 'HH24:MI'))
                              ELSE 'Є вільні місця на кілька наступних занять. Встигни забронювати першим.' END
          WHEN 'pl' THEN CASE WHEN grp.single THEN format('%s o %s. Bądź pierwszy, zajmij miejsce.', to_char(grp.single_start, 'DD.MM'), to_char(grp.single_start, 'HH24:MI'))
                              ELSE 'Kilka nadchodzących zajęć ma wolne miejsca. Bądź pierwszy, zajmij miejsce.' END
          WHEN 'de' THEN CASE WHEN grp.single THEN format('%s um %s. Sei der Erste — schnapp ihn dir.', to_char(grp.single_start, 'DD.MM'), to_char(grp.single_start, 'HH24:MI'))
                              ELSE 'Mehrere kommende Einheiten haben freie Plätze. Sei der Erste — schnapp sie dir.' END
          ELSE           CASE WHEN grp.single THEN format('%s at %s. Be first to claim the spot.', to_char(grp.single_start, 'DD.MM'), to_char(grp.single_start, 'HH24:MI'))
                              ELSE 'Several upcoming sessions have free spots. Be first to claim.' END
        END,
        -- Stable per training (was per session) → repeats collapse at the OS level.
        'tag', 'spot-freed-' || grp.training_id,
        'url', '/player'
      )
    );
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  -- Never block the attendance mutation if the notification fails.
  RETURN;
END;
$$;

-- Not a trigger function, so the default EXECUTE TO PUBLIC would make it
-- callable through PostgREST RPC by any signed-in user — a push-spam vector.
-- The triggers below run it as the function owner regardless.
REVOKE EXECUTE ON FUNCTION public.notify_waitlist_spots_freed(uuid[], uuid[]) FROM PUBLIC, anon, authenticated;

-- ── 3. Statement-level triggers ───────────────────────────────────────────
-- Postgres allows transition tables only on single-event triggers → one
-- trigger for UPDATE, one for DELETE. Both MUST stay SECURITY DEFINER:
-- the core function's EXECUTE is revoked from `authenticated`, so an
-- invoker-rights wrapper would fail for client-initiated mutations.

CREATE OR REPLACE FUNCTION public.notify_spot_free_after_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sessions uuid[];
  v_users uuid[];
BEGIN
  SELECT array_agg(DISTINCT o.session_id), array_agg(DISTINCT o.user_id)
    INTO v_sessions, v_users
  FROM old_rows o
  JOIN new_rows n ON n.id = o.id
  WHERE o.status = 'confirmed' AND n.status <> 'confirmed';

  IF v_sessions IS NOT NULL THEN
    PERFORM public.notify_waitlist_spots_freed(v_sessions, v_users);
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_spot_free_after_delete()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sessions uuid[];
  v_users uuid[];
BEGIN
  SELECT array_agg(DISTINCT o.session_id), array_agg(DISTINCT o.user_id)
    INTO v_sessions, v_users
  FROM old_rows o
  WHERE o.status = 'confirmed';

  IF v_sessions IS NOT NULL THEN
    PERFORM public.notify_waitlist_spots_freed(v_sessions, v_users);
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_spot_free_update ON public.session_attendance;
CREATE TRIGGER trg_notify_spot_free_update
AFTER UPDATE ON public.session_attendance
REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.notify_spot_free_after_update();

DROP TRIGGER IF EXISTS trg_notify_spot_free_delete ON public.session_attendance;
CREATE TRIGGER trg_notify_spot_free_delete
AFTER DELETE ON public.session_attendance
REFERENCING OLD TABLE AS old_rows
FOR EACH STATEMENT
EXECUTE FUNCTION public.notify_spot_free_after_delete();

-- ── 4. delete_my_account: silence the coach-owned cascade ─────────────────
-- A deleting coach's own trainings are wiped a few statements after their
-- attendance rows — pushing those trainings' waitlists would advertise spots
-- on sessions that are about to vanish. The user-participation DELETE further
-- down stays notifiable (same semantics as leaving a training).
--
-- Body copied from current state (20260506100000) per CLAUDE.md rule #1; the
-- only changes are the two set_config lines around the coach-cascade
-- session_attendance DELETE. statement_timeout = '30s' is re-declared inline
-- because CREATE OR REPLACE drops settings applied via ALTER FUNCTION
-- (20260507110000 set it).

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET statement_timeout = '30s'
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- ── Content moderation data ─────────────────────────────────────────
  DELETE FROM public.content_flags WHERE reporter_id = v_uid OR flagged_user_id = v_uid;
  DELETE FROM public.blocked_users WHERE blocker_id = v_uid OR blocked_id = v_uid;

  -- ── Coach-owned training cascade ──────────────────────────────────────
  DELETE FROM public.messages WHERE conversation_id IN (
    SELECT c.id FROM public.conversations c WHERE c.training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid)
  );
  DELETE FROM public.conversation_participants WHERE conversation_id IN (
    SELECT c.id FROM public.conversations c WHERE c.training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid)
  );
  DELETE FROM public.conversations WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.training_open_spots WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.session_attendance_log WHERE session_id IN (SELECT ts.id FROM public.training_sessions ts JOIN public.trainings t ON ts.training_id = t.id WHERE t.coach_id = v_uid);
  PERFORM set_config('sessio.suppress_spot_notify', 'on', true);
  DELETE FROM public.session_attendance WHERE session_id IN (SELECT ts.id FROM public.training_sessions ts JOIN public.trainings t ON ts.training_id = t.id WHERE t.coach_id = v_uid);
  PERFORM set_config('sessio.suppress_spot_notify', '', true);
  DELETE FROM public.training_sessions WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.training_members WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.join_requests WHERE training_id IN (SELECT id FROM public.trainings WHERE coach_id = v_uid);
  DELETE FROM public.trainings WHERE coach_id = v_uid;

  -- ── User participation data ───────────────────────────────────────────
  DELETE FROM public.messages WHERE sender_id = v_uid;
  DELETE FROM public.conversation_participants WHERE user_id = v_uid;
  DELETE FROM public.message_reactions WHERE user_id = v_uid;
  DELETE FROM public.session_attendance_log WHERE user_id = v_uid OR actor = v_uid;
  DELETE FROM public.session_attendance WHERE user_id = v_uid;
  DELETE FROM public.training_members WHERE user_id = v_uid;
  DELETE FROM public.join_requests WHERE user_id = v_uid;
  DELETE FROM public.training_open_spots WHERE claimed_by = v_uid;
  DELETE FROM public.reviews WHERE reviewer_id = v_uid OR coach_id = v_uid;
  DELETE FROM public.favourite_schools WHERE user_id = v_uid;
  DELETE FROM public.favourite_coaches WHERE user_id = v_uid OR coach_id = v_uid;
  DELETE FROM public.push_subscriptions WHERE user_id = v_uid;

  -- ── Player abonaments (for trainings owned by other coaches) ──────────
  DELETE FROM public.player_abonaments WHERE player_id = v_uid;

  -- ── School data ───────────────────────────────────────────────────────
  DELETE FROM public.school_members WHERE coach_id = v_uid;
  DELETE FROM public.schools WHERE owner_id = v_uid;

  -- ── Orphaned DM conversations (no participants left) ──────────────────
  DELETE FROM public.conversations c
  WHERE c.training_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = c.id
    );

  -- ── Delete the auth user ──────────────────────────────────────────────
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;
