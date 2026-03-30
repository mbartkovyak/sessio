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

// ── Abonament type queries (school owner manages) ──

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
        .order('sessions_count', { ascending: true });
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
      sessions_count: number;
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

/** All abonaments for a school (school owner / coach view — includes player profile) */
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

/** Player's active/pending abonament for a specific school */
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
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PlayerAbonament | null;
    },
  });
}

/** Player's all active+pending abonaments (homepage) */
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
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlayerAbonamentWithSchool[];
    },
  });
}

/** Pending abonament requests for school owner */
export function usePendingAbonaments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pending-abonaments', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_abonaments')
        .select('*, abonament_types(*), profiles:player_id(id, full_name, avatar_url), schools!inner(id, name, owner_id)')
        .eq('status', 'pending');
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

// ── Mutations ──

/** Player requests to buy a pass */
export function useRequestAbonament() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ abonamentTypeId, schoolId, sessionsTotal }: {
      abonamentTypeId: string;
      schoolId: string;
      sessionsTotal: number;
    }) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('player_abonaments')
        .insert({
          abonament_type_id: abonamentTypeId,
          school_id: schoolId,
          player_id: user.id,
          sessions_total: sessionsTotal,
          sessions_remaining: sessionsTotal,
          status: 'pending',
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['my-school-abonament', vars.schoolId] });
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
      qc.invalidateQueries({ queryKey: ['school-abonaments', vars.schoolId] });
      qc.invalidateQueries({ queryKey: ['pending-abonaments'] });
      toast.success(i18n.t('abonaments.requestSent', { ns: 'common' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

/** School owner activates a pending pass */
export function useActivateAbonament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, schoolId }: { id: string; schoolId: string }) => {
      const { error } = await supabase
        .from('player_abonaments')
        .update({ status: 'active', activated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['school-abonaments', vars.schoolId] });
      qc.invalidateQueries({ queryKey: ['pending-abonaments'] });
      qc.invalidateQueries({ queryKey: ['my-school-abonament'] });
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
      toast.success(i18n.t('abonaments.activated', { ns: 'common' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

// ── Session deduction ──

/** Usage records for a specific session */
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

/** Coach/owner deducts a session from a player's abonament */
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
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

/** Coach/owner undoes a deduction */
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
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}
