import webPush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

webPush.setVapidDetails('mailto:hello@sessio.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export { webPush };

export type Sub = { endpoint: string; keys: any; user_id?: string };

/** Send push to a list of raw subscriptions. Cleans up stale endpoints (410/404). */
export async function sendPushToSubs(
  subs: Sub[],
  payload: string,
  supabaseAdmin: any,
): Promise<number> {
  let sent = 0;
  for (const sub of subs) {
    try {
      await webPush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
      sent++;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  }
  return sent;
}

/** Look up push subscriptions for user IDs and send push. Optionally exclude a user (the sender). */
export async function sendPushToUsers(
  supabaseAdmin: any,
  userIds: string[],
  payload: string,
  excludeUserId?: string,
): Promise<number> {
  const targets = excludeUserId ? userIds.filter(id => id !== excludeUserId) : userIds;
  if (!targets.length) return 0;

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, keys, user_id')
    .in('user_id', targets);

  return sendPushToSubs(subs ?? [], payload, supabaseAdmin);
}
