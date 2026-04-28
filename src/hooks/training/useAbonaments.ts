import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import i18n from '@/i18n';
import { localizeErrorMessage } from '@/lib/localizedErrors';
import { notifyUsers } from '@/lib/pushNotify';
import { getFixedTForUser, getFixedTForLanguage, groupUsersByLanguage } from '@/lib/notificationI18n';
import type { Tables } from '@/integrations/supabase/types';

// ── Types ──

type AbonamentType = Tables<'abonament_types'>;

type PlayerAbonament = Tables<'player_abonaments'> & {
  abonament_types: AbonamentType;
};

type PlayerAbonamentWithProfile = Tables<'player_abonaments'> & {
  abonament_types: AbonamentType;
  profiles: Pick<Tables<'profiles'>, 'id' | 'full_name' | 'avatar_url'> | null;
};

type PlayerAbonamentWithSchool = Tables<'player_abonaments'> & {
  abonament_types: AbonamentType;
  schools: Pick<Tables<'schools'>, 'id' | 'name'> | null;
};

type AbonamentTypeWithSchool = AbonamentType & {
  schools: Pick<Tables<'schools'>, 'id' | 'name'> | null;
};

type AbonamentUsage = Tables<'abonament_usage'>;

// ── Helpers ──

/** True if the pass is effectively active (not expired, has sessions left) */
export function isAbonamentActive(pa: { status: string; expires_at: string | null; sessions_remaining: number | null }): boolean {
  if (pa.status !== 'active') return false;
  if (pa.expires_at && new Date(pa.expires_at) < new Date()) return false;
  if (pa.sessions_remaining !== null && pa.sessions_remaining <= 0) return false;
  return true;
}

/** Calendar days remaining until expiry (today = 0 means expires today) */
export function daysRemaining(expiresAt: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiry = new Date(expiresAt);
  const expiryDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  return Math.max(0, Math.round((expiryDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
}

// ── Abonament type queries ──

export function useAbonamentTypes(schoolId: string | undefined | null) {
  return useQuery({
    queryKey: ['abonament-types', schoolId],
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('abonament_types')
        .select('*')
        .eq('school_id', schoolId!)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AbonamentType[];
    },
  });
}

export function useCreateAbonamentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      school_id: string;
      name: string;
      sessions_count?: number | null;
      duration_days?: number | null;
      price?: number | null;
      currency?: string;
    }) => {
      const { data, error } = await supabase
        .from('abonament_types')
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data as AbonamentType;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['abonament-types', vars.school_id] });
      toast.success(i18n.t('abonaments.typeCreated', { ns: 'common' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

export function useDeleteAbonamentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, schoolId }: { id: string; schoolId: string }) => {
      const { error } = await supabase
        .from('abonament_types')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['abonament-types', vars.schoolId] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

// ── Player abonament queries ──

/** All abonaments for a school (coach/owner view) */
export function useSchoolAbonaments(schoolId: string | undefined | null) {
  return useQuery({
    queryKey: ['school-abonaments', schoolId],
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_abonaments')
        .select('*, abonament_types(*), profiles:player_id(id, full_name, avatar_url)')
        .eq('school_id', schoolId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlayerAbonamentWithProfile[];
    },
  });
}

/** Player's active abonament for a specific school */
export function useMySchoolAbonament(schoolId: string | undefined | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-school-abonament', schoolId, user?.id],
    enabled: !!schoolId && !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_abonaments')
        .select('*, abonament_types(*)')
        .eq('school_id', schoolId!)
        .eq('player_id', user!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PlayerAbonament | null;
    },
  });
}

/** Player's all active abonaments (homepage) */
export function useMyAbonaments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-abonaments', user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_abonaments')
        .select('*, abonament_types(*), schools(id, name)')
        .eq('player_id', user!.id)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlayerAbonamentWithSchool[];
    },
  });
}

// ── Player search (for assign picker) ──

/** Search players by name across all profiles. */
export function useSearchPlayers(query: string, schoolId: string | undefined | null) {
  return useQuery({
    queryKey: ['search-players', query, schoolId],
    enabled: !!schoolId && query.length >= 2,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, is_placeholder')
        .ilike('full_name', `%${query}%`)
        .limit(20);
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string | null; avatar_url: string | null; is_placeholder?: boolean }[];
    },
  });
}

