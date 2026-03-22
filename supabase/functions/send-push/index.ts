import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webPush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

webPush.setVapidDetails('mailto:hello@sessio.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'send_confirmations';
    const results: any = {};

    // ── Send confirmation reminders for upcoming sessions ──
    if (action === 'send_confirmations') {
      // Find pending attendance records where the session is within the confirmation window
      const { data: pending, error } = await supabase
        .from('session_attendance')
        .select(`
          id, user_id, session_id, status,
          training_sessions(id, session_date, start_time, end_time,
            trainings(id, name, confirmation_window_hours)
          )
        `)
        .eq('status', 'pending')
        .limit(100);

      if (error) throw error;

      const now = Date.now();
      let sent = 0;

      for (const att of pending ?? []) {
        const session = att.training_sessions as any;
        const training = session?.trainings;
        if (!session || !training) continue;

        // Check if within confirmation window
        const sessionStart = new Date(`${session.session_date}T${session.start_time}`).getTime();
        const windowMs = (training.confirmation_window_hours ?? 48) * 60 * 60 * 1000;
        if (sessionStart - now > windowMs || sessionStart < now) continue;

        // Get push subscriptions for this user
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('endpoint, keys')
          .eq('user_id', att.user_id);

        if (!subs?.length) continue;

        const payload = JSON.stringify({
          title: training.name,
          body: `${session.session_date} at ${session.start_time?.slice(0, 5)} — are you coming?`,
          tag: `confirm-${att.session_id}`,
          url: '/player',
        });

        for (const sub of subs) {
          try {
            await webPush.sendNotification(
              { endpoint: sub.endpoint, keys: sub.keys },
              payload
            );
            sent++;
          } catch (err: any) {
            // Remove invalid subscriptions
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            }
          }
        }
      }

      results.sent = sent;
    }

    // ── Test: send a push to a specific user ──
    if (action === 'test' && body.user_id) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, keys')
        .eq('user_id', body.user_id);

      let sent = 0;
      for (const sub of subs ?? []) {
        try {
          await webPush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            JSON.stringify({
              title: body.title ?? 'Sessio',
              body: body.body ?? 'Test notification',
              tag: 'test',
              url: '/player',
            })
          );
          sent++;
        } catch (err: any) {
          console.error('Push failed:', err.statusCode, err.body);
        }
      }
      results.sent = sent;
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
