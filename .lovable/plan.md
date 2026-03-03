
## Summary of user feedback

1. **Sessions auto-generate** — the ↺ button on the dashboard is confusing. Sessions should auto-generate silently on login/app load.
2. **Session management** — from the group's Sessions tab, coach should be able to: cancel a session, reschedule (edit date/time), and add one-off sessions for a group.
3. **Group chat** — a chat tab should exist in the group detail page for group communication. Chat should also work for individual planning (future).
4. **Landing always shows login** — fix: redirect logged-in users with a session immediately, not just when `onboarding_complete`.

---

## Plan

### 1. Fix: Auto-generate sessions silently

- Remove the ↺ "Generate sessions" button from the coach dashboard header.
- On `CoachDashboard` mount, silently call `generate` automation if the coach has groups (fire-and-forget, no toast on success unless new sessions were actually created).
- Remove the "Generate Next Sessions" button from the `GroupDetail` Sessions tab too — replace with a "Add One-Off Session" button instead.

### 2. Session management in GroupDetail — Sessions tab

Make `SessionRow` tappable, linking to `SessionDetail` (already exists for upcoming ones). Add two actions to the Sessions tab:

- **"+ Add session"** button → opens a bottom sheet / modal with date picker + time range → inserts into `sessions` table directly (no automation needed for one-off manual sessions), sends `confirmations` for all active members.
- Each upcoming `SessionRow` gets a tap → navigates to `SessionDetail` where coach can already cancel. We also add **"Reschedule"** in `SessionDetail` — a small edit form to change `session_date`, `start_time`, `end_time`.

### 3. Group chat

**Database migration:**
```sql
CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Group members and coach can read
CREATE POLICY "Group members read messages"
ON public.group_messages FOR SELECT
USING (
  public.is_group_member(group_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND coach_id = auth.uid())
);

-- Group members and coach can insert
CREATE POLICY "Group members send messages"
ON public.group_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND (
    public.is_group_member(group_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND coach_id = auth.uid())
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
```

**UI changes:**
- Add a **"Chat"** tab to `GroupDetail` (alongside Invite / Members / Sessions).
- Chat tab shows a message thread with sender avatar/initials + timestamp.
- Input box at the bottom to send messages.
- Real-time updates via Supabase channel subscription on `group_messages`.
- Coach name shown (profiles need a policy to allow group members to read coach profile + fellow members' profiles in the same group — add `SELECT` policy on `profiles` for group members).

### 4. Fix: Landing always asks for login

Change `Landing.tsx`:
```tsx
useEffect(() => {
  if (!loading && profile) {
    if (profile.onboarding_complete) {
      navigate(profile.role === 'coach' ? '/coach/dashboard' : '/player/dashboard');
    } else {
      navigate('/onboarding');
    }
  }
}, [loading, profile, navigate]);
```
This redirects any logged-in user (with a profile) away from the landing page immediately.

Also add a `session`-based early redirect using `useAuth`'s `session` before the profile loads:
```tsx
const { profile, loading, session } = useAuth();
useEffect(() => {
  if (!loading && session && !profile) {
    // profile still loading — do nothing yet
  }
  if (!loading && profile) { ... }
}, ...);
```

### 5. Additional: profiles visibility for chat

Add RLS policy on `profiles` so group members can see other members in the same group (needed to show names in chat):
```sql
CREATE POLICY "Group members view each other's profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.player_id = auth.uid()
      AND gm2.player_id = profiles.id
  )
  OR EXISTS (
    SELECT 1 FROM public.groups WHERE coach_id = profiles.id
    AND public.is_group_member(id, auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.groups WHERE coach_id = auth.uid()
    AND public.is_group_member(id, profiles.id)
  )
);
```

---

## Files to change

- `src/pages/Landing.tsx` — fix redirect logic
- `src/pages/CoachDashboard.tsx` — remove ↺ button, auto-generate on mount
- `src/pages/GroupDetail.tsx` — remove generate button, add Chat tab, make session rows tappable, add "Add session" button
- `src/pages/SessionDetail.tsx` — add Reschedule form
- New migration: `group_messages` table + RLS + profiles policy
- New hook: `useGroupMessages` (send/subscribe)
