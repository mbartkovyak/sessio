# Pre-Launch Checklist

Priority-ordered. Walk through top to bottom. Fixes marked with code changes are being implemented.

---

## PRIORITY 5: E2E Test Flows (Run After Fixes)

### Critical Path (must pass before giving links to anyone)

**Flow A: Coach Setup (10 min)**
- [ ] Fresh signup → Google OAuth → onboarding → school created
- [ ] Create group training (recurring, 2 days, instant booking)
- [ ] Verify sessions appear in Calendar (next weeks)
- [ ] Copy invite link

**Flow B: Athlete Joins (5 min)**
- [ ] Open invite link (second device / incognito)
- [ ] Sign up → onboarding → auto-redirect to join page
- [ ] Tap "Sign Up" → success → home page shows training
- [ ] Coach gets push notification

**Flow C: Core Loop (10 min)**
- [ ] Athlete: open Calendar → cancel upcoming session → see "Declined"
- [ ] Coach: get push notification → see declined in session detail
- [ ] Athlete: rejoin session → back to "Confirmed"
- [ ] Coach: send chat message → athlete gets push
- [ ] Athlete: reply → coach gets push
- [ ] Coach: mark attendance (past session) → toggle present/absent → save

**Flow D: Passes (5 min)**
- [ ] Coach: create pass type (10 sessions, 30 days)
- [ ] Coach: assign pass to athlete
- [ ] Mark attendance → verify 1 session deducted
- [ ] Verify: athlete pass shows 9 remaining

### Extended Tests (do these same day if time allows)

**Flow E: School Coach**
- [ ] Owner copies school invite link
- [ ] Second coach signs up → joins school → pending
- [ ] Owner approves → coach sees dashboard
- [ ] Owner creates training assigned to coach → coach sees it

**Flow F: Polish Language**
- [ ] Set phone to Polish → app shows Polish UI
- [ ] All major screens render in Polish (no English strings leaking)
- [ ] Push notifications arrive in Polish

