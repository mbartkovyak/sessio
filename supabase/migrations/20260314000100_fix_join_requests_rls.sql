-- Fix: Players need UPDATE on join_requests for upsert to work
-- The existing INSERT policy isn't enough when .upsert() hits a conflict.

CREATE POLICY "Players update own join requests"
ON public.join_requests FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
