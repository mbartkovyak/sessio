-- Allow users to see ALL participants in conversations they belong to.
-- Previously the policy was user_id = auth.uid() only, which blocked
-- looking up the other person in a DM.
--
-- This is a safe self-reference: the subquery resolves via the base case
-- (user_id = auth.uid()) without recursion. The previous cross-table
-- recursion (conversations ↔ conversation_participants) is not reintroduced.

DROP POLICY IF EXISTS "View participants" ON public.conversation_participants;
CREATE POLICY "View participants" ON public.conversation_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR conversation_id IN (
      SELECT cp.conversation_id FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
    )
  );