**Flow G: Mobile UX**
- [ ] Android: Add to Home Screen → standalone mode → push works in background
- [ ] iOS: Add to Home Screen → standalone mode → safe areas correct
- [ ] Keyboard doesn't cover inputs in bottom sheets
- [ ] Back button works correctly (doesn't exit app)

**Flow H: Edge Cases**
- [ ] Athlete joins full training → "Full" error
- [ ] Same athlete clicks invite twice → "Already in training"
- [ ] Coach edits training time → future sessions updated
- [ ] Coach deletes training → disappears from lists
- [ ] Delete account → all data removed → can re-signup

---

## PRIORITY 6: Coach Onboarding Messages (Ready to Send)

### Day -1: Introduction (send today)

**English:**
```
Hey [Name]! I'm Myro, founder of Sessio. Thanks for trying the app.

Sessio handles your scheduling automatically — athletes get reminders, you get a dashboard, and everything runs without WhatsApp groups.

Tomorrow I'll walk you through setup. It takes ~10 minutes:
1. Create your school
2. Add your first training
3. Share a link with your athletes

I'll be available all day if anything breaks. Your feedback is the most valuable thing right now.
```

**Polish:**
```
Cześć [Name]! Jestem Myro, twórca Sessio.

Sessio automatyzuje Twój grafik — Twoi zawodnicy dostają przypomnienia, Ty widzisz dashboard, i wszystko działa bez grup na WhatsAppie.

Jutro przeprowadzę Cię przez setup. Zajmie ~10 minut:
1. Tworzysz szkołę
2. Dodajesz pierwszy trening
3. Wysyłasz link zawodnikom

Będę dostępny cały dzień jeśli coś nie zadziała. Twój feedback jest teraz najcenniejszy.
```

### Day 0: Setup Steps

**Step 1:**
```
Open this link → [APP URL]
Sign in with Google → "I coach" → "Open a school"
Fill in: school name, sport, city → Done!
```

**Step 2:**
```
Create your first training:
Tap "+" → name, venue, max players → pick days + times
Set confirmation window to 24h → Create

Sessions for the next 3 months are now auto-generated.
```

**Step 3:**
```
Share with your athletes:
Open training → "Invite Link" → Copy
Paste into WhatsApp group with this message:
```

**Ready-to-paste for athletes (Polish):**
```
Cześć! Od teraz treningi rezerwujemy przez aplikację Sessio.
Kliknij ten link, żeby dołączyć: [INVITE LINK]

Co trzeba zrobić:
1. Kliknij link
2. Zaloguj się przez Google (30 sek)
3. Wpisz imię i miasto
4. Gotowe — jesteś zapisany/a

Dzień przed treningiem dostaniesz przypomnienie. Jeśli nie możesz przyjść, po prostu odwołaj w apce.
```

**Step 4 (send after athletes join):**
```
What happens automatically now:
- Athletes are auto-confirmed for every session
- 24h before: they get a reminder "Cancel if you can't make it"
- If someone cancels: you get a notification
- After each session: reminder to mark attendance

Your morning routine: open app, check who's confirmed, done.
```

### Day 1-3: Follow-up

**After first session:**
```
How did it go? Quick tip: after each session, tap "Mark Attendance" → toggle who showed up.

If you use passes (e.g., "10 session pack"), go to Passes tab to set those up. Sessions auto-deduct when you mark attendance.
```

**Day 2 check-in:**
```
Morning! Is the app working? Any athletes having trouble joining?

Check: Dashboard (today's sessions), Calendar (week view), Messages (group chat per training).
```

**End of week 1:**
```
Week 1! Questions:
1. Are you checking the app daily?
2. Are athletes using it to confirm/cancel?
3. Anything missing or confusing?

Your honest feedback helps. No wrong answers.
```

### Troubleshooting (bookmark these)

| Problem | Fix |
|---------|-----|
| Athlete can't find link | Resend invite from training detail |
| "It asks me to sign up" | "Tap Continue with Google — 10 seconds" |
| Training not visible | Check: correct link? Onboarding completed? |
| No reminder received | Enable notifications: phone Settings → Chrome → Notifications |
| App shows English | Profile → Language → Polski |
| Can't install app | Chrome → menu (⋮) → "Add to Home Screen" |
| Notifications don't work | phone Settings → Apps → Chrome → Notifications → Allow |

---

## PRIORITY 7: Known Limitations (Communicate to Coaches)

Things that DON'T work yet — be upfront about these:

| Limitation              | Workaround                                              | When fixing      |
| ----------------------- | ------------------------------------------------------- | ---------------- |
| No payments             | Coach collects cash/transfer outside app                | After validation |
| No review system        | Athletes can't leave reviews yet                        | This month       |
| No waitlist auto-fill   | When someone cancels, coach manually adds from waitlist | This month       |
| No profile photo upload | Use Gravatar or skip for now                            | This week        |
| No venue map            | Venue is text-only, no Google Maps                      | Later            |
| Late cancel = allowed   | App warns but doesn't block                             | By design        |
| Pass purchase is manual | Coach assigns passes, athletes can't buy                | After payments   |

---

## PRIORITY 8: Post-Launch Monitoring

### Daily (week 1-2)
- [ ] 9am: Check Sentry for new errors
- [ ] 9am: Verify cron ran (check `training_sessions` for new rows, `session_attendance.reminder_count` incrementing)
- [ ] After each coach's first session: "How did it go?"
- [ ] Evening: Review any WhatsApp reports, push hotfixes

### Track These Metrics
- Is the coach opening the app daily?
- Are athletes joining via invite links? (check `training_members` growth)
- Are reminders being sent? (check `session_attendance.reminder_count > 0`)
- Is attendance being marked? (check `training_sessions.attendance_marked_at` not null)
- Any Sentry errors? (especially in automation edge function)

### Bug Report Template (send to coaches)
```
If something breaks, send me:
1. What you were doing
2. What happened
3. Screenshot if possible
```
