import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronRight, CalendarDays, X, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import CoachHeader from '@/components/coach/CoachHeader';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import Avatar from '@/components/shared/Avatar';
import VenueLink from '@/components/shared/VenueLink';
import ShareLinkButton from '@/components/shared/ShareLinkButton';
import AttendanceSheet from '@/components/coach/AttendanceSheet';
import { SessioLoader } from '@/components/SessioLogo';

import { useSessionDetail } from '@/hooks/training/useTodaySessions';
import { useSessionAttendance, useTrainingMembers, useCancelSession, useRescheduleSession } from '@/hooks/training/useTrainings';
import { useSchoolAbonaments, useSessionAbonamentUsage, useDeductSession, useUndoDeduction, isAbonamentActive } from '@/hooks/training/useAbonaments';
import { SPORT_ICONS } from '@/lib/constants';
import { getDateLocale } from '@/lib/dateFnsLocale';

export default function SessionDetail() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('coach');
  const { data: session, isLoading } = useSessionDetail(sessionId);
  const training = session?.trainings;
  const { data: attendance = [], isLoading: attendanceLoading } = useSessionAttendance(sessionId);
  const { data: members = [] } = useTrainingMembers(training?.id);
  const { data: playerAbonaments = [] } = useSchoolAbonaments(training?.school_id);
  const { data: usageRecords = [] } = useSessionAbonamentUsage(sessionId);
  const deduct = useDeductSession();
  const undo = useUndoDeduction();

  const cancelSession = useCancelSession(training?.id ?? '');
  const rescheduleSession = useRescheduleSession(training?.id ?? '');
  const [showAttendance, setShowAttendance] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <CoachHeader title="" back />
        <div className="flex flex-1 items-center justify-center"><SessioLoader /></div>
      </div>
    );
  }

  if (!session || !training) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <CoachHeader title="" back />
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="text-sm text-muted-foreground">{t('detail.notFound')}</p>
        </div>
      </div>
    );
  }

  const sportIcon = SPORT_ICONS[training.sport] ?? '🎯';
  const dateLabel = format(new Date(session.session_date + 'T00:00:00'), 'EEEE, d MMM', { locale: getDateLocale() });
  const isCancelled = session.status === 'cancelled';
  const today = new Date().toISOString().split('T')[0];
  const isPast = session.session_date < today || (session.session_date === today && new Date(`${session.session_date}T${session.end_time}`) < new Date());
  const memberUserIds = new Set(members.map((m: any) => m.user_id));

  // Attendance stats
  const confirmed = attendance.filter(a => a.status === 'confirmed').length;
  const total = attendance.length;

  // Abonament lookups
  const abonamentByPlayer = new Map<string, any>();
  for (const pa of playerAbonaments) {
    if (isAbonamentActive(pa)) abonamentByPlayer.set(pa.player_id, pa);
  }
  const usedAbonamentIds = new Set(usageRecords.map((u: any) => u.player_abonament_id));

  const sorted = [...attendance].sort((a, b) => {
    const order = { confirmed: 0, pending: 1, declined: 2, no_show: 3 };
    return (order[a.status as keyof typeof order] ?? 4) - (order[b.status as keyof typeof order] ?? 4);
  });

  // Session invite link
  const sessionInviteLink = `${window.location.origin}/join/${training.invite_code}?session=${sessionId}`;

  function handleCancel() {
    const dl = format(new Date(session.session_date + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() });
    if (!confirm(t('home.cancelConfirm', { name: training.name, date: dl }))) return;
    cancelSession.mutate({ sessionId: session.id, trainingName: training.name, sessionDate: dl });
  }

  function handleReschedule() {
    const newDate = prompt(t('home.rescheduleDate'), session.session_date);
    if (!newDate) return;
    const newStart = prompt(t('home.rescheduleStart'), session.start_time?.slice(0, 5));
    if (!newStart) return;
    const newEnd = prompt(t('home.rescheduleEnd'), session.end_time?.slice(0, 5));
    if (!newEnd) return;
    if (newDate === session.session_date && newStart === session.start_time?.slice(0, 5) && newEnd === session.end_time?.slice(0, 5)) return;
    rescheduleSession.mutate({
      sessionId: session.id, trainingName: training.name,
      oldDate: session.session_date, newDate, newStartTime: newStart, newEndTime: newEnd,
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CoachHeader title={training.name} subtitle={dateLabel} back />

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 pt-4 space-y-4">

          {/* Session info card */}
          <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: '1px solid hsl(203 20% 90%)' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{sportIcon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{training.name}</p>
                <p className="text-sm text-muted-foreground">
                  {dateLabel} · {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
                </p>
              </div>
            </div>
            {training.venue && (
              <div className="text-sm mb-2">
                <VenueLink venue={training.venue} className="text-foreground" />
              </div>
            )}
            {isCancelled && (
              <p className="text-sm font-medium text-destructive mt-2">{t('session.cancelled')}</p>
            )}
            {isPast && !isCancelled && (
              <p className="text-sm text-muted-foreground mt-2">{t('session.pastSession')}</p>
            )}
          </div>

          {/* View training link */}
          <button
            onClick={() => navigate(`/coach/trainings/${training.id}`)}
            className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3.5 shadow-sm text-sm font-semibold text-foreground active:scale-[0.98] transition-transform"
            style={{ border: '1px solid hsl(203 20% 90%)' }}
          >
            {t('session.viewTraining')}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Share session invite */}
          {!isCancelled && !isPast && (
            <ShareLinkButton url={sessionInviteLink} label={t('session.shareSessionLink')} />
          )}

          {/* Actions: cancel / reschedule (future sessions only) */}
          {!isCancelled && !isPast && (
            <div className="flex gap-2">
              <button
                onClick={handleReschedule}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-medium text-foreground shadow-sm active:scale-[0.97] transition-transform"
                style={{ border: '1px solid hsl(203 20% 90%)' }}
              >
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                {t('common:actions.reschedule')}
              </button>
              <button
                onClick={handleCancel}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-medium text-destructive shadow-sm active:scale-[0.97] transition-transform"
                style={{ border: '1px solid hsl(203 20% 90%)' }}
              >
                <X className="h-3.5 w-3.5" />
                {t('common:actions.cancelSession')}
              </button>
            </div>
          )}

          {/* Mark / Change attendance (past sessions) */}
          {isPast && !isCancelled && (
            <button
              onClick={() => setShowAttendance(true)}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold active:scale-[0.97] transition-transform ${
                session.attendance_marked_at
                  ? 'bg-white border border-border text-foreground shadow-sm'
                  : 'bg-amber-50 border border-amber-200 text-amber-800'
              }`}
              style={session.attendance_marked_at ? { border: '1px solid hsl(203 20% 90%)' } : undefined}
            >
              <ClipboardCheck className="h-4 w-4" />
              {session.attendance_marked_at ? t('session.changeAttendance') : t('home.markAttendance')}
            </button>
          )}

          {/* Participants section */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('session.participants')}</h2>
              {total > 0 && (
                <span className="text-xs font-medium text-muted-foreground">
                  {t('session.participantCount', { confirmed, total })}
                </span>
              )}
            </div>

            {attendanceLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />)}
              </div>
            ) : sorted.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm text-center" style={{ border: '1px solid hsl(203 20% 90%)' }}>
                <p className="text-sm text-muted-foreground">{t('session.noParticipants')}</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-white shadow-sm divide-y divide-border overflow-hidden" style={{ border: '1px solid hsl(203 20% 90%)' }}>
                {sorted.map(a => {
                  const isGuest = !memberUserIds.has(a.user_id);
                  const playerAbonament = abonamentByPlayer.get(a.user_id);
                  const isDeducted = playerAbonament ? usedAbonamentIds.has(playerAbonament.id) : false;

                  return (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar url={a.profiles?.avatar_url} name={a.profiles?.full_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground truncate">
                            {a.profiles?.full_name ?? t('common:profile.unknown')}
                          </span>
                          {isGuest && (
                            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 shrink-0">
                              {t('session.guest')}
                            </span>
                          )}
                        </div>
                        {playerAbonament && (
                          <span className="text-[10px] text-muted-foreground">
                            {playerAbonament.sessions_remaining != null
                              ? t('abonaments.remaining', { remaining: playerAbonament.sessions_remaining, total: playerAbonament.sessions_total })
                              : t('abonaments.unlimited')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Abonament deducted → green "Attended" toggle */}
                        {playerAbonament && isDeducted ? (
                          <button
                            onClick={() => undo.mutate({ playerAbonamentId: playerAbonament.id, sessionId: session.id, schoolId: training.school_id! })}
                            disabled={undo.isPending}
                            className="flex items-center gap-0.5 rounded-full bg-success px-2 py-0.5 text-xs font-bold text-success-foreground min-h-[22px] disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3 w-3" /> {t('abonaments.markAttended')}
                          </button>
                        ) : (
                          <>
                            {/* Signed up = default, no badge. Only show badge for cancelled/no-show */}
                            {(a.status === 'declined' || a.status === 'no_show') && (() => {
                              if (a.status === 'no_show') return (
                                <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">{t('detail.statusNoShow')}</span>
                              );
                              // Determine if late cancel
                              const sessionStart = new Date(`${session.session_date}T${session.start_time}`);
                              const deadlineMs = (training.cancel_deadline_hours ?? 0) * 60 * 60 * 1000;
                              const cancelDeadline = new Date(sessionStart.getTime() - deadlineMs);
                              const declinedAt = a.declined_at ? new Date(a.declined_at) : null;
                              const isLate = declinedAt && training.cancel_deadline_hours && declinedAt > cancelDeadline;
                              return (
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isLate ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                                  {isLate ? t('detail.statusLateCancelled') : t('detail.statusCancelled')}
                                </span>
                              );
                            })()}
                            {/* Abonament deduct button for past sessions */}
                            {playerAbonament && isPast && (
                              <button
                                onClick={() => deduct.mutate({ playerAbonamentId: playerAbonament.id, sessionId: session.id, schoolId: training.school_id! })}
                                disabled={deduct.isPending || (playerAbonament.sessions_remaining != null && playerAbonament.sessions_remaining <= 0)}
                                className="flex items-center gap-0.5 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground min-h-[22px] disabled:opacity-30"
                              >
                                {t('abonaments.markAttended')}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <CoachBottomNav />

      {showAttendance && (
        <AttendanceSheet
          session={session as any}
          onClose={() => setShowAttendance(false)}
        />
      )}
    </div>
  );
}
