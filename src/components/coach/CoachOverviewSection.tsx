import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle2, Users, CalendarDays, X, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainings, useAllCoachJoinRequests, useRespondJoinRequest } from '@/hooks/training/useTrainings';
import { useMySchoolMembership } from '@/hooks/school/useSchools';
import { useUpcomingSessions, type UpcomingSession } from '@/hooks/training/useTodaySessions';
import Avatar from '@/components/shared/Avatar';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SPORT_ICONS, sportLabel } from '@/lib/constants';
import { getDateLocale } from '@/lib/dateFnsLocale';
import { localizeErrorMessage } from '@/lib/localizedErrors';

export default function CoachOverviewSection() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('coach');
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: trainings = [], isLoading: trainingsLoading } = useTrainings();
  const { data: joinRequests = [], isLoading: joinRequestsLoading } = useAllCoachJoinRequests();
  const respond = useRespondJoinRequest();
  const { data: upcomingSessions = [], isLoading: sessionsLoading } = useUpcomingSessions(profile?.id, 5);
  const { data: schoolMembership } = useMySchoolMembership();
  const qc = useQueryClient();
  const trainingIds = trainings.map((tr: any) => tr.id);
  const { data: totalAthletes = 0, isPending: athletesPending } = useQuery({
    queryKey: ['coach-total-athletes', trainingIds],
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
    const newStart = prompt(t('home.rescheduleStart'), session.start_time?.slice(0, 5));
    if (!newStart) return;
    const newEnd = prompt(t('home.rescheduleEnd'), session.end_time?.slice(0, 5));
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
          content: t('home.rescheduledMessage', { name: training?.name, date: newDateLabel, time: newStart }),
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

  // athletesPending (not isLoading) because the query starts disabled — isLoading would be
  // false in the gap between trainings loading and athletes query starting, flashing 0s.
  // Guard with trainingIds.length so coaches with 0 trainings don't spin forever.
  const isLoading = trainingsLoading || joinRequestsLoading || sessionsLoading
    || (trainingIds.length > 0 && athletesPending);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {t('home.greeting', { name: profile?.first_name ?? t('home.defaultName') })}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('home.overview')}</p>
      </div>

      {/* School membership banner */}
      {!isSchoolOwner && schoolMembership?.schools && (
        <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-sm"
          style={{ border: '1px solid hsl(193 30% 50% / 0.15)' }}>
          <Avatar url={(schoolMembership.schools as any).logo_url} name={(schoolMembership.schools as any).name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm truncate">{(schoolMembership.schools as any).name}</p>
            <p className="text-xs text-muted-foreground">
              {[
                (schoolMembership.schools as any).sport ? sportLabel((schoolMembership.schools as any).sport) : null,
                (schoolMembership.schools as any).city,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t('home.athletes'), value: totalAthletes, style: 'accent' as const },
          { label: t('home.lessons'), value: trainings.length, style: 'primary' as const },
        ].map(({ label, value, style }) => (
          <div key={label} className={`rounded-2xl p-4 text-center shadow-md ${
            style === 'accent' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'
          }`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs mt-1 font-medium opacity-80">{label}</div>
          </div>
        ))}
      </div>

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
        {upcomingSessions.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm text-center" style={{ border: '1px solid hsl(203 20% 90%)' }}>
            <p className="text-sm text-muted-foreground">{t('home.noUpcoming')}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {(() => {
                let lastDate = '';
                return upcomingSessions.slice(0, 4).map((session) => {
                  const training = session.trainings;
                  const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';
                  const showLabel = session.session_date !== lastDate;
                  lastDate = session.session_date;
                  const label = session.session_date === today ? t('common:calendar.today')
                    : session.session_date === tomorrow ? t('common:calendar.tomorrow')
                    : format(new Date(session.session_date + 'T00:00:00'), 'EEEE, MMM d', { locale: getDateLocale() });

                  return (
                    <div key={session.id}>
                      {showLabel && <p className="text-xs font-medium text-muted-foreground mt-2 mb-1">{label}</p>}
                      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3">
                          <button
                            onClick={() => navigate(`/coach/trainings/${training?.id}`)}
                            className="flex flex-1 items-center gap-3 text-left min-w-0"
                          >
                            <span className="text-xl shrink-0">{sportIcon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm truncate text-foreground">{training?.name}</p>
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary shrink-0">{t(`common:trainingType.${training?.type}`)}</span>
                              </div>
                              <span className="text-xs text-muted-foreground mt-0.5 block">
                                {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
                              </span>
                            </div>
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => handleRescheduleSession(session)} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors" title={t('common:actions.reschedule')}>
                              <CalendarDays className="h-3.5 w-3.5 text-primary" />
                            </button>
                            <button onClick={() => handleCancelSession(session)} className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors" title={t('common:actions.cancelSession')}>
                              <X className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>
                        {training?.venue && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(training.venue)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 border-t border-border px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                          >
                            <MapPin className="h-3 w-3" /> {t('home.navigateTo', { venue: training.venue.split(',')[0] })}
                          </a>
                        )}
                      </div>
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
