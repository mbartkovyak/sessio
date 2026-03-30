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

type PlayerAbonamentWithTraining = Tables<'player_abonaments'> & {
  abonament_types: AbonamentType;
  trainings: Pick<Tables<'trainings'>, 'id' | 'name' | 'sport' | 'venue'> | null;
};

type AbonamentUsage = Tables<'abonament_usage'>;

// ── Abonament type queries (coach manages per training) ──

export function useAbonamentTypes(trainingId: string | undefined) {
  return useQuery({
    queryKey: ['abonament-types', trainingId],
    enabled: !!trainingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('abonament_types')
        .select('*')
        .eq('training_id', trainingId!)
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
      training_id: string;
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
      qc.invalidateQueries({ queryKey: ['abonament-types', vars.training_id] });
      toast.success(i18n.t('abonaments.typeCreated', { ns: 'common' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

export function useDeleteAbonamentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, trainingId }: { id: string; trainingId: string }) => {
      const { error } = await supabase
        .from('abonament_types')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['abonament-types', vars.trainingId] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

// ── Player abonament queries ──

/** All abonaments for a training (coach view — includes player profile) */
export function useTrainingAbonaments(trainingId: string | undefined) {
  return useQuery({
    queryKey: ['training-abonaments', trainingId],
    enabled: !!trainingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_abonaments')
        .select('*, abonament_types(*), profiles:player_id(id, full_name, avatar_url)')
        .eq('training_id', trainingId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlayerAbonamentWithProfile[];
    },
  });
}

/** Player's active/pending abonament for a specific training */
export function useMyTrainingAbonament(trainingId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-training-abonament', trainingId, user?.id],
    enabled: !!trainingId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_abonaments')
        .select('*, abonament_types(*)')
        .eq('training_id', trainingId!)
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
        .select('*, abonament_types(*), trainings(id, name, sport, venue)')
        .eq('player_id', user!.id)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlayerAbonamentWithTraining[];
    },
  });
}

/** Pending abonament requests across all coach's trainings */
export function usePendingAbonaments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pending-abonaments', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_abonaments')
        .select('*, abonament_types(*), profiles:player_id(id, full_name, avatar_url), trainings!inner(id, name, coach_id)')
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
    mutationFn: async ({ abonamentTypeId, trainingId, sessionsTotal }: {
      abonamentTypeId: string;
      trainingId: string;
      sessionsTotal: number;
    }) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('player_abonaments')
        .insert({
          abonament_type_id: abonamentTypeId,
          training_id: trainingId,
          player_id: user.id,
          sessions_total: sessionsTotal,
          sessions_remaining: sessionsTotal,
          status: 'pending',
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['my-training-abonament', vars.trainingId] });
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
      qc.invalidateQueries({ queryKey: ['training-abonaments', vars.trainingId] });
      toast.success(i18n.t('abonaments.requestSent', { ns: 'common' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

/** Coach activates a pending pass */
export function useActivateAbonament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, trainingId }: { id: string; trainingId: string }) => {
      const { error } = await supabase
        .from('player_abonaments')
        .update({ status: 'active', activated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['training-abonaments', vars.trainingId] });
      qc.invalidateQueries({ queryKey: ['pending-abonaments'] });
      qc.invalidateQueries({ queryKey: ['my-training-abonament'] });
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
      toast.success(i18n.t('abonaments.activated', { ns: 'common' }));
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

// ── Session deduction ──

/** Usage records for a specific session (which players have been deducted) */
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

/** Coach deducts a session from a player's abonament */
export function useDeductSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ playerAbonamentId, sessionId, trainingId }: {
      playerAbonamentId: string;
      sessionId: string;
      trainingId: string;
    }) => {
      const { error } = await supabase.rpc('deduct_abonament_session', {
        p_player_abonament_id: playerAbonamentId,
        p_session_id: sessionId,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['abonament-usage-session', vars.sessionId] });
      qc.invalidateQueries({ queryKey: ['training-abonaments', vars.trainingId] });
      qc.invalidateQueries({ queryKey: ['my-training-abonament'] });
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}

/** Coach undoes a deduction */
export function useUndoDeduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ playerAbonamentId, sessionId, trainingId }: {
      playerAbonamentId: string;
      sessionId: string;
      trainingId: string;
    }) => {
      const { error } = await supabase.rpc('undo_abonament_deduction', {
        p_player_abonament_id: playerAbonamentId,
        p_session_id: sessionId,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['abonament-usage-session', vars.sessionId] });
      qc.invalidateQueries({ queryKey: ['training-abonaments', vars.trainingId] });
      qc.invalidateQueries({ queryKey: ['my-training-abonament'] });
      qc.invalidateQueries({ queryKey: ['my-abonaments'] });
    },
    onError: (e: any) => toast.error(localizeErrorMessage(e, i18n.t('errors.somethingWentWrong', { ns: 'common' }))),
  });
}
