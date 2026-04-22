# Sessio

Scheduling + discovery platform for sports coaches and small schools. React + TypeScript + Supabase + Capacitor. Web at get-sessio.com, native iOS live on App Store (all regions), native Android pending Play Store submission (Capacitor APK available for testers, public download not yet available).

---

## What Sessio does

Coaches have no professional infrastructure. Sessio gives them automated scheduling, a public profile that generates leads, and a dashboard that eliminates admin overhead. Athletes get search, reviews, ratings, and one-tap booking.

**Strategy:** Tool-first → marketplace. Coach brings existing clients via invite links (tool), public profile attracts new ones (marketplace).

**Beachhead:** Warsaw, tennis coaches, personal network.

**Critical question:** Will coaches adopt this for daily use? Not yet validated.

## The product

MVP: **group lesson management** (auto-confirm, auto-backfill) + **coach discovery** (browse, reviews, ratings).

- **Athlete** — confirm lessons in 10 seconds + find new coaches. Pages: Home, Chats, Search, Calendar, Profile.
- **Coach** — dashboard ("do I need to do anything?") + public profile. Pages: Home, Chats, Lessons, Calendar, Profile. Plus Passes, Athletes, Stats, Coaches (school_owner only). Group + individual lessons. Messages inside each lesson.
- **School** — school profile, multiple coaches, invite link, cross-coach dashboard.

**Not yet built:** Payments, AI, venue integration.

## Monetization — Booksy model

SaaS subscription (school pays monthly) + commission on NEW platform-acquired clients only. Existing relationships untouched — no disintermediation risk. Contrast with TeachMe.To (pure marketplace): after one session they go to WhatsApp → platform loses. Sessio doesn't have this problem because it's the operating system, not the middleman.

| Revenue line | Sessio |
|---|---|
| **SaaS subscription** (core) | School pays monthly for scheduling/confirmations tool |
| **Commission on NEW clients only** | Commission on happy hour / discovery bookings only |
| **Payment processing** | Later, when payments are added |
| **Consumer side** | Free |

## GTM

Validate with one school → seed 5-10 → schools bring athletes via invite links → expand sports → expand cities.

---

## How to work here

**We are in stability phase.** The app is live, users are on it, iOS is in all App Store regions, Android is in Play Store submission. Every change is a potential regression. The ratio is **30% coding, 70% verifying nothing breaks.**

- **Small, focused changes.** One concern per commit. Don't touch what you don't need to.
- **Prove it works before pushing.** Build, trace the flow, grep for broken imports. "Should work" is not good enough.
- **Read before writing.** Always read files and surrounding code before modifying.
- **Challenge bad ideas.** Push back when it doesn't make strategic sense.
- **Be concise.** No slop. Main results only.

## Docs

Business context lives in the Obsidian vault (`obsidian_doc/`). Read before making product or strategy decisions. This CLAUDE.md is itself the authoritative tech reference — there is no separate `Tech.md`.

```
obsidian_doc/0-Direction/Direction.md      — Vision, mission, why now, unfair advantages
obsidian_doc/1-Product/Signup.md           — Invite link flow, coach vs athlete routing, questionnaire
obsidian_doc/1-Product/ConfirmationFlow.md — Core loop: confirmation, backfill, notifications
obsidian_doc/1-Product/Athlete/            — Athlete entity, UX, pages
obsidian_doc/1-Product/Coach/              — Coach entity, dashboard, automation, school
obsidian_doc/1-Product/UX References.md    — Business-side UI from competitor platforms
obsidian_doc/2-GTM/GTM.md                  — Go-to-market, beachhead, first users
obsidian_doc/3-Competition/Competition.md  — Competitive landscape and positioning
obsidian_doc/4-Monetization/Monetization.md — Pricing model (Booksy)
```

## Architecture

**3 roles:** `player` (athlete), `coach` (school member), `school_owner` (school admin or solo coach).
- **Solo coach** = `school_owner` with `schools.is_listed = false`. Auto-created hidden school during onboarding. Same home page as school owners, but UI hides multi-coach features via `isSolo` flag.
- `ProtectedRoute` lets `school_owner` access all `coach` routes.

**File structure:** Role-based separation + shared layer.
```
src/pages/{auth,coach,player,school,shared}/   — Route pages, thin shells
src/components/{coach,player,shared,layout}/   — UI components (24 shared)
src/hooks/{coach,school,training,shared}/      — Data hooks (13 total)
src/lib/                                       — constants, utils, pushNotify, auth-providers
src/contexts/AuthContext.tsx                    — Session, profile, loading state
```

