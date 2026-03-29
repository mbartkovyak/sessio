# UX Sprint — Make Sessio Self-Sufficient

Working doc. Each item has acceptance criteria. Work top-to-bottom. Check off ACs as you go.

---

## Tier 1 — Coach can't do their job without this

### 1.1 Coach sees who's coming to each session

**Problem:** Kajtek has Thursday 4pm tennis. 6 athletes enrolled. He's driving to the court. He opens Sessio — and can't see who confirmed. The `useSessionAttendance()` hook exists (useTrainings.ts:212) and works. Zero UI uses it.

**What to build:**
- Tappable session rows in TrainingDetail → opens a bottom sheet / expandable section showing attendance list
- Each athlete: avatar + name + status badge (confirmed ✓ / declined ✗ / pending ?)
- Summary line on the session row itself: "4/6 confirmed" or "2 pending"
- Same summary on CoachOverviewSection upcoming sessions and CoachCalendar session cards

**Acceptance criteria:**
- [ ] TrainingDetail "Upcoming Lessons" section — each session row shows "X/Y confirmed"
- [ ] Tapping a session row expands to show full attendance list with names and statuses
- [ ] CoachOverviewSection upcoming sessions show attendance summary
- [ ] CoachCalendar session cards show attendance summary
- [ ] Attendance updates in real-time when athlete confirms/declines (query invalidation)

**Edge cases:**
- Session with 0 members yet → show "No athletes" not "0/0"
- Cancelled session → don't show attendance (already shows "Cancelled")
- Individual training (1 athlete) → still show their status

**Files:** TrainingDetail.tsx, CoachOverviewSection.tsx, CoachCalendar.tsx, useTrainings.ts (useSessionAttendance already exists)

---

### 1.2 Athlete can leave a training

**Problem:** Kasia quit tennis. She still gets weekly confirmation requests. She can decline each one forever, or awkwardly ask the coach to remove her. Most will just ghost → coach sees phantom members.

**What to build:**
- "Leave training" action accessible from the group chat header (settings/gear icon or "..." menu)
- Confirmation dialog: "Leave [Training Name]? You won't receive session requests anymore."
- On confirm: delete from `training_members`, clean up future `session_attendance`, archive the group chat, notify coach

**DB:** RLS already allows `DELETE USING (auth.uid() = user_id)` on training_members. But there's NO trigger to clean up `session_attendance` — orphaned rows will remain. Need a migration to add cleanup trigger.

**Acceptance criteria:**
- [ ] Group chat header has a "..." or settings icon → "Leave training" option
- [ ] Confirmation dialog appears before leaving
- [ ] After leaving: `training_members` row deleted
- [ ] After leaving: future `session_attendance` rows for this training are deleted (new DB trigger)
- [ ] After leaving: group chat is archived (hidden) for the athlete
- [ ] After leaving: athlete redirected to messages list
- [ ] After leaving: coach receives push notification "[Athlete] left [Training]"
- [ ] After leaving: coach sees updated member count in TrainingDetail
- [ ] Athlete can rejoin later via invite link (no blocking)

**Migration needed:**
```sql
CREATE FUNCTION cleanup_attendance_on_member_leave() RETURNS TRIGGER ...
-- Delete future session_attendance rows where session_date >= today
-- Keep past attendance for history
```

**Edge cases:**
- Last member leaving → training stays, just empty
- Waitlist member leaving → just delete, no promotion needed
- Athlete leaves but has a confirmed session TODAY → warn "You have a session today. Leave anyway?"

**Files:** ChatView.tsx (header action), new hook `useLeaveTraining`, migration for cleanup trigger, pushNotify call

---

### 1.3 Athlete can message coach privately

**Problem:** Marek is running late. Group chat = everyone sees. DM route `/player/dm/{coachId}` exists and works. But there's NO button anywhere to reach it. Also: new athlete Tomek found Kajtek via search, wants to ask "What level is this group?" before joining. Can't message — has to blindly join first.

**What to build:**
- **CoachPublicProfile**: Add "Message" button below coach name/bio (before trainings list). Works even before joining any training.
- **Group chat header**: Show coach name — tappable → opens DM
- **PlayerCalendar session detail**: Add "Message coach" link

