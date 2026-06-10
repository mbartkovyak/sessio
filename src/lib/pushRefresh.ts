import type { QueryClient } from '@tanstack/react-query';

// Query keys a push notification can make stale. A push is our signal that
// the DB changed while realtime wasn't watching (app suspended, foreground
// FCM, other device) — invalidating these keeps lists fresh without any
// standing subscriptions. Targeted on purpose (CLAUDE.md perf rule 5): only
// queries that are currently mounted actually refetch; the rest are just
// marked stale and refetch on next mount.
//
// 'trainings' is deliberately absent — it's realtime-maintained by the
// trainings:coach:{id} channel (see REALTIME_MAINTAINED_KEYS in App.tsx).
const PUSH_REFRESH_KEYS = [
  // messaging
  'messages',
  'my-conversations',
  // coach side: dashboard + training/session detail
  'upcoming-sessions',
  'attendance-summary',
  'session-attendance',
  'training-members',
  'past-unmarked-sessions',
  'join-requests',
  'all-join-requests',
  // player side: home strip, calendar, waitlist claims
  'my-upcoming-sessions',
  'my-attendance',
  'my-trainings',
  'my-join-requests',
] as const;

export function invalidatePushTargets(queryClient: QueryClient) {
  for (const key of PUSH_REFRESH_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}
