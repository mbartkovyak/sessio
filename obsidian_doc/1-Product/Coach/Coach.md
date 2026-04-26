# Coach

The coach is the **operator**. Three jobs:
1. **Manage lessons** (group and individual) with zero scheduling overhead
2. **Attract new athletes** through a public profile with ratings and reviews
3. **Fill empty hours** by making availability visible and bookable

If the coach is still doing manual coordination or relying on word-of-mouth for new clients, we haven't delivered enough value.

## Three coach contexts

| Context | Who | What they see |
|---|---|---|
| **Solo coach** | Independent, no school | Full dashboard — same admin capabilities as school owner, just no school entity. Can upgrade to school anytime. |
| **School coach** | Invited to a school | Coach dashboard with school badge on relevant trainings. Manages own trainings day-to-day. Can be in multiple schools. |
| **School owner** | Created/runs a school | School management dashboard: all coaches, all trainings, confirmations. Can also coach (adds self as coach). |

**Key insight:** solo coach and school owner get the same management UI. Solo is a "school of one" — no school name, no coach list, but all the same tools. Upgrading from solo to school = add school name + invite coaches.

## Pages

| Page | Route | Purpose |
|---|---|---|
| **Home** | `/coach` | Today's lessons, alerts, join requests, unread messages |
| **Chats** | `/coach/messages`, `/coach/dm/:userId` | Training group chats + DMs with athletes |
| **Lessons** | `/coach/trainings`, `/coach/trainings/new`, `/coach/trainings/:id`, `/coach/sessions/:id` | All training offerings — create, edit, rosters, invite links, per-session detail |
| **Calendar** | `/coach/calendar` | Full schedule across all lessons, weekly view, session status |
| **Profile** | `/coach/profile` | Public face + account settings: bio, sports, rating, reviews |
| **Passes** | `/coach/passes` | Multi-session passes with auto-deduction on attendance marking |
| **Athletes** | `/coach/athletes` | Roster across all the coach's trainings |
| **Stats** | `/coach/stats` | Coach-level usage / attendance / fill-rate stats |
| **Coaches** (school_owner only) | `/coach/coaches` | Invite and manage coaches inside the school |

**Bottom nav: Home, Chats, Lessons, Calendar, Profile.** (`CoachBottomNav.tsx`, 5 tabs. "Lessons" label routes to `/coach/trainings`.) Passes, Athletes, Stats, and Coaches are reached from Home and from the Profile/settings area.

## School owner: additional views

School owners get a **context switcher in the top-left of `CoachHome`** — tap to flip between personal coaching view and school management view. `/school/profile` is the School Profile editor. Other school-level views (Dashboard, Calendar, Coaches, School Profile) overlay into the coach routes and are gated by the `school_owner` role in `ProtectedRoute` (see root `CLAUDE.md`).

→ Full school detail: [[School/School]]

## How coaches get on the platform

1. **Solo path**: Sign up → "I coach" → "Solo coach" → name, sport, city → create first training
2. **School path**: Sign up → "I coach" → "Open a school" → name, school name, sport, city → school dashboard
3. **Invite path**: Tap school invite link → "I coach" → "Join a school" → name, sport → coach dashboard with school badge

## Core loop

The confirmation model is **assumed attending by default** — athletes don't opt in, they opt out. See [[../ConfirmationFlow]] for the canonical flow. Key pieces:

- **Cancellation reminders** before each session (deadline configured per training: 12/24/48/72h).
- **Auto-backfill** (group only): someone cancels → spot opens → waitlist/flex members can claim.
- **Attendance tracking**: marked post-session via `AttendanceSheet`.
- **Passes**: auto-deduct sessions on attendance mark.
- **Review collection**: athletes can rate after lessons.

## Role evolution

- Solo coach → taps "Create a school" in settings → becomes school owner
- School owner → taps "I also coach" in Coaches tab → added to own school as coach
- School coach → can create own school independently (separate from schools they coach at)
- School coach → can be in multiple schools simultaneously

## Reliability

Strike system same as athletes. Coaches who repeatedly cancel get flagged. When marketplace exists, reliability affects search ranking.