**DB:** RLS on conversation_participants already allows any authenticated user to INSERT. DM creation logic already exists in ChatView. No migration needed.

**Acceptance criteria:**
- [ ] CoachPublicProfile shows "Message" button (speech bubble icon + text)
- [ ] Tapping it navigates to `/player/dm/{coachId}`
- [ ] DM works even if athlete has never joined any of this coach's trainings
- [ ] Group chat header shows coach name — tapping opens DM
- [ ] PlayerCalendar expanded session shows "Message [Coach Name]" link → DM
- [ ] Existing DM conversations show up in athlete's messages list (already works)

**Edge cases:**
- Coach sees the DM in their messages list (already works via ChatList)
- Multiple trainings with same coach → single DM thread (already handled by DM dedup logic)

**Files:** CoachPublicProfile.tsx, ChatView.tsx (header), PlayerCalendar.tsx (expanded section)

---

### 1.4 Coach can add existing athletes to a training

**Problem:** Kajtek creates a new Friday group. 5 of his Wednesday athletes should move. Currently: share invite link to each via WhatsApp → wait for them to click → manually remove from Wednesday. This is exactly the admin overhead Sessio should eliminate.

**What to build:**
- TrainingDetail: "Add member" button in the Members section
- Tapping opens a sheet with searchable list of "my athletes" (anyone in any of my trainings, minus already in this one)
- Coach selects one or more → add to `training_members` → auto-create `session_attendance` via existing trigger
- Notify each added athlete: "Kajtek added you to Friday Tennis"

**DB:** RLS already allows coach INSERT on training_members for own trainings (FOR ALL policy). The `trg_attendance_on_member_join` trigger auto-creates session_attendance. No migration needed.

