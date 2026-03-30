import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, Users, Building2, Star } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import AppHeader from '@/components/shared/AppHeader';
import { useDiscoverableCoaches, useDiscoverableSchools } from '@/hooks/school/useSchools';
import { SPORTS, CITIES_BY_COUNTRY, sportLabel, SPORT_ICONS, type Country } from '@/lib/constants';
import { getInitials } from '@/lib/utils';
import SelectField from '@/components/shared/SelectField';
import { useAuth } from '@/contexts/AuthContext';

export default function PlayerSearch() {
  const { t } = useTranslation('player');
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(profile?.country ?? '');
  const [selectedCity, setSelectedCity] = useState(profile?.city ?? '');

  const cities = selectedCountry ? CITIES_BY_COUNTRY[selectedCountry as Country] ?? [] : [];

  const { data: coaches = [], isLoading: coachesLoading } = useDiscoverableCoaches(search, selectedSport || undefined, selectedCity || undefined, selectedCountry || undefined);
  const { data: schools = [], isLoading: schoolsLoading } = useDiscoverableSchools(search, selectedSport || undefined, selectedCity || undefined, selectedCountry || undefined);
  const sportLabelMap = Object.fromEntries(SPORTS.map(sport => [sport, sportLabel(sport)]));

  const isLoading = coachesLoading || schoolsLoading;

  // Merge: schools first, then coaches
  const results = useMemo(() => {
    const schoolItems = schools.map((s: any) => ({ ...s, _type: 'school' as const }));
    const coachItems = coaches.map((c: any) => ({ ...c, _type: 'coach' as const }));
    return [...schoolItems, ...coachItems];
  }, [schools, coaches]);

  // Result summary
  const summary = !isLoading && results.length > 0
    ? [
        schools.length > 0 && t('search.schoolCount', { count: schools.length }),
        coaches.length > 0 && t('search.coachCount', { count: coaches.length }),
      ].filter(Boolean).join(', ')
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title={t('search.title')} />

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 pt-3 pb-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('search.placeholder')}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SelectField label="" value={selectedSport} onChange={setSelectedSport} options={SPORTS} placeholder={t('search.allSports')} labels={sportLabelMap} />
            <SelectField label="" value={selectedCity} onChange={setSelectedCity} options={cities} placeholder={t('search.allCities')} />
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-2">
          {summary && (
            <p className="text-xs text-muted-foreground mb-3">{summary}</p>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-medium text-foreground">{t('search.noResults')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('search.noResultsDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((item: any) =>
                item._type === 'school' ? (
                  <button
                    key={`school-${item.id}`}
                    onClick={() => navigate(`/s/${item.id}`)}
                    className="w-full flex items-start gap-4 rounded-xl border border-border bg-card p-4 text-left active:bg-secondary/50 transition-colors shadow-sm"
                  >
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary overflow-hidden">
                      {item.logo_url
                        ? <img src={item.logo_url} alt="" className="h-full w-full object-cover" />
                        : item.name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-semibold text-foreground truncate">{item.name}</p>
                      {item.sport?.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {item.sport.map((s: string) => `${SPORT_ICONS[s] ?? '🎯'} ${sportLabel(s)}`).join(' · ')}
                        </p>
                      )}
                      {item.city && (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />{item.city}
                        </p>
                      )}
                      {item.coach_count > 0 && (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-3.5 w-3.5 shrink-0" />{t('search.coachCount', { count: item.coach_count })}
                        </p>
                      )}
                      {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
                    </div>
                  </button>
                ) : (
                  <button
                    key={`coach-${item.id}`}
                    onClick={() => navigate(`/search/coach/${item.id}`)}
                    className="w-full flex items-start gap-4 rounded-xl border border-border bg-card p-4 text-left active:bg-secondary/50 transition-colors shadow-sm"
                  >
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary overflow-hidden">
                      {item.avatar_url
                        ? <img src={item.avatar_url} alt="" className="h-full w-full object-cover" />
                        : getInitials(item.full_name) || '?'}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{item.full_name}</p>
                        {item.avg_rating !== null && (
                          <span className="ml-auto shrink-0 flex items-center gap-1 text-sm">
                            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                            <span className="font-semibold text-foreground">{item.avg_rating.toFixed(1)}</span>
                            <span className="text-muted-foreground">({item.review_count})</span>
                          </span>
                        )}
                      </div>
                      {item.sport && (
                        <p className="text-sm text-muted-foreground">
                          {SPORT_ICONS[item.sport] ?? '🎯'} {sportLabel(item.sport)}
                        </p>
                      )}
                      {item.city && (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />{item.city}
                        </p>
                      )}
                      {item.schools?.name ? (
                        <p className="flex items-center gap-1 text-sm text-primary">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />{item.schools.name}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t('search.independentCoach')}</p>
                      )}
                      {item.bio && <p className="text-sm text-muted-foreground line-clamp-2">{item.bio}</p>}
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}
