-- Human-readable slugs for school public URLs (/s/<slug>).
-- Backfilled for existing schools, auto-generated for new ones.

ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS slug TEXT;

-- ── Slugify helper (Latin + Cyrillic UA/RU + Polish/German diacritics)
-- Multi-char Cyrillic replacements come first; single-char follow.
CREATE OR REPLACE FUNCTION public.slugify_text(p_text TEXT) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  s TEXT;
BEGIN
  IF p_text IS NULL OR p_text = '' THEN RETURN ''; END IF;
  s := lower(p_text);
  -- Multi-char Cyrillic
  s := replace(s, 'щ', 'shch');
  s := replace(s, 'ч', 'ch');
  s := replace(s, 'ш', 'sh');
  s := replace(s, 'ж', 'zh');
  s := replace(s, 'х', 'kh');
  s := replace(s, 'ц', 'ts');
  s := replace(s, 'ю', 'iu');
  s := replace(s, 'я', 'ia');
  s := replace(s, 'є', 'ie');
  s := replace(s, 'ї', 'i');
  s := replace(s, 'й', 'i');
  -- Single-char Cyrillic (UA + RU)
  s := translate(s,
    'абвгґдезийіклмнопрстуфьыэёъ',
    'abvhgdezyyiklmnoprstufyyye_');
  s := replace(s, '_', '');
  -- Polish/Czech/German diacritics
  s := translate(s,
    'ąćęłńóśźżäöüčďěňřšťůž',
    'acelnoszzaoucdenrstuz');
  s := replace(s, 'ß', 'ss');
  -- Anything else → hyphens
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  IF length(s) > 50 THEN
    s := substring(s from 1 for 50);
    s := regexp_replace(s, '-+$', '', 'g');
  END IF;
  RETURN s;
END;
$$;

GRANT EXECUTE ON FUNCTION public.slugify_text(TEXT) TO anon, authenticated, service_role;

-- ── Unique-slug helper. Appends -2, -3, ... on collision. Skips reserved sub-routes.
CREATE OR REPLACE FUNCTION public.unique_school_slug(p_name TEXT, p_school_id UUID DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  n INT := 1;
BEGIN
  base := public.slugify_text(p_name);
  IF base IS NULL OR base = '' THEN
    base := 'school';
  END IF;
  -- Reserved sub-route names that would collide with /s/<slug>/<sub>
  IF base IN ('schedule', 'passes', 'info', 'edit', 'about', 'new', 'create') THEN
    base := base || '-school';
  END IF;
  candidate := base;
  WHILE EXISTS (
    SELECT 1 FROM public.schools
    WHERE slug = candidate
      AND (p_school_id IS NULL OR id <> p_school_id)
  ) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  RETURN candidate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unique_school_slug(TEXT, UUID) TO authenticated, service_role;

-- ── Backfill existing schools (one at a time so the unique_school_slug loop sees prior rows)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, name FROM public.schools WHERE slug IS NULL ORDER BY created_at ASC NULLS LAST
  LOOP
    UPDATE public.schools SET slug = public.unique_school_slug(r.name, r.id) WHERE id = r.id;
  END LOOP;
END $$;

-- ── Enforce uniqueness + lookup index
CREATE UNIQUE INDEX IF NOT EXISTS schools_slug_unique ON public.schools(slug) WHERE slug IS NOT NULL;

-- ── Auto-generate slug on INSERT when caller didn't provide one
CREATE OR REPLACE FUNCTION public.set_school_slug() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.unique_school_slug(NEW.name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS schools_set_slug_before_insert ON public.schools;
CREATE TRIGGER schools_set_slug_before_insert
  BEFORE INSERT ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.set_school_slug();
