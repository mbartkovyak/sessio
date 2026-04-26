# Athlete

The athlete is a **consumer**. Two jobs: manage your trainings (group and individual) and find new coaches. The entire daily flow should take under 10 seconds.

## Pages

| Page | Purpose | Key sections |
|---|---|---|
| **Home** | Act on what's urgent | Next Training, Open Spots, Offers |
| **Chats** | Messages across all trainings + DMs with coaches | Inbox with unread badge |
| **Search** | Find new coaches and training | Filters, coach cards, coach profile |
| **Calendar** | See your full schedule | Weekly view, training details |
| **Profile** | Manage yourself | Personal info, groups, reviews, settings |

**Bottom nav: Home, Chats, Search, Calendar, Profile.** Chats surfaces an unread badge.

→ Each page has its own doc: [[Home]], [[Search]], [[Calendar]], [[Profile]]

---

## How athletes get on the platform

1. **Invited by coach** (primary): coach drops invite link → athlete taps → signs in with Google or email → profile + `/onboarding/questionnaire` → auto-joined into the training → lands on Home. Account creation is required (the old PWA no-signup framing is gone).
2. **Self-discovery**: athlete browses Search → finds coach → requests to join a group.

Detail on the signup funnel and the questionnaire steps lives in [[../Signup]].

## Reliability

Strike system on 90-day rolling window. Tracks cancellations, no-shows, late reschedules. Repeated bad behavior → lower backfill priority, hidden from coach search.
