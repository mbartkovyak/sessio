# Sessio

Scheduling + discovery platform for independent sports coaches. React + TypeScript + Supabase, hosted on Vercel (sessio-topaz.vercel.app).

---

## What Sessio does

Coaches have no professional infrastructure. Sessio gives them automated scheduling, a public profile that generates leads, and a dashboard that eliminates admin overhead. Athletes get search, reviews, ratings, and one-tap booking.

**Strategy:** Tool-first → marketplace. Coach brings existing clients via invite links (tool), public profile attracts new ones (marketplace).

**Beachhead:** Warsaw, tennis coaches, personal network.

**Critical question:** Will coaches adopt this for daily use? Not yet validated.

## The product

MVP: **group lesson management** (auto-confirm, auto-backfill) + **coach discovery** (browse, reviews, ratings).

- **Athlete** — confirm lessons in 10 seconds + find new coaches. Pages: Home, Search, Calendar, Profile.
- **Coach** — dashboard ("do I need to do anything?") + public profile. Pages: Home, Calendar, Lessons, Profile. Group + individual lessons. Messages inside each lesson.
- **School** — school profile, multiple coaches, invite link, cross-coach dashboard.

**Not in MVP:** Payments, AI, venue integration, native app.

## GTM

Validate with one coach → seed 5-10 → coaches bring athletes via invite links → expand sports → expand cities.

Metrics: Does the coach use Sessio daily? Is the profile generating new athlete interest?

---

## How to work here

- **Be concise.** No slop. Main results only.
- **Keep docs short.** Write the minimum that's useful. User gives a link → that's the basis, add a few extras, not a wall.
- **Don't over-plan.** Build, don't write essays.
- **Challenge bad ideas.** Push back when it doesn't make strategic sense.
- **Read before writing.** Always read files and surrounding code before modifying.

## Docs

Business context lives in the Obsidian vault (`obsidian_doc/`). Read before making product or strategy decisions.

```
obsidian_doc/0-Direction/Direction.md      — Vision, mission, why now, unfair advantages
obsidian_doc/1-Product/Signup.md           — Invite link flow, coach vs athlete routing
obsidian_doc/1-Product/ConfirmationFlow.md — Core loop: confirmation, backfill, notifications
obsidian_doc/1-Product/Athlete/            — Athlete entity, UX, pages
obsidian_doc/1-Product/Coach/              — Coach entity, dashboard, automation, school
obsidian_doc/1-Product/UX References.md    — Business-side UI from competitor platforms
obsidian_doc/2-GTM/GTM.md                 — Go-to-market, beachhead, first users
obsidian_doc/3-Competition/Competition.md  — Competitive landscape and positioning
obsidian_doc/4-Monetization/Monetization.md — Pricing model
obsidian_doc/5-Tech/Tech.md               — Architecture and stack
```

---

## Tools

**Whisper (audio transcription):**
```bash
PATH="/Users/myro/Documents/whisper-tools/whisper-bin:$PATH" \
  /Users/myro/Documents/whisper-tools/whisper-venv/bin/whisper \
  "<input_file>" --language uk --model medium --output_dir /Users/myro/Downloads --output_format txt
```
- Venv: `/Users/myro/Documents/whisper-tools/whisper-venv/`
- ffmpeg: `/Users/myro/Documents/whisper-tools/whisper-bin/ffmpeg` (symlink to imageio_ffmpeg binary in the venv)
- Must prepend whisper-bin to PATH so whisper's subprocess finds ffmpeg
- CPU-only (no CUDA) — medium model takes a few minutes per recording, run in background

---

## Code Rules

This codebase will be handed over to a developer. It must be clean, readable, and stable — not a house of cards. Every change should leave the code better than you found it.

**The priority is simplicity.** Before adding anything, ask: can I reuse what exists? Can I simplify what's there? If a feature requires a fragile chain of workarounds, stop and restructure first. Never patch over bad structure — fix the structure. A working app built on messy foundations will eventually crash, and that's not acceptable.

**Why this matters:** Complex code costs real money. Every tangled component, every duplicated hook, every unclear data flow means more Claude credits spent understanding context in future sessions. Simple code = fewer tokens to read = cheaper iterations. Keep it lean.

Lovable export has heavy duplication. These rules prevent it from getting worse and actively clean it up.

### Single source of truth

Before writing a new component, hook, or constant: **search for existing ones.** Extend, don't duplicate.

```
src/lib/constants.ts     — SPORTS, CITIES, DAYS_FULL, DAYS_SHORT, SPORT_ICONS
src/lib/utils.ts         — getInitials(), formatting helpers
src/components/shared/   — Avatar, TrainingForm, CalendarGrid, SelectField, AccountActions
src/hooks/shared/        — useConversations (all messaging), cross-role hooks
```

### One component per concept

