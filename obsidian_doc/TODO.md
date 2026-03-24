---

kanban-plugin: board

---

## Backlog

- [ ] Reach out for funding https://www.linkedin.com/in/bartosz-jakubowski-20978b26/?originalSubdomain=fr
- [ ] **Post-training attendance (mark absences, not presences)** — after training, coach sees list of confirmed athletes. Default = attended. Coach only taps who didn't show up. Confirmed + not marked absent = auto-attended. Minimal tapping, fewer errors #dev #core
- [ ] **Makeup balance tracking** — cancelled = +1 makeup owed. Makeup attended = -1. No-show = no makeup (wasted spot). Auto-calculated from attendance data. Rolling 60-day expiry per makeup (coach configurable). Manual override with logged adjustments (who, when, old→new). Parents see their balance + expiry dates, coach sees overview per athlete #dev #core
- [ ] **Attendance history view** — monthly view per training showing attended/missed/cancelled/no-show per athlete. Log with timestamps for disputes #dev
- [ ] Phone number at registration — ideally auth by phone not email. SMS OTP needs paid service (Twilio) #dev #decision
- [ ] Work with Yoodli.ai #gtm
- [ ] Align design through Behance and then Figma Make #design
- [ ] Avatar photo upload — Supabase Storage bucket + upload button on both player and coach profiles #dev
- [ ] Chat photo sending — attachment_url column on messages, chat-attachments bucket, file picker in ChatView, image rendering in bubbles #dev
- [ ] Player profile editor — let players edit name, email, bio. Currently read-only #dev
- [ ] Optional nickname/display name — show instead of real name if set. Privacy feature #dev
- [ ] **No-response + backfill automation** — deadline passes → apply coach's default → open spot → notify waitlist. Finalize TBD decisions in ConfirmationFlow.md with Kajtek first #dev #automation
- [ ] **Waitlist signup flow** — "Join Waitlist" button when training full, integrates with backfill #dev
- [ ] Switch entire app to Polish — all UI labels, buttons, messages, toasts #dev #i18n
- [ ] **School-level automation settings** — owner sets school-wide defaults (reminder timing, no-response behavior). Coach inherits, owner can override #dev #school


## Next

- [ ] **2. E2E test: coach registration** — fresh signup → onboarding (pick "I coach" → solo) → lands on CoachHome. Create a training, get invite link, verify it works. Fix any bugs
- [ ] **3. E2E test: school owner registration** — fresh signup → onboarding (pick "I coach" → school owner) → creates school → lands on CoachHome with school view. Add self as coach, create training assigned to self. Fix any bugs
- [ ] **4. E2E test: athlete joins training** — coach shares invite link → athlete opens on phone → signs up or logs in → auto-joins → sees training on PlayerHome with pending confirmation. Fix any bugs in this chain
- [ ] **5. E2E test: confirmation flow** — athlete confirms "I'm coming" → status changes → coach sees confirmed count on TrainingDetail. Athlete declines → same. Change mind flow works. Fix any bugs
- [ ] **6. Web push: VAPID keys + subscription storage** — generate VAPID keypair, create `push_subscriptions` table in Supabase (user_id, subscription JSON, created_at), add subscribe logic in frontend (ask permission → store subscription) #dev
- [ ] **7. Web push: service worker handler** — add push event handler in service worker (VitePWA). Show notification with training name, time, tap opens the app #dev
- [ ] **8. Web push: send function** — Supabase Edge Function that reads subscriptions and sends web push via VAPID. Input: user_id + title + body. Reusable for any notification #dev
- [ ] **9. Web push: confirmation reminder** — hook into existing automation cron: X hours before training → send "Are you coming to [training] at [time]?" push to all pending athletes #dev
- [ ] **10. Test push on Android + iOS** — install PWA → grant notification permission → trigger test push → verify notification shows and tap opens app. iOS requires PWA installed to home screen
- [ ] **11. Final walkthrough** — one clean run: school owner creates school + training → shares invite → athlete joins → gets push reminder → confirms → coach sees it
- [ ] **Confirmation reminder pipeline** — Edge Function on cron: sends "are you coming?" X hours before training. One-tap confirm/decline via token link, no login needed #dev #automation
- [ ] Cancel if you are not coming, 12 hours before free cancellation
- [ ] Scheduling a few lessons per week - should be better functionality
- [ ] **School confirmation dashboard** — Kajtek's main screen: all trainings across coaches, confirmation status (confirmed/pending/no response), trigger manual reminders #dev #school
- [ ] Move scripts from Marta to the recordings
- [ ] Write down the roadmap - mobile app, more complex dash for computer, when DEMO, who to DEMO etc


## Doing

- [ ] **Invite link flow: auto-join after signup** — athlete opens invite link → signs up → should auto-join the training. Currently requires re-opening the link. Persist invite through auth #dev #ux
- [ ] **Toast notifications position** — toasts appear at the bottom and block UI. Move to top or make non-blocking #dev #ux
- [ ] **Calendar: show all sessions until end date** — currently cuts off at 28 days, should show through training's end date #dev
- [ ] **Phone number with country code** — make phone required, add country code picker. Format validation + check if number already used by another account #dev
- [ ] **Push notification landing** — tapping a push should open the relevant screen (e.g. training detail, confirmation card), not just the app home #dev #push
- [ ] **Scheduled push + cancel flow** — send push X hours before lesson ("Cancel if you're not coming"). If athlete cancels via push → free their spot, notify waitlist. If no cancel → assumed attending, no-show = charged #dev #push #automation
- [ ] Polish language and UA at the beginning
- [ ] **Google Calendar sync** — export/sync sessions via .ics or Google Calendar API. Low prio, high value #dev #later


## Blocked



## Review



## Done

**Complete**
- [x] **Simplify coach/school model** — removed personal vs school distinction. Coach in school = read-only. School owner always creates school lessons. Deleted OwnershipFilter, SchoolViewToggle, SchoolViewContext #dev
- [x] **Design refresh** — use Figma to design screens, share for implementation. Or pick a reference app and I'll match the style #design
- [x] **School home scroll** — after registration, school owner's home starts too low. School name should be visible at top #dev #ux
- [x] Cold calling Marta
- [x] **Rework call script** — update Playbook PL based on core value prop discussion. Sharper questions, clearer pain points to validate #gtm
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