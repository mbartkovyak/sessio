---

kanban-plugin: board

---

## Backlog

- [ ] Assign pass search for people think through, different search button, through names of all app users in the given country?
- [ ] AI chat to voice over and then implement or implement from text, premium feature
- [ ] Write down the roadmap - mobile app, more complex dash for computer, when DEMO, who to DEMO etc
- [ ] Phone number at registration — ideally auth by phone not email. SMS OTP needs paid service (Twilio) #dev #decision
- [ ] Chat photo sending — attachment_url column on messages, chat-attachments bucket, file picker in ChatView, image rendering in bubbles #dev
- [ ] Work with Yoodli.ai #gtm
- [ ] Reach out for funding https://www.linkedin.com/in/bartosz-jakubowski-20978b26/?originalSubdomain=fr


## Doing

- [ ] **Thu 09:00–10:30** 🎯 Coach outreach, make sure your plan make sense, maybe prepare script for Marta. Align with GTM GTM one-pager: 3-month beachhead, channel ladder, CAC/LTV → condense to 3 slide bullets https://x.com/athcanft/status/2038863134543466990?s=46
- [ ] Add UpperHand to the competitors, their pricing etc
- [ ] Go through both https://x.com/adamlyttleapps/status/2041174925575409967?s=46
- [ ] Add notifications to the email about training etc
- [ ] Send to Kajtek plan ideas how can we proceed, questions. What is hie using app for
- [ ] Here is Claude's plan:
	
	╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
	
	 **_Pass Request Flow: Player requests, Coach approves_**
	
	  
	
	 **Context**
	
	  
	
	 Players who join a school have no way to get a pass (abonament). Currently only
	
	 coaches can assign passes manually from /coach/passes. A player on Android tried
	
	 to get a pass and couldn't — there's zero self-service UI. We need a request →
	
	 approval flow.
	
	  
	
	 **How** **it** **works**
	
	  
	
	 1. Player sees available pass types for their school(s) on their home page
	
	 2. Player taps "Request" → player_abonaments row created with status: 'pending'
	
	 3. Coach/owner gets push notification
	
	 4. Coach sees pending requests on passes page, taps Approve or Decline
	
	 5. Approve → status='active', sessions/expiry calculated, player notified
	
	 6. Decline → row deleted, player notified
	
	  
	
	 ---
	
	 **Step** **1:** **Migration**
	
	  
	
	 **File:** supabase/migrations/YYYYMMDD_pass_request_flow.sql
	
	  
	
	 **A)** **Widen** **status** **CHECK** (currently only allows 'active', 'used_up', 'expired'):
	
	 ALTER TABLE public.player_abonaments DROP CONSTRAINT
	
	 player_abonaments_status_check;
	
	 ALTER TABLE public.player_abonaments ADD CONSTRAINT player_abonaments_status_check
	
	   CHECK (status IN ('pending', 'active', 'used_up', 'expired'));
	
	  
	
	 **B)** **Tighten** **INSERT** **RLS** — players can only insert status='pending', coaches/owners
	
	 can insert any:
	
	 DROP POLICY IF EXISTS "player_abonaments_insert" ON public.player_abonaments;
	
	 CREATE POLICY "player_abonaments_insert" ON public.player_abonaments
	
	   FOR INSERT TO authenticated
	
	   WITH CHECK (
	
	     (player_id = auth.uid() AND status = 'pending')
	
	     OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND
	
	 s.owner_id = auth.uid())
	
	     OR EXISTS (SELECT 1 FROM public.school_members sm WHERE sm.school_id =
	
	 player_abonaments.school_id AND sm.coach_id = auth.uid() AND sm.status =
	
	 'approved')
	
	   );
	
	  
	
	 **C)** **Add** **DELETE** **policy** — player can cancel their own pending request; owner can
	
	 clean up:
	
	 CREATE POLICY "player_abonaments_delete" ON public.player_abonaments
	
	   FOR DELETE TO authenticated
	
	   USING (
	
	     (player_id = auth.uid() AND status = 'pending')
	
	     OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = school_id AND
	
	 s.owner_id = auth.uid())
	
	   );
	
	  
	
	 No new tables. No new columns. Just constraint + RLS changes.
	
	  
	
	 ---
	
	 **Step** **2:** **Hooks** **(****src/hooks/training/useAbonaments.ts****)**
	
	  
	
	 **New** **hooks:**
	
	  
	
	 **Hook:** useAvailablePassTypes()
	
	 **Purpose:** Player: get pass types from schools where player has trainings. Query:
	
	   training_members → trainings.school_id → abonament_types where is_active=true,
	
	   joined with schools(id, name). Deduplicate by school.
	
	 ────────────────────────────────────────
	
	 **Hook:** useRequestPass()
	
	 **Purpose:** Player mutation: insert player_abonaments with status:'pending',
	
	   activated_at:null, sessions_total:null, sessions_remaining:null,
	
	 expires_at:null.
	
	    Notify coach/owner via notifyUsers().
	
	 ────────────────────────────────────────
	
	 **Hook:** usePendingPassRequests(schoolId)
	
	 **Purpose:** Coach: fetch player_abonaments where status='pending' and school_id
	
	   matches, joined with profiles:player_id and abonament_types.
	
	 ────────────────────────────────────────
	
	 **Hook:** useRespondPassRequest()
	
	 **Purpose:** Coach mutation: approve → update to status:'active', set activated_at,
	
	   calculate sessions_total/remaining from type, calculate expires_at from
	
	   duration_days. Decline → delete the row. Notify player.
	
	  
	
	 **Modify** **existing:**
	
	 - useMyAbonaments() (line 167): change .eq('status', 'active') → .in('status',
	
	 ['active', 'pending']) so pending shows on player home
	
	  
	
	 ---
	
	 **Step** **3:** **Player** **UI**
	
	  
	
	 **Modify** **src/components/player/home/MyAbonamentsSection.tsx****:**
	
	 - Split fetched abonaments into active and pending lists
	
	 - Show pending passes with a Clock icon + "Waiting for approval" badge (yellow,
	
	 like join requests)
	
	 - Don't return null if only pending passes exist — show them
	
	  
	
	 **New** **src/components/player/home/AvailablePassesSection.tsx****:**
	
	 - Uses useAvailablePassTypes() to get types grouped by school
	
	 - Filters out types where player already has an active or pending pass of same
	
	 abonament_type_id
	
	 - Each type: card with name, details (sessions/duration/price), "Request" button
	
	 - Returns null if no available types (keeps home clean)
	
	  
	
	 **Wire** **into** **src/pages/player/PlayerHome.tsx****:**
	
	 - Add <AvailablePassesSection /> after <MyAbonamentsSection />
	
	  
	
	 ---
	
	 **Step** **4:** **Coach** **UI**
	
	  
	
	 **Modify** **src/components/coach/AbonamentSection.tsx****:**
	
	 - Add "Pending requests" section above the "All passes" list
	
	 - Uses usePendingPassRequests(schoolId)
	
	 - Each pending request: player avatar + name, pass type name, Approve / Decline
	
	 buttons
	
	 - Approve → useRespondPassRequest({ accept: true })
	
	 - Decline → useRespondPassRequest({ accept: false })
	
	 - Section hidden when no pending requests
	
	  
	
	 ---
	
	 **Step** **5:** **Translations** **(4** **locales)**
	
	  
	
	 **Player** **keys** (player.json):
	
	 - abonaments.availablePasses, abonaments.request, abonaments.requestSent,
	
	 abonaments.pendingApproval, abonaments.alreadyRequested
	
	  
	
	 **Coach** **keys** (coach.json):
	
	 - abonaments.pendingRequests, abonaments.approve, abonaments.decline
	
	  
	
	 **Notification** **keys** (common.json):
	
	 - notifications.passRequestTitle/Body (to coach)
	
	 - notifications.passApprovedTitle/Body (to player)
	
	 - notifications.passDeclinedTitle/Body (to player)
	
	  
	
	 ---
	
	 **Step** **6:** **Notifications**
	
	  
	
	 Follow the exact pattern from useRespondJoinRequest (useTrainings.ts:748-758):
	
	 - **Player** **requests:** notify school owner + approved coaches, deep link to
	
	 /coach/passes
	
	 - **Coach** **approves/declines:** notify player, deep link to /player
	
	 - Use groupUsersByLanguage() + getFixedTForUser() for localized push
	
	  
	
	 ---
	
	 **Key** **files** **to** **modify**
	
	  
	
	 - supabase/migrations/NEW_pass_request_flow.sql
	
	 - src/hooks/training/useAbonaments.ts
	
	 - src/components/player/home/MyAbonamentsSection.tsx
	
	 - src/components/player/home/AvailablePassesSection.tsx (new)
	
	 - src/pages/player/PlayerHome.tsx
	
	 - src/components/coach/AbonamentSection.tsx
	
	 - src/i18n/locales/{en,pl,uk,fr}/{player,coach,common}.json
	
	  
	
	 **Verification**
	
	  
	
	 1. bun run build — no compile errors
	
	 2. Run migration on dev Supabase
	
	 3. Test as player: see available passes → request → see pending status
	
	 4. Test as coach: see pending request → approve → verify player sees active pass
	
	 5. Test decline flow: coach declines → verify row deleted, player notified
	
	 6. Test duplicate prevention: request same type twice → blocked
	
	 7. Verify push notifications arrive for both request and response
