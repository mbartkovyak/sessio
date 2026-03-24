import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webPush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

webPush.setVapidDetails('mailto:hello@sessio.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const ALLOWED_ORIGINS = [
  'https://sessio-topaz.vercel.app',
  'https://sessio-dev.vercel.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Authenticate the caller
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Verify the JWT to get the caller's user ID
  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY') ?? authHeader.replace('Bearer ', '')
  );
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'send_confirmations';
    const results: any = {};

    // ── Send confirmation reminders for upcoming sessions ──
    if (action === 'send_confirmations') {
      const { data: pending, error } = await supabaseAdmin
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

        const sessionStart = new Date(`${session.session_date}T${session.start_time}`).getTime();
        const windowMs = (training.confirmation_window_hours ?? 48) * 60 * 60 * 1000;
        if (sessionStart - now > windowMs || sessionStart < now) continue;

        const { data: subs } = await supabaseAdmin
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
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            }
          }
        }
      }

      results.sent = sent;
    }

    // ── Test: send a push to yourself only ──
    if (action === 'test') {
      // Can only send test push to yourself
      const targetUserId = user.id;

      const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('endpoint, keys')
        .eq('user_id', targetUserId);

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
