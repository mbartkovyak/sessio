-- Fix slugify_text: ь and ъ should be silent (not 'y' / 'e'),
-- and Russian э should map to 'e' (not 'y').
-- Existing dev/prod data has no schools with these letters, so no re-backfill.

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
  -- Single-char Cyrillic. Last two source chars (ь, ъ) deleted via shorter target.
  -- Source: 25 mapped letters, then ь, ъ silent.
  s := translate(s,
    'абвгґдезийіклмнопрстуфыэёьъ',
    'abvhgdezyiiklmnoprstufyee');
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
