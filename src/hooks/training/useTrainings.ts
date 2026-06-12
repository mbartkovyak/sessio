import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import i18n from '@/i18n';
import { toast } from 'sonner';
import { notifyUsers } from '@/lib/pushNotify';
import { getFixedTForCurrentLanguage, getFixedTForUser, getFixedTForLanguage } from '@/lib/notificationI18n';
import { localizeErrorMessage } from '@/lib/localizedErrors';
import { getDateLocale } from '@/lib/dateFnsLocale';
import type { Tables } from '@/integrations/supabase/types';

type CoachProfile = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url'>;
type CoachProfileExtended = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url' | 'bio' | 'sport' | 'city'>;
type SchoolBasic = Pick<Tables<'schools'>, 'id' | 'name'>;
type MemberProfile = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url' | 'email'>;

type TrainingWithSchool = Tables<'trainings'> & { schools: SchoolBasic | null };
type TrainingWithSchoolAndCoach = Tables<'trainings'> & { schools: SchoolBasic | null; coach: CoachProfile | null };
type TrainingDetail = Tables<'trainings'> & { schools: SchoolBasic | null; coach: CoachProfileExtended | null };

type TrainingMemberWithTraining = Tables<'training_members'> & {
  trainings: (Tables<'trainings'> & { coach: CoachProfile | null }) | null;
};
type TrainingMemberWithProfile = Tables<'training_members'> & { profiles: MemberProfile | null };

type SessionAttendanceWithProfile = Tables<'session_attendance'> & {
  profiles: Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url'> | null;
};

type TrainingBasic = Pick<Tables<'trainings'>, 'id' | 'name' | 'sport' | 'venue' | 'max_players' | 'confirmation_window_hours'> & { coach: CoachProfile | null };
type SessionAttendanceWithSession = Tables<'session_attendance'> & {
  training_sessions: (Tables<'training_sessions'> & { trainings: TrainingBasic | null }) | null;
};

type JoinRequestWithProfile = Tables<'join_requests'> & { profiles: MemberProfile | null };
type JoinRequestWithProfileAndTraining = Tables<'join_requests'> & {
  profiles: MemberProfile | null;
  trainings: Pick<Tables<'trainings'>, 'id' | 'name' | 'sport' | 'coach_id'>;
};

export function useTrainings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Realtime: invalidate when a training is created/updated for this coach
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`trainings:coach:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trainings',
        filter: `coach_id=eq.${user.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['trainings', user.id] });
        qc.invalidateQueries({ queryKey: ['upcoming-sessions'] });
        qc.invalidateQueries({ queryKey: ['coach-calendar-sessions'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return useQuery({
    queryKey: ['trainings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings')
        .select('*, schools(id, name)')
        .eq('coach_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TrainingWithSchool[];
    },
  });
}

/** All trainings including deleted — for messages (chat persists after deletion) */
export function useAllTrainings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all-trainings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings')
        .select('*, schools(id, name)')
        .eq('coach_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TrainingWithSchool[];
    },
  });
}

export function useSchoolTrainings(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['school-trainings', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings')
        .select('*, schools(id, name), coach:profiles(id, full_name, avatar_url)')
        .eq('school_id', schoolId!)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as TrainingWithSchoolAndCoach[];
    },
  });
}

export function useTraining(id: string | undefined) {
  return useQuery({
    queryKey: ['training', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainings')
        .select('*, schools(id, name), coach:profiles(id, full_name, avatar_url, bio, sport, city)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as TrainingDetail;
    },
  });
}

export function useMyTrainings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-trainings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_members')
        .select('*, trainings(*, coach:profiles(id, full_name, avatar_url))')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data ?? []) as TrainingMemberWithTraining[];
    },
  });
}

