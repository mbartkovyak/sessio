import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfWeek, startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getDateLocale } from '@/lib/dateFnsLocale';

export type StatsSession = {
  id: string;
  session_date: string;
  status: string;
  training_id: string;
  session_attendance: { status: string }[];
  trainings: { id: string; name: string; sport: string; coach_id: string } | null;
};

export type ChartDataPoint = {
  label: string;
  confirmed: number;
  declined: number;
  noShow: number;
};

export type StatsSummary = {
  totalSessions: number;
  totalConfirmed: number;
  totalDeclined: number;
  totalNoShow: number;
  attendanceRate: number; // 0-100
};

export type TrainingStats = {
  id: string;
  name: string;
  sport: string;
  coachId: string;
  sessions: number;
  confirmed: number;
  declined: number;
  noShow: number;
  attendanceRate: number;
};

// Window narrowed from 180 to 90 days. Covers the common "trends + last few
// months" use case for /coach/stats while keeping the result set small enough
// to render without timing out. The nested session_attendance(status) select
// expands one row per attendance record, so the response grows quadratically
// with active trainings × session count.
const STATS_WINDOW_DAYS = 90;
// Hard cap on rows pulled — backstop in case a single coach has wildly more
// data than expected. 5000 sessions × ~10 attendees still fits in ~250 KB JSON.
const STATS_ROW_LIMIT = 5000;

export function useStatsData(trainingIds: string[]) {
  const windowStart = format(new Date(Date.now() - STATS_WINDOW_DAYS * 86400000), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['stats-data', trainingIds],
    enabled: trainingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, session_date, status, training_id, session_attendance(status), trainings(id, name, sport, coach_id)')
        .in('training_id', trainingIds)
        .gte('session_date', windowStart)
        .lte('session_date', new Date().toISOString().split('T')[0])
        .neq('status', 'cancelled')
        .order('session_date', { ascending: true })
        .limit(STATS_ROW_LIMIT);
      if (error) throw error;
      return (data ?? []) as StatsSession[];
    },
  });
}

export function groupStats(sessions: StatsSession[], groupBy: 'week' | 'month'): ChartDataPoint[] {
  const locale = getDateLocale();
  const buckets = new Map<string, ChartDataPoint>();

  for (const session of sessions) {
    const date = parseISO(session.session_date);
    const bucketStart = groupBy === 'week'
      ? startOfWeek(date, { weekStartsOn: 1 })
      : startOfMonth(date);
    const key = bucketStart.toISOString();

    if (!buckets.has(key)) {
      const label = groupBy === 'week'
        ? format(bucketStart, 'MMM d', { locale })
        : format(bucketStart, 'MMM yyyy', { locale });
      buckets.set(key, { label, confirmed: 0, declined: 0, noShow: 0 });
    }

    const bucket = buckets.get(key)!;
    for (const att of session.session_attendance) {
      if (att.status === 'confirmed') bucket.confirmed++;
      else if (att.status === 'declined') bucket.declined++;
      else if (att.status === 'no_show') bucket.noShow++;
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, val]) => val);
}

export function computeSummary(sessions: StatsSession[]): StatsSummary {
  let totalConfirmed = 0;
  let totalDeclined = 0;
  let totalNoShow = 0;
  for (const session of sessions) {
    for (const att of session.session_attendance) {
      if (att.status === 'confirmed') totalConfirmed++;
      else if (att.status === 'declined') totalDeclined++;
      else if (att.status === 'no_show') totalNoShow++;
    }
  }
  const present = totalConfirmed;
  const expected = totalConfirmed + totalNoShow;
  const attendanceRate = expected > 0 ? Math.round((present / expected) * 100) : 100;
  return { totalSessions: sessions.length, totalConfirmed, totalDeclined, totalNoShow, attendanceRate };
}

export function computePerTrainingStats(sessions: StatsSession[]): TrainingStats[] {
  const byTraining = new Map<string, { name: string; sport: string; coachId: string; sessions: Set<string>; confirmed: number; declined: number; noShow: number }>();

  for (const session of sessions) {
    const t = session.trainings;
    if (!t) continue;
    if (!byTraining.has(t.id)) {
      byTraining.set(t.id, { name: t.name, sport: t.sport, coachId: t.coach_id, sessions: new Set(), confirmed: 0, declined: 0, noShow: 0 });
    }
    const bucket = byTraining.get(t.id)!;
    bucket.sessions.add(session.id);
    for (const att of session.session_attendance) {
      if (att.status === 'confirmed') bucket.confirmed++;
      else if (att.status === 'declined') bucket.declined++;
      else if (att.status === 'no_show') bucket.noShow++;
    }
  }

  return Array.from(byTraining.entries()).map(([id, b]) => {
    const expected = b.confirmed + b.noShow;
    return {
      id,
      name: b.name,
      sport: b.sport,
      coachId: b.coachId,
      sessions: b.sessions.size,
      confirmed: b.confirmed,
      declined: b.declined,
      noShow: b.noShow,
      attendanceRate: expected > 0 ? Math.round((b.confirmed / expected) * 100) : 100,
    };
  }).sort((a, b) => b.sessions - a.sessions);
}
