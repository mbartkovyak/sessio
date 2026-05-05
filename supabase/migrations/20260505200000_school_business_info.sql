-- Business info fields on schools, required for online payment processors
-- (LiqPay, Stripe, P24) which must see merchant identity, contact, services
-- and refund policy on the school's public page.
-- All nullable; existing RLS (public SELECT, owner-only UPDATE) covers them.

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS legal_name    TEXT,
  ADD COLUMN IF NOT EXISTS tax_id        TEXT,
  ADD COLUMN IF NOT EXISTS legal_address TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS services_info TEXT,
  ADD COLUMN IF NOT EXISTS refund_policy TEXT;
