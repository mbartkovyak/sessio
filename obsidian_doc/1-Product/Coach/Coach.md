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

| Page | Purpose | Key sections |
|---|---|---|
| **Home** | What needs attention now | Today's lessons, alerts, join requests, unread messages |
| **Calendar** | Full schedule across all lessons | Weekly view, lesson status, fill rates |
| **Lessons** | Manage all lesson offerings | Group + individual, rosters, settings, invite links, chat |
| **Profile** | Public face + account settings | Bio, video, reviews, ratings, settings |

**Bottom nav: Home, Calendar, Lessons, Profile.**

Messages live inside each lesson (group chat or direct chat). Unread alerts surface on Home.

## School owner: additional views

School owners get a **context switcher in the top-left corner** — tap to flip between personal coaching view and school management view.

**School view nav: Dashboard, Calendar, Coaches, School Profile.**

→ Full detail: [[School/School]]

## How coaches get on the platform

1. **Solo path**: Sign up → "I coach" → "Solo coach" → name, sport, city → create first training
2. **School path**: Sign up → "I coach" → "Open a school" → name, school name, sport, city → school dashboard
3. **Invite path**: Tap school invite link → "I coach" → "Join a school" → name, sport → coach dashboard with school badge

## Core automation

- **Auto-confirm requests**: X hours before lesson, athletes get confirm/decline prompt
- **Auto-backfill** (group only): decline → spot to waitlist → first claim wins → coach notified
- **Attendance tracking**: automatic, no manual entry
- **Review collection**: athletes can rate after lessons

## Role evolution

- Solo coach → taps "Create a school" in settings → becomes school owner
- School owner → taps "I also coach" in Coaches tab → added to own school as coach
- School coach → can create own school independently (separate from schools they coach at)
- School coach → can be in multiple schools simultaneously

## Reliability

Strike system same as athletes. Coaches who repeatedly cancel get flagged. When marketplace exists, reliability affects search ranking.
