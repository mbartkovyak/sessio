import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchool } from '@/hooks/school/useSchools';
import { useTrainings, useSchoolTrainings } from '@/hooks/training/useTrainings';
import { useStatsData, groupStats, computeSummary } from '@/hooks/training/useStatsData';
import CoachHeader from '@/components/coach/CoachHeader';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { SessioLoader } from '@/components/SessioLogo';

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

  const chartData = useMemo(() => groupStats(rawSessions, groupBy), [rawSessions, groupBy]);
  const summary = useMemo(() => computeSummary(rawSessions), [rawSessions]);

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
              {/* Bar chart */}
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
                    <Bar dataKey="declined" name={t('stats.declined')} fill="hsl(0, 72%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary numbers */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white p-3 text-center shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
                  <div className="text-lg font-bold text-foreground">{summary.totalSessions}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('stats.totalSessions')}</div>
                </div>
                <div className="rounded-2xl bg-white p-3 text-center shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
                  <div className="text-lg font-bold text-success">{summary.totalConfirmed}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('stats.confirmed')}</div>
                </div>
                <div className="rounded-2xl bg-white p-3 text-center shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
                  <div className="text-lg font-bold text-destructive">{summary.totalDeclined}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t('stats.declined')}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <CoachBottomNav />
    </div>
  );
}
