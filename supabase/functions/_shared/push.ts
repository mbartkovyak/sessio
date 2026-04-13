// Shared push-sending helpers. Transport-agnostic — web push (VAPID) and
// FCM (Android + iOS via Firebase) live behind a single sendPush() entry
// point so callers never branch on transport themselves.
//
// Schema: one row per device in push_subscriptions, keyed on (user_id,
// device_id). Stale-token cleanup happens in this file; callers just pass
// the sub list and a structured payload.

import webPush from 'npm:web-push@3.6.7';
import { sendFcmV1, FcmUnregisteredError, type FcmPayload } from './fcm.ts';

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

webPush.setVapidDetails('mailto:hello@sessio.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

/** Structured push payload — same shape across all transports. */
export type PushPayload = FcmPayload;

export type Sub = {
  user_id: string;
  device_id: string;
  platform: 'web' | 'ios' | 'android';
  transport: 'webpush' | 'fcm' | 'apns';
  target: string;
  web_keys: { p256dh: string; auth: string } | null;
};

/**
 * Send a push to a single subscription. Throws on failure so the caller
 * (sendPushToSubs) can decide whether the row is stale.
 */
export async function sendPush(sub: Sub, payload: PushPayload): Promise<void> {
  if (sub.transport === 'webpush') {
    if (!sub.web_keys) throw new Error('webpush sub is missing web_keys');
    await webPush.sendNotification(
      { endpoint: sub.target, keys: sub.web_keys },
      JSON.stringify(payload),
    );
    return;
  }

  if (sub.transport === 'fcm') {
    await sendFcmV1(sub.target, payload);
    return;
  }

  // Schema reserves 'apns' but we don't ship a direct APNs transport today
  // (iOS goes through FCM via Firebase iOS SDK).
  throw new Error(`unsupported transport: ${sub.transport}`);
}

/** True if the error means the token is permanently dead and the row should be deleted. */
function isStaleTokenError(err: any): boolean {
  // web-push surfaces HTTP status on the error object
  if (err?.statusCode === 410 || err?.statusCode === 404) return true;
  // FCM v1 helper throws this exact type
  if (err instanceof FcmUnregisteredError) return true;
  return false;
}

/** Result from a single push attempt — includes error detail for diagnostics. */
export type PushResult = { ok: true } | { ok: false; error: string; stale: boolean };

/**
 * Send to a single sub with stale-token cleanup. Returns a result object
 * with error details so callers can surface diagnostics.
 */
export async function sendPushWithCleanup(
  sub: Sub,
  payload: PushPayload,
  supabaseAdmin: any,
): Promise<PushResult> {
  try {
    await sendPush(sub, payload);
    return { ok: true };
  } catch (err: any) {
    const errStr = String(err);
    if (isStaleTokenError(err)) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', sub.user_id)
        .eq('device_id', sub.device_id);
      console.error('sendPush stale token — deleted', { user_id: sub.user_id, device_id: sub.device_id, transport: sub.transport, err: errStr });
      return { ok: false, error: errStr, stale: true };
    }
    // Transient error (quota, network, transport misconfig). Log but
    // don't delete — we'll retry on the next invocation.
    console.error('sendPush failed', { user_id: sub.user_id, device_id: sub.device_id, transport: sub.transport, err: errStr });
    return { ok: false, error: errStr, stale: false };
  }
}

/** Aggregated result from sending to multiple subs. */
export type PushBatchResult = { sent: number; errors: string[] };

/**
 * Send the same payload to every sub in the list. Cleans up stale rows by
 * (user_id, device_id) — never by endpoint, since tokens rotate.
 */
export async function sendPushToSubs(
  subs: Sub[],
  payload: PushPayload,
  supabaseAdmin: any,
): Promise<PushBatchResult> {
  let sent = 0;
  const errors: string[] = [];
  for (const sub of subs) {
    const r = await sendPushWithCleanup(sub, payload, supabaseAdmin);
    if (r.ok) sent++;
    else errors.push(`${sub.transport}/${sub.platform}: ${r.error}`);
  }
  return { sent, errors };
}

/**
 * Look up subscriptions for a list of user IDs and send the same payload to
 * every device. Optionally exclude one user (the sender) to avoid
 * self-notifications.
 */
export async function sendPushToUsers(
  supabaseAdmin: any,
  userIds: string[],
  payload: PushPayload,
  excludeUserId?: string,
): Promise<PushBatchResult> {
  const targets = excludeUserId ? userIds.filter((id) => id !== excludeUserId) : userIds;
  if (!targets.length) return { sent: 0, errors: [] };

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('user_id, device_id, platform, transport, target, web_keys')
    .in('user_id', targets);

  return sendPushToSubs((subs ?? []) as Sub[], payload, supabaseAdmin);
}
