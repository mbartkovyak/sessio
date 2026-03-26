-- Add language preference to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language text DEFAULT NULL;

ALTER TABLE profiles ADD CONSTRAINT profiles_language_check
  CHECK (language IS NULL OR language IN ('en', 'pl', 'uk'));

COMMENT ON COLUMN profiles.language IS 'User language preference (ISO 639-1). NULL = use browser detection.';
