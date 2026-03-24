-- Add venues array to profiles (same format as schools.venues)
-- Allows solo coaches to manage venues in their profile settings
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS venues jsonb DEFAULT '[]'::jsonb;
