import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle2, BarChart3, Ticket, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainings, useAllCoachJoinRequests, useRespondJoinRequest, useAttendanceSummary } from '@/hooks/training/useTrainings';
import { useMySchoolMembership } from '@/hooks/school/useSchools';
import { useUpcomingSessions, usePastUnmarkedSessions, type UpcomingSession } from '@/hooks/training/useTodaySessions';
import AttendanceBanner from '@/components/coach/AttendanceBanner';
import CoachSetupGuide from '@/components/coach/CoachSetupGuide';
import Avatar from '@/components/shared/Avatar';
import CoachSessionCard from '@/components/coach/CoachSessionCard';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sportLabel, sportLabels } from '@/lib/constants';
import { normalizeTime } from '@/lib/utils';
import { SessioLoader } from '@/components/SessioLogo';
import { getDateLocale } from '@/lib/dateFnsLocale';
import { localizeErrorMessage } from '@/lib/localizedErrors';

export default function CoachOverviewSection() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('coach');
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: trainings = [] } = useTrainings();
  const { data: joinRequests = [] } = useAllCoachJoinRequests();
  const respond = useRespondJoinRequest();
  const { data: upcomingSessions = [], isLoading: sessionsLoading, isError: sessionsError } = useUpcomingSessions(profile?.id, 5);
  const { data: unmarkedSessions = [] } = usePastUnmarkedSessions(profile?.id);
  const { data: schoolMembership } = useMySchoolMembership();
  const sessionIds = (upcomingSessions ?? []).filter((s: any) => s.status !== 'cancelled').map((s: any) => s.id);
  const { data: attendanceSummary = {} } = useAttendanceSummary(sessionIds);
  const qc = useQueryClient();

  async function handleCancelSession(session: UpcomingSession) {
    const training = session.trainings;
    const dateLabel = format(new Date(session.session_date + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() });
    if (!confirm(t('home.cancelConfirm', { name: training?.name, date: dateLabel }))) return;
    const { error } = await supabase
      .from('training_sessions')
      .update({ status: 'cancelled' })
      .eq('id', session.id);
    if (error) { toast.error(localizeErrorMessage(error, t('common:errors.somethingWentWrong'))); return; }
    if (user) {
      const { data: conv } = await supabase.from('conversations').select('id').eq('training_id', training?.id).maybeSingle();
      if (conv) {
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: user.id,
          content: t('home.cancelledMessage', { name: training?.name, date: dateLabel }),
        });
      }
    }
    qc.invalidateQueries({ queryKey: ['upcoming-sessions'] });
    qc.invalidateQueries({ queryKey: ['coach-calendar-sessions'] });
    qc.invalidateQueries({ queryKey: ['training-sessions', training?.id] });
    toast.success(t('home.sessionCancelled'));
  }

  async function handleRescheduleSession(session: UpcomingSession) {
    const training = session.trainings;
    const newDate = prompt(t('home.rescheduleDate'), session.session_date);
    if (!newDate) return;
    const rawStart = prompt(t('home.rescheduleStart'), session.start_time?.slice(0, 5));
    if (!rawStart) return;
    const newStart = normalizeTime(rawStart);
    if (!newStart) { toast.error(t('home.invalidTime')); return; }
    const rawEnd = prompt(t('home.rescheduleEnd'), session.end_time?.slice(0, 5));
    if (!rawEnd) return;
    const newEnd = normalizeTime(rawEnd);
    if (!newEnd) { toast.error(t('home.invalidTime')); return; }
    if (newDate === session.session_date && newStart === session.start_time?.slice(0, 5) && newEnd === session.end_time?.slice(0, 5)) return;
    const { error } = await supabase
      .from('training_sessions')
      .update({ session_date: newDate, start_time: newStart, end_time: newEnd })
      .eq('id', session.id);
    if (error) { toast.error(localizeErrorMessage(error, t('common:errors.somethingWentWrong'))); return; }
    if (user) {
      const { data: conv } = await supabase.from('conversations').select('id').eq('training_id', training?.id).maybeSingle();
      if (conv) {
        const oldDateLabel = format(new Date(session.session_date + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() });
        const newDateLabel = format(new Date(newDate + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() });
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: user.id,
          content: t('home.rescheduledMessage', { name: training?.name, oldDate: oldDateLabel, oldTime: session.start_time?.slice(0, 5), newDate: newDateLabel, newTime: newStart }),
        });
      }
    }
    qc.invalidateQueries({ queryKey: ['upcoming-sessions'] });
    qc.invalidateQueries({ queryKey: ['coach-calendar-sessions'] });
    qc.invalidateQueries({ queryKey: ['training-sessions', training?.id] });
    toast.success(t('home.sessionRescheduled'));
  }

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Render the page chrome immediately and let each section show its own
  // state. Gating the whole page on three queries used to cause minutes-long
  // blank screens whenever any single query stalled (cold cache, pool spike).
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {t('home.greeting', { name: profile?.first_name ?? t('home.defaultName') })}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('home.overview')}</p>
      </div>

      {/* Setup guide for new coaches */}
      <CoachSetupGuide trainings={trainings} />

      {/* Attendance marking banner */}
      <AttendanceBanner sessions={unmarkedSessions} />

      {/* School membership banner */}
      {!isSchoolOwner && schoolMembership?.schools && (
        <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-sm"
          style={{ border: '1px solid hsl(193 30% 50% / 0.15)' }}>
          <Avatar url={(schoolMembership.schools as any).logo_url} name={(schoolMembership.schools as any).name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm truncate">{(schoolMembership.schools as any).name}</p>
            <p className="text-xs text-muted-foreground">
              {[
                sportLabels((schoolMembership.schools as any).sport) || null,
                (schoolMembership.schools as any).city,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Athletes + Passes buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/coach/athletes')}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all active:scale-[0.97]"
          style={{ border: '1px solid hsl(203 20% 90%)' }}
        >
          <Users className="h-4 w-4 text-muted-foreground" />
          {t('athletes.title')}
        </button>
        <button
          onClick={() => navigate('/coach/passes')}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all active:scale-[0.97]"
          style={{ border: '1px solid hsl(203 20% 90%)' }}
        >
          <Ticket className="h-4 w-4 text-muted-foreground" />
          {t('abonaments.title')}
        </button>
      </div>

      {/* Reports button */}
      <button
        onClick={() => navigate('/coach/stats')}
        className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all active:scale-[0.97]"
        style={{ border: '1px solid hsl(203 20% 90%)' }}
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          {t('home.viewStats')}
        </div>
      </button>

      {/* Join Requests */}
      {joinRequests.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('home.joinRequests')}</h2>
          <div className="space-y-2">
            {joinRequests.map((req: any) => {
              const player = req.profiles;
              const training = req.trainings;
              return (
                <div key={req.id} className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar url={player?.avatar_url} name={player?.full_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{player?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{training?.name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => respond.mutate({ requestId: req.id, trainingId: req.training_id, userId: req.user_id, accept: true, trainingName: req.trainings?.name })}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-success py-2.5 text-xs font-bold text-success-foreground min-h-[40px] shadow-sm transition-all active:scale-[0.97]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t('home.accept')}
                    </button>
                    <button
                      onClick={() => respond.mutate({ requestId: req.id, trainingId: req.training_id, userId: req.user_id, accept: false, trainingName: req.trainings?.name })}
                      className="flex items-center justify-center gap-1 rounded-xl bg-muted py-2.5 text-xs font-bold text-muted-foreground min-h-[40px] transition-all active:scale-[0.97]"
                    >
                      {t('home.decline')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming Sessions — up to 4 with cancel/reschedule */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('home.upcoming')}</h2>
        </div>
        {(sessionsLoading || (sessionsError && upcomingSessions.length === 0)) ? (
          // Loader while loading AND when a fetch errored with no cached
          // sessions — a failed/timed-out load must never show a confident
          // "no upcoming" over sessions that exist; it self-heals on the next
          // refetch. A genuinely empty success still falls through to noUpcoming.
          <div className="rounded-2xl bg-white p-6 shadow-sm flex items-center justify-center" style={{ border: '1px solid hsl(203 20% 90%)' }}>
            <SessioLoader />
          </div>
        ) : upcomingSessions.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm text-center" style={{ border: '1px solid hsl(203 20% 90%)' }}>
            <p className="text-sm text-muted-foreground">{t('home.noUpcoming')}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {(() => {
                let lastDate = '';
                return upcomingSessions.slice(0, 4).map((session) => {
                  const showLabel = session.session_date !== lastDate;
                  lastDate = session.session_date;
                  const label = session.session_date === today ? t('common:calendar.today')
                    : session.session_date === tomorrow ? t('common:calendar.tomorrow')
                    : format(new Date(session.session_date + 'T00:00:00'), 'EEEE, MMM d', { locale: getDateLocale() });

                  return (
                    <div key={session.id}>
                      {showLabel && <p className="text-xs font-medium text-muted-foreground mt-2 mb-1">{label}</p>}
                      <CoachSessionCard
                        session={session}
                        attendance={attendanceSummary[session.id]}
                        onCancel={handleCancelSession}
                        onReschedule={handleRescheduleSession}
                      />
                    </div>
                  );
                });
              })()}
            </div>
            {upcomingSessions.length > 4 && (
              <button onClick={() => navigate('/coach/calendar')}
                className="mt-3 w-full rounded-xl bg-accent py-2.5 text-xs font-bold text-accent-foreground transition-all active:scale-[0.97]">
                {t('home.showAll')}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
