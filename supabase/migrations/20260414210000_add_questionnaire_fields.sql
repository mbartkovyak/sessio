-- Add questionnaire fields for post-onboarding research flow (A1-A3 / C1-C6 questionnaire).
-- primary_goal: answer to C2 "what matters most to you right now?" — research signal for product direction.
-- questionnaire_complete: gates the new questionnaire the same way onboarding_complete gates the base flow.
-- Existing onboarded users are backfilled to true so they never see the new flow retroactively.

ALTER TABLE profiles ADD COLUMN primary_goal text;
ALTER TABLE profiles ADD COLUMN questionnaire_complete boolean NOT NULL DEFAULT false;

UPDATE profiles SET questionnaire_complete = true WHERE onboarding_complete = true;
