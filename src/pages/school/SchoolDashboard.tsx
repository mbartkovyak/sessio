import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMySchool } from '@/hooks/school/useSchools';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, UserPlus, LogOut, Calendar, Settings } from 'lucide-react';
import { SessioLogoCompact } from '@/components/SessioLogo';
import { toast } from 'sonner';
import Avatar from '@/components/shared/Avatar';
import { useState } from 'react';
import { sportLabel } from '@/lib/constants';
import { localizeErrorMessage } from '@/lib/localizedErrors';

export default function SchoolDashboard() {
  const { t } = useTranslation('school');
  const { data: school, isLoading } = useMySchool();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [addingSelf, setAddingSelf] = useState(false);

  const coaches = (school)?.school_members ?? [];
  const isSelfCoach = coaches.some((m: any) => m.coach_id === user?.id);

  const { data: trainingsCount = 0, isLoading: trainingsLoading } = useQuery({
    queryKey: ['school-trainings-count', school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('trainings')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', school!.id)
        .eq('is_active', true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: athletesCount = 0, isLoading: athletesLoading } = useQuery({
    queryKey: ['school-athletes-count', school?.id],
    enabled: !!school?.id,
    queryFn: async () => {
      // Get all active training IDs for this school
      const { data: trainings, error: tErr } = await supabase
        .from('trainings')
        .select('id')
        .eq('school_id', school!.id)
        .eq('is_active', true);
      if (tErr) throw tErr;
      if (!trainings || trainings.length === 0) return 0;

      const trainingIds = trainings.map((tr: any) => tr.id);
      const { data: members, error: mErr } = await supabase
        .from('training_members')
        .select('user_id')
        .in('training_id', trainingIds);
      if (mErr) throw mErr;

      // Count unique athletes
      const uniqueIds = new Set((members ?? []).map((m: any) => m.user_id));
      return uniqueIds.size;
    },
  });

  async function addSelfAsCoach() {
    if (!school?.id || !user) return;
    setAddingSelf(true);
    const { error } = await supabase
      .from('school_members')
      .insert({ school_id: school.id, coach_id: user.id, status: 'approved' });
    setAddingSelf(false);
    if (error) {
      toast.error(localizeErrorMessage(error, t('common:errors.somethingWentWrong')));
    } else {
      toast.success(t('dashboard.nowCoach'));
      qc.invalidateQueries({ queryKey: ['my-school'] });
    }
  }

  if (isLoading || trainingsLoading || athletesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="safe-area-top fixed top-0 left-0 right-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">{school?.name ?? t('dashboard.defaultName')}</h1>
            <p className="text-xs text-muted-foreground">{[school?.city, school?.sport ? sportLabel(school.sport) : null].filter(Boolean).join(' · ')}</p>
          </div>
          <SessioLogoCompact size={24} />
        </div>
      </header>
      <div className="safe-area-top px-4 py-4 invisible" aria-hidden="true">
        <div className="max-w-md mx-auto h-10" />
      </div>

      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t('dashboard.coaches'), value: coaches.length, loading: isLoading },
            { label: t('dashboard.trainings'), value: trainingsCount, loading: trainingsLoading },
            { label: t('dashboard.athletes'), value: athletesCount, loading: athletesLoading },
          ].map(({ label, value, loading }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-3 text-center">
              {loading ? (
                <div className="h-6 w-8 mx-auto rounded bg-muted animate-pulse" />
              ) : (
                <p className="text-xl font-bold text-foreground">{value}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        {!isSelfCoach && (
          <button
            onClick={addSelfAsCoach}
            disabled={addingSelf}
            className="w-full rounded-xl bg-primary p-4 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-primary-foreground">{t('dashboard.alsoCoach')}</p>
                <p className="text-sm text-primary-foreground/70">{t('dashboard.alsoCoachDesc')}</p>
              </div>
            </div>
          </button>
        )}

        {/* Coaches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">{t('dashboard.coachesSection')}</h2>
            <button
              onClick={() => navigate('/school/coaches')}
              className="flex items-center gap-1 text-sm font-medium text-primary px-2 min-h-[44px]"
            >
              <Plus className="h-4 w-4" /> {t('dashboard.add')}
            </button>
          </div>
          {coaches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-foreground">{t('dashboard.noCoaches')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('dashboard.noCoachesDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {coaches.map((m: any) => {
                const coach = m.coach ?? m.profiles;
                const isMe = m.coach_id === user?.id;
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <Avatar url={coach?.avatar_url} name={coach?.full_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {coach?.full_name ?? t('dashboard.coach')}
                        {isMe && <span className="text-xs text-primary ml-1">{t('dashboard.you')}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{coach?.sport ? sportLabel(coach.sport) : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          <button onClick={() => navigate('/school/calendar')} className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground min-h-[44px]">
            <Calendar className="h-4 w-4 text-muted-foreground" /> {t('dashboard.schoolCalendar')}
          </button>
          <button onClick={() => navigate('/school/coaches')} className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground min-h-[44px]">
            <Users className="h-4 w-4 text-muted-foreground" /> {t('dashboard.manageCoaches')}
          </button>
          <button onClick={() => navigate('/school/profile')} className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground min-h-[44px]">
            <Settings className="h-4 w-4 text-muted-foreground" /> {t('dashboard.schoolSettings')}
          </button>
        </div>

        <button
          onClick={async () => { await signOut(); navigate('/auth'); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-destructive"
        >
          <LogOut className="h-4 w-4" /> {t('common:actions.signOut')}
        </button>
      </main>
    </div>
  );
}
