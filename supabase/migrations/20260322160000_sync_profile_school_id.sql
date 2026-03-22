-- Structural fix: keep profiles.school_id in sync with school_members.
-- profiles.school_id is the canonical "which school is this coach in" field,
-- but it was never being set when coaches joined via school_members.

-- 1. Trigger: auto-sync profiles.school_id on school_members changes
CREATE OR REPLACE FUNCTION public.sync_profile_school_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Coach removed from school → clear school_id
    UPDATE public.profiles SET school_id = NULL WHERE id = OLD.coach_id AND school_id = OLD.school_id;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status = 'approved' THEN
      -- Coach approved → set school_id
      UPDATE public.profiles SET school_id = NEW.school_id WHERE id = NEW.coach_id;
    ELSIF OLD IS NOT NULL AND OLD.status = 'approved' AND NEW.status != 'approved' THEN
      -- Coach un-approved → clear school_id
      UPDATE public.profiles SET school_id = NULL WHERE id = NEW.coach_id AND school_id = NEW.school_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_profile_school_id
AFTER INSERT OR UPDATE OR DELETE ON public.school_members
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_school_id();

-- 2. Backfill: set school_id for all currently approved coaches
UPDATE public.profiles p
SET school_id = sm.school_id
FROM public.school_members sm
WHERE sm.coach_id = p.id AND sm.status = 'approved' AND p.school_id IS NULL;

-- 3. Backfill: set school_id for school owners
UPDATE public.profiles p
SET school_id = s.id
FROM public.schools s
WHERE s.owner_id = p.id AND p.school_id IS NULL;