export function useCreateTraining() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await supabase
        .from('trainings')
        .insert({ ...values, coach_id: values.coach_id || user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Tables<'trainings'>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainings'] });
      qc.invalidateQueries({ queryKey: ['school-trainings'] });
      toast.success(i18n.t('toast.trainingCreated', { ns: 'common' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

export function useUpdateTraining(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { error } = await supabase
        .from('trainings')
        .update(values)
        .eq('id', trainingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainings'] });
      qc.invalidateQueries({ queryKey: ['training', trainingId] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

export function useTrainingMembers(trainingId: string | undefined) {
  return useQuery({
    queryKey: ['training-members', trainingId],
    enabled: !!trainingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_members')
        .select('*, profiles:user_id(id, full_name, avatar_url, email, phone, bio, sport, city, is_placeholder)')
        .eq('training_id', trainingId!);
      if (error) throw error;
      return (data ?? []) as TrainingMemberWithProfile[];
    },
  });
}

export function useRemoveTrainingMember(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('training_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-members', trainingId] });
      toast.success(i18n.t('toast.memberRemoved', { ns: 'common' }));
    },
  });
}

export function useLeaveTraining() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async ({ trainingId, coachId, trainingName }: {
      trainingId: string; coachId: string; trainingName: string;
    }) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('training_members')
        .delete()
        .eq('training_id', trainingId)
        .eq('user_id', user.id);
      if (error) throw error;

      // Cascade-clean future attendance so leaving doesn't leave orphan 'confirmed' rows
      // counted toward capacity. Past attendance (attendance_marked_at IS NOT NULL) is
      // preserved as audit history.
      const { data: futureSessionIds } = await supabase
        .from('training_sessions')
        .select('id')
        .eq('training_id', trainingId)
        .gte('session_date', new Date().toISOString().slice(0, 10))
        .is('attendance_marked_at', null);
      const ids = (futureSessionIds ?? []).map(r => r.id);
      if (ids.length > 0) {
        await supabase
          .from('session_attendance')
          .delete()
          .eq('user_id', user.id)
          .in('session_id', ids);
      }

      // Hide the group chat for the athlete
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('training_id', trainingId)
        .maybeSingle();
      if (conv) {
        await supabase
          .from('conversation_participants')
          .update({ hidden: true })
          .eq('conversation_id', conv.id)
          .eq('user_id', user.id);
      }

      // Notify coach
      const tNotify = await getFixedTForUser(coachId);
      const participantName = profile?.full_name ?? i18n.t('join.anonymousParticipant', { ns: 'common' });
      notifyUsers([coachId], {
        title: tNotify('notifications.playerLeftTitle', { ns: 'common' }),
        body: tNotify('notifications.playerLeftBody', { ns: 'common', name: participantName, training: trainingName }),
        tag: `leave-${trainingId}`,
        url: `/coach/trainings/${trainingId}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-upcoming-sessions'] });
      qc.invalidateQueries({ queryKey: ['my-trainings'] });
      qc.invalidateQueries({ queryKey: ['my-conversations'] });
      qc.invalidateQueries({ queryKey: ['training-members'] });
      toast.success(i18n.t('toast.leftTraining', { ns: 'common' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

export function useAddTrainingMember(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, trainingName }: { userId: string; trainingName: string }) => {
      const { error } = await supabase
        .from('training_members')
        .insert({ training_id: trainingId, user_id: userId, role: 'regular' });
      if (error) {
        if (error.code === '23505') return; // already a member — treat as success
        throw error;
      }

      // Notify athlete
      const tNotify = await getFixedTForUser(userId);
      notifyUsers([userId], {
        title: tNotify('notifications.addedToTrainingTitle', { ns: 'common' }),
        body: tNotify('notifications.addedToTrainingBody', { ns: 'common', training: trainingName }),
        tag: `added-${trainingId}`,
        url: '/player',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-members', trainingId] });
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
      toast.success(i18n.t('toast.memberAdded', { ns: 'common' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

export function useCreatePlaceholderAthlete(trainingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ firstName, lastName, schoolId, phone, email, trainingName }: {
      firstName: string;
      lastName: string;
      schoolId: string;
      phone?: string;
      email?: string;
      trainingName: string;
    }) => {
      // Create placeholder profile via RPC
      const { data: placeholderId, error: rpcErr } = await supabase.rpc('create_placeholder_athlete', {
        p_first_name: firstName,
        p_last_name: lastName,
        p_school_id: schoolId,
        p_phone: phone || null,
        p_email: email || null,
      });
      if (rpcErr) throw rpcErr;
      if (!placeholderId) throw new Error('Failed to create placeholder');

      // Add to training (triggers auto-enroll in future sessions)
      const { error: memberErr } = await supabase
        .from('training_members')
        .insert({ training_id: trainingId, user_id: placeholderId, role: 'regular' });
      if (memberErr) {
        if (memberErr.code !== '23505') throw memberErr; // ignore duplicate
      }

      return placeholderId as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-members', trainingId] });
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
      qc.invalidateQueries({ queryKey: ['school-athletes'] });
      toast.success(i18n.t('toast.memberAdded', { ns: 'common' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

/** Create a placeholder athlete without adding to any training. For passes page. */
export function useCreateStandalonePlaceholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ firstName, lastName, schoolId, phone, email }: {
      firstName: string;
      lastName: string;
      schoolId: string;
      phone?: string;
      email?: string;
    }) => {
      const { data: placeholderId, error: rpcErr } = await supabase.rpc('create_placeholder_athlete', {
        p_first_name: firstName,
        p_last_name: lastName,
        p_school_id: schoolId,
        p_phone: phone || null,
        p_email: email || null,
      });
      if (rpcErr) throw rpcErr;
      if (!placeholderId) throw new Error('Failed to create placeholder');
      return placeholderId as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['school-athletes'] });
      qc.invalidateQueries({ queryKey: ['school-athletes-pool'] });
      qc.invalidateQueries({ queryKey: ['my-athletes'] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

/** Get all trainings a specific athlete is in. For ProfileSheet coach actions. */
export function useAthleteTrainings(athleteId: string | undefined) {
  return useQuery({
    queryKey: ['athlete-trainings', athleteId],
    enabled: !!athleteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_members')
        .select('id, training_id, trainings:training_id(id, name, sport)')
        .eq('user_id', athleteId!)
        .eq('role', 'regular');
      if (error) throw error;
      // Only include active trainings
      return (data ?? []).filter((m: any) => m.trainings) as { id: string; training_id: string; trainings: { id: string; name: string; sport: string } }[];
    },
  });
}

/** Remove a training member, accepting trainingId as a mutation param. */
export function useRemoveAnyTrainingMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ membershipId, trainingId }: { membershipId: string; trainingId: string }) => {
      const { error } = await supabase
        .from('training_members')
        .delete()
        .eq('id', membershipId);
      if (error) throw error;
      return trainingId;
    },
    onSuccess: (trainingId) => {
      qc.invalidateQueries({ queryKey: ['training-members', trainingId] });
      qc.invalidateQueries({ queryKey: ['athlete-trainings'] });
      qc.invalidateQueries({ queryKey: ['school-athletes'] });
      qc.invalidateQueries({ queryKey: ['school-athletes-pool'] });
      toast.success(i18n.t('toast.memberRemoved', { ns: 'common' }));
    },
  });
}

export function useMyAthletes(coachId: string | undefined) {
  return useQuery({
    queryKey: ['my-athletes', coachId],
    enabled: !!coachId,
    queryFn: async () => {
      // Get all trainings for this coach
      const { data: trainings, error: tErr } = await supabase
        .from('trainings')
        .select('id')
        .eq('coach_id', coachId!)
        .eq('is_active', true);
      if (tErr) throw tErr;
      const trainingIds = (trainings ?? []).map(t => t.id);
      if (!trainingIds.length) return [];

      // Get all unique members across trainings
      const { data: members, error: mErr } = await supabase
        .from('training_members')
        .select('user_id, training_id, profiles:user_id(id, full_name, avatar_url, email, is_placeholder)')
        .in('training_id', trainingIds)
        .eq('role', 'regular');
      if (mErr) throw mErr;

      // Deduplicate by user_id
      const seen = new Map<string, any>();
      for (const m of members ?? []) {
        if (!seen.has(m.user_id)) {
          seen.set(m.user_id, { ...m.profiles, trainingIds: [m.training_id] });
        } else {
          seen.get(m.user_id).trainingIds.push(m.training_id);
        }
      }
      return Array.from(seen.values());
    },
  });
}

export function useTrainingSessions(trainingId: string | undefined) {
  return useQuery({
    queryKey: ['training-sessions', trainingId],
    enabled: !!trainingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('training_id', trainingId!)
        .order('session_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Tables<'training_sessions'>[];
    },
  });
}

export function useSessionAttendance(sessionId: string | undefined) {
  const qc = useQueryClient();

  // Realtime: refetch when an athlete confirms/declines for this session.
  // Without this, the coach's UI was stale for up to 5 minutes (the default
  // staleTime) after a parent canceled — even after closing/reopening the app.
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`session-attendance:${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_attendance',
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['session-attendance', sessionId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, qc]);

  return useQuery({
    queryKey: ['session-attendance', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_attendance')
        .select('*, profiles:user_id(id, full_name, avatar_url, is_placeholder)')
        .eq('session_id', sessionId!);
      if (error) throw error;
      return (data ?? []) as SessionAttendanceWithProfile[];
    },
  });
}

export type AttendanceSummary = { confirmed: number; declined: number; total: number };

export function useAttendanceSummary(sessionIds: string[]) {
  return useQuery({
    queryKey: ['attendance-summary', sessionIds],
    enabled: sessionIds.length > 0,
    // Keep the confirmed/total badges stable while the summary refetches.
    placeholderData: (prev: any) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_attendance')
        .select('session_id, status')
        .in('session_id', sessionIds);
      if (error) throw error;
      const summary: Record<string, AttendanceSummary> = {};
      for (const row of data ?? []) {
        if (!summary[row.session_id]) summary[row.session_id] = { confirmed: 0, declined: 0, total: 0 };
        summary[row.session_id].total++;
        if (row.status === 'confirmed') summary[row.session_id].confirmed++;
        else if (row.status === 'declined') summary[row.session_id].declined++;
      }
      return summary;
    },
  });
}

export function useMyUpcomingSessions(options?: { from?: string; to?: string }) {
  const { user } = useAuth();
  const from = options?.from;
  const to = options?.to;
  return useQuery({
    queryKey: ['my-upcoming-sessions', user?.id, from, to],
    enabled: !!user,
    retry: 1,
    placeholderData: (prev: any) => prev,
    queryFn: async () => {
      // Use SECURITY DEFINER RPC to bypass training_sessions RLS for drop-in players
      const params: Record<string, string> = {};
      if (from) params.p_from_date = from;
      if (to) params.p_to_date = to;
      const { data, error } = await supabase.rpc('get_my_upcoming_sessions', Object.keys(params).length > 0 ? params : undefined);
      if (error) throw error;
      // Reshape RPC flat rows into the nested structure components expect
      return (data ?? []).map((row: any) => ({
        id: row.attendance_id,
        session_id: row.session_id,
        user_id: user!.id,
        status: row.attendance_status,
        confirmed_at: row.confirmed_at,
        declined_at: row.declined_at,
        reminder_sent_at: null,
        reminder_count: 0,
        training_sessions: {
          id: row.session_id,
          training_id: row.training_id,
          session_date: row.session_date,
          start_time: row.start_time,
          end_time: row.end_time,
          status: row.session_status,
          trainings: {
            id: row.training_id,
            name: row.training_name,
            sport: row.sport,
            venue: row.venue,
            max_players: row.max_players,
            confirmed_count: row.confirmed_count,
            confirmation_window_hours: row.confirmation_window_hours,
            is_active: row.is_active,
            coach: {
              id: row.coach_id,
              full_name: row.coach_full_name,
              avatar_url: row.coach_avatar_url,
            },
          },
        },
      })) as SessionAttendanceWithSession[];
    },
  });
}

export function useUpsertAttendance() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async ({ sessionId, status, notify }: {
      sessionId: string;
      status: string;
      notify?: { coachId: string; trainingName: string; trainingId: string };
    }) => {
      Sentry.addBreadcrumb({
        category: 'capacity',
        message: `attendance:${status}`,
        data: { sessionId, userId: user?.id },
      });

      // Server-side RPCs: capacity is enforced atomically by enforce_session_capacity()
      // BEFORE trigger. The previous client-side count was silently RLS-stripped to
      // the caller's own row, which is how the «ДОДО» 9/8 overbook landed in prod.
      const rpc = status === 'confirmed' ? 'confirm_session_attendance' : 'decline_session_attendance';
      const { error } = await supabase.rpc(rpc, { p_session_id: sessionId });
      if (error) {
        if (error.message?.includes('SESSION_FULL')) {
          Sentry.captureMessage('SESSION_FULL', {
            level: 'warning',
            extra: { sessionId, userId: user?.id },
          });
          // Tag so localizeErrorMessage shows the localized message instead of
          // discarding it on non-EN locales (FCFS losers were seeing the generic
          // "Щось пішло не так" toast).
          const err: any = new Error(i18n.t('join.sessionFull', { ns: 'common' }));
          err.__localized = true;
          throw err;
        }
        throw error;
      }

      // Coach push is best-effort and MUST NOT be able to reject the mutation.
      // The decline/confirm RPC already committed above; awaiting
      // getFixedTForUser here meant a transport reject (flaky network/timeout)
      // would reject the whole mutation — which, with the optimistic onMutate,
      // rolls the card back AND skips the push: a committed decline that looks
      // failed and notifies nobody (the missing "player cancelled" push).
      // Fire-and-forget with its own catch.
      if (notify && (status === 'confirmed' || status === 'declined')) {
        void (async () => {
          const tNotify = await getFixedTForUser(notify.coachId);
          const participantName = profile?.full_name ?? tNotify('join.anonymousParticipant');
          notifyUsers([notify.coachId], {
            title: status === 'confirmed'
              ? tNotify('notifications.playerConfirmedTitle')
              : tNotify('notifications.playerDeclinedTitle'),
            body: status === 'confirmed'
              ? tNotify('notifications.attendanceConfirmedBody', { name: participantName, training: notify.trainingName })
              : tNotify('notifications.attendanceDeclinedBody', { name: participantName, training: notify.trainingName }),
            tag: `attendance-${sessionId}`,
            url: `/coach/trainings/${notify.trainingId}`,
          });
        })().catch((err) => Sentry.captureException(err, { extra: { context: 'attendance notify', coachId: notify.coachId, sessionId, status } }));
      }
    },
    // Optimistic flip so cancel / claim feels instant. Without it the card and
    // its buttons stayed frozen on "cancelling…" for the whole RPC + notify +
    // refetch round-trip — seconds on a cold/slow connection. We touch only the
    // status field on matching my-upcoming-sessions rows; the onSuccess refetch
    // reconciles, and onError rolls back (e.g. a claim that loses the SESSION_FULL
    // race flips back to pending). A wrong shape just no-ops and the refetch heals it.
    onMutate: async ({ sessionId, status }) => {
      await qc.cancelQueries({ queryKey: ['my-upcoming-sessions'] });
      const snapshot = qc.getQueriesData({ queryKey: ['my-upcoming-sessions'] });
      qc.setQueriesData({ queryKey: ['my-upcoming-sessions'] }, (old: any) =>
        Array.isArray(old)
          ? old.map((row: any) => (row.session_id === sessionId ? { ...row, status } : row))
          : old,
      );
      return { snapshot };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-upcoming-sessions'] });
      qc.invalidateQueries({ queryKey: ['session-attendance'] });
      qc.invalidateQueries({ queryKey: ['my-attendance'] });
      // confirmed↔declined transitions move passes via the DB charge trigger.
      qc.invalidateQueries({ queryKey: ['my-school-abonament'] });
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
      qc.invalidateQueries({ queryKey: ['school-abonaments'] });
    },
    onError: (e: any, _vars, ctx: any) => {
      // Roll the optimistic flip back before surfacing the (localized) error.
      if (ctx?.snapshot) for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data);
      toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' })));
    },
  });
}

