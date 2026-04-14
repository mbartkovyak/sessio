import { useNavigate } from 'react-router-dom';
import { Search, MapPin, MessageCircle } from 'lucide-react';
import NewLessonButton from '@/components/coach/NewLessonButton';
import CoachHeader from '@/components/coach/CoachHeader';
import { useState, useMemo } from 'react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { useTrainings, useSchoolTrainings } from '@/hooks/training/useTrainings';
import { useMySchool } from '@/hooks/school/useSchools';
import { useAuth } from '@/contexts/AuthContext';
import TrainingCard from '@/components/shared/TrainingCard';
import { openExternal } from '@/components/shared/VenueLink';
import { useTranslation } from 'react-i18next';

export default function CoachTrainings() {
  const navigate = useNavigate();
  const { t } = useTranslation('coach');
  const { profile } = useAuth();
  const isSchoolOwner = profile?.role === 'school_owner';
  const { data: school } = useMySchool();
  const { data: myTrainings = [], isLoading } = useTrainings();
  const { data: schoolTrainings = [] } = useSchoolTrainings(isSchoolOwner ? school?.id : undefined);
  const [search, setSearch] = useState('');

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
    // Sort by earliest start_date first
    return [...list].sort((a: any, b: any) => {
      const da = a.start_date ?? '9999';
      const db = b.start_date ?? '9999';
      return da.localeCompare(db);
    });
  }, [allTrainings, search]);


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

        </div>

        <div className="max-w-md mx-auto px-4 pb-4 space-y-2">
          {isLoading ? [1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />) :
          filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🏋️</div>
              <p className="font-medium text-foreground">{t('trainings.noLessons')}</p>
              {canCreate && <button onClick={() => navigate('/coach/trainings/new')} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground active:scale-[0.97] transition-transform">{t('trainings.createFirst')}</button>}
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
                isSchoolOwner && tr.school_id && tr.coach?.full_name
                  ? <span className="mt-1 inline-block text-xs text-primary font-medium">{t('trainings.coachName', { name: tr.coach.full_name })}</span>
                  : undefined
              }
              footer={
                <div className="flex border-t border-border divide-x divide-border">
                  {tr.venue && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tr.venue)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => openExternal(e, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tr.venue)}`)}
                      className="flex flex-1 items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                    >
                      <MapPin className="h-3 w-3" /> {t('home.navigateTo', { venue: tr.venue.split(',')[0] })}
                    </a>
                  )}
                  <button
                    onClick={() => navigate(`/coach/trainings/${tr.id}?tab=chat`)}
                    className="flex flex-1 items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    <MessageCircle className="h-3 w-3" /> {t('common:chat.group')}
                  </button>
                </div>
              }
            />
          ))}
        </div>
      </main>
      <CoachBottomNav />
    </div>
  );
}
