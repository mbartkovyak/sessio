import { format, addWeeks, subWeeks } from 'date-fns';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizeTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchool } from '@/hooks/school/useSchools';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { getDateLocale } from '@/lib/dateFnsLocale';
import { useTranslation } from 'react-i18next';
import CoachHeader from '@/components/coach/CoachHeader';
import NewLessonButton from '@/components/coach/NewLessonButton';
import CoachSessionCard from '@/components/coach/CoachSessionCard';
import CalendarGrid, { type CalendarGridHandle } from '@/components/shared/CalendarGrid';
import { localizeErrorMessage } from '@/lib/localizedErrors';
import { useAttendanceSummary } from '@/hooks/training/useTrainings';

function useCoachSessions(coachId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: ['coach-calendar-sessions', coachId, from, to],
    enabled: !!coachId,
    placeholderData: (prev: any) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*, trainings!inner(id, name, sport, venue, type, coach_id, max_players, school_id, is_active, schools(name))')
        .eq('trainings.coach_id', coachId!)
        .eq('trainings.is_active', true)
        .gte('session_date', from)
        .lte('session_date', to)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

function useSchoolSessions(schoolId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: ['school-calendar-sessions', schoolId, from, to],
    enabled: !!schoolId,
    placeholderData: (prev: any) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*, trainings!inner(id, name, sport, venue, type, coach_id, max_players, school_id, is_active, schools(name), coach:profiles(full_name))')
        .eq('trainings.school_id', schoolId!)
        .eq('trainings.is_active', true)
        .gte('session_date', from)
        .lte('session_date', to)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

const WINDOW_STEP = 4; // weeks per load

export default function CoachCalendar() {
  const navigate = useNavigate();
  const { t } = useTranslation('coach');
  const { user, profile } = useAuth();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: school } = useMySchool();

  const [pastWeeks, setPastWeeks] = useState(WINDOW_STEP);
  const [futureWeeks, setFutureWeeks] = useState(WINDOW_STEP);
  const now = new Date();
  const from = format(subWeeks(now, pastWeeks), 'yyyy-MM-dd');
  const to = format(addWeeks(now, futureWeeks), 'yyyy-MM-dd');

  const { data: coachSessions = [], isLoading: coachLoading, isFetching: coachFetching } = useCoachSessions(user?.id, from, to);
  const { data: schoolSessions = [], isLoading: schoolLoading, isFetching: schoolFetching } = useSchoolSessions(isSchoolOwner ? school?.id : undefined, from, to);

  const handleLoadPast = useCallback(() => setPastWeeks(w => w + WINDOW_STEP), []);
  const handleLoadFuture = useCallback(() => setFutureWeeks(w => w + WINDOW_STEP), []);
  const isExpandingWindow = (coachFetching && !coachLoading) || (schoolFetching && !schoolLoading);

  const canCreate = true;
  const today = format(new Date(), 'yyyy-MM-dd');
  const calendarRef = useRef<CalendarGridHandle>(null);
  const qc = useQueryClient();

  async function handleCancelSession(session: any) {
    const training = session.trainings;
    const dateLabel = format(new Date(session.session_date + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() });
    if (!confirm(t('calendar.cancelConfirm', { name: training?.name, date: dateLabel }))) return;
    const { error } = await supabase
      .from('training_sessions')
      .update({ status: 'cancelled' })
      .eq('id', session.id);
    if (error) { toast.error(localizeErrorMessage(error, t('common:errors.somethingWentWrong'))); return; }
    // Notify in training chat
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
    qc.invalidateQueries({ queryKey: ['coach-calendar-sessions'] });
    qc.invalidateQueries({ queryKey: ['school-calendar-sessions'] });
    qc.invalidateQueries({ queryKey: ['training-sessions', training?.id] });
    toast.success(t('calendar.sessionCancelled'));
  }

  async function handleRescheduleSession(session: any) {
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
    qc.invalidateQueries({ queryKey: ['coach-calendar-sessions'] });
    qc.invalidateQueries({ queryKey: ['school-calendar-sessions'] });
    qc.invalidateQueries({ queryKey: ['training-sessions', training?.id] });
    toast.success(t('calendar.sessionRescheduled'));
  }

  // School owner: merge own sessions + school sessions (deduplicate)
  const sessions = useMemo(() => {
    if (!isSchoolOwner) return coachSessions;
    const ids = new Set(coachSessions.map((s: any) => s.id));
    return [...coachSessions, ...schoolSessions.filter((s: any) => !ids.has(s.id))];
  }, [coachSessions, schoolSessions, isSchoolOwner]);

  const scheduledSessionIds = useMemo(() => sessions.filter((s: any) => s.status !== 'cancelled').map((s: any) => s.id), [sessions]);
  const { data: attendanceSummary = {} } = useAttendanceSummary(scheduledSessionIds);

  const isLoading = coachLoading || (isSchoolOwner && schoolLoading);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CoachHeader
        title={t('calendar.title')}
        left={
          <button
            onClick={() => calendarRef.current?.scrollToToday()}
            className="flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white transition-all active:scale-[0.95]"
          >
            <ArrowDown className="h-3 w-3" />
            {t('common:calendar.today')}
          </button>
        }
        right={canCreate ? <NewLessonButton /> : undefined}
      />

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4 space-y-1">
          <CalendarGrid
            ref={calendarRef}
            items={sessions}
            getDate={(s: any) => s.session_date}
            isLoading={isLoading}
            onLoadPast={handleLoadPast}
            onLoadFuture={handleLoadFuture}
            isLoadingPast={isExpandingWindow}
            isLoadingFuture={isExpandingWindow}
            emptyState={
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📅</div>
                <p className="font-medium text-foreground">{t('calendar.noUpcoming')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {canCreate ? t('calendar.noUpcomingDesc') : t('calendar.noUpcomingSchool')}
                </p>
                {canCreate && (
                  <button
                    onClick={() => navigate('/coach/trainings/new')}
                    className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground min-h-[44px]"
                  >
                    {t('calendar.createTraining')}
                  </button>
                )}
              </div>
            }
            renderItem={(session: any) => {
              const isPast = session.session_date < today;
              return (
                <CoachSessionCard
                  key={session.id}
                  session={session}
                  attendance={attendanceSummary[session.id]}
                  showActions={!isPast}
                  coachName={isSchoolOwner && session.trainings?.coach?.full_name ? t('trainings.coachName', { name: session.trainings.coach.full_name }) : undefined}
                  onCancel={handleCancelSession}
                  onReschedule={handleRescheduleSession}
                />
              );
            }}
          />
        </div>
      </main>

      <CoachBottomNav />
    </div>
  );
}