// ── School athletes (for assign picker — fallback) ──

export function useSchoolAthletes(schoolId: string | undefined | null, enabled = true) {
  return useQuery({
    queryKey: ['school-athletes', schoolId],
    enabled: !!schoolId && enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Get all training IDs for this school
      const { data: trainings, error: tErr } = await supabase
        .from('trainings')
        .select('id')
        .eq('school_id', schoolId!)
        .eq('is_active', true);
      if (tErr) throw tErr;
      const trainingIds = (trainings ?? []).map(t => t.id);
      if (!trainingIds.length) return [];

      const { data: members, error: mErr } = await supabase
        .from('training_members')
        .select('user_id, profiles:user_id(id, full_name, avatar_url, is_placeholder)')
        .in('training_id', trainingIds)
        .eq('role', 'regular');
      if (mErr) throw mErr;

      // Deduplicate by user_id
      const seen = new Map<string, any>();
      for (const m of members ?? []) {
        if (!seen.has(m.user_id)) seen.set(m.user_id, m.profiles);
      }
      return Array.from(seen.values()) as { id: string; full_name: string | null; avatar_url: string | null }[];
    },
  });
}

// ── Unified athlete pool (training members + pass holders) ──

/** All athletes the coach knows about: training members OR pass holders in the school. Deduplicated. */
export function useSchoolAthletesWithPassHolders(schoolId: string | undefined | null) {
  return useQuery({
    queryKey: ['school-athletes-pool', schoolId],
    enabled: !!schoolId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      // Get ALL trainings for this school (active + inactive) so we capture past athletes
      const { data: trainings, error: tErr } = await supabase
        .from('trainings')
        .select('id')
        .eq('school_id', schoolId!);
      if (tErr) throw tErr;
      const trainingIds = (trainings ?? []).map(t => t.id);

      const seen = new Map<string, { id: string; full_name: string | null; avatar_url: string | null; is_placeholder: boolean }>();

      if (trainingIds.length) {
        // 1. Training members (regular role — current + past trainings)
        const { data: members, error: mErr } = await supabase
          .from('training_members')
          .select('user_id, profiles:user_id(id, full_name, avatar_url, is_placeholder)')
          .in('training_id', trainingIds)
          .eq('role', 'regular');
        if (mErr) throw mErr;
        for (const m of members ?? []) {
          if (m.profiles && !seen.has(m.user_id)) {
            seen.set(m.user_id, m.profiles as any);
          }
        }

        // 2. Session attendees (drop-ins, one-time participants who aren't regular members)
        const { data: sessions, error: sErr } = await supabase
          .from('training_sessions')
          .select('id')
          .in('training_id', trainingIds);
        if (sErr) throw sErr;
        const sessionIds = (sessions ?? []).map(s => s.id);

        if (sessionIds.length) {
          const { data: attendees, error: aErr } = await supabase
            .from('session_attendance')
            .select('user_id, profiles:user_id(id, full_name, avatar_url, is_placeholder)')
            .in('session_id', sessionIds);
          if (aErr) throw aErr;
          for (const a of attendees ?? []) {
            if (a.profiles && !seen.has(a.user_id)) {
              seen.set(a.user_id, a.profiles as any);
            }
          }
        }
      }

      // 3. Pass holders in the school (may not be in any training)
      const { data: passHolders, error: pErr } = await supabase
        .from('player_abonaments')
        .select('player_id, profiles:player_id(id, full_name, avatar_url, is_placeholder)')
        .eq('school_id', schoolId!);
      if (pErr) throw pErr;
      for (const ph of passHolders ?? []) {
        if (ph.profiles && !seen.has(ph.player_id)) {
          seen.set(ph.player_id, ph.profiles as any);
        }
      }

      return Array.from(seen.values());
    },
  });
}

// ── Player abonament history (for profile sheet) ──

