-- Allow drop-in players (who have session_attendance but aren't training_members)
-- to read the training_sessions they're attending.
-- Without this, useMyUpcomingSessions returns null for the nested join.

CREATE POLICY "Attendees view their sessions" ON public.training_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM session_attendance sa
    WHERE sa.session_id = id AND sa.user_id = auth.uid()
  ));
