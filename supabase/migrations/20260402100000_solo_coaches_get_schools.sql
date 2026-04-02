-- Every coach gets a school. Solo coaches (role='coach' with no school membership)
-- get an auto-created school so athletes, passes, and auto-deduct all work.
-- The school is marked is_listed=false so it doesn't appear in player search.

-- 1. Add is_listed column to schools
ALTER TABLE public.schools ADD COLUMN is_listed BOOLEAN NOT NULL DEFAULT true;

-- 2. Backfill: create schools for existing solo coaches
DO $$
DECLARE
  r RECORD;
  v_school_id UUID;
BEGIN
  FOR r IN
    SELECT p.id, p.full_name, p.sport, p.country, p.city
    FROM profiles p
    WHERE p.role = 'coach'
    AND p.id NOT IN (SELECT sm.coach_id FROM school_members sm)
  LOOP
    v_school_id := gen_random_uuid();

    INSERT INTO schools (id, name, sport, country, city, owner_id, is_listed)
    VALUES (
      v_school_id,
      COALESCE(r.full_name, 'My School'),
      CASE WHEN r.sport IS NOT NULL THEN ARRAY[r.sport] ELSE ARRAY['Tennis'] END,
      r.country, r.city, r.id, false
    );

    INSERT INTO school_members (school_id, coach_id, status)
    VALUES (v_school_id, r.id, 'approved');

    UPDATE profiles SET role = 'school_owner' WHERE id = r.id;

    UPDATE trainings SET school_id = v_school_id
    WHERE coach_id = r.id AND school_id IS NULL;
  END LOOP;
END $$;