- [ ] From Monika: 1. Sign for all the zajecia, not clear 2. Block time, do not give the case to sign for two training at the same time. 3. Btter filtration for coach. 4. Add training to google kalendarz
- [ ] test if I can join training from the date when the pass becomes active
- [ ] I am puchasing the abonament at place - then coach should confirm that this person will buy at place
- [ ] Add the possibility of assigning the misses
- [ ] **Makeup balance tracking** — cancelled = +1 makeup owed. Makeup attended = -1. No-show = no makeup (wasted spot). Auto-calculated from attendance data. Rolling 60-day expiry per makeup (coach configurable). Manual override with logged adjustments (who, when, old→new). Parents see their balance + expiry dates, coach sees overview per athlete #dev #core
- [ ] When adding a poass add at least one out of two, you can not go without anything filled + there is an error when creating a pass
- [ ] Switch off abonaments fully funtinality
- [ ] Waitlist flow.
- [ ] Rework the landing page
- [ ] Avatar photo upload — Supabase Storage bucket + upload button on both player and coach profiles #dev
- [ ] **Attendance history view** — monthly view per training showing attended/missed/cancelled/no-show per athlete. Log with timestamps for disputes #dev
- [ ] Add the reuse nieobecnosci
- [ ] Additional lesson inside the group
- [ ] Add the people to invite to directly in the lesson creation if they are your contancts? Ask Claude how that should be handled
- [ ] **Google Calendar sync** — export/sync sessions via .ics or Google Calendar API. Low prio, high value #dev #later


