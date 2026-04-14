import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  sendPushToSubs,
  sendPushToUsers,
  sendPushWithCleanup,
  type Sub,
} from '../_shared/push.ts';

const ALLOWED_ORIGINS = [
  'https://get-sessio.com',
  'https://sessio-topaz.vercel.app',
  'https://sessio-dev.vercel.app',
  'https://sessio-git-dev-mbartkovyak-6875s-projects.vercel.app',
  'capacitor://localhost',
  'https://localhost',
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

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'notify';
    const results: any = {};

    // ── Determine sender: from JWT (client calls) or from body (server/trigger calls) ──
    let senderId: string | null = null;

    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const supabaseAuth = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY') ?? authHeader.replace('Bearer ', '')
      );
      const { data: { user } } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''));
      senderId = user?.id ?? null;
    }

    // For server-side calls (DB trigger), sender_id comes in the body
    if (!senderId && body.sender_id) {
      senderId = body.sender_id;
    }

    if (!senderId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Generic: send push to specific users ──
    if (action === 'notify') {
      const { user_ids, title, body: pushBody, tag, url } = body;
      if (!Array.isArray(user_ids) || !title) throw new Error('user_ids[] and title required');

      const batch = await sendPushToUsers(
        supabaseAdmin,
        user_ids,
        { title, body: pushBody ?? '', tag: tag ?? 'sessio', url: url ?? '/', sender_id: senderId },
        senderId,
      );
      results.sent = batch.sent;
      if (batch.errors.length) results.errors = batch.errors;
    }

    // ── Message: notify conversation participants ──
    if (action === 'notify_message') {
      const { conversation_id, message_preview } = body;
      if (!conversation_id) throw new Error('conversation_id required');

      // Get sender name
      const { data: senderProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', senderId)
        .single();

      // Get conversation details
      const { data: conv } = await supabaseAdmin
        .from('conversations')
        .select('id, training_id')
        .eq('id', conversation_id)
        .single();

      // Get all participants except sender
      const { data: participants } = await supabaseAdmin
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversation_id)
        .neq('user_id', senderId);

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

        // Get all subscriptions in one query — transport-agnostic shape.
        const { data: subs } = await supabaseAdmin
          .from('push_subscriptions')
          .select('user_id, device_id, platform, transport, target, web_keys')
          .in('user_id', participantIds);

        const senderName = senderProfile?.full_name ?? 'Someone';
        const preview = (message_preview ?? '').slice(0, 100);
        let sent = 0;
        const errors: string[] = [];

        // Per-sub payload customization: each recipient gets a URL based
        // on their role (player vs coach). sendPushWithCleanup handles
        // transport branching and stale-token cleanup.
        for (const sub of (subs ?? []) as Sub[]) {
          const role = roleMap[sub.user_id] ?? 'player';
          const url = conv?.training_id
            ? (role === 'player'
                ? `/player/messages/${conv.training_id}`
                : `/coach/trainings/${conv.training_id}`)
            : (role === 'player'
                ? `/player/dm/${senderId}`
                : `/coach/dm/${senderId}`);

          const r = await sendPushWithCleanup(
            sub,
            {
              title: senderName,
              body: preview,
              tag: `msg-${conversation_id}`,
              url,
              sender_id: senderId,
            },
            supabaseAdmin,
          );
          if (r.ok) sent++;
          else errors.push(`${sub.transport}/${sub.platform}: ${r.error}`);
        }
        results.sent = sent;
        if (errors.length) results.errors = errors;
      }
    }

    // ── Test: send a push to yourself only ──
    if (action === 'test') {
      const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('user_id, device_id, platform, transport, target, web_keys')
        .eq('user_id', senderId);

      results.subs_found = (subs ?? []).length;
      const batch = await sendPushToSubs(
        (subs ?? []) as Sub[],
        {
          title: body.title ?? 'Sessio',
          body: body.body ?? 'Test notification',
          tag: 'test',
          url: body.url ?? '/',
        },
        supabaseAdmin,
      );
      results.sent = batch.sent;
      if (batch.errors.length) results.errors = batch.errors;
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
