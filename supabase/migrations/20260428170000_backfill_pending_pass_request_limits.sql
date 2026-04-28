-- Pending pass requests should carry the package limits immediately.
-- Otherwise lesson packs with nullable sessions look like unlimited passes while awaiting approval.

UPDATE public.player_abonaments pa
SET
  sessions_total = COALESCE(pa.sessions_total, at.sessions_count),
  sessions_remaining = COALESCE(pa.sessions_remaining, at.sessions_count),
  expires_at = COALESCE(
    pa.expires_at,
    CASE
      WHEN pa.activated_at IS NOT NULL AND at.duration_days IS NOT NULL
      THEN (
        date_trunc('day', pa.activated_at)
        + (at.duration_days || ' days')::interval
        + interval '1 day'
        - interval '1 millisecond'
      )
      ELSE NULL
    END
  )
FROM public.abonament_types at
WHERE pa.abonament_type_id = at.id
  AND pa.status = 'pending'
  AND (
    (at.sessions_count IS NOT NULL AND (pa.sessions_total IS NULL OR pa.sessions_remaining IS NULL))
    OR (at.duration_days IS NOT NULL AND pa.activated_at IS NOT NULL AND pa.expires_at IS NULL)
  );
