import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown } from 'lucide-react';
import NewLessonButton from '@/components/coach/NewLessonButton';
import CoachHeader from '@/components/coach/CoachHeader';
import { useState, useMemo } from 'react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { useTrainings, useSchoolTrainings } from '@/hooks/training/useTrainings';
import { useMySchool } from '@/hooks/school/useSchools';
import { useAuth } from '@/contexts/AuthContext';
import TrainingCard from '@/components/shared/TrainingCard';
import { useTranslation } from 'react-i18next';

type TypeFilter = 'all' | 'group' | 'individual';
type ScheduleFilter = 'all' | 'recurring' | 'one-time';

export default function CoachTrainings() {
  const navigate = useNavigate();
  const { t } = useTranslation('coach');
  const { profile } = useAuth();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: school } = useMySchool();
  const { data: myTrainings = [], isLoading } = useTrainings();
  const { data: schoolTrainings = [] } = useSchoolTrainings(isSchoolOwner ? school?.id : undefined);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('all');

  const canCreate = true;

  // School owner: merge personal + school trainings (deduplicate)
  const allTrainings = useMemo(() => {
    if (!isSchoolOwner) return myTrainings;
    const ids = new Set(myTrainings.map((tr: any) => tr.id));
    return [...myTrainings, ...schoolTrainings.filter((tr: any) => !ids.has(tr.id))];
  }, [myTrainings, schoolTrainings, isSchoolOwner]);

  const filtered = useMemo(() => {
    let list = allTrainings;
    if (search) list = list.filter((tr: any) => tr.name?.toLowerCase().includes(search.toLowerCase()));
    if (typeFilter !== 'all') list = list.filter((tr: any) => tr.type === typeFilter);
    if (scheduleFilter === 'recurring') list = list.filter((tr: any) => tr.is_recurring);
    if (scheduleFilter === 'one-time') list = list.filter((tr: any) => !tr.is_recurring);
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
      <CoachHeader title={t('trainings.title')} right={canCreate ? <NewLessonButton /> : undefined} />
      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('trainings.searchPlaceholder')}
              className="w-full rounded-xl border border-border bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {([
              { value: typeFilter, set: (v: string) => setTypeFilter(v as TypeFilter), label: typeFilter === 'all' ? t('trainings.filterType') : typeFilter === 'group' ? t('trainings.group') : t('trainings.individual'), options: [['all', t('trainings.filterType')], ['group', t('trainings.group')], ['individual', t('trainings.individual')]] },
              { value: scheduleFilter, set: (v: string) => setScheduleFilter(v as ScheduleFilter), label: scheduleFilter === 'all' ? t('trainings.filterSchedule') : scheduleFilter === 'recurring' ? t('trainings.recurring') : t('trainings.oneTime'), options: [['all', t('trainings.filterSchedule')], ['recurring', t('trainings.recurring')], ['one-time', t('trainings.oneTime')]] },
            ] as const).map(({ value, set, label, options }, i) => (
              <div key={i} className={`relative inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors ${
                value !== 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
              }`}>
                <span className="text-xs font-semibold pointer-events-none">{label}</span>
                <ChevronDown className={`h-3 w-3 pointer-events-none ${value !== 'all' ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                <select value={value} onChange={e => set(e.target.value)}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label={label}>
                  {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 pb-4 space-y-2">
          {isLoading ? [1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />) :
          filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🏋️</div>
              <p className="font-medium text-foreground">{hasFilters ? t('trainings.noMatching') : t('trainings.noLessons')}</p>
              {!hasFilters && canCreate && <button onClick={() => navigate('/coach/trainings/new')} className="mt-4 text-sm font-medium text-primary">{t('trainings.createFirst')}</button>}
              {hasFilters && <button onClick={() => { setTypeFilter('all'); setScheduleFilter('all'); }} className="mt-4 text-sm font-medium text-primary">{t('trainings.clearFilters')}</button>}
            </div>
          ) : filtered.map((tr: any) => (
            <TrainingCard
              key={tr.id}
              training={tr}
              onClick={() => navigate(`/coach/trainings/${tr.id}`)}
              badge={
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary shrink-0">{t(`common:trainingType.${tr.type}`)}</span>
              }
              extra={
                isSchoolOwner && tr.school_id && tr.coach?.full_name && tr.coach_id !== profile?.id
                  ? <span className="mt-1 inline-block text-xs text-primary font-medium">{t('trainings.coachName', { name: tr.coach.full_name })}</span>
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