**Key shared components:** Avatar, TrainingForm, TrainingCard, CalendarGrid, ChatView, ChatList, SelectField, AccountActions, CoachCard, VenueManager, ProfileSheet, ReportDialog.

**Key shared hooks:** useConversations (messaging), useBlockedUsers, useAutoRegisterPush, useNativePush, usePushNotifications, useUnsavedChanges, useVisualViewport.

**Edge Functions** (`supabase/functions/`):
- `send-push` — Push notifications via FCM (native) and Web Push (VAPID). Called by DB trigger for messages, by client for training events.
- `automation` — Cron jobs: session generation, confirmation windows, reminders, deadline handling. Auth via `x-cron-secret`.
- `send-email` — Supabase Auth webhook for transactional emails via Resend.

**Tech stack:** React 18 + React Router 6 + TypeScript + Vite + Tailwind + Radix UI + TanStack Query. Supabase (Postgres + Auth + Realtime + Edge Functions). Capacitor 8 + Capgo OTA for native. Sentry for error tracking. i18n: EN, PL, UK.

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

**18K lines of source code, 131 lines average per file.** It must stay lean, readable, and stable. Every change should leave the code better than you found it.

**The priority is stability, then simplicity.** Before adding anything, ask: can I reuse what exists? Can I simplify what's there? Will this break something else? Simple code = fewer tokens = cheaper iterations. Complex code costs real money in Claude credits.

### Single source of truth

Before writing a new component, hook, or constant: **search for existing ones.** Extend, don't duplicate.

```
src/lib/constants.ts     — SPORTS, CITIES, COUNTRIES, DAYS_FULL, DAYS_SHORT, SPORT_ICONS
src/lib/utils.ts         — cn(), getInitials(), normalizeTime()
src/components/shared/   — 24 components (see Architecture section above)
src/hooks/shared/        — 8 hooks (see Architecture section above)
```

### One component per concept

| Concept | Use | Not |
|---------|-----|-----|
| Training create + edit | `TrainingForm` (mode prop) | ~~separate create/edit forms~~ |
| Profile fields | `SelectField` + `AccountActions` | ~~inline selects + sign out/delete in each page~~ |
| Avatar | `Avatar` (size prop) | ~~inline div everywhere~~ |
| Calendar | `CalendarGrid` (generic) | ~~duplicated day-grouping + dayLabel~~ |
| Training card | `TrainingCard` (list/grid variants) | ~~card markup in 5+ pages~~ |

### When modifying features

- Duplicated form? **Fix the duplication first** or flag it.
- New constant? → `src/lib/constants.ts`, never inline.
- New Supabase query that looks like an existing hook? → **Extend the existing hook.**

### Git workflow — MANDATORY

- **Push to `dev` only.** Never push directly to `main`.
- **"Push to dev"** means push everything — code AND migration files — to the `dev` branch on GitHub.
- **Create PRs** from `dev` → `main` using `gh pr create`.
- **NEVER merge PRs.** Only the user merges via GitHub. Do not run `gh pr merge` under any circumstances.
- **Always ask before destructive git operations** — force push, reset, branch delete, merge.

### Deployment pipeline

- **Vercel** deploys automatically on push to any branch (preview for `dev`, production for `main`).
- **Supabase migrations** run through GitHub CI only — never via direct CLI.
  - **Dev:** `.github/workflows/deploy-supabase-dev.yml` runs on push to `dev` (when `supabase/` changes).
  - **Prod:** `.github/workflows/deploy-supabase.yml` runs on merge to `main`.
  - **NEVER run `supabase db push` directly.** Commit the migration file, push to `dev`, let CI apply it. This keeps both databases in sync with git as the single source of truth.
  - Edge Functions deploy through the same CI workflows. Never run `supabase functions deploy` directly.

### Mobile app distribution

Sessio ships on three surfaces. Both mobile apps use Capacitor + Capgo OTA — the web bundle is baked into the native shell at build time, but JS/CSS/HTML updates can be pushed over-the-air via Capgo without a store release.