/** All abonaments for a player in a school, with usage history. Sorted newest first. */
export function usePlayerAbonamentHistory(playerId: string | undefined, schoolId: string | undefined | null) {
  return useQuery({
    queryKey: ['player-abonament-history', playerId, schoolId],
    enabled: !!playerId && !!schoolId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Fetch all abonaments for this player in this school
      const { data: abonaments, error: aErr } = await supabase
        .from('player_abonaments')
        .select('*, abonament_types(name, sessions_count, duration_days, price, currency)')
        .eq('player_id', playerId!)
        .eq('school_id', schoolId!)
        .order('created_at', { ascending: false });
      if (aErr) throw aErr;
      if (!abonaments?.length) return [];

      // Fetch usage records for all these abonaments, with session info
      const abonamentIds = abonaments.map(a => a.id);
      const { data: usage, error: uErr } = await supabase
        .from('abonament_usage')
        .select('*, training_sessions(session_date, start_time, trainings(name))')
        .in('player_abonament_id', abonamentIds)
        .order('created_at', { ascending: false });
      if (uErr) throw uErr;

      // Group usage by abonament
      const usageByAbonament = new Map<string, any[]>();
      for (const u of usage ?? []) {
        const list = usageByAbonament.get(u.player_abonament_id) ?? [];
        list.push(u);
        usageByAbonament.set(u.player_abonament_id, list);
      }

      return abonaments.map(a => ({
        ...a,
        usage: usageByAbonament.get(a.id) ?? [],
      }));
    },
  });
}

// ── Pass request flow ──

/** Player: available pass types from specific schools, or from schools where the player has training memberships. */
export function useAvailablePassTypes(schoolIds?: Array<string | null | undefined>) {
  const { user } = useAuth();
  const requestedSchoolIds = [...new Set((schoolIds ?? []).filter(Boolean))] as string[];
  const hasRequestedSchools = schoolIds !== undefined;

  return useQuery({
    queryKey: ['available-passes', user?.id, requestedSchoolIds],
    enabled: !!user && (!hasRequestedSchools || requestedSchoolIds.length > 0),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let sourceSchoolIds = requestedSchoolIds;

      if (!hasRequestedSchools) {
        // Get school IDs from training memberships for the home page.
        const { data: memberships, error: mErr } = await supabase
          .from('training_members')
          .select('trainings(school_id)')
          .eq('user_id', user!.id);
        if (mErr) throw mErr;

        sourceSchoolIds = [...new Set(
          (memberships ?? [])
            .map((m: any) => m.trainings?.school_id)
            .filter(Boolean) as string[],
        )];
      }

      if (!sourceSchoolIds.length) return [];

      const { data, error } = await supabase
        .from('abonament_types')
        .select('*, schools(id, name)')
        .in('school_id', sourceSchoolIds)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AbonamentTypeWithSchool[];
    },
  });
}

/** Coach: pending pass requests for a school */
export function usePendingPassRequests(schoolId: string | undefined | null) {
  return useQuery({
    queryKey: ['pending-pass-requests', schoolId],
    enabled: !!schoolId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_abonaments')
        .select('*, abonament_types(*), profiles:player_id(id, full_name, avatar_url)')
        .eq('school_id', schoolId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlayerAbonamentWithProfile[];
    },
  });
}

