import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { webPush, sendPushToSubs, sendPushToUsers } from '../_shared/push.ts';

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
    const action = body.action ?? 'notify';
    const results: any = {};

    // ── Generic: send push to specific users ──
    if (action === 'notify') {
      const { user_ids, title, body: pushBody, tag, url } = body;
      if (!Array.isArray(user_ids) || !title) throw new Error('user_ids[] and title required');

      results.sent = await sendPushToUsers(
        supabaseAdmin,
        user_ids,
        JSON.stringify({ title, body: pushBody ?? '', tag: tag ?? 'sessio', url: url ?? '/' }),
        user.id,
      );
    }

    // ── Message: notify conversation participants ──
    if (action === 'notify_message') {
      const { conversation_id, message_preview } = body;
      if (!conversation_id) throw new Error('conversation_id required');

      // Get sender name
      const { data: senderProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Get conversation details
      const { data: conv } = await supabaseAdmin
        .from('conversations')
        .select('id, training_id')
        .eq('id', conversation_id)
        .single();

      // Get all participants except sender, with their roles
      const { data: participants } = await supabaseAdmin
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversation_id)
        .neq('user_id', user.id);

      if (!participants?.length) {
        results.sent = 0;
      } else {
        const participantIds = participants.map((p: any) => p.user_id);

        // Get roles for all participants
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, role')
          .in('id', participantIds);

        const roleMap: Record<string, string> = {};
        for (const p of profiles ?? []) roleMap[p.id] = p.role;

        // Get all subscriptions in one query
        const { data: subs } = await supabaseAdmin
          .from('push_subscriptions')
          .select('endpoint, keys, user_id')
          .in('user_id', participantIds);

        const senderName = senderProfile?.full_name ?? 'Someone';
        const preview = (message_preview ?? '').slice(0, 100);
        let sent = 0;

        for (const sub of subs ?? []) {
          const role = roleMap[sub.user_id] ?? 'player';
          let url: string;

          if (conv?.training_id) {
            url = role === 'player'
              ? `/player/messages/${conversation_id}`
              : `/coach/trainings/${conv.training_id}`;
          } else {
            url = role === 'player'
              ? `/player/dm/${user.id}`
              : `/coach/dm/${user.id}`;
          }

          try {
            await webPush.sendNotification(
              { endpoint: sub.endpoint, keys: sub.keys },
              JSON.stringify({
                title: senderName,
                body: preview,
                tag: `msg-${conversation_id}`,
                url,
              }),
            );
            sent++;
          } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            }
          }
        }
        results.sent = sent;
      }
    }

    // ── Test: send a push to yourself only ──
    if (action === 'test') {
      const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('endpoint, keys')
        .eq('user_id', user.id);

      results.sent = await sendPushToSubs(
        subs ?? [],
        JSON.stringify({
          title: body.title ?? 'Sessio',
          body: body.body ?? 'Test notification',
          tag: 'test',
          url: body.url ?? '/',
        }),
        supabaseAdmin,
      );
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
