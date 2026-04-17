-- Sports the athlete is interested in, collected in the onboarding questionnaire.
-- Used to surface matching coaches / schools in discovery and to power future
-- personalised offers. Additive, nullable — safe to apply without backfill.

ALTER TABLE profiles ADD COLUMN preferred_sports text[];
