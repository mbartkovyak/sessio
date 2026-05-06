-- Stats query had no supporting index — coach stats hits training_sessions
-- filtered by training_id IN (...) AND session_date BETWEEN x AND y, which
-- without this index is a sequential scan over the whole table. Likely cause
-- of the recurring 'canceling statement due to statement timeout' errors in
-- the Postgres logs whenever a coach with a few months of history opens
-- /coach/stats.
--
-- Composite (training_id, session_date) supports the common access patterns:
-- coach stats, calendar windowed reads, today/upcoming session lookups.
CREATE INDEX IF NOT EXISTS idx_training_sessions_training_date
  ON public.training_sessions(training_id, session_date);