| Concept | Use | Not |
|---------|-----|-----|
| Training create + edit | `TrainingForm` (mode prop) | ~~separate create/edit forms~~ |
| Profile fields | `SelectField` + `AccountActions` | ~~inline selects + sign out/delete in each page~~ |
| Avatar | `Avatar` (size prop) | ~~inline div everywhere~~ |
| Calendar | `CalendarGrid` (generic) | ~~duplicated day-grouping + dayLabel~~ |
| Training card | `TrainingCard` (not yet extracted) | ~~card markup in 5+ pages~~ |

### When modifying features

- Duplicated form? **Fix the duplication first** or flag it.
- New constant? → `src/lib/constants.ts`, never inline.
- New Supabase query that looks like an existing hook? → **Extend the existing hook.**

### Remaining debt (fix when touched)

1. Training card markup repeated in CoachTrainings, PlayerHome, PlayerSearch, CoachPublicProfile, SchoolPublicProfile → extract `TrainingCard`

### Git workflow — MANDATORY

- **Push to `dev` only.** Never push directly to `main`.
- **Create PRs** from `dev` → `main` using `gh pr create`.
- **NEVER merge PRs.** Only the user merges via GitHub. Do not run `gh pr merge` under any circumstances.
- **Always ask before destructive git operations** — force push, reset, branch delete, merge.

### Verify before pushing — MANDATORY

Every change must be verified before `git push`. We've broken production multiple times by pushing "should work" code. **Never skip these:**

1. **`bun run build`** — catch compile errors, missing imports, type issues.
2. **Trace the full flow** — what calls what, what data flows where, what happens on mount/unmount/navigate-away-and-back.
3. **Grep for removed/renamed exports** — if you removed or renamed a function, grep `src/` for all usages. Files you didn't edit may still import the old name.
4. **For DB migrations** — verify the SQL is correct, check that triggers/backfills will actually work with existing data.
5. **Don't push and hope** — if you're not confident it works, say so and ask to test first.

### General

- **No silent failures.** Every Supabase call handles errors — toast or message, never swallow.
- **Keep pages thin.** Compose shared components, not 300-line inline markup.
- **Test the flow, not just the page.** Invite link → sign up → onboarding → join → home.
- **Refactor as you go.** If you touch a file and see duplicated logic, tangled state, or unclear naming — clean it up in the same change. Don't leave it for later.
- **Keep it handover-ready.** A new developer should be able to read any file and understand what it does. Clear naming, small functions, obvious data flow. No clever tricks.

### Supabase / RLS / Migrations — MANDATORY checks

These rules exist because we've been burned repeatedly by RLS policies that silently fail, migrations that don't migrate data, and `.select()` after INSERT that gets blocked by RLS. **Never skip these.**

1. **After every migration: verify data.** Query the affected tables with the service role key to confirm rows exist. Don't assume `INSERT INTO ... SELECT` worked — prove it with a COUNT or sample query. If a migration creates tables and migrates data, check both.

2. **After every RLS policy change: test as the actual user role.** RLS policies that look correct in SQL often fail at runtime. Known traps:
   - `SECURITY DEFINER` functions calling `auth.uid()` → can return NULL in RLS context. **Never use `owns_school()` or similar wrappers.** Use direct subqueries.
   - `FOR ALL` policies → the `USING` clause doubles as `WITH CHECK` for INSERT, which can silently block inserts. **Always split into per-operation policies** (SELECT, INSERT, UPDATE, DELETE).
   - `.select()` after `.insert()` → the SELECT applies RLS separately. If the row was just created and no participant/membership row exists yet, SELECT returns nothing and `.single()` throws. **Generate UUIDs client-side** and skip `.select()` after INSERT, or add the user as a participant before selecting.
   - `.upsert()` with RLS → can return success with 0 rows affected. **Use check-then-insert** instead of upsert when RLS is involved.

3. **Never say "this should work" about RLS.** Prove it works by querying the DB after the change. Use `curl` with the service role key to verify data exists, then reason about whether the user's JWT would pass the policy.

4. **When dropping and recreating tables:** verify the new tables have data after migration. Query with service role key. If migration runs on an empty source table, that's expected — but say so explicitly.

5. **When changing import paths:** grep the entire `src/` directory for the old import path. Don't rely on memory — files you didn't edit may still reference old paths.

6. **Never create cross-referencing RLS policies.** If table A's policy queries table B, table B's policy must NOT query table A — this creates infinite recursion and returns 500 on every query. Test with the anon key (`curl`) after every RLS change to catch this immediately.

7. **When changing `profiles` schema: update `delete_my_account()`.** Adding a column, making one generated, or adding a new table with a user FK? Update the `delete_my_account` RPC in the same migration. This function resets the profile and deletes all user data — if it references a dropped/generated column or misses a new table, account deletion breaks silently.
