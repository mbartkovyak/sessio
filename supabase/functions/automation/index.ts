import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'full';

    const results: Record<string, any> = {};

    // ── 1. Generate sessions for all active groups ──
    if (action === 'full' || action === 'generate') {
      const { data: groups } = await supabase
        .from('groups')
        .select('id')
        .eq('is_active', true);

      let totalCreated = 0;
      for (const g of groups ?? []) {
        const { data } = await supabase.rpc('generate_sessions_for_group', { p_group_id: g.id });
        totalCreated += (data as any)?.created ?? 0;
      }
      results.sessions_created = totalCreated;
    }

    // ── 2. Send confirmation-window notifications ──
    if (action === 'full' || action === 'notifications') {
      const { data } = await supabase.rpc('process_confirmation_window');
      results.notifications_sent = (data as any)?.notifications_sent ?? 0;
    }

    // ── 3. Handle no-response deadline ──
    if (action === 'full' || action === 'deadline') {
      const { data } = await supabase.rpc('handle_no_response_deadline');
      results.no_response_handled = (data as any)?.spots_created ?? 0;
      results.waitlist_notified = (data as any)?.notified ?? 0;
    }

    // ── 4. Generate sessions for a single group (manual trigger) ──
    if (action === 'generate_group' && body.group_id) {
      const { data } = await supabase.rpc('generate_sessions_for_group', { p_group_id: body.group_id });
      results.sessions_created = (data as any)?.created ?? 0;
    }

    // ── 5. Cancel session + notify players ──
    if (action === 'cancel_session' && body.session_id) {
      const { data: session } = await supabase
        .from('sessions')
        .select('*, groups(name)')
        .eq('id', body.session_id)
        .single();

      if (session) {
        await supabase
          .from('sessions')
          .update({ status: 'cancelled' })
          .eq('id', body.session_id);

        // Notify confirmed + pending players
        const { data: confs } = await supabase
          .from('confirmations')
          .select('player_id')
          .eq('session_id', body.session_id)
          .in('status', ['confirmed', 'pending']);

        const group = session.groups as any;
        const notifications = (confs ?? []).map((c: any) => ({
          user_id: c.player_id,
          type: 'session_cancelled',
          title: 'Session cancelled',
          message: `${group?.name ?? 'Your session'} has been cancelled.`,
          related_session_id: body.session_id,
          related_group_id: session.group_id,
        }));

        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }

        // Remove open spots
        await supabase.from('open_spots').delete().eq('session_id', body.session_id);

        results.cancelled = true;
        results.notified = notifications.length;
      }
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
