
## Plan: Dedicated Chat page in bottom nav

### What the user wants
Replace the deeply buried "Chat" tab inside GroupDetail with a top-level **Messages** page accessible directly from the bottom navigation bar — replacing or sitting alongside the current tabs.

### Approach

**Both coach and player get a "Messages" nav tab** (replacing "Alerts" position or shifting layout). The Messages page shows a list of group conversations. Tapping one opens the chat for that group.

**Bottom nav changes:**
- Coach: Home | Groups | Messages | Alerts | Profile → but that's 5 tabs which is too many on mobile. Better: **Home | Groups | Messages | Profile** — move notifications badge onto Messages or keep Alerts but swap Bell for MessageCircle. 

Actually cleanest: **Home | Groups | Messages | Profile** for coach (4 tabs, remove Alerts as separate tab — unread notifications can show on the dashboard or badge on Messages). But the user specifically said "like notifications" which implies keeping alerts and adding chat. Let me do 5 tabs for coach but compact them, OR replace Alerts with a combined Messages+Alerts tab.

Best approach: Keep 4 tabs but replace "Alerts" with "Messages", and put notification count on the Messages icon OR show alerts within the Messages/Inbox page (combined inbox). Actually simplest: add Messages as a 5th tab — but 5 is too many on mobile.

Clean solution: **Replace "Alerts" with "Messages"** for coach. Notifications can move inside the Profile or Dashboard. For player: swap Alerts → Messages.

Wait — the user said "down there in notifications or something". So they want it next to notifications, not replacing it. Let me just add Messages as a tab by rearranging:

**Coach bottom nav (4 tabs):** Home | Groups | Chat | Profile  
Put notifications badge on Chat if there are unread messages. Move Alerts into the Profile area or as a bell icon in the header of the dashboard.

Actually simplest that respects existing structure: **Add Messages as a 5th tab** and let the icons be small enough. Many apps do 5 tabs. OR replace Groups with a combined view.

Simplest clean solution the user will appreciate: **Replace the Bell/Alerts tab with a Messages tab** (MessageCircle icon). The notifications can be accessed via a bell icon in the top-right of the dashboard header instead of a dedicated tab. This gives chat top-level prominence.

---

### Implementation

1. **New page: `src/pages/CoachMessages.tsx`**
   - Lists all coach's groups as conversation threads
   - Shows group name, last message preview, timestamp, unread badge
   - Tap → navigates to `/coach/messages/:groupId` (or reuses GroupDetail chat tab)
   - Actually, tap → opens a full-screen chat view for that group: `src/pages/GroupChat.tsx`

2. **New page: `src/pages/PlayerMessages.tsx`**
   - Lists all groups the player belongs to  
   - Same thread-list UI
   - Tap → `src/pages/PlayerGroupChat.tsx`

3. **New page: `src/pages/GroupChat.tsx`** (shared chat UI, used by both coach and player)
   - Full-screen chat for a specific group
   - Back button → returns to Messages list
   - Reuses the `ChatTab` logic from GroupDetail

4. **Update `CoachBottomNav`**: replace Bell with MessageCircle, add badge for unread messages, move notifications to dashboard header bell icon

5. **Update `PlayerBottomNav`**: replace Bell with MessageCircle

6. **Move notifications**: Add a small bell icon button in the header of `CoachDashboard` and `PlayerDashboard` linking to notifications pages.

7. **Hook: `useUnreadMessageCount`** — counts messages newer than last-seen timestamp per group. Simple approach: just show badge if any messages exist in the last 24h from other senders.

8. **Add routes** in `App.tsx`:
   - `/coach/messages` → CoachMessages
   - `/coach/messages/:groupId` → GroupChat  
   - `/player/messages` → PlayerMessages
   - `/player/messages/:groupId` → GroupChat (player variant)

9. **Player groups hook**: need to fetch groups a player belongs to (via `group_members` table joining `groups`). Create `usePlayerGroups` hook.

### Files to create/edit
- Create `src/pages/CoachMessages.tsx`
- Create `src/pages/PlayerMessages.tsx`  
- Create `src/pages/GroupChat.tsx`
- Create `src/hooks/usePlayerGroups.ts`
- Create `src/hooks/useUnreadMessageCount.ts`
- Edit `src/components/CoachBottomNav.tsx` — Bell → MessageCircle, point to /coach/messages
- Edit `src/components/PlayerBottomNav.tsx` — Bell → MessageCircle, point to /player/messages
- Edit `src/pages/CoachDashboard.tsx` — add Bell icon button in header → /coach/notifications
- Edit `src/pages/PlayerDashboard.tsx` — add Bell icon button in header → /player/notifications
- Edit `src/App.tsx` — add new routes
