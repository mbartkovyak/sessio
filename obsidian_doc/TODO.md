---

kanban-plugin: board

---

## Backlog

- [ ] Phone number at registration — ideally auth by phone not email. SMS OTP needs paid service (Twilio). Decide: needed for Kajtek demo or can wait? #dev #decision
- [ ] Work with Yoodli.ai #gtm
- [ ] Align design through Behance and then Figma Make #design
- [ ] Avatar photo upload — Supabase Storage bucket + upload button on both player and coach profiles #dev
- [ ] Player profile editor — let players edit name, email, bio. Currently read-only #dev
- [ ] Optional nickname/display name — show instead of real name if set. Privacy feature #dev


## Next

- [ ] **Decide notification channel** — PWA push requires home screen install on iOS. Test if acceptable for Kajtek's athletes or if SMS (Twilio, ~€0.03/msg in PL) is needed. This blocks everything below #dev #decision
- [ ] **Confirmation reminder pipeline** — Supabase Edge Function on cron: sends "are you coming?" X hours before training via chosen channel. One-tap confirm/decline from notification (token-based link, no login required) #dev #automation
- [ ] **No-response + backfill automation** — deadline passes → apply coach's default → open spot → notify waitlist. Finalize TBD decisions in ConfirmationFlow.md with Kajtek first #dev #automation
- [ ] **Waitlist signup flow** — "Join Waitlist" button when training full, integrates with backfill #dev
- [ ] Switch entire app to Polish — all UI labels, buttons, messages, toasts. Starting in Warsaw, app should be in Polish from day one #dev #i18n
- [ ] **School permissions model** — owner has full control over all trainings and coaches. Store as roles in DB. Update RLS policies accordingly #dev #school
- [ ] **School confirmation dashboard** — Kajtek's main screen: all trainings across coaches, confirmation status (confirmed/pending/no response), trigger manual reminders #dev #school
- [ ] **School-level automation settings** — owner sets school-wide defaults (reminder timing, no-response behavior). Coach inherits, owner can override per-training #dev #school
- [ ] **Capacitor setup + App Store deploy** — wrap React app in Capacitor, configure FCM (Android) + APNs (iOS) for native push notifications, publish to Play Store + App Store. After first deploy, use Capacitor Live Update for web-layer changes (instant, no review) #dev #infra


## Doing



## Blocked



## Review



## Done

**Complete**
- [x] Fix messages UX — fixed header + input bar, stays visible when keyboard opens #dev
- [x] Add city filter to Find Coach search — ~20 Polish cities as scrollable pills #dev
- [x] Confirmation prompts only show for sessions within 3 days #dev
- [x] Remove "My Training" section from player Profile page — clutters the view #dev
- [x] Replace Lovable favicon with Sessio icon #dev
- [x] Remove "switch to coach view" toggle — unnecessary for MVP, coaches are coaches #dev




%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[false,false,false,true,false,false]}
```
%%