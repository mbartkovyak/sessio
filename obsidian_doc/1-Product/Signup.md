# Signup & Entity Selection

Two-step funnel. No jargon. Users pick based on what they do, not what they are.

---

## Step 1: Train or Coach?

First screen after landing (or after auth if they signed up from landing page).

> **How will you use Sessio?**
>
> 🎾 **I train** — Find coaches, join trainings, manage my schedule
>
> 🏋️ **I coach** — Create trainings, manage athletes, run your business

Two big cards. Tap one, move on.

- **"I train"** → athlete onboarding (name, done) → athlete Home
- **"I coach"** → Step 2

---

## Step 2: What kind of coach? (coach path only)

> **How do you work?**
>
> 👤 **Solo coach** — I manage my own trainings independently
>
> 🏫 **Open a school** — I manage coaches and run a sports business
>
> 🔗 **Join a school** — I was invited by a school on Sessio

Three options. Each leads to a different onboarding path.

---

### Path A: Solo coach

Onboarding: name, sport, city → create first training → dashboard.

**Key insight:** solo coach gets the same management capabilities as a school owner — just without the school entity. Their dashboard IS the admin view for a "school of one." This means upgrading to a school later is trivial: just add school name and start inviting coaches.

DB: `profiles.role = 'coach'`, no school association.

### Path B: Open a school

Onboarding: name, school name, sport, city → dashboard (school view).

The school owner lands in the school management dashboard. From there:
- **Add coaches** — invite link or "I also coach" (adds self as coach in own school)
- **Create trainings** — assigns to any coach in the school (including self)

DB: `profiles.role = 'school_owner'`, creates row in `schools`, `schools.owner_id = user.id`.

### Path C: Join a school

Two sub-paths:
- **Via invite link** (primary): coach taps link → prompted to join → name, sport → joined. Lands in coach dashboard with school badge.
- **Via code/search**: enter school invite code during onboarding.

DB: `profiles.role = 'coach'`, row in `school_members`.

---

## Context: invite link arrival

If someone arrives via a **training invite link** (most common at launch):

Show:
> **[Coach Name] invited you to join**
> Tuesday Tennis · Warszawianka · 16:00
> **Continue with Google**

Skip step 1 — they're clearly an athlete. After auth: confirm name → join training → athlete Home.

If someone arrives via a **school invite link**:

Show:
> **[School Name] invites you to coach**
> **Continue with Google**

After auth: confirm name, sport → join school → coach dashboard.

---

## Returning users

Straight to their dashboard. Role determines routing:
- `player` → athlete Home
- `coach` → coach Home (with school badges if member of schools)
- `school_owner` → school Dashboard

---

## Flexibility / role evolution

| From | To | How |
|---|---|---|
| Solo coach | School owner | "Create a school" in settings → add school name → invite coaches |
| School owner | Also coaches | "I also coach" in Coaches tab → adds self to school_members |
| Coach at school A | Also at school B | Accepts invite link from school B → row in school_members |
| Coach at school | Leaves school | Settings → leave school → back to solo (or stays in other schools) |

Athletes don't become coaches through the app (for MVP).

---

## DB mapping

| Signup path | profiles.role | schools row | school_members row |
|---|---|---|---|
| Athlete | `player` | — | — |
| Solo coach | `coach` | — | — |
| Open a school | `school_owner` | created, owner_id = self | — (until "I also coach") |
| Join a school | `coach` | — | coach_id = self, school_id = school |

---

## Design notes

- Mobile-first. Most athletes arrive via invite link on phone.
- No email/password for MVP — Google + email OTP.
- Step 2 (coach sub-path) should feel like a natural continuation, not a separate page. Could be a slide or expand on the same screen.
- The "Join a school" path is invite-driven. Don't show it prominently if there's no invite context — solo coach and open school are the primary actions.
