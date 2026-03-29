import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfWeek, startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getDateLocale } from '@/lib/dateFnsLocale';

export type StatsSession = {
  id: string;
  session_date: string;
  status: string;
  session_attendance: { status: string }[];
};

export type ChartDataPoint = {
  label: string;
  confirmed: number;
  declined: number;
};

export type StatsSummary = {
  totalSessions: number;
  totalConfirmed: number;
  totalDeclined: number;
};

export function useStatsData(trainingIds: string[]) {
  const sixMonthsAgo = format(new Date(Date.now() - 180 * 86400000), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['stats-data', trainingIds],
    enabled: trainingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, session_date, status, session_attendance(status)')
        .in('training_id', trainingIds)
        .gte('session_date', sixMonthsAgo)
        .neq('status', 'cancelled')
        .order('session_date', { ascending: true });
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
      buckets.set(key, { label, confirmed: 0, declined: 0 });
    }

    const bucket = buckets.get(key)!;
    for (const att of session.session_attendance) {
      if (att.status === 'confirmed') bucket.confirmed++;
      else if (att.status === 'declined') bucket.declined++;
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, val]) => val);
}

export function computeSummary(sessions: StatsSession[]): StatsSummary {
  let totalConfirmed = 0;
  let totalDeclined = 0;
  for (const session of sessions) {
    for (const att of session.session_attendance) {
      if (att.status === 'confirmed') totalConfirmed++;
      else if (att.status === 'declined') totalDeclined++;
    }
  }
  return { totalSessions: sessions.length, totalConfirmed, totalDeclined };
}
