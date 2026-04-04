import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import i18n from '@/i18n';
import { toast } from 'sonner';
import { notifyUsers } from '@/lib/pushNotify';
import { getFixedTForCurrentLanguage, getFixedTForUser } from '@/lib/notificationI18n';
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
      // Check capacity before re-confirming (rejoin after cancel)
      if (status === 'confirmed') {
        const { data: sess } = await supabase
          .from('training_sessions')
          .select('id, trainings(max_players)')
          .eq('id', sessionId)
          .single();
        const maxPlayers = (sess?.trainings as any)?.max_players;
        if (maxPlayers) {
          const { count } = await supabase
            .from('session_attendance')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .eq('status', 'confirmed');
          if ((count ?? 0) >= maxPlayers) {
            throw new Error(i18n.t('join.trainingFull', { ns: 'common' }));
          }
        }
      }

      const update: any = { session_id: sessionId, user_id: user!.id, status };
      if (status === 'confirmed') update.confirmed_at = new Date().toISOString();
      if (status === 'declined') update.declined_at = new Date().toISOString();
      const { error } = await supabase
        .from('session_attendance')
        .upsert(update, { onConflict: 'session_id,user_id' });
      if (error) throw error;

      if (notify && (status === 'confirmed' || status === 'declined')) {
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
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-upcoming-sessions'] });
      qc.invalidateQueries({ queryKey: ['session-attendance'] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['past-unmarked-sessions'] });
      qc.invalidateQueries({ queryKey: ['session-attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
      qc.invalidateQueries({ queryKey: ['stats-data'] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

export function useJoinSingleSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const { error } = await supabase.rpc('join_single_session', { p_session_id: sessionId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-upcoming-sessions'] });
      qc.invalidateQueries({ queryKey: ['session-attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
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
