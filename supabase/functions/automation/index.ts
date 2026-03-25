import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendPushToUsers } from '../_shared/push.ts';

const ALLOWED_ORIGINS = [
  'https://sessio-topaz.vercel.app',
  'https://sessio-dev.vercel.app',
  'https://sessio-git-dev-mbartkovyak-6875s-projects.vercel.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

const CRON_ACTIONS = ['full', 'generate', 'notifications', 'deadline'];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth: support JWT (user) or cron secret (scheduled) ──
  const cronSecret = req.headers.get('x-cron-secret');
  const cronSecretEnv = Deno.env.get('CRON_SECRET');
  const isCron = !!cronSecret && !!cronSecretEnv && cronSecret === cronSecretEnv;

  let userId: string | null = null;

  if (!isCron) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    userId = user.id;
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'full';

    // Cron can only run safe actions
    if (isCron && !CRON_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ error: 'Forbidden action for cron' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Coach-only actions require role check
    if (!isCron && ['generate', 'generate_training'].includes(action)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId!)
        .single();
      if (profile?.role !== 'coach') {
        return new Response(JSON.stringify({ error: 'Forbidden - coach access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const results: Record<string, any> = {};

    // ── 1. Generate sessions for all active trainings ──
    if (action === 'full' || action === 'generate') {
      const { data: trainings } = await supabase
        .from('trainings')
        .select('id')
        .eq('is_active', true);

      let totalCreated = 0;
      for (const t of trainings ?? []) {
        const { data } = await supabase.rpc('generate_sessions_for_training', { p_training_id: t.id });
        totalCreated += (data as any)?.created ?? 0;
      }
      results.sessions_created = totalCreated;
    }

    // ── 2. Generate sessions for a single training (manual trigger) ──
    if (action === 'generate_training' && body.training_id) {
      const { data } = await supabase.rpc('generate_sessions_for_training', { p_training_id: body.training_id });
      results.sessions_created = (data as any)?.created ?? 0;
    }

    // ── 3. Send confirmation reminders ──
    if (action === 'full' || action === 'notifications') {
      const { data: pending, error } = await supabase
        .from('session_attendance')
        .select(`
          id, user_id, session_id, status, reminder_sent_at,
          training_sessions(id, session_date, start_time, end_time,
            trainings(id, name, confirmation_window_hours)
          )
        `)
        .eq('status', 'pending')
        .is('reminder_sent_at', null)
        .limit(200);

      if (error) throw error;

      const now = Date.now();
      let sent = 0;
      const sentIds: string[] = [];

      for (const att of pending ?? []) {
        const session = att.training_sessions as any;
        const training = session?.trainings;
        if (!session || !training) continue;

        const sessionStart = new Date(`${session.session_date}T${session.start_time}`).getTime();
        const windowMs = (training.confirmation_window_hours ?? 48) * 60 * 60 * 1000;

        // Only send if within confirmation window and session hasn't passed
        if (sessionStart - now > windowMs || sessionStart < now) continue;

        const payload = JSON.stringify({
          title: training.name,
          body: `${session.session_date} at ${session.start_time?.slice(0, 5)} — are you coming?`,
          tag: `confirm-${att.session_id}`,
          url: '/player',
        });

        const count = await sendPushToUsers(supabase, [att.user_id], payload);
        sent += count;
        sentIds.push(att.id);
      }

      // Mark reminders as sent (dedup)
      if (sentIds.length) {
        await supabase
          .from('session_attendance')
          .update({ reminder_sent_at: new Date().toISOString() })
          .in('id', sentIds);
      }

      results.reminders_sent = sent;
    }

    // ── 4. Handle no-response deadline ──
    if (action === 'full' || action === 'deadline') {
      // Find pending attendances past their deadline
      const { data: pending } = await supabase
        .from('session_attendance')
        .select(`
          id, user_id, session_id, status,
          training_sessions(id, session_date, start_time, training_id,
            trainings(id, name, no_response_behavior, cancel_deadline_hours)
          )
        `)
        .eq('status', 'pending');

      const now = Date.now();
      let handled = 0;

      for (const att of pending ?? []) {
        const session = att.training_sessions as any;
        const training = session?.trainings;
        if (!session || !training) continue;

        const sessionStart = new Date(`${session.session_date}T${session.start_time}`).getTime();
        const deadlineMs = (training.cancel_deadline_hours ?? 2) * 60 * 60 * 1000;

        // Past the deadline?
        if (sessionStart - now > deadlineMs) continue;
        if (sessionStart < now) continue; // session already happened

        const behavior = training.no_response_behavior ?? 'mark_absent';
        if (behavior === 'keep_pending') continue;

        // Mark as no_response
        await supabase
          .from('session_attendance')
          .update({ status: 'no_response' })
          .eq('id', att.id);

        // Create open spot
        await supabase.from('training_open_spots').insert({
          training_id: session.training_id,
          session_id: att.session_id,
          created_by: att.user_id,
        }).then(() => {}, () => {}); // ignore duplicate errors

        handled++;
      }

      results.no_response_handled = handled;
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