- **Web** (`get-sessio.com`) — Vercel auto-deploys on push to `main`. Instant updates.
- **iOS** — **Capacitor** (`capacitor.config.ts`, `ios/` folder). `webDir: 'dist'` with no `server.url`, so the web bundle is baked into the IPA at build time. Native changes (plugins, Info.plist, signing) require `bun run ios:prod` → archive in Xcode → TestFlight/App Store submission (Apple review ~24–48h). **NEVER archive from Xcode without first running `bun run ios:prod`** — it rebuilds the web bundle, syncs it into `ios/App/App/public/`, and deletes iCloud-duplicated files (`* 2.*`). Using raw `bunx cap sync ios` skips the iCloud cleanup and ships a polluted bundle. Dev variant: `bun run ios:dev`. JS/CSS/HTML-only changes reach users via **Capgo OTA** on next app launch.
  - **iPad review trap**: the app is marked iPhone-only (`TARGETED_DEVICE_FAMILY = 1`, `LSRequiresIPhoneOS = true`), but iPads still install iPhone-only apps in **iPhone compatibility mode** and Apple reviewers explicitly test there. You cannot opt out. If the app hangs on iPad (2.1(a) "loading indefinitely"), the cause is always inside our code — test in the iPad Air simulator in Xcode before every App Store submission. Every boot-path async operation must have a timeout + `.catch()`; any promise that can stall will stall on iPad WKWebView eventually.
- **Android** — **Capacitor** (`capacitor.config.ts`, `android/` folder). Same model as iOS: web bundle baked at build time, native changes need a Play Store release, JS/CSS/HTML-only changes reach users via **Capgo OTA** on next app launch. Use `bun run android:dev` / `bun run android:prod` to build debug/release APKs locally (see "Android Capacitor build" below).

**Capgo OTA** (`@capgo/capacitor-updater`): JS bundles are uploaded to a Capgo channel by CI. The `defaultChannel` is set dynamically in `capacitor.config.ts` via `CAPGO_CHANNEL` env var — `android:dev` sets it to `dev`, prod builds default to `production`. The `setChannel` call in `main.tsx` is a fallback (guarded by localStorage to avoid rate limits). Workflows: `.github/workflows/deploy-capgo.yml` uploads the prod bundle on push to `main`; `deploy-capgo-dev.yml` uploads the dev bundle on push to `dev`. Capgo CANNOT update native code — plugin changes, `AndroidManifest.xml`, `build.gradle`, icons, or version bumps require a full store release.

**Capgo version rules — DO NOT BREAK:**
- `capacitor.config.ts` has `version: '1.0.0'` in the `CapacitorUpdater` plugin config. **NEVER change this to match `package.json` or the native `versionName`.** This version is sent to Capgo's server as the "native version." The CI uploads bundles as `1.2.0-dev.{hash}` (semver pre-release). If the config version is `>= 1.2.0`, the server rejects updates with `disable_auto_update_under_native` because `1.2.0-dev.xxx < 1.2.0` in semver. Keeping it at `1.0.0` ensures all bundles pass the version check.
- Android's `versionNameSuffix " (debug)"` in `build.gradle` produces `"1.2.0 (debug)"` which **fails Capgo's semver parser entirely**. The `version: '1.0.0'` override in the config prevents this from reaching the server.
- **If you bump `package.json` version** (e.g., to `2.0.0`), the CI will upload `2.0.0-dev.{hash}`. This is still `> 1.0.0`, so Capgo works. No config change needed.
- **If you bump to a new major version** and the Capgo channel `autoUpdate` mode is `major`, ensure the major versions still match (both `1.x` or both `2.x`). Check channel settings with `npx @capgo/cli channel list com.get-sessio.app`.
- Capgo updates apply when the app goes **background → foreground**, not on force-close/reopen.

Implications:
- JS/CSS/HTML bug fixes reach iOS users via Capgo on the next app launch — no store release needed.
- iOS is live in all App Store regions. Android Play Store submission is pending — APKs can be sideloaded for testers, but public download isn't available yet. Once Android is live, Capgo will reach both platforms the same way.
- Native changes (new plugin, manifest edit, icon update, native lib) require a full store release on the affected platform(s).
- iOS releases need Apple review (~24–48h). Android releases need Google Play review (usually faster). Plan native-affecting changes accordingly.

#### Android Capacitor build

Android dev/prod split mirrors iOS:

- **Debug variant** (`app-debug.apk`) — package `com.get_sessio.app.debug`, label "Sessio Dev", auto-signed with Android's debug keystore, coexists with the prod install.
- **Release variant** (`app-release.apk`) — package `com.get_sessio.app`, label "Sessio", signed from `android/keystore.properties` (gitignored). The production signing key for the Play Store release is at `/Users/myro/Documents/Sessio/android.keystore` (gitignored via root `.gitignore *.keystore`); `keystore.properties` and the keystore both stay local and are never committed.

Commands:
- Dev APK: `bun run android:dev` — wraps `bun run build:dev && bunx cap sync android && gradlew assembleDebug`. Bakes dev Supabase into the JS bundle.
- Prod APK: `bun run android:prod` — wraps `bun run build && bunx cap sync android && gradlew assembleRelease`. Bakes prod Supabase into the JS bundle.
- Both scripts include an iCloud-duplicate cleanup step (`find dist ... -name '* 2.*' -delete`) because macOS iCloud Drive silently duplicates files in `dist/`, which breaks Gradle's `compressDebugAssets` task.

Gradle signing is wired in `android/app/build.gradle` via a `signingConfigs.release` block that reads `keystore.properties`. If the properties file is missing, the release buildType falls through unsigned (the block is guarded by `if (keystorePropertiesFile.exists())`).

Firebase (FCM) uses `sessio-4f6a4` as the shared project across dev/prod. `android/app/google-services.json` contains two Android clients: `com.get_sessio.app` (prod/release) and `com.get_sessio.app.debug` (debug). iOS has matching bundle IDs (`com.get-sessio.app` + `com.get-sessio.app.dev`) in the same Firebase project.

Native (Capacitor) builds bake env vars into the JS bundle at Vite build time. Vite text-replaces `import.meta.env.VITE_*` with literal strings during build — once the APK/IPA is packaged, the app is locked to whichever Supabase backend was configured at that moment. Rules:
- **Debug native build (dev backend):** `bun run build:dev && bunx cap sync <platform>` before the native build. `build:dev` passes `--mode development` so Vite reads `.env.development`.
- **Production native build (prod backend):** `bun run build && bunx cap sync <platform>`. `build` reads `.env`.
- `.env.development` must exist and contain the dev Supabase credentials. If the file is missing, Vite **silently falls back to `.env`** and you get a prod-pointing "debug" APK.
- **Verify before installing.** After the native build, grep inside the APK's JS bundle to confirm the expected Supabase ref is baked in:
  ```
  unzip -p android/app/build/outputs/apk/debug/app-debug.apk 'assets/public/assets/index-*.js' | grep -c '<expected_ref>'
  ```
  Should return `1` or more for the ref you expect (dev or prod).
- `.env.development` is gitignored and must never be committed.

### Dev/Prod parity — MANDATORY

We lost push notifications and realtime on prod for days because of invisible config drift. **These rules are non-negotiable.**

1. **Every migration that rewrites a function must copy the CURRENT body from the database, not from an older migration file.** Run `\df+ function_name` or read the latest migration that touches it. The `set_search_path` incident silently regressed `create_training_conversation()` because it was rewritten from a stale version.

2. **Every migration must include `GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role` if it creates tables.** Edge Functions use the `service_role` key via PostgREST. Without explicit GRANTs, the function silently gets empty results — no errors, just `null`. The default grants differ between Supabase projects. Never assume `service_role` has access.

3. **Edge Function `ALLOWED_ORIGINS` must include `get-sessio.com`.** Both `supabase/functions/send-push/index.ts` and `supabase/functions/automation/index.ts`. If you touch these files, verify the list.

4. **The `_config` table values differ between dev and prod.** Never hardcode environment-specific values in migrations. The seed migration (`20260326120000`) hardcodes dev values — any migration that touches `_config` must use `ON CONFLICT DO NOTHING` or be environment-aware.
   - **Dev:** `supabase_url` = `https://iindwpdpmtztwwsejarz.supabase.co`
   - **Prod:** `supabase_url` = `https://wavuvwrmtsrxrzuumlid.supabase.co`
   - **Prod `cron_secret`** must match the `CRON_SECRET` Supabase secret (check with `supabase secrets list`).

5. **After every PR merge to `main`: check the GitHub Actions `deploy-supabase` workflow succeeded.** If it fails, migrations did NOT reach prod — fix immediately. Don't assume "the next PR will pick it up."

