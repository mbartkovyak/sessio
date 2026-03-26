-- Drop the overly permissive SELECT policy.
-- Service role bypasses RLS entirely, so this policy was never needed for its
-- intended purpose (edge function send-push uses service role key).
-- It just exposed all push tokens to any authenticated user.
DROP POLICY IF EXISTS "Service role can read all push subscriptions" ON public.push_subscriptions;

-- The remaining "Users manage own push subscriptions" (FOR ALL, auth.uid() = user_id)
-- correctly covers SELECT, INSERT, UPDATE, DELETE for the user's own rows.