/** Leave a session-level waitlist (status='pending' rows only). Deletes the row
 *  via the leave_session_waitlist RPC — the player opted out and shouldn't
 *  surface in the coach's "not coming" list. Confirmed/declined attendees keep
 *  using useUpsertAttendance which preserves audit history. */
export function useLeaveSessionWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const { error } = await supabase.rpc('leave_session_waitlist', { p_session_id: sessionId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-upcoming-sessions'] });
      qc.invalidateQueries({ queryKey: ['session-attendance'] });
      qc.invalidateQueries({ queryKey: ['my-attendance'] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

/** Look up the current user's attendance status across a batch of session IDs.
 *  Returns a `{ [session_id]: status }` map so callers can render per-session UI. */
export function useMyAttendanceForSessions(sessionIds: string[]) {
  const { user } = useAuth();
  const key = sessionIds.slice().sort().join(',');
  return useQuery({
    queryKey: ['my-attendance', user?.id, key],
    enabled: !!user && sessionIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_attendance')
        .select('session_id, status')
        .eq('user_id', user!.id)
        .in('session_id', sessionIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.session_id] = row.status;
      return map;
    },
  });
}

export type AttendanceEntry = { userId: string; present: boolean; originalStatus: string };

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, entries }: { sessionId: string; entries: AttendanceEntry[] }) => {
      // Group by target status for batch updates
      const toConfirm: string[] = [];
      const toNoShow: string[] = [];

      for (const e of entries) {
        if (e.present) {
          if (e.originalStatus !== 'confirmed') toConfirm.push(e.userId);
        } else {
          if (e.originalStatus === 'confirmed') toNoShow.push(e.userId);
          // 'declined' stays 'declined', 'no_show' stays 'no_show'
        }
      }

      if (toConfirm.length) {
        const { error } = await supabase
          .from('session_attendance')
          .update({ status: 'confirmed' })
          .eq('session_id', sessionId)
          .in('user_id', toConfirm);
        if (error) throw error;
      }
      if (toNoShow.length) {
        const { error } = await supabase
          .from('session_attendance')
          .update({ status: 'no_show' })
          .eq('session_id', sessionId)
          .in('user_id', toNoShow);
        if (error) throw error;
      }

      const { error } = await supabase
        .from('training_sessions')
        .update({ attendance_marked_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['past-unmarked-sessions'] });
      qc.invalidateQueries({ queryKey: ['session-attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
      qc.invalidateQueries({ queryKey: ['stats-data'] });
      // pending→confirmed transitions catch up via the DB charge trigger.
      qc.invalidateQueries({ queryKey: ['school-abonaments'] });
      qc.invalidateQueries({ queryKey: ['abonament-usage-session', vars.sessionId] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

export function useJoinSingleSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      // RPC now returns 'confirmed' or 'pending' so callers can render the
      // right success messaging instead of trusting stale client-side capacity.
      // See migration 20260519160000_join_single_session_return_status.sql.
      const { data, error } = await supabase.rpc('join_single_session', { p_session_id: sessionId });
      if (error) throw error;
      return data as 'confirmed' | 'pending' | null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-upcoming-sessions'] });
      qc.invalidateQueries({ queryKey: ['session-attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
      qc.invalidateQueries({ queryKey: ['my-attendance'] });
      // Drop-in deducts a pass entry via the DB charge trigger.
      qc.invalidateQueries({ queryKey: ['my-school-abonament'] });
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
      qc.invalidateQueries({ queryKey: ['school-abonaments'] });
      // Refresh the public schedule so the capacity badge reflects the new attendance.
      qc.invalidateQueries({ queryKey: ['coach-upcoming-sessions'] });
      qc.invalidateQueries({ queryKey: ['school-upcoming-sessions'] });
    },
    onError: (e: any) => {
      // RPC RAISE EXCEPTION strings come back in English from Postgres. The previous
      // generic fallback ("something went wrong") hid the actual cause from non-EN
      // users — pattern-match the known cases and translate per-locale instead.
      const msg = String(e?.message ?? '');
      if (msg.includes('PASS_REQUIRED')) {
        // SignUpSheet redirects to the request-pass UI; this toast is a hint, not an error.
        toast.info(i18n.t('join.passRequiredToast', { ns: 'common' }));
        return;
      }
      if (msg.includes('Drop-ins not allowed')) {
        toast.error(i18n.t('join.dropInNotAllowed', { ns: 'common' }));
        return;
      }
      if (msg.includes('Trial session already used')) {
        toast.error(i18n.t('join.trialUsed', { ns: 'common' }));
        return;
      }
      if (msg.includes('full')) {
        toast.error(i18n.t('join.sessionFull', { ns: 'common' }));
        return;
      }
      if (msg.includes('Session not found') || msg.includes('cancelled')) {
        toast.error(i18n.t('join.sessionUnavailable', { ns: 'common' }));
        return;
      }
      toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' })));
    },
  });
}

/** Sign up for a training as a regular member (or waitlist / approval-pending request).
 *  Mirrors the recurring branch of JoinTraining so callers can join without leaving the page.
 *  `isWaitlist` distinguishes waitlist from any "in-training" role (regular, flex, ...). */
export type RecurringJoinResult =
  | { kind: 'alreadyIn'; isWaitlist: boolean }
  | { kind: 'requestPending' }
  | { kind: 'requestSent'; resent: boolean }
  | { kind: 'joined'; role: 'regular' | 'waitlist' }
  | { kind: 'full' }
  | { kind: 'passRequired'; passTypeId: string; coachId: string | null };

interface RecurringTrainingInput {
  id: string;
  coach_id: string | null;
  name: string;
  max_players?: number | null;
  allow_waitlist?: boolean | null;
  booking_mode?: string | null;
  required_pass_type_id?: string | null;
  coach?: { language?: string | null } | null;
}

export function useJoinTrainingRecurring() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  return useMutation<RecurringJoinResult, Error, { training: RecurringTrainingInput }>({
    mutationFn: async ({ training }) => {
      if (!profile) throw new Error('Not authenticated');

      // Pass gate: training requires a specific pass type, athlete must hold an active one.
      if (training.required_pass_type_id) {
        const { data: passes } = await supabase
          .from('player_abonaments')
          .select('id, status, expires_at, sessions_remaining, activated_at')
          .eq('player_id', profile.id)
          .eq('abonament_type_id', training.required_pass_type_id)
          .eq('status', 'active');
        const now = new Date();
        const hasActive = (passes ?? []).some(p => {
          if (p.expires_at && new Date(p.expires_at) < now) return false;
          if (p.sessions_remaining !== null && p.sessions_remaining <= 0) return false;
          return true;
        });
        if (!hasActive) {
          return {
            kind: 'passRequired',
            passTypeId: training.required_pass_type_id,
            coachId: training.coach_id,
          };
        }
      }

      // Already in?
      const { data: existing } = await supabase
        .from('training_members')
        .select('id, role')
        .eq('training_id', training.id)
        .eq('user_id', profile.id)
        .maybeSingle();
      if (existing) {
        return { kind: 'alreadyIn', isWaitlist: existing.role === 'waitlist' };
      }

      // Capacity
      const { count: activeCount } = await supabase
        .from('training_members')
        .select('*', { count: 'exact', head: true })
        .eq('training_id', training.id)
        .eq('role', 'regular');
      const isFull = !!training.max_players && (activeCount ?? 0) >= training.max_players;
      if (isFull && !training.allow_waitlist) {
        return { kind: 'full' };
      }

      // Approval mode → join_request
      if (training.booking_mode === 'approval') {
        const { data: existingReq } = await supabase
          .from('join_requests')
          .select('id, status')
          .eq('user_id', profile.id)
          .eq('training_id', training.id)
          .maybeSingle();
        if (existingReq?.status === 'pending') return { kind: 'requestPending' };
        if (existingReq) {
          await supabase
            .from('join_requests')
            .update({ status: 'pending', created_at: new Date().toISOString() })
            .eq('id', existingReq.id);
          notifyJoinRequest(training, profile);
          return { kind: 'requestSent', resent: true };
        }
        const { error } = await supabase
          .from('join_requests')
          .insert({ user_id: profile.id, training_id: training.id, status: 'pending' });
        if (error) throw error;
        notifyJoinRequest(training, profile);
        return { kind: 'requestSent', resent: false };
      }

      // Instant join
      const role: 'regular' | 'waitlist' = isFull ? 'waitlist' : 'regular';
      const { error } = await supabase
        .from('training_members')
        .insert({ training_id: training.id, user_id: profile.id, role });
      if (error) {
        // 23505 = unique constraint, i.e. raced with another tab. Treat as already-in.
        if (error.code === '23505') return { kind: 'alreadyIn', isWaitlist: false };
        throw error;
      }
      notifyMemberJoined(training, profile);
      return { kind: 'joined', role };
    },
    onSuccess: (result, { training }) => {
      qc.removeQueries({ queryKey: ['my-upcoming-sessions'] });
      qc.invalidateQueries({ queryKey: ['my-join-requests'] });
      qc.invalidateQueries({ queryKey: ['my-attendance'] });
      // Recurring join cascades into auto-attendance INSERTs which deduct passes via the trigger.
      qc.invalidateQueries({ queryKey: ['my-school-abonament'] });
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
      qc.invalidateQueries({ queryKey: ['school-abonaments'] });
      const tk = (k: string, opts?: Record<string, unknown>) => i18n.t(k, { ns: 'common', ...opts });
      switch (result.kind) {
        case 'alreadyIn':
          toast.info(tk(result.isWaitlist ? 'join.alreadyOnWaitlist' : 'join.alreadyInTraining'));
          break;
        case 'full':
          toast.error(tk('join.trainingFull'));
          break;
        case 'requestPending':
          toast.info(tk('join.requestAlreadySent'));
          break;
        case 'requestSent':
          toast.success(tk(result.resent ? 'join.joinRequestSentAgain' : 'join.joinRequestSent'));
          break;
        case 'joined':
          toast.success(
            result.role === 'waitlist'
              ? tk('join.addedToWaitlist')
              : tk('join.joinedTraining', { name: training.name })
          );
          break;
        case 'passRequired':
          // Caller is expected to surface the request-pass UI; we just inform briefly.
          toast.info(tk('join.passRequiredToast'));
          break;
      }
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('join.failedToJoin', { ns: 'common' }))),
  });
}

function notifyJoinRequest(training: RecurringTrainingInput, profile: { id: string; full_name: string | null }) {
  if (!training.coach_id) return;
  const tCoach = getFixedTForLanguage(training.coach?.language);
  notifyUsers([training.coach_id], {
    title: tCoach('join.requestNotificationTitle'),
    body: tCoach('join.requestNotificationBody', {
      name: profile.full_name ?? tCoach('join.anonymousParticipant'),
      training: training.name,
    }),
    tag: `join-req-${training.id}`,
    url: `/coach/trainings/${training.id}`,
  });
}

function notifyMemberJoined(training: RecurringTrainingInput, profile: { id: string; full_name: string | null }) {
  if (!training.coach_id) return;
  const tCoach = getFixedTForLanguage(training.coach?.language);
  notifyUsers([training.coach_id], {
    title: tCoach('join.memberJoinedTitle'),
    body: tCoach('join.memberJoinedBody', {
      name: profile.full_name ?? tCoach('join.anonymousParticipant'),
      training: training.name,
    }),
    tag: `joined-${training.id}`,
    url: `/coach/trainings/${training.id}`,
  });
}

export function useJoinRequests(trainingId: string | undefined) {
  return useQuery({
    queryKey: ['join-requests', trainingId],
    enabled: !!trainingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('join_requests')
        .select('*, profiles:user_id(id, full_name, avatar_url, email, phone, bio, sport, city)')
        .eq('training_id', trainingId!)
        .eq('status', 'pending');
      if (error) throw error;
      return (data ?? []) as JoinRequestWithProfile[];
    },
  });
}

/** Player's own join requests (pending + declined) */
export function useMyJoinRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-join-requests', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('join_requests')
        .select('*, trainings(id, name, sport)')
        .eq('user_id', user!.id)
        .in('status', ['pending', 'declined'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useAllCoachJoinRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all-join-requests', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // RLS handles access — coaches see their trainings' requests,
      // school owners see all school trainings' requests
      const { data, error } = await supabase
        .from('join_requests')
        .select('*, profiles:user_id(id, full_name, avatar_url, email, phone, bio, sport, city), trainings!inner(id, name, sport, coach_id)')
        .eq('status', 'pending');
      if (error) throw error;
      return (data ?? []) as JoinRequestWithProfileAndTraining[];
    },
  });
}

export function useRespondJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, trainingId, userId, accept, trainingName }: {
      requestId: string; trainingId: string; userId: string; accept: boolean; trainingName?: string;
    }) => {
      await supabase.from('join_requests').update({ status: accept ? 'accepted' : 'declined' }).eq('id', requestId);
      if (accept) {
        await supabase.from('training_members').upsert({ training_id: trainingId, user_id: userId, role: 'regular' }, { onConflict: 'training_id,user_id' });
      }
      // Notify the athlete about the decision
      const tNotify = await getFixedTForUser(userId);
      const name = trainingName ?? '';
      notifyUsers([userId], {
        title: accept ? tNotify('notifications.requestApprovedTitle') : tNotify('notifications.requestDeclinedTitle'),
        body: accept
          ? tNotify('notifications.requestApprovedBody', { training: name })
          : tNotify('notifications.requestDeclinedBody', { training: name }),
        tag: `join-${requestId}`,
        url: '/player',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-join-requests'] });
      qc.invalidateQueries({ queryKey: ['join-requests'] });
      qc.invalidateQueries({ queryKey: ['training-members'] });
      qc.invalidateQueries({ queryKey: ['my-upcoming-sessions'] });
      qc.invalidateQueries({ queryKey: ['my-join-requests'] });
    },
  });
}

