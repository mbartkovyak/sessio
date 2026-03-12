
## Diagnosis

### Messages not saving
The `useGroupMessages` hook queries `group_messages` but uses `.from('group_messages' as any)` — this is fine TypeScript but the real issue is that after `send.mutate()`, the UI clears optimistically but the query invalidation triggers a refetch that replaces the displayed list with a fresh fetch. Since `placeholderData: (prev) => prev` was added, this *should* work... but the `useSendGroupMessage` mutation only invalidates the query on `onSuccess`. If the INSERT fails silently (RLS), messages won't appear.

The deeper problem: the `GroupChat.tsx` page uses `useSendGroupMessage` which calls `.from('group_messages' as any)` with no error surfacing — errors are swallowed silently. We need to surface errors and also add **optimistic updates** so sent messages appear immediately regardless.

### UX Issues (from screenshot + code review)
1. **Messages list takes full page width** — no `max-w` container, looks stretched on tablets/desktop
2. **GroupChat fills entire screen** but message area doesn't properly calculate height with sticky header/footer — on mobile browsers the address bar causes overflow
3. **CoachMessages / PlayerMessages** shows no unread indicators per group thread
4. **Thread list avatar** uses a basic emoji circle — fine, but no unread dot
5. **All pages** use `min-h-screen` with `pb-24` — needs proper `max-w` centering for non-mobile views
6. **PlayerSpots** header looks plain; empty state icon oversized
7. **CoachProfile / PlayerProfile** centered content but no visual hierarchy on tablet
8. **GroupChat input area** — textarea doesn't auto-grow; send button needs better visual weight
9. **Messages page** — "No messages yet" text too sparse, should show a nicer empty state with group icon
10. **Bottom nav** — 56px height fine on mobile but needs `safe-area-inset-bottom` padding for iOS

## Plan

### Fix 1: Messages not saving (root cause fix)
- Add **optimistic update** in `useSendGroupMessage`: immediately append the message to the cache before the server responds
- Add proper **error handling** with toast on failure
- Remove `as any` cast — `group_messages` IS in `types.ts` so cast it properly

### Fix 2: App-wide max width container
- Wrap all pages in a `max-w-md mx-auto` container so they look good on tablet/desktop too
- The bottom nav and header should stay full-width on mobile but content max-width on larger screens

### Fix 3: GroupChat layout
- Fix `h-screen` to use `dvh` (dynamic viewport height) for mobile browser compatibility: `h-[100dvh]`
- Auto-grow textarea based on content

### Fix 4: Thread list UX
- Add unread dot indicator per group thread in Messages list
- Show "today" vs date for last message timestamp
- Truncate last message preview properly

### Fix 5: iOS safe area
- Add `pb-safe` / `padding-bottom: env(safe-area-inset-bottom)` to bottom nav

### Files to change
1. **`src/hooks/useGroupMessages.ts`** — optimistic updates, proper error handling, remove `as any`
2. **`src/pages/GroupChat.tsx`** — fix `h-[100dvh]`, auto-grow textarea, better empty state
3. **`src/pages/CoachMessages.tsx`** — add unread dot per thread, improve thread item layout
4. **`src/pages/PlayerMessages.tsx`** — same improvements
5. **`src/index.css`** — add `safe-area` utility for bottom nav
6. **`src/components/CoachBottomNav.tsx`** — add safe-area padding
7. **`src/components/PlayerBottomNav.tsx`** — add safe-area padding
8. **All page layouts** — add `max-w-md mx-auto` wrapper inside main content areas (CoachDashboard, PlayerDashboard, CoachMessages, PlayerMessages, GroupChat, PlayerSpots, CoachProfile, PlayerProfile)

The most impactful fix is the optimistic update for messages + `h-[100dvh]` for the chat layout.
