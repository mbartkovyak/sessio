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

const CRON_ACTIONS = ['full', 'generate', 'notifications', 'deadline', 'attendance_reminder'];

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

  /** Convert a Warsaw local date+time to UTC millis. */
  function warsawToUtcMs(dateStr: string, timeStr: string): number {
    const naiveUtc = new Date(`${dateStr}T${timeStr}Z`).getTime();
    // Midnight UTC expressed in Warsaw tells us the offset (1 for CET, 2 for CEST)
    const offsetHours = Number(
      new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Europe/Warsaw' })
        .format(new Date(`${dateStr}T00:00:00Z`))
    );
    return naiveUtc - offsetHours * 3600000;
  }

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
      if (!['coach', 'school_owner'].includes(profile?.role ?? '')) {
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

    // ── 3. Send confirmation reminders (only between 9:00–22:00 Warsaw time) ──
    if (action === 'full' || action === 'notifications') {
      const warsawHour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Europe/Warsaw' }).format(new Date()));
      if (warsawHour < 9 || warsawHour >= 22) {
        results.reminders_sent = 0;
        results.skipped_reason = 'outside_hours';
      } else {

      // Only fetch sessions within the next 3 days (covers any reminder window)
      const cutoff = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);

      const { data: upcomingSessions } = await supabase
        .from('training_sessions')
        .select('id')
        .gte('session_date', today)
        .lte('session_date', cutoff);

      const sessionIds = (upcomingSessions ?? []).map((s: any) => s.id);

      let pending: any[] = [];
      if (sessionIds.length) {
        const { data, error: err } = await supabase
          .from('session_attendance')
          .select(`
            id, user_id, session_id, status, reminder_sent_at, reminder_count,
            training_sessions(id, session_date, start_time, end_time,
              trainings(id, name, confirmation_window_hours)
            )
          `)
          .eq('status', 'confirmed')
          .lt('reminder_count', 2)
          .in('session_id', sessionIds);
        if (err) throw err;
        pending = data ?? [];
      }

      const now = Date.now();
      let sent = 0;
      const sentIds: string[] = [];

      for (const att of pending ?? []) {
        const session = att.training_sessions as any;
        const training = session?.trainings;
        if (!session || !training) continue;

        const sessionStart = warsawToUtcMs(session.session_date, session.start_time);
        const deadlineHours = training.confirmation_window_hours;
        if (deadlineHours == null) continue; // deadline disabled — no reminders
        const reminderHours = deadlineHours + 24;

        // Must be within the reminder window
        if (sessionStart - now > (reminderHours + 1) * 60 * 60 * 1000 || sessionStart < now) continue;

        // First reminder: always send. Second: only if 6h since first.
        const count = (att as any).reminder_count ?? 0;
        if (count === 1) {
          const firstSentAt = new Date((att as any).reminder_sent_at).getTime();
          if (now - firstSentAt < 6 * 60 * 60 * 1000) continue; // too soon for follow-up
        }

        const payload = JSON.stringify({
          title: training.name,
          body: `${session.session_date} at ${session.start_time?.slice(0, 5)} — cancel if you can't make it.`,
          tag: `confirm-${att.session_id}`,
          url: '/player',
        });

        const pushCount = await sendPushToUsers(supabase, [att.user_id], payload);
        sent += pushCount;
        sentIds.push({ id: att.id, newCount: count + 1 });
      }

      // Update reminder_sent_at and increment reminder_count
      for (const { id, newCount } of sentIds) {
        await supabase
          .from('session_attendance')
          .update({ reminder_sent_at: new Date().toISOString(), reminder_count: newCount })
          .eq('id', id);
      }

      results.reminders_sent = sent;
      } // end hours check
    }

    // ── 4. Deadline handler — no-op (all attendance starts as confirmed) ──
    if (action === 'deadline') {
      results.no_response_handled = 0;
    }

    // ── 5. Attendance marking reminders (12h after session ends) ──
    if (action === 'full' || action === 'attendance_reminder') {
      const warsawHour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Europe/Warsaw' }).format(new Date()));
      if (warsawHour < 9 || warsawHour >= 22) {
        results.attendance_reminders_sent = 0;
        results.attendance_reminders_skipped = 'outside_hours';
      } else {
        const now = Date.now();
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const todayStr = new Date().toISOString().slice(0, 10);

        const { data: unmarkedSessions } = await supabase
          .from('training_sessions')
          .select('id, session_date, start_time, end_time, trainings!inner(id, name, coach_id)')
          .is('attendance_marked_at', null)
          .eq('attendance_reminder_sent', false)
          .eq('status', 'scheduled')
          .gte('session_date', sevenDaysAgo)
          .lte('session_date', todayStr);

        let attendanceRemindersSent = 0;
        for (const s of unmarkedSessions ?? []) {
          const sessionEndUtc = warsawToUtcMs(s.session_date, s.end_time);
          const hoursSinceEnd = (now - sessionEndUtc) / (60 * 60 * 1000);

          // Only remind if session ended 12+ hours ago
          if (hoursSinceEnd < 12) continue;

          const training = s.trainings as any;
          if (!training?.coach_id) continue;

          const payload = JSON.stringify({
            title: training.name,
            body: `Mark attendance for ${s.session_date}`,
            tag: `attendance-mark-${s.id}`,
            url: '/coach',
          });

          const pushCount = await sendPushToUsers(supabase, [training.coach_id], payload);
          attendanceRemindersSent += pushCount;

          await supabase
            .from('training_sessions')
            .update({ attendance_reminder_sent: true })
            .eq('id', s.id);
        }
        results.attendance_reminders_sent = attendanceRemindersSent;
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
