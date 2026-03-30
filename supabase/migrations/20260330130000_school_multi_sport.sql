-- Convert schools.sport from text to text[] to support multiple sports
ALTER TABLE schools
  ALTER COLUMN sport TYPE text[]
  USING CASE WHEN sport IS NOT NULL THEN ARRAY[sport] ELSE NULL END;
