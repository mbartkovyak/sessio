import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, Settings, Clock, CalendarDays, Trash2, MessageCircle, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { useTraining, useTrainingMembers, useRemoveTrainingMember, useTrainingSessions, useUpdateTraining, useJoinRequests, useRespondJoinRequest, useCancelSession, useRescheduleSession, useAttendanceSummary, useSessionAttendance } from '@/hooks/training/useTrainings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { notifyUsers } from '@/lib/pushNotify';
import { getFixedTForLanguage, groupUsersByLanguage } from '@/lib/notificationI18n';
import { format } from 'date-fns';
import { DAYS_SHORT, SPORT_ICONS, dayShortLabel, sportLabel } from '@/lib/constants';
import { getDateLocale } from '@/lib/dateFnsLocale';
import { useTranslation } from 'react-i18next';
import { localizeErrorMessage } from '@/lib/localizedErrors';

import Avatar from '@/components/shared/Avatar';
import VenueLink from '@/components/shared/VenueLink';
import ChatView from '@/components/shared/ChatView';
import ProfileSheet from '@/components/shared/ProfileSheet';
import ShareLinkButton from '@/components/shared/ShareLinkButton';
import TrainingForm, { type TrainingFormValues } from '@/components/shared/TrainingForm';
import PageHeader from '@/components/shared/PageHeader';
import { SessioLoader } from '@/components/SessioLogo';
export default function TrainingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('coach');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'chat' ? 'chat' : 'detail';
  const { data: training, isLoading, error: trainingError } = useTraining(id);
  const { data: members = [] } = useTrainingMembers(id);
  const { data: sessions = [] } = useTrainingSessions(id);
  const { user } = useAuth();
  const qc = useQueryClient();
  const removeMember = useRemoveTrainingMember(id!);
  const cancelSession = useCancelSession(id!);
  const rescheduleSession = useRescheduleSession(id!);
  const { data: joinRequests = [] } = useJoinRequests(id);
  const respond = useRespondJoinRequest();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewProfile, setViewProfile] = useState<any>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // All hooks must be called before any early return to avoid "Rendered more hooks" error
  const today = new Date().toISOString().split('T')[0];
  const upcoming = sessions.filter((s: any) => s.session_date >= today).slice(0, 5);
  const regularMembers = members.filter((m: any) => m.role === 'regular');
  const scheduledIds = upcoming.filter((s: any) => s.status !== 'cancelled').map((s: any) => s.id);
  const { data: attendanceSummary = {} } = useAttendanceSummary(scheduledIds);
  const waitlistMembers = members.filter((m: any) => m.role === 'waitlist');

  const inviteLink = training ? `${window.location.origin}/join/${training.invite_code}` : '';
  const daysLabel = training ? (training.days_of_week ?? [training.day_of_week]).map((d: number) => dayShortLabel(DAYS_SHORT[d])).filter(Boolean).join(', ') : '';

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><SessioLoader /></div>;
  if (!training) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-3 px-6">
      <p className="text-muted-foreground">{t('detail.notFound')}</p>
      {trainingError && <p className="text-xs text-destructive text-center max-w-sm">{(trainingError).message}</p>}
      <button onClick={() => navigate('/coach/trainings')} className="text-sm text-primary font-medium">{t('detail.backToTrainings')}</button>
    </div>
  );

  async function handleDelete() {
    setDeleting(true);
    // Notify members via training chat + push before deleting
    if (members.length > 0 && user) {
      const { getOrCreateTrainingConversation } = await import('@/hooks/shared/useConversations');
      try {
        const convId = await getOrCreateTrainingConversation(training.id);
        await supabase.from('messages').insert({
          conversation_id: convId,
          sender_id: user.id,
          content: t('detail.cancelledNotice', { name: training.name }),
        });
      } catch {}
      const memberIds = members.map((m: any) => m.user_id ?? m.profiles?.id).filter(Boolean);
      const usersByLanguage = await groupUsersByLanguage(memberIds);
      for (const [language, userIds] of Object.entries(usersByLanguage)) {
        if (!userIds?.length) continue;
        const tMembers = getFixedTForLanguage(language, 'coach');
        notifyUsers(userIds, {
          title: tMembers('detail.trainingCancelled'),
          body: tMembers('detail.cancelledNotification', { name: training.name }),
          tag: `delete-${training.id}`,
          url: '/player',
        });
      }
    }
    const { error } = await supabase
      .from('trainings')
      .update({ is_active: false })
      .eq('id', training.id);
    if (error) { toast.error(localizeErrorMessage(error, t('common:errors.somethingWentWrong'))); setDeleting(false); }
    else {
      qc.invalidateQueries({ queryKey: ['trainings'] });
      qc.invalidateQueries({ queryKey: ['upcoming-sessions'] });
      qc.invalidateQueries({ queryKey: ['coach-calendar-sessions'] });
      toast.success(t('detail.deletedNotification'));
      navigate('/coach/trainings');
    }
  }

  const isDeleted = !training.is_active;

  return (
    <div className={`flex flex-col bg-background ${activeTab === 'chat' && !showEdit ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'}`}>
      <PageHeader className="rounded-b-2xl">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 text-white shrink-0"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-white truncate">{training.name}</h1>
            <p className="text-xs text-white/60">
              {isDeleted ? t('detail.deleted') : `${sportLabel(training.sport)} · ${daysLabel} · ${training.start_time?.slice(0,5)}`}
            </p>
          </div>
          {!isDeleted && (
            <button onClick={() => { setShowEdit(!showEdit); setSearchParams({}, { replace: true }); }} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 shrink-0">
              <Settings className="h-4.5 w-4.5 text-white/70" />
            </button>
          )}
        </div>
        {!showEdit && (
          <div className="max-w-md mx-auto px-4 pb-2 flex gap-1">
            <button
              onClick={() => setSearchParams({}, { replace: true })}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'detail' ? 'bg-white/20 text-white' : 'text-white/50'}`}
            >
              {t('detail.tabDetails')}
            </button>
            <button
              onClick={() => setSearchParams({ tab: 'chat' }, { replace: true })}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === 'chat' ? 'bg-white/20 text-white' : 'text-white/50'}`}
            >
              <MessageCircle className="h-3.5 w-3.5" /> {t('detail.tabChat')}
            </button>
          </div>
        )}
      </PageHeader>

      {activeTab === 'chat' && !showEdit ? (
        <>
        <ChatView trainingId={training.id} className="flex-1 min-h-0" />
        </>
      ) : showEdit ? (
        <main className="flex-1 pb-24">
          <EditSection training={training} onClose={() => setShowEdit(false)} />
        </main>
      ) : (
        <main className="flex-1 pb-24">
          <div className="max-w-md mx-auto px-4 py-5 space-y-6">

            {/* Training info card */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{SPORT_ICONS[training.sport] ?? '🎯'}</span>
                <div>
                  <p className="font-semibold text-foreground">{training.name}</p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{t(`common:trainingType.${training.type}`)}</span>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {(training as any).coach?.full_name && (
                  <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 shrink-0" /> {(training as any).coach.full_name}</div>
                )}
                <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 shrink-0" /> {daysLabel}</div>
                <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 shrink-0" /> {training.start_time?.slice(0,5)} – {training.end_time?.slice(0,5)}</div>
                {training.venue && <div className="flex items-center gap-2"><VenueLink venue={training.venue} className="text-sm text-muted-foreground" /></div>}
                {training.type === 'group' && (
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    {t('detail.participantsCount', { count: regularMembers.length, max: training.max_players ?? '∞' })}
                  </div>
                )}
              </div>
            </div>

            {isDeleted && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-center">
                <p className="text-sm font-medium text-destructive">{t('detail.cancelledInfo')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('detail.chatStillAvailable')}</p>
              </div>
            )}

            {!isDeleted && (
              <>
                {/* Invite */}
                <div>
                  <h2 className="font-semibold text-foreground text-sm mb-3">{t('detail.inviteAthletes')}</h2>
                  <ShareLinkButton url={inviteLink} />
                </div>

                {/* Join Requests */}
                {joinRequests.length > 0 && (
                  <div>
                    <h2 className="font-semibold text-foreground text-sm mb-3">{t('detail.joinRequests')} <span className="text-muted-foreground font-normal">({joinRequests.length})</span></h2>
                    <div className="space-y-2">
                      {joinRequests.map((req: any) => {
                        const p = req.profiles;
                        return (
                          <div key={req.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                            <button onClick={() => setViewProfile(p)} className="flex items-center gap-3 mb-2.5 text-left w-full">
                              <Avatar url={p?.avatar_url} name={p?.full_name} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{p?.full_name ?? p?.email ?? t('common:profile.unknown')}</p>
                              </div>
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => respond.mutate({ requestId: req.id, trainingId: training.id, userId: req.user_id, accept: true, trainingName: training.name })}
                                className="flex items-center justify-center gap-1 rounded-lg bg-success/10 py-2 text-xs font-bold text-success min-h-[36px]"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> {t('detail.accept')}
                              </button>
                              <button
                                onClick={() => respond.mutate({ requestId: req.id, trainingId: training.id, userId: req.user_id, accept: false, trainingName: training.name })}
                                className="flex items-center justify-center gap-1 rounded-lg bg-destructive/10 py-2 text-xs font-bold text-destructive min-h-[36px]"
                              >
                                {t('detail.decline')}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Members */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-foreground text-sm">{t('detail.members')} <span className="text-muted-foreground font-normal">({members.length})</span></h2>
                  </div>
                  {members.length === 0 && joinRequests.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center">
                      <p className="text-sm text-muted-foreground">{t('detail.noMembers')}</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-card divide-y divide-border">
                      {members.map((m: any) => {
                        const p = m.profiles;
                        return (
                          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                            <button onClick={() => setViewProfile(p)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                              <Avatar url={p?.avatar_url} name={p?.full_name} size="sm" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{p?.full_name ?? p?.email ?? t('common:profile.unknown')}</p>
                                {m.role === 'waitlist' && (
                                  <span className="text-xs text-warning font-medium">{t('detail.waitlist')}</span>
                                )}
                              </div>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => navigate(`/coach/dm/${p?.id}`)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                                title={t('detail.directMessage')}
                              >
                                <MessageCircle className="h-3.5 w-3.5 text-primary" />
                              </button>
                              <button
                                onClick={() => { if (confirm(t('detail.removeConfirm', { name: p?.full_name ?? '' }))) removeMember.mutate(m.id); }}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors"
                                title={t('detail.remove')}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Upcoming lessons */}
                <div>
                  <h2 className="font-semibold text-foreground text-sm mb-3">{t('detail.upcomingLessons')}</h2>
                  {upcoming.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('detail.noUpcomingLessons')}</p>
                  ) : (
                    <div className="space-y-2">
                      {upcoming.map((s: any) => {
                        const isCancelled = s.status === 'cancelled';
                        const summary = attendanceSummary[s.id];
                        const isExpanded = expandedSession === s.id;
                        return (
                          <div key={s.id} className={`rounded-xl border bg-card overflow-hidden ${isCancelled ? 'border-destructive/20 opacity-60' : 'border-border'}`}>
                            <div className="flex items-center gap-3 px-4 py-3">
                              <button
                                onClick={() => !isCancelled && setExpandedSession(isExpanded ? null : s.id)}
                                className="flex-1 min-w-0 text-left"
                              >
                                <p className={`text-sm font-medium ${isCancelled ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                  {format(new Date(s.session_date + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() })}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-muted-foreground">{s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</span>
                                  {!isCancelled && summary && summary.total > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success">
                                      <CheckCircle2 className="h-3 w-3" />
                                      {t('detail.attendanceSummary', { confirmed: summary.confirmed, total: summary.total })}
                                    </span>
                                  )}
                                </div>
                              </button>
                              {isCancelled ? (
                                <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">{t('detail.cancelled')}</span>
                              ) : (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      const newDate = prompt(t('home.rescheduleDate'), s.session_date);
                                      if (!newDate) return;
                                      const newStart = prompt(t('home.rescheduleStart'), s.start_time?.slice(0,5));
                                      if (!newStart) return;
                                      const newEnd = prompt(t('home.rescheduleEnd'), s.end_time?.slice(0,5));
                                      if (!newEnd) return;
                                      if (newDate === s.session_date && newStart === s.start_time?.slice(0,5) && newEnd === s.end_time?.slice(0,5)) return;
                                      rescheduleSession.mutate({
                                        sessionId: s.id, trainingName: training.name,
                                        oldDate: s.session_date, newDate, newStartTime: newStart, newEndTime: newEnd,
                                      });
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                                    title={t('common:actions.reschedule')}
                                  >
                                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!confirm(t('calendar.cancelConfirm', { name: training.name, date: format(new Date(s.session_date + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() }) }))) return;
                                      cancelSession.mutate({ sessionId: s.id, trainingName: training.name, sessionDate: s.session_date });
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors"
                                    title={t('common:actions.cancelSession')}
                                  >
                                    <X className="h-3.5 w-3.5 text-destructive" />
                                  </button>
                                </div>
                              )}
                            </div>
                            {isExpanded && <SessionAttendancePanel sessionId={s.id} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Delete */}
                <div className="space-y-2 border-t border-border pt-6">
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-medium text-destructive min-h-[44px]"
                    >
                      <Trash2 className="h-4 w-4" /> {t('detail.deleteTraining')}
                    </button>
                  ) : (
                    <div className="rounded-xl border border-destructive/30 p-4 space-y-3">
                      <p className="text-sm text-destructive text-center font-medium">{t('detail.deleteConfirm')}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setConfirmDelete(false)} className="rounded-xl border border-border py-2.5 text-sm font-medium text-foreground min-h-[44px]">{t('common:actions.cancel')}</button>
                        <button onClick={handleDelete} disabled={deleting} className="rounded-xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground min-h-[44px] disabled:opacity-60">
                          {deleting ? t('detail.deleting') : t('detail.delete')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        </main>
      )}

      {(activeTab !== 'chat' || showEdit) && <CoachBottomNav />}
      {viewProfile && <ProfileSheet profile={viewProfile} onClose={() => setViewProfile(null)} />}
    </div>
  );
}

// ── Session Attendance Panel ──

function SessionAttendancePanel({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation('coach');
  const { data: attendance = [], isLoading } = useSessionAttendance(sessionId);

  if (isLoading) return <div className="px-4 py-3 border-t border-border"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></div>;
  if (attendance.length === 0) return (
    <div className="px-4 py-3 border-t border-border">
      <p className="text-xs text-muted-foreground">{t('detail.noAttendance')}</p>
    </div>
  );

  const sorted = [...attendance].sort((a, b) => {
    const order = { confirmed: 0, pending: 1, declined: 2 };
    return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
  });

  return (
    <div className="border-t border-border divide-y divide-border">
      {sorted.map((a) => (
        <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
          <Avatar url={a.profiles?.avatar_url} name={a.profiles?.full_name} size="xs" />
          <span className="flex-1 text-sm text-foreground truncate">{a.profiles?.full_name ?? t('common:profile.unknown')}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            a.status === 'confirmed' ? 'bg-success/10 text-success' :
            a.status === 'declined' ? 'bg-destructive/10 text-destructive' :
            'bg-warning/10 text-warning'
          }`}>
            {a.status === 'confirmed' ? t('detail.statusConfirmed') :
             a.status === 'declined' ? t('detail.statusDeclined') :
             t('detail.statusPending')}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Edit Section ──

function EditSection({ training, onClose }: { training: any; onClose: () => void }) {
  const { t } = useTranslation('coach');
  const qc = useQueryClient();
  const update = useUpdateTraining(training.id);

  const initialValues: Partial<TrainingFormValues> = training ? {
    name: training.name ?? '',
    type: training.type ?? 'group',
    sport: training.sport ?? 'Tennis',
    venue: training.venue ?? '',
    start_time: training.start_time?.slice(0, 5) ?? '09:00',
    end_time: training.end_time?.slice(0, 5) ?? '10:00',
    max_players: training.max_players ?? 6,
    is_recurring: training.is_recurring ?? true,
    days_of_week: training.days_of_week ?? [training.day_of_week ?? 0],
    start_date: training.start_date ?? '',
    end_date: training.end_date ?? '',
    booking_mode: training.booking_mode ?? 'instant',
    visibility: training.visibility ?? 'private',
    confirmation_window_hours: training.confirmation_window_hours ?? 48,
    day_schedules: training.day_schedules ?? null,
  } : undefined;

  async function handleSave(form: TrainingFormValues) {
    const oldTime = training.start_time?.slice(0, 5);
    const oldEnd = training.end_time?.slice(0, 5);
    const oldDays = JSON.stringify(training.days_of_week ?? [training.day_of_week ?? 0]);

    await update.mutateAsync({
      name: form.name, sport: form.sport, venue: form.venue,
      type: form.type,
      day_of_week: form.days_of_week[0], days_of_week: form.days_of_week,
      start_time: form.start_time + ':00', end_time: form.end_time + ':00',
      max_players: form.type === 'group' ? form.max_players : undefined,
      booking_mode: form.booking_mode, visibility: form.visibility,
      confirmation_window_hours: form.confirmation_window_hours,
      day_schedules: form.day_schedules || null,
    });

    // Notify members if schedule changed
    const timeChanged = form.start_time !== oldTime || form.end_time !== oldEnd;
    const daysChanged = JSON.stringify(form.days_of_week) !== oldDays;
    if (timeChanged || daysChanged) {
      const days = form.days_of_week.map(d => dayShortLabel(DAYS_SHORT[d])).join(', ');
      const msg = t('detail.scheduleUpdated', { name: training.name, days, time: `${form.start_time}–${form.end_time}` });
      try {
        const { getOrCreateTrainingConversation } = await import('@/hooks/shared/useConversations');
        const convId = await getOrCreateTrainingConversation(training.id);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('messages').insert({ conversation_id: convId, sender_id: user.id, content: msg });
        }
      } catch {}
    }

    // Update future session times if time changed
    if (timeChanged) {
      const today = new Date().toISOString().split('T')[0];
      const { error: sessErr } = await supabase
        .from('training_sessions')
        .update({ start_time: form.start_time + ':00', end_time: form.end_time + ':00' })
        .eq('training_id', training.id)
        .gte('session_date', today)
        .eq('status', 'scheduled');
      if (sessErr) toast.error(localizeErrorMessage(sessErr, t('common:errors.somethingWentWrong')));
    }

    // Regenerate sessions if days changed (new days need new sessions)
    if (daysChanged) {
      try { await supabase.rpc('generate_sessions_for_training', { p_training_id: training.id }); } catch {}
    }

    qc.invalidateQueries({ queryKey: ['training-sessions', training.id] });
    qc.invalidateQueries({ queryKey: ['my-upcoming-sessions'] });
    qc.invalidateQueries({ queryKey: ['coach-calendar-sessions'] });
    toast.success(t('detail.trainingUpdated'));
    onClose();
  }

  return (
    <div className="max-w-md mx-auto px-4 py-5">
      <TrainingForm
        mode="edit"
        initialValues={initialValues}
        onSubmit={handleSave}
        submitting={update.isPending}
        onCancel={onClose}
      />
    </div>
  );
}
