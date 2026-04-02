import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, UserPlus } from 'lucide-react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import CoachHeader from '@/components/coach/CoachHeader';
import { useCreateTraining } from '@/hooks/training/useTrainings';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchool, useMySchoolMembership } from '@/hooks/school/useSchools';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import TrainingForm, { type TrainingFormValues, type VenueOption } from '@/components/shared/TrainingForm';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

/** Given a start_date and a target day (Monday=0), return the first occurrence
 *  of that day on or after start_date. Prevents sessions starting on the wrong day. */
function alignStartDate(startDate: string, dayOfWeek: number): string {
  const d = new Date(startDate + 'T00:00:00');
  const currentDay = (d.getDay() + 6) % 7; // Monday=0
  const diff = ((dayOfWeek - currentDay) + 7) % 7;
  if (diff > 0) d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

export default function CreateTraining() {
  const navigate = useNavigate();
  const { t } = useTranslation('coach');
  const create = useCreateTraining();
  const { profile, refreshProfile } = useAuth();
  const { data: school } = useMySchool();
  const { data: schoolMembership } = useMySchoolMembership();
  const isSchoolOwner = profile?.role === 'school_owner';
  const isSchoolMember = !isSchoolOwner && !!schoolMembership;
  const isSolo = (school as any)?.is_listed === false;
  const schoolCoaches = (school as any)?.school_members ?? [];
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [attempted, setAttempted] = useState(false);
  const qc = useQueryClient();
  const sourceVenues: VenueOption[] = isSchoolOwner
    ? ((school as any)?.venues ?? [])
    : isSchoolMember
      ? ((schoolMembership?.schools as any)?.venues ?? [])
      : ((profile as any)?.venues ?? []);
  const [localVenues, setLocalVenues] = useState<VenueOption[]>(sourceVenues);

  // Sync when source data loads (profile/school async)
  useEffect(() => {
    if (sourceVenues.length > 0) setLocalVenues(sourceVenues);
  }, [sourceVenues.length]);

  async function handleNewCoachVenue(venue: VenueOption) {
    if (!profile) return;
    setLocalVenues(prev => [...prev, venue]);
    const currentVenues = ((profile as any).venues ?? []) as VenueOption[];
    await supabase
      .from('profiles')
      .update({ venues: [...currentVenues, venue] })
      .eq('id', profile.id);
    refreshProfile();
  }

  async function handleNewVenue(venue: VenueOption) {
    if (!school) return;
    setLocalVenues(prev => [...prev, venue]);
    const currentSchoolVenues = ((school as any).venues ?? []) as VenueOption[];
    await supabase
      .from('schools')
      .update({ venues: [...currentSchoolVenues, venue] })
      .eq('id', school.id);
    qc.invalidateQueries({ queryKey: ['my-school'] });
    // Also save to profile so it shows in the coach profile editor
    if (profile) {
      const currentProfileVenues = ((profile as any).venues ?? []) as VenueOption[];
      await supabase
        .from('profiles')
        .update({ venues: [...currentProfileVenues, venue] })
        .eq('id', profile.id);
      refreshProfile();
    }
  }

  const extraErrors = isSchoolOwner && !isSolo && !selectedCoachId ? [t('create.coachRequired')] : [];

  async function handleSubmit(form: TrainingFormValues) {
    try {
      const payload: any = {
        ...form,
        start_time: form.start_time + ':00',
        end_time: form.end_time + ':00',
        days_of_week: form.is_recurring ? form.days_of_week : undefined,
        day_of_week: form.is_recurring ? form.days_of_week[0] : undefined,
        start_date: form.is_recurring ? alignStartDate(form.start_date, form.days_of_week[0]) : form.one_off_date,
        end_date: form.is_recurring ? (form.end_date || null) : form.one_off_date,
      };
      delete payload.one_off_date;
      // Per-day schedules (null when same time for all)
      payload.day_schedules = form.day_schedules || null;
      if (form.type === 'individual') delete payload.max_players;
      // Sport inherited from school (first sport) or coach profile
      payload.sport = (isSchoolOwner && school)
        ? school.sport?.[0] ?? 'Tennis'
        : (isSchoolMember && schoolMembership?.schools)
          ? (schoolMembership.schools as any).sport?.[0] ?? 'Tennis'
          : (profile?.sport ?? 'Tennis');
      // School owner: school lesson with assigned coach (solo coaches auto-assign themselves)
      if (isSchoolOwner && school) {
        payload.school_id = school.id;
        payload.coach_id = isSolo ? profile?.id : (selectedCoachId || undefined);
      }
      // School member coach: auto-link to school
      if (isSchoolMember && schoolMembership?.school_id) {
        payload.school_id = schoolMembership.school_id;
      }
      if (!form.is_recurring) {
        const d = new Date(form.one_off_date + 'T00:00:00');
        payload.day_of_week = (d.getDay() + 6) % 7;
        payload.days_of_week = [payload.day_of_week];
      }
      const training = await create.mutateAsync(payload);
      const { error: rpcError } = await supabase.rpc('generate_sessions_for_training', { p_training_id: training.id });
      if (rpcError) {
        console.warn('Session generation failed:', rpcError.message);
        toast.error(t('create.sessionGenFailed'));
      }
      // Invalidate home page session queries so they show immediately on navigate back
      qc.invalidateQueries({ queryKey: ['upcoming-sessions'] });
      qc.invalidateQueries({ queryKey: ['school-upcoming-sessions'] });
      qc.invalidateQueries({ queryKey: ['coach-calendar-sessions'] });
      qc.invalidateQueries({ queryKey: ['school-calendar-sessions'] });
      navigate(`/coach/trainings/${training.id}`);
    } catch (err: any) {
      console.error('Create training error:', err);
    }
  }

  // School owner: show coach selector (not for solo coaches)
  const schoolSlot = isSchoolOwner && school && !isSolo ? (
    <div {...(!selectedCoachId ? { 'data-field-error': true } : {})}>
      <label className="text-sm font-medium text-foreground mb-1 block">{t('create.coachLabel')} <span className="text-destructive">*</span></label>
      {schoolCoaches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">{t('create.noCoaches')}</p>
          <button type="button" onClick={() => navigate('/coach/coaches')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            <UserPlus className="h-4 w-4" /> {t('create.addCoaches')}
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <select
              value={selectedCoachId}
              onChange={e => setSelectedCoachId(e.target.value)}
              className={`w-full appearance-none rounded-xl border bg-background px-4 py-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] ${attempted && !selectedCoachId ? 'border-destructive' : 'border-input'}`}
            >
              <option value="">{t('create.selectCoach')}</option>
              {schoolCoaches.map((m: any) => (
                <option key={m.coach_id} value={m.coach_id}>
                  {m.coach?.full_name ?? t('create.coachLabel')}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <button type="button" onClick={() => navigate('/coach/coaches')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary mt-1.5">
            <UserPlus className="h-3.5 w-3.5" /> {t('create.addCoaches')}
          </button>
          {attempted && !selectedCoachId && <p className="text-xs text-destructive mt-1">{t('create.coachRequired')}</p>}
        </>
      )}
    </div>
  ) : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CoachHeader title={t('create.title')} back />
      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="rounded-2xl bg-white p-4 shadow-sm overflow-visible" style={{ border: '1px solid hsl(203 20% 90%)' }}>
          <TrainingForm
            mode="create"
            onSubmit={handleSubmit}
            submitting={create.isPending}
            schoolSlot={schoolSlot}
            venueOptions={localVenues}
            onNewVenue={isSchoolOwner ? handleNewVenue : handleNewCoachVenue}
            extraErrors={extraErrors}
            onAttemptSubmit={() => setAttempted(true)}
          />
          </div>
        </div>
      </main>
      <CoachBottomNav />
    </div>
  );
}
