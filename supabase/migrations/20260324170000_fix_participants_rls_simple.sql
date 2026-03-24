-- The self-referencing RLS on conversation_participants causes issues
-- when evaluated from within messages RLS (nested policy evaluation).
--
-- Fix: make it readable by any authenticated user.
-- This table only has (conversation_id, user_id) — no sensitive data.
-- The real security boundary is on messages (participant check).

DROP POLICY IF EXISTS "View participants" ON public.conversation_participants;
CREATE POLICY "View participants" ON public.conversation_participants FOR SELECT
  USING (auth.role() = 'authenticated');
