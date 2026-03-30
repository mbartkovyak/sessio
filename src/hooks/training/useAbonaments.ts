import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import i18n from '@/i18n';
import { localizeErrorMessage } from '@/lib/localizedErrors';
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

type AbonamentUsage = Tables<'abonament_usage'>;

// ── Helpers ──

/** True if the pass is effectively active (not expired, has sessions left) */
export function isAbonamentActive(pa: { status: string; expires_at: string | null; sessions_remaining: number | null }): boolean {
  if (pa.status !== 'active') return false;
  if (pa.expires_at && new Date(pa.expires_at) < new Date()) return false;
  if (pa.sessions_remaining !== null && pa.sessions_remaining <= 0) return false;
  return true;
}

// ── Abonament type queries ──

export function useAbonamentTypes(schoolId: string | undefined | null) {
  return useQuery({
    queryKey: ['abonament-types', schoolId],
    enabled: !!schoolId,
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_abonaments')
        .select('*, abonament_types(*), schools(id, name)')
        .eq('player_id', user!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlayerAbonamentWithSchool[];
    },
  });
}

// ── School athletes (for assign picker) ──

export function useSchoolAthletes(schoolId: string | undefined | null) {
  return useQuery({
    queryKey: ['school-athletes', schoolId],
    enabled: !!schoolId,
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
        .select('user_id, profiles:user_id(id, full_name, avatar_url)')
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

// ── Mutations ──

/** Coach/owner assigns a pass directly to a player */
export function useAssignAbonament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ abonamentTypeId, schoolId, playerId, sessionsCount, durationDays }: {
      abonamentTypeId: string;
      schoolId: string;
      playerId: string;
      sessionsCount: number | null;
      durationDays: number | null;
    }) => {
      const now = new Date();
      const expiresAt = durationDays
        ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('player_abonaments')
        .insert({
          abonament_type_id: abonamentTypeId,
          school_id: schoolId,
          player_id: playerId,
          sessions_total: sessionsCount,
          sessions_remaining: sessionsCount,
          status: 'active',
          activated_at: now.toISOString(),
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

export function useSessionAbonamentUsage(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['abonament-usage-session', sessionId],
    enabled: !!sessionId,
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
