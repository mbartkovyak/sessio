-- Add venues array to schools (each venue = { name, address })
ALTER TABLE schools ADD COLUMN IF NOT EXISTS venues jsonb DEFAULT '[]'::jsonb;
