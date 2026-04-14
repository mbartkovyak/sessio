-- Persist setup guide dismissal in the DB so it survives app reinstalls.
-- Previously stored only in localStorage, which gets wiped on reinstall.
ALTER TABLE profiles ADD COLUMN setup_guide_dismissed boolean NOT NULL DEFAULT false;
