# Athlete

The athlete is a **consumer**. Two jobs: manage your trainings (group and individual) and find new coaches. The entire daily flow should take under 10 seconds.

## Pages

| Page | Purpose | Key sections |
|---|---|---|
| **Home** | Act on what's urgent | Next Training, Open Spots, Offers |
| **Search** | Find new coaches and training | Filters, coach cards, coach profile |
| **Calendar** | See your full schedule | Weekly view, training details |
| **Profile** | Manage yourself | Personal info, groups, reviews, settings |

**Bottom nav: Home, Search, Calendar, Profile.**

Messages accessible via header icon (badge when unread) — not a dedicated tab. Athlete reads/sends group messages but doesn't need it front-and-center.

→ Each page has its own doc: [[Home]], [[Search]], [[Calendar]], [[Profile]]

---

## How athletes get on the platform

1. **Invited by coach** (primary): coach drops invite link in WhatsApp → athlete taps → enters name → done. No app install (PWA), no account creation.
2. **Self-discovery**: athlete browses Search → finds coach → requests to join a group.

## Reliability

Strike system on 90-day rolling window. Tracks cancellations, no-shows, late reschedules. Repeated bad behavior → lower backfill priority, hidden from coach search.