**Acceptance criteria:**
- [ ] TrainingDetail Members section has "Add" button (+ icon or "Add member")
- [ ] Opens bottom sheet with list of coach's athletes (from all trainings)
- [ ] Athletes already in this training are excluded from the list
- [ ] Search/filter by name works
- [ ] Selecting an athlete adds them to `training_members` with role='regular'
- [ ] `session_attendance` rows auto-created via existing trigger
- [ ] Added athlete receives push notification
- [ ] Member list refreshes immediately after adding
- [ ] If training is full (count >= max_players), show warning but allow coach to override (they're the coach)

**New hook needed:** `useMyAthletes(coachId)` — query all unique users from training_members where training.coach_id = me.

**Edge cases:**
- Adding to a full training → coach override (they decide, not the system)
- Adding someone who previously left → should work (no blocking)
- Adding someone on the waitlist of this training → promote to regular

**Files:** TrainingDetail.tsx, new useMyAthletes hook, new AddMemberSheet component

---

## Tier 2 — Users get stuck or fall back to WhatsApp

### 2.1 Post-onboarding guidance

**Problem:** All three roles land on empty screens after onboarding. No one knows what to do next. Drop-off risk is highest in the first 60 seconds.

#### Coach walkthrough (exists, just needs activation)
- `CoachWalkthrough.tsx` is built, exported, and never imported
- **Bug:** Links to `/coach/groups/new` — should be `/coach/trainings/new`
- Show on first visit to CoachHome when coach has 0 trainings
- Dismiss flag in localStorage

#### School owner walkthrough (new, same pattern)
- Steps: Welcome → Invite a Coach (share link) → Create First Training → Ready
- Show on first visit to CoachHome with school and 0 trainings + 0 coaches (only the owner)
- Same UI pattern as CoachWalkthrough

#### Athlete first-run (lighter)
- Better empty state on PlayerHome for 0-training athletes
- "How it works" card: 1. Find a coach → 2. Join a training → 3. Confirm sessions
- Prominent search CTA. Dismissible.

#### School owner routing fix
- `getPostOnboardingPath('school_owner')` returns `/coach` — should return `/school`
- One-line fix in Onboarding.tsx

**Acceptance criteria:**
- [ ] New solo coach → CoachWalkthrough appears on first CoachHome visit
- [ ] Walkthrough route fixed to `/coach/trainings/new`
- [ ] Walkthrough dismissed via X or completion → never shows again (localStorage)
- [ ] New school owner → school walkthrough appears
- [ ] New school owner → routed to `/school` after onboarding (not `/coach`)
- [ ] New athlete (no trainings) → sees "How it works" card with search CTA
- [ ] All walkthroughs are dismissible and don't block the app

**Files:** CoachHome.tsx (import + show walkthrough), CoachWalkthrough.tsx (fix route), Onboarding.tsx (fix routing), PlayerHome.tsx (better empty state), new SchoolWalkthrough.tsx

---

### 2.2 Push notifications for messages and key events

**Problem:** Tomek sent a join request. Kajtek approved it. Tomek has no idea — no push. He checks the app 3 days later. Also: Kasia sent a message in the training chat. Nobody gets a push. They check WhatsApp instead.

**Currently notifying:**
- ✅ Athlete confirms/declines session → coach gets push
- ✅ Athlete joins/requests to join training → coach gets push
- ✅ Coach deletes training → all members get push

**Missing:**
- ❌ Join request approved/declined → athlete
- ❌ New message in conversation → other participants
- ❌ Athlete removed from training → athlete
- ❌ Athlete leaves training → coach (covered in 1.2)

**What to build:**
- Add `notifyUsers()` call when coach responds to join request (useRespondJoinRequest)
- Add `notifyUsers()` call when coach removes a member (useRemoveTrainingMember)
- Add message notification on send — use existing `notify_message` edge function action (already built, handles role-based deep links)

**Acceptance criteria:**
- [ ] Coach approves join request → athlete gets push "You've been accepted to [Training]"
- [ ] Coach declines join request → athlete gets push "Your request to join [Training] was declined"
- [ ] Coach removes athlete → athlete gets push "You've been removed from [Training]"
- [ ] New message sent → all other participants get push (use `notify_message` action)
- [ ] Push notifications respect the user's notification language preference
- [ ] No self-notification (sender doesn't get push for own message)
- [ ] No duplicate notifications (use `tag` parameter for dedup)

**Caution on message notifications:** Don't send push for every single message in a rapid back-and-forth. Use the `tag` parameter so a new message push replaces the previous one for the same conversation.

**Files:** useTrainings.ts (useRespondJoinRequest, useRemoveTrainingMember), ChatView.tsx (on message send), lib/pushNotify.ts

---

### 2.3 Member removal cleanup

**Problem:** When a coach removes an athlete, or when we build "leave training":
1. `training_members` row is deleted ✓
2. Future `session_attendance` rows remain orphaned ✗
3. Athlete is not notified ✗ (notification covered in 2.2)
4. No chat message ✗

This is a DB hygiene issue. The trigger `trg_attendance_on_member_join` auto-creates attendance on join, but there's no reverse trigger.

**Migration:**
```sql
CREATE OR REPLACE FUNCTION public.cleanup_attendance_on_member_leave()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.session_attendance
  WHERE user_id = OLD.user_id
    AND session_id IN (
      SELECT id FROM public.training_sessions
      WHERE training_id = OLD.training_id
        AND session_date >= CURRENT_DATE
    );
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_cleanup_attendance_on_member_leave
BEFORE DELETE ON public.training_members
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_attendance_on_member_leave();
```

**Acceptance criteria:**
- [ ] Migration runs cleanly on dev
- [ ] Coach removes athlete → future session_attendance rows for that training are deleted
- [ ] Past session_attendance rows are preserved (history)
- [ ] Athlete leaves training (1.2) → same cleanup happens
- [ ] Verify with service role key: query session_attendance after removal, confirm future rows gone

**Files:** New migration file only

---

## Tier 3 — Completeness and polish

### 3.1 "My Trainings" for athletes

**Problem:** Kasia is in 3 trainings. She can see sessions in calendar and chats in messages. But there's no single place that says "You're in these trainings" with details (schedule, coach, members, actions).

**What to build:**
- New section on PlayerHome (below confirmations, above "This Week") OR a dedicated route
- List of trainings the athlete is a member of
- Each item: training name, sport icon, schedule summary (days + time), coach name (tappable → DM), member count
- Tapping a training → group chat for that training (existing route)
- "Leave" action (ties to 1.2) available from here too

**Acceptance criteria:**
- [ ] PlayerHome shows "My Trainings" section when athlete has ≥1 training
- [ ] Each training shows: name, sport, schedule, coach, member count
- [ ] Coach name tappable → opens DM
- [ ] Training card tappable → opens group chat
- [ ] "Leave" action available (three-dot menu or swipe)
- [ ] Section hidden when athlete has 0 trainings (empty state already handles this)

**New hook:** `useMyTrainings(userId)` — query training_members → trainings → coach profile

**Files:** PlayerHome.tsx, new MyTrainingsSection component, new hook

---

### 3.2 Waitlist auto-promotion

**Problem:** Training is full. Anna is on waitlist. Kasia leaves (or gets removed). Spot opens. Anna stays on waitlist. Coach must manually promote her. Most coaches won't remember.

**What to build:**
- DB trigger: when a `training_members` row with role='regular' is deleted, check if training has waitlist members. If yes, promote the oldest one (by `joined_at`) to 'regular'. Notify the promoted athlete.
- This also triggers `trg_attendance_on_member_join` which auto-creates session_attendance.

**Acceptance criteria:**
- [ ] Regular member removed from full training → oldest waitlist member auto-promoted to regular
- [ ] Promoted athlete gets push: "A spot opened up in [Training]! You're in."
- [ ] Session attendance auto-created for promoted athlete (existing trigger handles this)
- [ ] If no waitlist members, nothing happens
- [ ] Coach sees updated member list with promoted athlete as regular
- [ ] Promotion only happens when count < max_players after removal

**Edge case:** What if coach removes someone and immediately adds someone else? The promotion trigger fires first, then the add. Could go over capacity. Solution: trigger checks count < max_players before promoting.

**Files:** New migration (trigger on training_members DELETE), push notification from trigger (or from app after detecting promotion)

---

### 3.3 Coach profile completeness

**Problem:** Coaches sign up, create a training, but never fill in bio, set trainings to discoverable, or add a photo. Their public profile looks empty. Athletes searching can't evaluate them.

**What to build:**
- Simple progress indicator on CoachProfile: "Profile 60% complete"
- Checklist: photo ✓, bio ✗, sport ✓, city ✓, discoverable training ✗
- Not blocking, just a nudge

**Acceptance criteria:**
- [ ] Coach profile page shows completeness percentage
- [ ] Checklist shows which items are missing with links to fix them
- [ ] Dismissible after first view
- [ ] Reaching 100% hides the indicator

**Files:** CoachProfileEditor.tsx (add section at top)

---

## Implementation order (suggested)

| Day | Items | Why this order |
|-----|-------|----------------|
| 1 | 2.3 (cleanup migration) + 1.1 (session attendance UI) | Foundation: fix DB first, then build the most-needed coach feature |
| 2 | 1.2 (leave training) + 1.3 (message coach button) | Self-service basics — small, high-impact UI changes |
| 3 | 1.4 (add existing athlete) | Biggest build, needs new hook + sheet component |
| 4 | 2.1 (onboarding — walkthrough activation + routing) | Quick wins, mostly wiring up existing code |
| 5 | 2.2 (push notifications) + 3.1 (my trainings) | Notification calls are surgical additions; my trainings is a new section |
| 6 | 3.2 (waitlist auto-promote) + 3.3 (profile completeness) | Polish, can skip if time is tight |

---

## Cross-cutting concerns

**i18n:** Every new string needs EN + PL + UA keys. Use existing translation files.

**Build verification:** `bun run build` after every feature. No pushing broken code.

**RLS traps to watch:**
- training_members has a `FOR ALL` policy for coaches — remember `USING` doubles as `WITH CHECK` on INSERT. Test that coach INSERT actually works by tracing through the policy.
- conversation_participants INSERT is open to all authenticated — this is intentional for DM creation.

**Existing TODO.md overlap:** Items 56 ("Add the people to invite directly"), 54 ("Waitlist flow"), 51 ("max people enforcement") overlap with this sprint. Update TODO.md when done.