/** Player: request a pass (inserts pending row + notifies school staff) */
export function useRequestPass() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async ({ abonamentTypeId, schoolId, typeName }: {
      abonamentTypeId: string;
      schoolId: string;
      typeName: string;
    }) => {
      const { error } = await supabase
        .from('player_abonaments')
        .insert({
          abonament_type_id: abonamentTypeId,
          school_id: schoolId,
          player_id: user!.id,
          status: 'pending',
        });
      if (error) throw error;

      // Notify school owner + approved coaches
      const { data: school } = await supabase
        .from('schools')
        .select('owner_id')
        .eq('id', schoolId)
        .single();
      const { data: members } = await supabase
        .from('school_members')
        .select('coach_id')
        .eq('school_id', schoolId)
        .eq('status', 'approved');

      const staffIds = [
        school?.owner_id,
        ...(members ?? []).map(m => m.coach_id),
      ].filter(Boolean) as string[];

      if (staffIds.length) {
        const groups = await groupUsersByLanguage(staffIds);
        const playerName = profile?.full_name ?? '';
        for (const [lang, ids] of Object.entries(groups)) {
          if (!ids?.length) continue;
          const t = getFixedTForLanguage(lang);
          notifyUsers(ids, {
            title: t('notifications.passRequestTitle'),
            body: t('notifications.passRequestBody', { name: playerName, type: typeName }),
            tag: `pass-req-${abonamentTypeId}-${user!.id}`,
            url: '/coach/passes',
          });
        }
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
      qc.invalidateQueries({ queryKey: ['available-passes'] });
      qc.invalidateQueries({ queryKey: ['pending-pass-requests', vars.schoolId] });
      qc.invalidateQueries({ queryKey: ['school-abonaments', vars.schoolId] });
      toast.success(i18n.t('abonaments.requestSent', { ns: 'player' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

/** Coach: approve or decline a pending pass request */
export function useRespondPassRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, playerId, schoolId, abonamentType, accept }: {
      id: string;
      playerId: string;
      schoolId: string;
      abonamentType: AbonamentType;
      accept: boolean;
    }) => {
      if (accept) {
        // Activate: set status, sessions, expiry (same logic as useAssignAbonament)
        const now = new Date();
        let expiresAt: string | null = null;
        if (abonamentType.duration_days) {
          const end = new Date(now);
          end.setDate(end.getDate() + abonamentType.duration_days);
          end.setHours(23, 59, 59, 999);
          expiresAt = end.toISOString();
        }

        const { error } = await supabase
          .from('player_abonaments')
          .update({
            status: 'active',
            activated_at: now.toISOString(),
            sessions_total: abonamentType.sessions_count,
            sessions_remaining: abonamentType.sessions_count,
            expires_at: expiresAt,
          })
          .eq('id', id);
        if (error) throw error;
      } else {
        // Decline: delete the pending row
        const { error } = await supabase
          .from('player_abonaments')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }

      // Notify the player
      const tNotify = await getFixedTForUser(playerId);
      const typeName = abonamentType.name;
      notifyUsers([playerId], {
        title: accept
          ? tNotify('notifications.passApprovedTitle')
          : tNotify('notifications.passDeclinedTitle'),
        body: accept
          ? tNotify('notifications.passApprovedBody', { type: typeName })
          : tNotify('notifications.passDeclinedBody', { type: typeName }),
        tag: `pass-resp-${id}`,
        url: '/player',
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pending-pass-requests', vars.schoolId] });
      qc.invalidateQueries({ queryKey: ['school-abonaments', vars.schoolId] });
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
      qc.invalidateQueries({ queryKey: ['my-school-abonament'] });
      qc.invalidateQueries({ queryKey: ['available-passes'] });
      toast.success(i18n.t(
        vars.accept ? 'abonaments.approved' : 'abonaments.declined',
        { ns: 'common' },
      ));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

// ── Mutations ──

/** Coach/owner assigns a pass directly to a player */
export function useAssignAbonament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ abonamentTypeId, schoolId, playerId, sessionsCount, durationDays, startDate }: {
      abonamentTypeId: string;
      schoolId: string;
      playerId: string;
      sessionsCount: number | null;
      durationDays: number | null;
      startDate?: string; // YYYY-MM-DD, defaults to today
    }) => {
      const start = startDate ? new Date(startDate + 'T00:00:00') : new Date();
      // Expire at end of the last calendar day (23:59:59 local time)
      let expiresAt: string | null = null;
      if (durationDays) {
        const end = new Date(start);
        end.setDate(end.getDate() + durationDays);
        end.setHours(23, 59, 59, 999);
        expiresAt = end.toISOString();
      }

      const { error } = await supabase
        .from('player_abonaments')
        .insert({
          abonament_type_id: abonamentTypeId,
          school_id: schoolId,
          player_id: playerId,
          sessions_total: sessionsCount,
          sessions_remaining: sessionsCount,
          status: 'active',
          activated_at: start.toISOString(),
          expires_at: expiresAt,
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['school-abonaments', vars.schoolId] });
      qc.invalidateQueries({ queryKey: ['my-school-abonament'] });
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
      toast.success(i18n.t('abonaments.assigned', { ns: 'common' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

// ── Session deduction ──

/** Auto-deduct all signed-up abonament holders for a past session. Idempotent. */
export function useAutoDeductSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.rpc('auto_deduct_session', {
        p_session_id: sessionId,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count, sessionId) => {
      if (count > 0) {
        qc.invalidateQueries({ queryKey: ['abonament-usage-session', sessionId] });
        qc.invalidateQueries({ queryKey: ['school-abonaments'] });
        qc.invalidateQueries({ queryKey: ['my-school-abonament'] });
        qc.invalidateQueries({ queryKey: ['my-abonaments'] });
      }
    },
  });
}

/** Toggle attendance status to no_show. Pass charge stays — refund explicitly via pass card if needed.
 *  Policy: no-shows pay. */
export function useMarkNoShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, userId }: {
      playerAbonamentId?: string;
      sessionId: string;
      schoolId: string;
      userId: string;
    }) => {
      const { error: attErr } = await supabase
        .from('session_attendance')
        .update({ status: 'no_show' })
        .eq('session_id', sessionId)
        .eq('user_id', userId);
      if (attErr) throw attErr;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['session-attendance', vars.sessionId] });
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

/** Toggle attendance status back to confirmed. Pass charge already in place from auto-deduct. */
export function useRemarkAttended() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, userId }: {
      playerAbonamentId?: string;
      sessionId: string;
      schoolId: string;
      userId: string;
    }) => {
      const { error: attErr } = await supabase
        .from('session_attendance')
        .update({ status: 'confirmed' })
        .eq('session_id', sessionId)
        .eq('user_id', userId);
      if (attErr) throw attErr;

      // Catch up the deduction in case the session was previously refunded.
      // auto_deduct_session is idempotent — skips already-deducted players.
      const { error: deductErr } = await supabase.rpc('auto_deduct_session', { p_session_id: sessionId });
      if (deductErr) throw deductErr;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['abonament-usage-session', vars.sessionId] });
      qc.invalidateQueries({ queryKey: ['school-abonaments', vars.schoolId] });
      qc.invalidateQueries({ queryKey: ['session-attendance', vars.sessionId] });
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
      qc.invalidateQueries({ queryKey: ['my-school-abonament'] });
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