// ── Session-level actions ──

export function useCancelSession(trainingId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ sessionId, trainingName, sessionDate }: { sessionId: string; trainingName: string; sessionDate: string }) => {
      const { error } = await supabase
        .from('training_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId);
      if (error) throw error;
      // Notify in training chat — push comes from the chat message
      if (user) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('training_id', trainingId)
          .maybeSingle();
        if (conv) {
          const msg = getFixedTForCurrentLanguage('coach')('home.cancelledMessage', { name: trainingName, date: sessionDate });
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user.id,
            content: msg,
          });

        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-sessions', trainingId] });
      qc.invalidateQueries({ queryKey: ['my-upcoming-sessions'] });
      // Cancellation refunds passes via the DB trigger.
      qc.invalidateQueries({ queryKey: ['school-abonaments'] });
      qc.invalidateQueries({ queryKey: ['my-school-abonament'] });
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
      toast.success(i18n.t('toast.sessionCancelled', { ns: 'common' }));
    },
  });
}

export function useRescheduleSession(trainingId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ sessionId, trainingName, oldDate, oldStartTime, newDate, newStartTime, newEndTime }: {
      sessionId: string; trainingName: string; oldDate: string; oldStartTime: string;
      newDate: string; newStartTime: string; newEndTime: string;
    }) => {
      const { error } = await supabase
        .from('training_sessions')
        .update({ session_date: newDate, start_time: newStartTime, end_time: newEndTime })
        .eq('id', sessionId);
      if (error) throw error;
      // Notify in training chat
      const oldDateLabel = format(new Date(oldDate + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() });
      const newDateLabel = format(new Date(newDate + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() });
      const chatMsg = getFixedTForCurrentLanguage('coach')('home.rescheduledMessage', {
        name: trainingName,
        oldDate: oldDateLabel,
        oldTime: oldStartTime.slice(0, 5),
        newDate: newDateLabel,
        newTime: newStartTime.slice(0, 5),
      });
      if (user) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('training_id', trainingId)
          .maybeSingle();
        if (conv) {
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user.id,
            content: chatMsg,
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-sessions', trainingId] });
      qc.invalidateQueries({ queryKey: ['my-upcoming-sessions'] });
      toast.success(i18n.t('toast.sessionRescheduled', { ns: 'common' }));
    },
  });
}
