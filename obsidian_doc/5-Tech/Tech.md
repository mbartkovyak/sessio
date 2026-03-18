# 5. Tech

## Current stack (from Lovable)
- **Frontend:** React + TypeScript + Tailwind + shadcn/ui
- **Backend/DB:** Supabase (PostgreSQL, Auth with Google OAuth, Realtime subscriptions)
- **Hosting:** Lovable deploy → migrating to Vercel/Netlify
- **Repo:** GitHub (auto-synced from Lovable)

## Migration plan
Lovable → GitHub → Cursor + Claude Code for iteration

## Architecture decisions
- **Supabase Realtime** for live spot claiming (race condition protection via RLS + transactions)
- **Edge Functions** for automation (confirmation reminders, backfill triggers)
- **PWA** for mobile-like experience without App Store
- **Email notifications** first (Supabase built-in), SMS (Twilio) later

## Future additions (not now)
- Stripe Connect for split payments
- Twilio for SMS reminders
- Native mobile (React Native or Flutter)
- AI layer: smart matching, pricing optimization, training planning
