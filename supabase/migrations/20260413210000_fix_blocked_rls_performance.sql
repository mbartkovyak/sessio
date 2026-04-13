-- ============================================================
-- Fix: nested RLS on blocked_users inside messages policy
-- causes severe query planning overhead (15-20s loads).
--
-- Solution: SECURITY DEFINER helper functions bypass
-- blocked_users' own RLS, giving the planner a simple path.
-- ============================================================

-- Helper: "has current user blocked this sender?"
CREATE OR REPLACE FUNCTION public.is_sender_blocked(sender_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE blocker_id = auth.uid() AND blocked_id = sender_id
  );
$$;

-- Helper: "is current user blocked by anyone in this DM?"
CREATE OR REPLACE FUNCTION public.is_blocked_in_dm(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users bu
    JOIN public.conversations c ON c.id = conv_id
    JOIN public.conversation_participants cp ON cp.conversation_id = c.id
    WHERE c.training_id IS NULL
      AND bu.blocked_id = auth.uid()
      AND bu.blocker_id = cp.user_id
      AND cp.user_id <> auth.uid()
  );
$$;

-- Rewrite "Read messages" using the helper function
DROP POLICY IF EXISTS "Read messages" ON public.messages;
CREATE POLICY "Read messages" ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
    )
    AND NOT public.is_sender_blocked(messages.sender_id)
  );

-- Rewrite "Send messages" using the helper function
DROP POLICY IF EXISTS "Send messages" ON public.messages;
CREATE POLICY "Send messages" ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND NOT public.is_blocked_in_dm(conversation_id)
  );
