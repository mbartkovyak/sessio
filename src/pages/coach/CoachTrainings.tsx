import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { useTrainings, useSchoolTrainings } from '@/hooks/training/useTrainings';
import { useMySchool, useMySchoolMembership } from '@/hooks/school/useSchools';
import { useAuth } from '@/contexts/AuthContext';
import TrainingCard from '@/components/shared/TrainingCard';

export default function CoachTrainings() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: school } = useMySchool();
  const { data: schoolMembership } = useMySchoolMembership();
  const { data: myTrainings = [], isLoading } = useTrainings();
  const { data: schoolTrainings = [] } = useSchoolTrainings(isSchoolOwner ? school?.id : undefined);
  const [search, setSearch] = useState('');

  // Coach in a school cannot create lessons
  const canCreate = isSchoolOwner || !schoolMembership;

  // School owner: merge personal + school trainings (deduplicate)
  const allTrainings = useMemo(() => {
    if (!isSchoolOwner) return myTrainings;
    const ids = new Set(myTrainings.map((t: any) => t.id));
    return [...myTrainings, ...schoolTrainings.filter((t: any) => !ids.has(t.id))];
  }, [myTrainings, schoolTrainings, isSchoolOwner]);

  const filtered = allTrainings.filter((t: any) => t.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 px-4 py-4 header-gradient">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Lessons</h1>
          {canCreate && (
            <button onClick={() => navigate('/coach/trainings/new')} className="flex items-center gap-1 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground min-h-[40px]">
              <Plus className="h-4 w-4" /> New
            </button>
          )}
        </div>
      </header>
      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 pb-4 space-y-2">
          {isLoading ? [1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />) :
          filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🏋️</div>
              <p className="font-medium text-foreground">No lessons yet</p>
              {canCreate && <button onClick={() => navigate('/coach/trainings/new')} className="mt-4 text-sm font-medium text-primary">Create your first lesson →</button>}
            </div>
          ) : filtered.map((t: any) => (
            <TrainingCard
              key={t.id}
              training={t}
              onClick={() => navigate(`/coach/trainings/${t.id}`)}
              badge={
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize shrink-0">{t.type}</span>
              }
              extra={
                isSchoolOwner && t.school_id && t.coach?.full_name && t.coach_id !== profile?.id
                  ? <span className="mt-1 inline-block text-xs text-primary font-medium">Coach {t.coach.full_name}</span>
                  : undefined
              }
            />
          ))}
        </div>
      </main>
      <CoachBottomNav />
    </div>
  );
}
