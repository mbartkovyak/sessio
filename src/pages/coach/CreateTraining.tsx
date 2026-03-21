import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { useCreateTraining } from '@/hooks/training/useTrainings';
import { useAuth } from '@/contexts/AuthContext';
import { useMySchool, useMySchoolMembership } from '@/hooks/school/useSchools';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import TrainingForm, { type TrainingFormValues } from '@/components/shared/TrainingForm';

function getNextDayDate(dayOfWeek: number): string {
  const today = new Date();
  const todayDay = (today.getDay() + 6) % 7; // Monday=0
  const diff = ((dayOfWeek - todayDay) + 7) % 7 || 7;
  const next = new Date(today);
  next.setDate(today.getDate() + diff);
  return next.toISOString().split('T')[0];
}

export default function CreateTraining() {
  const navigate = useNavigate();
  const create = useCreateTraining();
  const { profile } = useAuth();
  const { data: school } = useMySchool();
  const { data: schoolMembership } = useMySchoolMembership();
  const isSchoolOwner = profile?.role === 'school_owner';
  const schoolCoaches = (school as any)?.school_members ?? [];
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');

  // Coaches in a school cannot create lessons — only school owners can
  if (!isSchoolOwner && schoolMembership) {
    return <Navigate to="/coach/trainings" replace />;
  }

  async function handleSubmit(form: TrainingFormValues) {
    try {
      const payload: any = {
        ...form,
        start_time: form.start_time + ':00',
        end_time: form.end_time + ':00',
        days_of_week: form.is_recurring ? form.days_of_week : undefined,
        day_of_week: form.is_recurring ? form.days_of_week[0] : undefined,
        start_date: form.is_recurring ? (form.start_date || getNextDayDate(form.days_of_week[0])) : form.one_off_date,
        end_date: form.is_recurring ? (form.end_date || null) : form.one_off_date,
      };
      delete payload.one_off_date;
      // Per-day schedules (null when same time for all)
      payload.day_schedules = form.day_schedules || null;
      if (form.type === 'individual') delete payload.max_players;
      // Sport inherited from school or coach profile
      payload.sport = (isSchoolOwner && school) ? school.sport : (profile?.sport ?? 'Tennis');
      // School owner: always a school lesson with assigned coach
      if (isSchoolOwner && school) {
        payload.school_id = school.id;
        if (selectedCoachId) payload.coach_id = selectedCoachId;
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
        toast.error('Training created but session generation failed.');
      }
      navigate(`/coach/trainings/${training.id}`);
    } catch (err: any) {
      console.error('Create training error:', err);
    }
  }

  // School owner: show coach selector
  const schoolSlot = isSchoolOwner && school ? (
    <div>
      <label className="text-sm font-medium text-foreground mb-1 block">Coach</label>
      {schoolCoaches.length === 0 ? (
        <p className="text-sm text-destructive">No coaches in your school yet. Add coaches before creating trainings.</p>
      ) : (
        <div className="relative">
          <select
            value={selectedCoachId}
            onChange={e => setSelectedCoachId(e.target.value)}
            className="w-full appearance-none rounded-xl border border-input bg-background px-4 py-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
          >
            <option value="">Select coach</option>
            {schoolCoaches.map((m: any) => (
              <option key={m.coach_id} value={m.coach_id}>
                {m.coach?.full_name ?? 'Coach'}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  ) : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-semibold text-foreground">New Lesson</h1>
      </header>
      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-6">
          <TrainingForm
            mode="create"
            onSubmit={handleSubmit}
            submitting={create.isPending}
            schoolSlot={schoolSlot}
            venueOptions={isSchoolOwner ? ((school as any)?.venues ?? []) : undefined}
          />
        </div>
      </main>
      <CoachBottomNav />
    </div>
  );
}
