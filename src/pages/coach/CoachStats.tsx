import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchool } from '@/hooks/school/useSchools';
import { useTrainings, useSchoolTrainings } from '@/hooks/training/useTrainings';
import { useStatsData, groupStats, computeSummary, computePerTrainingStats, type StatsSession } from '@/hooks/training/useStatsData';
import CoachHeader from '@/components/coach/CoachHeader';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { SessioLoader } from '@/components/SessioLogo';
import { SPORT_ICONS } from '@/lib/constants';
import { getDateLocale } from '@/lib/dateFnsLocale';

function filterByPeriod(sessions: StatsSession[], groupBy: 'week' | 'month'): StatsSession[] {
  const now = new Date();
  const start = groupBy === 'week'
    ? startOfWeek(now, { weekStartsOn: 1 })
    : startOfMonth(now);
  const end = groupBy === 'week'
    ? endOfWeek(now, { weekStartsOn: 1 })
    : endOfMonth(now);
  return sessions.filter(s => {
    const d = parseISO(s.session_date);
    return d >= start && d <= end;
  });
}

function periodLabel(groupBy: 'week' | 'month'): string {
  const locale = getDateLocale();
  const now = new Date();
  if (groupBy === 'week') {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return `${format(start, 'd MMM', { locale })} – ${format(end, 'd MMM', { locale })}`;
  }
  return format(now, 'MMMM yyyy', { locale });
}

export default function CoachStats() {
  const { t } = useTranslation('coach');
  const { profile } = useAuth();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: school } = useMySchool();
  const { data: myTrainings = [] } = useTrainings();
  const { data: schoolTrainings = [] } = useSchoolTrainings(isSchoolOwner ? school?.id : undefined);

  const trainingIds = useMemo(() => {
    if (!isSchoolOwner) return myTrainings.map((t: any) => t.id);
    const ids = new Set(myTrainings.map((t: any) => t.id));
    return [...ids, ...schoolTrainings.filter((t: any) => !ids.has(t.id)).map((t: any) => t.id)];
  }, [myTrainings, schoolTrainings, isSchoolOwner]);

  const { data: rawSessions = [], isLoading } = useStatsData(trainingIds);
  const [groupBy, setGroupBy] = useState<'week' | 'month'>('week');

  // Chart shows full trend (all data grouped by week/month)
  const chartData = useMemo(() => groupStats(rawSessions, groupBy), [rawSessions, groupBy]);

  // Summary + breakdowns filtered to current period
  const periodSessions = useMemo(() => filterByPeriod(rawSessions, groupBy), [rawSessions, groupBy]);
  const summary = useMemo(() => computeSummary(periodSessions), [periodSessions]);
  const perTraining = useMemo(() => computePerTrainingStats(periodSessions), [periodSessions]);
  const currentPeriodLabel = useMemo(() => periodLabel(groupBy), [groupBy]);

  // For school owners: group per-training stats by coach
  const coachNames = useMemo(() => {
    if (!isSchoolOwner) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const tr of [...myTrainings, ...schoolTrainings]) {
      if (tr.coach_id && tr.coach?.full_name) {
        map.set(tr.coach_id, tr.coach.full_name);
      }
    }
    return map;
  }, [myTrainings, schoolTrainings, isSchoolOwner]);

  const perCoach = useMemo(() => {
    if (!isSchoolOwner) return [];
    const byCoach = new Map<string, { name: string; sessions: number; confirmed: number; noShow: number }>();
    for (const ts of perTraining) {
      if (!byCoach.has(ts.coachId)) {
        byCoach.set(ts.coachId, { name: coachNames.get(ts.coachId) ?? 'Coach', sessions: 0, confirmed: 0, noShow: 0 });
      }
      const c = byCoach.get(ts.coachId)!;
      c.sessions += ts.sessions;
      c.confirmed += ts.confirmed;
      c.noShow += ts.noShow;
    }
    return Array.from(byCoach.values()).map(c => ({
      ...c,
      attendanceRate: (c.confirmed + c.noShow) > 0 ? Math.round((c.confirmed / (c.confirmed + c.noShow)) * 100) : 100,
    })).sort((a, b) => b.sessions - a.sessions);
  }, [perTraining, coachNames, isSchoolOwner]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CoachHeader title={t('stats.title')} back />

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 pt-4 space-y-5">
          {/* Week / Month toggle */}
          <div className="flex rounded-xl bg-white p-1 shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
            <button
              onClick={() => setGroupBy('week')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                groupBy === 'week' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t('stats.week')}
            </button>
            <button
              onClick={() => setGroupBy('month')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                groupBy === 'month' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t('stats.month')}
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <SessioLoader />
            </div>
          ) : rawSessions.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm text-center" style={{ border: '1px solid hsl(203 20% 90%)' }}>
              <p className="text-sm text-muted-foreground">{t('stats.noData')}</p>
            </div>
          ) : (
            <>
              {/* Bar chart — full trend */}
              <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(0 0% 90%)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <Tooltip />
                    <Bar dataKey="confirmed" name={t('stats.confirmed')} fill="hsl(160, 60%, 38%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="noShow" name={t('stats.noShow')} fill="hsl(30, 90%, 55%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="declined" name={t('stats.declined')} fill="hsl(0, 72%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Period label */}
              <p className="text-xs font-medium text-muted-foreground text-center">{currentPeriodLabel}</p>

              {/* Summary numbers — filtered to current period */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-3 text-center shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
                  <div className="text-lg font-bold text-foreground">{summary.attendanceRate}%</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('stats.attendanceRate')}</div>
                </div>
                <div className="rounded-2xl bg-white p-3 text-center shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
                  <div className="text-lg font-bold text-foreground">{summary.totalSessions}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('stats.totalSessions')}</div>
                </div>
                <div className="rounded-2xl bg-white p-3 text-center shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
                  <div className="text-lg font-bold text-success">{summary.totalConfirmed}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('stats.confirmed')}</div>
                </div>
                <div className="rounded-2xl bg-white p-3 text-center shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
                  <div className="text-lg font-bold text-amber-600">{summary.totalNoShow}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('stats.noShow')}</div>
                </div>
              </div>

              {/* Per-coach breakdown (school owners only) — filtered */}
              {isSchoolOwner && perCoach.length > 1 && (
                <section>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('stats.perCoach')}</h2>
                  <div className="space-y-2">
                    {perCoach.map(c => (
                      <div key={c.name} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.sessions} {t('stats.totalSessions').toLowerCase()}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">{c.attendanceRate}%</p>
                          <p className="text-[10px] text-muted-foreground">
                            {c.confirmed} {t('stats.confirmed').toLowerCase()} · {c.noShow} {t('stats.noShow').toLowerCase()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Per-training breakdown — filtered */}
              {perTraining.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('stats.perTraining')}</h2>
                  <div className="space-y-2">
                    {perTraining.map(ts => (
                      <div key={ts.id} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
                        <span className="text-lg shrink-0">{SPORT_ICONS[ts.sport] ?? '🎯'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{ts.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ts.sessions} {t('stats.totalSessions').toLowerCase()} · {ts.confirmed} {t('stats.confirmed').toLowerCase()}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">{ts.attendanceRate}%</p>
                          {ts.noShow > 0 && (
                            <p className="text-[10px] text-amber-600">{ts.noShow} {t('stats.noShow').toLowerCase()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <CoachBottomNav />
    </div>
  );
}