6. **Vercel env vars must never contain trailing whitespace or newlines.** Use `vercel env pull` and inspect the raw file. A trailing `\n` in `VITE_SUPABASE_URL` breaks WebSocket (Realtime) while REST appears to work — an invisible failure. When adding env vars, use `printf 'value' | vercel env add NAME production` to avoid newlines.

7. **Every migration file must be committed to git before the PR is merged.** If you apply a migration manually to dev or prod with `supabase db push`, the .sql file MUST be in the repo. The CI pipeline fails if the remote migration history has versions not found locally — and that failure is silent (code deploys, DB doesn't).

8. **Native (Capacitor) builds bake env vars into the JS bundle at Vite build time.** The Android `applicationIdSuffix ".debug"` only changes the Android package name, NOT the backend the JavaScript talks to. **Building a "debug" APK with `bun run build` produces a debug-packaged Android app that hits PROD Supabase.** Always pair `bun run build:dev` with debug variants and `bun run build` with release variants, or use the `android:dev` / `android:prod` npm scripts which do the right thing. Full rules + verification commands in "Android Capacitor build" above.

### Verify before pushing — MANDATORY

Every change must be verified before `git push`. We've broken production multiple times by pushing "should work" code. **Never skip these:**

1. **`bun run build`** — catch compile errors, missing imports, type issues.
2. **Trace the full flow** — what calls what, what data flows where, what happens on mount/unmount/navigate-away-and-back.
3. **Grep for removed/renamed exports** — if you removed or renamed a function, grep `src/` for all usages. Files you didn't edit may still import the old name.
4. **For DB migrations** — verify the SQL is correct, check that triggers/backfills will actually work with existing data.
5. **Don't push and hope** — if you're not confident it works, say so and ask to test first.

### Performance — MANDATORY

These rules exist because we've been burned by auth state changes tearing down the entire component tree and killing realtime subscriptions. **Never skip these.**

1. **Never set auth `loading = true` for background operations.** Only for initial load and `SIGNED_IN`. Token refresh, profile updates, user updates → silent background fetch. Setting `loading = true` unmounts the entire page tree via `ProtectedRoute`, destroying all realtime subscriptions and component state.

2. **Realtime subscriptions must stay alive.** Never write code that unmounts components with active subscriptions as a side effect. If a parent re-renders or a context value changes, subscriptions in child hooks get destroyed and take seconds to reconnect — missed events during that window.

3. **Keep debounce/throttle under 500ms for user-facing updates.** Message delivery, unread counts, conversation list updates — these must feel instant. Use 300ms max for debouncing realtime event handlers.

4. **Prefer background refetches over loading states.** When data is already cached, never replace it with a spinner during refetch. Use `placeholderData`, `keepPreviousData`, or check `isFetching` instead of `isPending` when showing loading UI. Content should stay visible while refreshing.

5. **Don't invalidate all queries blindly.** `queryClient.invalidateQueries()` with no filter fires every query. Use targeted invalidation with specific query keys. The global invalidation in `RefreshOnResume` is the ONE exception (for app resume after long background).

### Push notifications — MANDATORY

Message push notifications are handled by the **DB trigger `on_new_message`** (migration `20260325210000`). The trigger calls the `send-push` Edge Function via `pg_net` on every INSERT into `messages`. This is the single source of truth.

1. **NEVER add client-side `notifyMessage()` or `notifyUsers()` calls for chat messages.** The trigger handles ALL message inserts regardless of source (chat, cancel, reschedule, system messages).
2. **Client-side `notifyUsers()`** is ONLY for non-message events: join requests, training confirmations, session cancellations, etc. These are called from `JoinTraining.tsx`, `useTrainings.ts`, `TrainingDetail.tsx`.
3. **If you touch `send-push` Edge Function or `_shared/push.ts`:** test by calling the function directly and checking the `errors` array in the response. `sent: 0` with no `errors` means 0 subscriptions found; `sent: 0` with `errors` means delivery failed.
4. **If you touch `messages` table RLS policies:** verify the `on_new_message` trigger still fires (send a message, check Edge Function logs).

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

7. **Any table or column that touches a user → update `delete_my_account()` in the same migration.** New table with a user FK (`user_id`, `player_id`, `coach_id`, `owner_id`, etc.)? New column on `profiles`? Making a column generated? Add the corresponding DELETE/cleanup to `delete_my_account` immediately. This function must wipe **all** user data — if it misses a table, account deletion leaks data. No exceptions, no "we'll do it later."
