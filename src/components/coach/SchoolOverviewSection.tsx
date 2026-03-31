import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Settings, CheckCircle2, UserPlus, Users, X, Copy, Share2, BarChart3 } from 'lucide-react';
import NewLessonButton from '@/components/coach/NewLessonButton';
import CoachSessionCard from '@/components/coach/CoachSessionCard';
import { useMySchool, useRespondSchoolMember } from '@/hooks/school/useSchools';
import { useSchoolTrainings, useAllCoachJoinRequests, useRespondJoinRequest, useAttendanceSummary } from '@/hooks/training/useTrainings';
import { useSchoolUpcomingSessions, usePastUnmarkedSessions, type UpcomingSession } from '@/hooks/training/useTodaySessions';
import AttendanceBanner from '@/components/coach/AttendanceBanner';
import { Ticket } from 'lucide-react';
import Avatar from '@/components/shared/Avatar';
import ShareLinkButton from '@/components/shared/ShareLinkButton';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { sportLabel } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SessioLoader } from '@/components/SessioLogo';
import { getDateLocale } from '@/lib/dateFnsLocale';
import { localizeErrorMessage } from '@/lib/localizedErrors';

export default function SchoolOverviewSection({ school }: { school: { id: string; name: string } }) {
  const { t } = useTranslation('school');
  const { t: tc } = useTranslation('coach');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: fullSchool } = useMySchool();
  const { data: trainings = [], isLoading: trainingsLoading } = useSchoolTrainings(fullSchool?.id);
  const { data: joinRequests = [], isLoading: joinRequestsLoading } = useAllCoachJoinRequests();
  const respond = useRespondJoinRequest();
  const respondSchool = useRespondSchoolMember();
  const { data: upcomingSessions = [], isLoading: sessionsLoading } = useSchoolUpcomingSessions(fullSchool?.id, 5);
  const { data: unmarkedSessions = [] } = usePastUnmarkedSessions(undefined, fullSchool?.id);
  const sessionIds = (upcomingSessions ?? []).filter((s: any) => s.status !== 'cancelled').map((s: any) => s.id);
  const { data: attendanceSummary = {} } = useAttendanceSummary(sessionIds);
  const [showInvite, setShowInvite] = useState(false);
  const qc = useQueryClient();

  const coaches = fullSchool?.school_members ?? [];
  const pendingCoaches = fullSchool?.pending_members ?? [];
  const inviteCode = fullSchool?.invite_code;
  const inviteLink = inviteCode ? `${window.location.origin}/join-school/${inviteCode}` : '';

  // Total unique athletes across all school trainings
  const trainingIds = trainings.map((tr: any) => tr.id);
  const { data: totalAthletes = 0, isPending: athletesPending } = useQuery({
    queryKey: ['school-total-athletes', trainingIds],
    enabled: trainingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_members')
        .select('user_id')
        .in('training_id', trainingIds)
        .eq('role', 'regular');
      if (error) throw error;
      return new Set(data?.map(m => m.user_id)).size;
    },
  });

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
    const newStart = prompt(tc('home.rescheduleStart'), session.start_time?.slice(0, 5));
    if (!newStart) return;
    const newEnd = prompt(tc('home.rescheduleEnd'), session.end_time?.slice(0, 5));
    if (!newEnd) return;
    if (newDate === session.session_date && newStart === session.start_time?.slice(0, 5) && newEnd === session.end_time?.slice(0, 5)) return;
    const { error } = await supabase
      .from('training_sessions')
      .update({ session_date: newDate, start_time: newStart, end_time: newEnd })
      .eq('id', session.id);
    if (error) { toast.error(localizeErrorMessage(error, t('common:errors.somethingWentWrong'))); return; }
    if (user) {
      const { data: conv } = await supabase.from('conversations').select('id').eq('training_id', training?.id).maybeSingle();
      if (conv) {
        const newDateLabel = format(new Date(newDate + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() });
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: user.id,
          content: tc('home.rescheduledMessage', { name: training?.name, date: newDateLabel, time: newStart }),
        });
      }
    }
    qc.invalidateQueries({ queryKey: ['school-upcoming-sessions'] });
    qc.invalidateQueries({ queryKey: ['upcoming-sessions'] });
    qc.invalidateQueries({ queryKey: ['school-calendar-sessions'] });
    qc.invalidateQueries({ queryKey: ['training-sessions', training?.id] });
    toast.success(tc('home.sessionRescheduled'));
  }

  const isLoading = trainingsLoading || joinRequestsLoading || sessionsLoading
    || (trainingIds.length > 0 && athletesPending);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <SessioLoader />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{school.name}</h1>
        </div>
        <button onClick={() => navigate('/school/profile')}
          className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground transition-all active:scale-[0.97] shrink-0 mt-1">
          <Settings className="h-3.5 w-3.5" /> {t('overview.schoolProfile')}
        </button>
      </div>

      {/* Attendance marking banner */}
      <AttendanceBanner sessions={unmarkedSessions} />

      {/* Quick stats — same as coach */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: tc('home.athletes'), value: totalAthletes, style: 'accent' as const },
          { label: tc('home.lessons'), value: trainings.length, style: 'primary' as const },
        ].map(({ label, value, style }) => (
          <div key={label} className={`rounded-2xl p-4 text-center shadow-md ${
            style === 'accent' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'
          }`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs mt-1 font-medium opacity-80">{label}</div>
          </div>
        ))}
      </div>

      {/* Stats button */}
      <button
        onClick={() => navigate('/coach/stats')}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all active:scale-[0.97]"
        style={{ border: '1px solid hsl(203 20% 90%)' }}
      >
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        {tc('home.viewStats')}
      </button>

      {/* Passes button */}
      <button
        onClick={() => navigate('/coach/passes')}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all active:scale-[0.97]"
        style={{ border: '1px solid hsl(203 20% 90%)' }}
      >
        <Ticket className="h-4 w-4 text-muted-foreground" />
        {tc('abonaments.title')}
      </button>

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
        {upcomingSessions.length === 0 ? (
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

      {/* Coaches */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t('dashboard.coachesSection')}</h2>

        {/* Pending coach requests */}
        {pendingCoaches.length > 0 && (
          <div className="mb-3 space-y-2">
            <p className="text-xs font-medium text-amber-600">{t('dashboard.pendingRequests')} ({pendingCoaches.length})</p>
            {pendingCoaches.map((m: any) => {
              const coach = m.coach;
              return (
                <div key={m.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar url={coach?.avatar_url} name={coach?.full_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{coach?.full_name ?? t('dashboard.coach')}</p>
                      <p className="text-xs text-muted-foreground">{coach?.sport ? sportLabel(coach.sport) : ''}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => respondSchool.mutate({ memberId: m.id, accept: true })}
                      disabled={respondSchool.isPending}
                      className="flex items-center justify-center gap-1 rounded-lg bg-success/10 py-2 text-xs font-bold text-success min-h-[36px]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t('coaches.approve')}
                    </button>
                    <button
                      onClick={() => respondSchool.mutate({ memberId: m.id, accept: false })}
                      disabled={respondSchool.isPending}
                      className="flex items-center justify-center gap-1 rounded-lg bg-destructive/10 py-2 text-xs font-bold text-destructive min-h-[36px]"
                    >
                      <X className="h-3.5 w-3.5" /> {t('coaches.decline')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {coaches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">{t('dashboard.noCoachesDesc')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {coaches.map((m: any) => {
              const coach = m.coach;
              const isMe = m.coach_id === user?.id;
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <Avatar url={coach?.avatar_url} name={coach?.full_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {coach?.full_name ?? t('dashboard.coach')}
                      {isMe && <span className="text-xs text-primary ml-1">{t('dashboard.you')}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{coach?.sport ? sportLabel(coach.sport) : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={() => setShowInvite(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground min-h-[44px] active:scale-[0.98] transition-transform"
        >
          <UserPlus className="h-4 w-4" /> {t('dashboard.addCoach')}
        </button>
      </div>

      {/* Invite coach bottom sheet */}
      {showInvite && (
        <>
          <div className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowInvite(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-card shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="font-semibold text-foreground">{t('dashboard.inviteTitle')}</h3>
              <button onClick={() => setShowInvite(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-4 pb-6 space-y-5">
              {/* Option 1: Share link */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{t('dashboard.inviteOptionLink')}</p>
                <ShareLinkButton url={inviteLink} label={t('coaches.shareInvite')} />
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">{t('dashboard.inviteOr')}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Option 2: Code */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{t('dashboard.inviteOptionCode')}</p>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 min-h-[44px]">
                  <span className="flex-1 text-base font-mono font-bold tracking-widest text-foreground">{inviteCode}</span>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(inviteCode ?? '');
                      toast.success(t('common:actions.linkCopied'));
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-background/50 active:scale-[0.95] transition-transform shrink-0"
                  >
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {navigator.share && (
                    <button
                      onClick={async () => {
                        try { await navigator.share({ text: inviteCode ?? '' }); } catch {}
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-background/50 active:scale-[0.95] transition-transform shrink-0"
                    >
                      <Share2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