## Review

- [ ] Test: 5. Never dissapearing check your calendar
- [ ] **Wed 12:00**   check those 1. **ecc5c6a** — Remove coach addition buttons from training form
	
	  2. **393782f** — Fix setup guide bio check (school bio vs profile bio)
	
	  3. **4329a06** — Fix attendance banner stuck for sessions with no athletes
	
	  4. **7b94d75** — Invalidate home/list queries after training edit
	
	  5. **78aa3f0** — Invalidate my-school cache after profile save
	  6. When you login the phone  should be cut off from the given user no matter what
	  7. вписати кастомний час відміни


## Done

**Complete**
- [x] **WED 19:30–20:00** 🎯 Send recording to trusted person — "in 30 sec, what do we do?"
- [x] **WED 11–11:45** 🎯 I App store fixes
- [x] **THU 13:30–14:30** 🎯 Q&A drill — ask claude and ChatGPT
- [x] **WED 17:00–18:30** 🎯 Pitch practice round 2 — 4 runs, record last on camera, note 3 fixes for Thursday
- [x] **THU 09:30–11:00** 🎯 Pitch practice round 3 — 4 runs, apply Wed's 3 fixes (wording only)
- [x] **TUE 16:45–17:00** 🎯 PPT read-through, export PDF, 3-line cover note, **SEND TO OTHER VC**
- [x] **TUE 15:15–15:30** 🎯 PPT #1: Willingness to pay + current spend — Czarek (100 PLN/mo ActiveNow), Kajtek (few hundred PLN/mo), Witek (budget exists)
- [x] **TUE 15:00–15:15** 🎯 PPT #2: FFT/federation partnerships bullet on GTM/acquisition slide
- [x] **TUE 14:30–15:00** 🎯 PPT #6: Concrete acquisition steps + target sport = Warsaw tennis (3 bullets max)
- [x] **TUE 12:15–13:00** 🎯 PPT #3: New Competition slide — 2×2 matrix (tool↔marketplace) — ActiveNow, TeachMe.To, Booksy, Sessio — source: `obsidian_doc/3-Competition/`
- [x] **TUE 15:30–15:45** 🎯 PPT #8: Team — Myro CEO/CTO, Simon CGO, Vlad advisor, brother advisor (skip brother if thin)
- [x] **TUE 14:00–14:30** 🎯 PPT #5: Surface Traction (loudest), soften/cut weak claims — especially "Why now?" if not confident
- [x] **TUE 12:00–12:15** 🎯 PPT #4: Lock hours-lost stat on Problem slide — €1–1.5k/month + 8h/week + Evgeniy 40% + Witek office employee framing
- [x] **TUE 15:45–16:45** 🎯 PPT #9: 50 words/slide refactor (DO LAST, after content) — cut excess to Annex slides
- [x] make sure you have customers page
- [x] Abonament days actually work how? I still see 30 days
- [x] Assigning pass to the Dinosaurs
- [x] Players should be able to join for one-off or sign for a series.
- [x] Add to the solocoach/school owner/coach dashboard the button passes where you pout the passes that exist, add passes, active passes. Baseically like there is on school page, but additional page that you can deep dive instead of everything on the home page
- [x] Null city impossible, you can not deselt city
- [x] Add abonament info to each person's profile
- [x] Make the get directions to etc bigger font, people do not see
- [x] Add the version with Simon and my Bro or my Bro
- [x] Change fonts and make sure the trainings are readible
- [x] Change wording EN/PL/UA each screen
- [x] Make sure people can not get more that x people in the training alrady, there is a max
- [x] Add cities for Ukraine, you should choose the location(Country only for now)
- [x] Merge after testing the dev
- [x] Android testing
- [x] Relogin - all messages get unread
- [x] **Push notification landing** — tapping a push should open the relevant screen (e.g. training detail, confirmation card), not just the app home #dev #push
- [x] **Scheduled push + cancel flow** — send push X hours before lesson ("Cancel if you're not coming"). If athlete cancels via push → free their spot, notify waitlist. If no cancel → assumed attending, no-show = charged #dev #push #automation
- [x] Polish language and UA at the beginning
- [x] Fix Athlete counter, I need geenral unique atheleted, not sign ups
- [x] **WED 15:00-15:30** 🎯 Demo video (PPT #10): QuickTime + iPhone mirror, CapCut edit, 45 sec — Story 1 scheduling + Story 2 discovery from `First demo.md`
- [x] **Phone number with country code** — make phone required, add country code picker. Format validation + check if number already used by another account #dev
- [x] Made the lesson for Wed and it start on Monday (BUG)
- [x] **Calendar: show all sessions until end date** — currently cuts off at 28 days, should show through training's end date #dev
- [x] **Toast notifications position** — toasts appear at the bottom and block UI. Move to top or make non-blocking #dev #ux
- [x] **Invite link flow: auto-join after signup** — athlete opens invite link → signs up → should auto-join the training. Currently requires re-opening the link. Persist invite through auth #dev #ux
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
{"kanban-plugin":"board","list-collapse":[false,false,false,false]}
```
%%