/** Recent abonament_usage rows for a single pass, joined with session + training info.
 *  Used by the refund chooser. */
export function usePassRecentUsages(playerAbonamentId: string | undefined | null) {
  return useQuery({
    queryKey: ['pass-recent-usages', playerAbonamentId],
    enabled: !!playerAbonamentId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('abonament_usage')
        .select('*, training_sessions(id, session_date, start_time, trainings(name))')
        .eq('player_abonament_id', playerAbonamentId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as (AbonamentUsage & {
        training_sessions: {
          id: string;
          session_date: string;
          start_time: string | null;
          trainings: { name: string } | null;
        } | null;
      })[];
    },
  });
}

export function useSessionAbonamentUsage(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['abonament-usage-session', sessionId],
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('abonament_usage')
        .select('*, player_abonaments(player_id)')
        .eq('session_id', sessionId!);
      if (error) throw error;
      return (data ?? []) as (AbonamentUsage & { player_abonaments: { player_id: string } })[];
    },
  });
}

export function useDeductSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ playerAbonamentId, sessionId, schoolId }: {
      playerAbonamentId: string;
      sessionId: string;
      schoolId: string;
    }) => {
      const { error } = await supabase.rpc('deduct_abonament_session', {
        p_player_abonament_id: playerAbonamentId,
        p_session_id: sessionId,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['abonament-usage-session', vars.sessionId] });
      qc.invalidateQueries({ queryKey: ['school-abonaments', vars.schoolId] });
      qc.invalidateQueries({ queryKey: ['my-school-abonament'] });
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
      qc.invalidateQueries({ queryKey: ['session-attendance', vars.sessionId] });
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

export function useUndoDeduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ playerAbonamentId, sessionId, schoolId }: {
      playerAbonamentId: string;
      sessionId: string;
      schoolId: string;
    }) => {
      const { error } = await supabase.rpc('undo_abonament_deduction', {
        p_player_abonament_id: playerAbonamentId,
        p_session_id: sessionId,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['abonament-usage-session', vars.sessionId] });
      qc.invalidateQueries({ queryKey: ['school-abonaments', vars.schoolId] });
      qc.invalidateQueries({ queryKey: ['my-school-abonament'] });
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
      qc.invalidateQueries({ queryKey: ['session-attendance', vars.sessionId] });
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}
