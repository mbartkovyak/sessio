# Sessio

This repository is the working knowledge base for Sessio, an early-stage startup project. It is **not a code repository** — it contains strategy documents, product thinking, and evolving decisions. The codebase lives separately (exported from Lovable, moving to Cursor + Claude Code).

---

## The Idea

1. Independent sports coaches have no professional infrastructure. Scheduling is manual, discovery is word-of-mouth, empty slots go unfilled, and there's no way to build a reputation online.
2. Athletes have no good way to find coaches, compare quality, or book training without back-and-forth messaging.
3. Sessio solves both sides: **for coaches** — automated scheduling, a public profile that generates leads, and a dashboard that eliminates admin overhead. **For athletes** — search, reviews, ratings, and one-tap booking.
4. Sessio starts as a **tool** coaches use with their existing clients (no cold-start problem), then grows into a **marketplace** where new athletes discover and book coaches directly.

## Current Direction

**Mission:** Give sports coaches professional infrastructure — automated scheduling, online presence, and a steady flow of new clients.

**Vision:** Become the default way people find, book, and manage sports coaching in their city.

**Strategy summary:** Start as a scheduling + discovery tool for tennis coaches in Warsaw. Coach brings existing clients via invite links, while their public profile attracts new ones. Marketplace and monetization come after tool adoption is proven.

→ *Full context: [[0-Direction/Direction|0-Direction/]]*

## How to Work on This Project

- **Be concise.** No slop. No 1000-line documents. Main results only.
- **All documentation is .md** — this is an Obsidian vault, keep files readable.
- **Don't over-plan.** We're building, not writing essays. Plans exist to guide code.
- **Challenge bad ideas.** Push back when something doesn't make strategic sense.
- **Reference the docs.** Extensive prior thinking on competition, pricing, user flows, and naming is captured in the numbered folders below.

## The Product (summary)

MVP does two things: **group lesson management** (auto-confirm, auto-backfill) and **coach discovery** (browse, reviews, ratings).

Two entities, two very different experiences:
- **Athlete** — consumer. Confirm lessons in 10 seconds + find new coaches. 4 pages: Home, Search, Calendar, Profile.
- **Coach** — operator. Dashboard that answers "do I need to do anything right now?" + public profile that attracts new athletes. 4 pages: Home, Calendar, Lessons, Profile. Manages both group and individual lessons. Messages live inside each lesson as chat.

School support (basic): a school profile with multiple coaches, invite link, cross-coach dashboard.

**What's NOT in MVP:** Payments, AI features, venue integration, native app.

**What we know and don't know:**
- Coach pain (daily coordination overhead for groups, no way to attract new clients online) — confirmed from real tennis coach in Warsaw.
- Whether coaches will actually adopt the tool for daily use — **not yet validated. This is the critical question.**

→ *Full context: [[1-Product/Athlete/Athlete|Athlete]] · [[1-Product/Coach/Coach|Coach]]*

## Go-To-Market (summary)

Beachhead: **Warsaw, tennis coaches, personal network.**

The launch sequence: validate with one coach → seed 5-10 coaches → coaches bring their own athletes via invite links → expand sports → expand cities.

Key metrics: Does the coach use Sessio as their main scheduling tool? Is the coach's profile generating new athlete interest?

→ *Full context: [[2-GTM/GTM|2-GTM/]]*

---

## Structure

**Progressive disclosure.** Each folder can grow with additional files as the project evolves. This root CLAUDE.md orients — the numbered folders go deep.

```
CLAUDE.md                                    — This file. Orients everything.
obsidian_doc/0-Direction/Direction.md        — Vision, why now, unfair advantages
obsidian_doc/1-Product/Signup.md             — Entry page: invite link flow, coach vs athlete routing
obsidian_doc/1-Product/ConfirmationFlow.md   — Core loop: confirmation, backfill, notifications
obsidian_doc/1-Product/Athlete/Athlete.md    — Athlete entity: UX, pages, what they can/can't do
obsidian_doc/1-Product/Coach/Coach.md        — Coach entity: UX, pages, automation, school
obsidian_doc/1-Product/Coach/School/         — School feature: dashboard, calendar, public profile
obsidian_doc/2-GTM/GTM.md                    — Go-to-market, beachhead, first users
obsidian_doc/3-Competition/Competition.md    — Competitive landscape and positioning
obsidian_doc/4-Monetization/Monetization.md  — Pricing model and revenue strategy
obsidian_doc/5-Tech/Tech.md                  — Architecture decisions and stack
```

## Tech (summary)

- **Stack:** React + TypeScript + Supabase (from Lovable export)
- **Current state:** MVP built in Lovable, transitioning to Cursor + Claude Code
- **Hosting:** TBD (Vercel or Netlify likely)

→ *Full context: [[5-Tech/Tech|5-Tech/]]*
