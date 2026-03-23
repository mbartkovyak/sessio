-- Temporary: allow anon to read push_subscriptions count for debugging
-- Also add a service-role-friendly policy
CREATE POLICY "Service role can read all push subscriptions"
ON public.push_subscriptions FOR SELECT
USING (true);
