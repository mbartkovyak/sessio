import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Settings, CheckCircle2, Users, X, BarChart3 } from 'lucide-react';
import NewLessonButton from '@/components/coach/NewLessonButton';
import CoachSessionCard from '@/components/coach/CoachSessionCard';
import { useMySchool, useRespondSchoolMember } from '@/hooks/school/useSchools';
import { useSchoolTrainings, useAllCoachJoinRequests, useRespondJoinRequest, useAttendanceSummary } from '@/hooks/training/useTrainings';
import { useSchoolUpcomingSessions, usePastUnmarkedSessions, type UpcomingSession } from '@/hooks/training/useTodaySessions';
import AttendanceBanner from '@/components/coach/AttendanceBanner';
import CoachSetupGuide from '@/components/coach/CoachSetupGuide';
import { Ticket } from 'lucide-react';
import Avatar from '@/components/shared/Avatar';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { SessioLoader } from '@/components/SessioLogo';
import { getDateLocale } from '@/lib/dateFnsLocale';
import { localizeErrorMessage } from '@/lib/localizedErrors';
import { normalizeTime } from '@/lib/utils';

export default function SchoolOverviewSection({ school }: { school: { id: string; name: string } }) {
  const { t } = useTranslation('school');
  const { t: tc } = useTranslation('coach');
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: fullSchool } = useMySchool();
  // School-scoped queries key off the school.id PROP, which is already resolved
  // before this component mounts (CoachHome gates render on it) — NOT
  // fullSchool?.id. That lets them fire immediately, in parallel with the
  // heavier useMySchool() members join, instead of waterfalling behind it
  // (was: basic-school → full-school → these → attendance = 4 round-trips).
  // fullSchool is still the source for the coaches list, pending members,
  // isSolo and bio below, which genuinely need the full row.
  const { data: trainings = [] } = useSchoolTrainings(school.id);
  const { data: joinRequests = [] } = useAllCoachJoinRequests();
  const respond = useRespondJoinRequest();
  const respondSchool = useRespondSchoolMember();
  const { data: upcomingSessions = [], isLoading: sessionsLoading, isError: sessionsError } = useSchoolUpcomingSessions(school.id, 5);
  const { data: unmarkedSessions = [] } = usePastUnmarkedSessions(undefined, school.id);
  const sessionIds = (upcomingSessions ?? []).filter((s: any) => s.status !== 'cancelled').map((s: any) => s.id);
  const { data: attendanceSummary = {} } = useAttendanceSummary(sessionIds);
  const qc = useQueryClient();

  const coaches = fullSchool?.school_members ?? [];
  const pendingCoaches = fullSchool?.pending_members ?? [];
  const isSolo = (fullSchool as any)?.is_listed === false;

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  async function handleCancelSession(session: UpcomingSession) {
    const training = session.trainings;
    const dateLabel = format(new Date(session.session_date + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() });
    if (!confirm(tc('home.cancelConfirm', { name: training?.name, date: dateLabel }))) return;
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
          content: tc('home.cancelledMessage', { name: training?.name, date: dateLabel }),
        });
      }
    }
    qc.invalidateQueries({ queryKey: ['school-upcoming-sessions'] });
    qc.invalidateQueries({ queryKey: ['upcoming-sessions'] });
    qc.invalidateQueries({ queryKey: ['school-calendar-sessions'] });
    qc.invalidateQueries({ queryKey: ['training-sessions', training?.id] });
    toast.success(tc('home.sessionCancelled'));
  }

  async function handleRescheduleSession(session: UpcomingSession) {
    const training = session.trainings;
    const newDate = prompt(tc('home.rescheduleDate'), session.session_date);
    if (!newDate) return;
    const rawStart = prompt(tc('home.rescheduleStart'), session.start_time?.slice(0, 5));
    if (!rawStart) return;
    const newStart = normalizeTime(rawStart);
    if (!newStart) { toast.error(tc('home.invalidTime')); return; }
    const rawEnd = prompt(tc('home.rescheduleEnd'), session.end_time?.slice(0, 5));
    if (!rawEnd) return;
    const newEnd = normalizeTime(rawEnd);
    if (!newEnd) { toast.error(tc('home.invalidTime')); return; }
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
          content: tc('home.rescheduledMessage', { name: training?.name, oldDate: oldDateLabel, oldTime: session.start_time?.slice(0, 5), newDate: newDateLabel, newTime: newStart }),
        });
      }
    }
    qc.invalidateQueries({ queryKey: ['school-upcoming-sessions'] });
    qc.invalidateQueries({ queryKey: ['upcoming-sessions'] });
    qc.invalidateQueries({ queryKey: ['school-calendar-sessions'] });
    qc.invalidateQueries({ queryKey: ['training-sessions', training?.id] });
    toast.success(tc('home.sessionRescheduled'));
  }

  // Render the page chrome immediately and let each section show its own
  // state. Gating the whole page on three queries used to cause minutes-long
  // blank screens whenever any single query stalled.
  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      {isSolo ? (
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {tc('home.greeting', { name: profile?.first_name ?? tc('home.defaultName') })}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tc('home.overview')}</p>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{school.name}</h1>
          </div>
          <button onClick={() => navigate('/school/profile')}
            className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground transition-all active:scale-[0.97] shrink-0 mt-1">
            <Settings className="h-3.5 w-3.5" /> {t('overview.schoolProfile')}
          </button>
        </div>
      )}

      {/* Setup guide for new coaches */}
      <CoachSetupGuide trainings={trainings} schoolCoachCount={isSolo ? undefined : coaches.length} schoolBio={isSolo ? profile?.bio : fullSchool?.description} />

      {/* Attendance marking banner */}
      <AttendanceBanner sessions={unmarkedSessions} />

      {/* Athletes button */}
      <button
        onClick={() => navigate('/coach/athletes')}
        className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all active:scale-[0.97]"
        style={{ border: '1px solid hsl(203 20% 90%)' }}
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          {tc('athletes.title')}
        </div>
      </button>

      {/* Stats + Passes buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/coach/stats')}
          className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all active:scale-[0.97]"
          style={{ border: '1px solid hsl(203 20% 90%)' }}
        >
          <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
          {tc('home.viewStats')}
        </button>
        <button
          onClick={() => navigate('/coach/passes')}
          className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all active:scale-[0.97]"
          style={{ border: '1px solid hsl(203 20% 90%)' }}
        >
          <Ticket className="h-4 w-4 text-muted-foreground shrink-0" />
          {tc('abonaments.title')}
        </button>
      </div>

      {/* Coaches button — hidden for solo coaches */}
      {!isSolo && (
        <button
          onClick={() => navigate('/coach/coaches')}
          className="w-full flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 shadow-sm text-sm font-semibold text-foreground transition-all active:scale-[0.97]"
          style={{ border: '1px solid hsl(203 20% 90%)' }}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{t('dashboard.coachesSection')}</span>
          </div>
          <div className="flex items-center gap-2">
            {pendingCoaches.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{pendingCoaches.length}</span>
            )}
            <span className="text-xs text-muted-foreground">{coaches.length}</span>
          </div>
        </button>
      )}

      {/* Join Requests (athletes) */}
      {joinRequests.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('overview.joinRequests')}</h2>
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
                    <button onClick={() => respond.mutate({ requestId: req.id, trainingId: req.training_id, userId: req.user_id, accept: true, trainingName: req.trainings?.name })}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-success py-2.5 text-xs font-bold text-success-foreground min-h-[40px] shadow-sm transition-all active:scale-[0.97]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t('overview.accept')}
                    </button>
                    <button onClick={() => respond.mutate({ requestId: req.id, trainingId: req.training_id, userId: req.user_id, accept: false, trainingName: req.trainings?.name })}
                      className="flex items-center justify-center gap-1 rounded-xl bg-muted py-2.5 text-xs font-bold text-muted-foreground min-h-[40px] transition-all active:scale-[0.97]">
                      {t('overview.decline')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming Sessions — same as coach */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{tc('home.upcoming')}</h2>
          <NewLessonButton />
        </div>
        {(sessionsLoading || (sessionsError && upcomingSessions.length === 0)) ? (
          // Show the loader while loading AND when a fetch errored with no
          // cached sessions — a failed/timed-out load must never render a
          // confident "no upcoming" over sessions that actually exist. It
          // self-heals on the next cold-start/resume refetch. A genuinely
          // empty success (no error, length 0) still falls through to noUpcoming.
          <div className="rounded-2xl bg-white p-6 shadow-sm flex items-center justify-center" style={{ border: '1px solid hsl(203 20% 90%)' }}>
            <SessioLoader />
          </div>
        ) : upcomingSessions.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm text-center" style={{ border: '1px solid hsl(203 20% 90%)' }}>
            <p className="text-sm text-muted-foreground">{tc('home.noUpcoming')}</p>
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
                {tc('home.showAll')}
              </button>
            )}
          </>
        )}
      </section>

    </div>
  );
}
