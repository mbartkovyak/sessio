import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown } from 'lucide-react';
import NewLessonButton from '@/components/coach/NewLessonButton';
import CoachHeader from '@/components/coach/CoachHeader';
import { useState, useMemo } from 'react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { useTrainings, useSchoolTrainings } from '@/hooks/training/useTrainings';
import { useMySchool, useMySchoolMembership } from '@/hooks/school/useSchools';
import { useAuth } from '@/contexts/AuthContext';
import TrainingCard from '@/components/shared/TrainingCard';

type TypeFilter = 'all' | 'group' | 'individual';
type ScheduleFilter = 'all' | 'recurring' | 'one-time';

export default function CoachTrainings() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: school } = useMySchool();
  const { data: schoolMembership } = useMySchoolMembership();
  const { data: myTrainings = [], isLoading } = useTrainings();
  const { data: schoolTrainings = [] } = useSchoolTrainings(isSchoolOwner ? school?.id : undefined);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('all');

  // Coach in a school cannot create lessons
  const canCreate = isSchoolOwner || !schoolMembership;

  // School owner: merge personal + school trainings (deduplicate)
  const allTrainings = useMemo(() => {
    if (!isSchoolOwner) return myTrainings;
    const ids = new Set(myTrainings.map((t: any) => t.id));
    return [...myTrainings, ...schoolTrainings.filter((t: any) => !ids.has(t.id))];
  }, [myTrainings, schoolTrainings, isSchoolOwner]);

  const filtered = useMemo(() => {
    let list = allTrainings;
    if (search) list = list.filter((t: any) => t.name?.toLowerCase().includes(search.toLowerCase()));
    if (typeFilter !== 'all') list = list.filter((t: any) => t.type === typeFilter);
    if (scheduleFilter === 'recurring') list = list.filter((t: any) => t.is_recurring);
    if (scheduleFilter === 'one-time') list = list.filter((t: any) => !t.is_recurring);
    // Sort by earliest start_date first
    return [...list].sort((a: any, b: any) => {
      const da = a.start_date ?? '9999';
      const db = b.start_date ?? '9999';
      return da.localeCompare(db);
    });
  }, [allTrainings, search, typeFilter, scheduleFilter]);

  const hasFilters = typeFilter !== 'all' || scheduleFilter !== 'all';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CoachHeader title="Lessons" right={canCreate ? <NewLessonButton /> : undefined} />
      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lessons..."
              className="w-full rounded-xl border border-border bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as TypeFilter)}
                className={`appearance-none rounded-full pl-3 pr-7 py-1.5 text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${
                  typeFilter !== 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}>
                <option value="all">All types</option>
                <option value="group">Group</option>
                <option value="individual">Individual</option>
              </select>
              <ChevronDown className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 ${
                typeFilter !== 'all' ? 'text-primary-foreground' : 'text-muted-foreground'
              }`} />
            </div>
            <div className="relative">
              <select value={scheduleFilter} onChange={e => setScheduleFilter(e.target.value as ScheduleFilter)}
                className={`appearance-none rounded-full pl-3 pr-7 py-1.5 text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${
                  scheduleFilter !== 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}>
                <option value="all">All schedules</option>
                <option value="recurring">Recurring</option>
                <option value="one-time">One-time</option>
              </select>
              <ChevronDown className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 ${
                scheduleFilter !== 'all' ? 'text-primary-foreground' : 'text-muted-foreground'
              }`} />
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 pb-4 space-y-2">
          {isLoading ? [1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />) :
          filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🏋️</div>
              <p className="font-medium text-foreground">{hasFilters ? 'No matching lessons' : 'No lessons yet'}</p>
              {!hasFilters && canCreate && <button onClick={() => navigate('/coach/trainings/new')} className="mt-4 text-sm font-medium text-primary">Create your first lesson →</button>}
              {hasFilters && <button onClick={() => { setTypeFilter('all'); setScheduleFilter('all'); }} className="mt-4 text-sm font-medium text-primary">Clear filters</button>}
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
