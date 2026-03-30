import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, Users, Building2, UserCheck } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import AppHeader from '@/components/shared/AppHeader';
import { useDiscoverableCoaches, useDiscoverableSchools } from '@/hooks/school/useSchools';
import { SPORTS, COUNTRIES, CITIES_BY_COUNTRY, sportLabel, countryLabel, SPORT_ICONS, type Country } from '@/lib/constants';
import Avatar from '@/components/shared/Avatar';
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
  function handleCountryChange(c: string) { setSelectedCountry(c); setSelectedCity(''); }

  const { data: coaches = [], isLoading: coachesLoading } = useDiscoverableCoaches(search, selectedSport || undefined, selectedCity || undefined, selectedCountry || undefined);
  const { data: schools = [], isLoading: schoolsLoading } = useDiscoverableSchools(search, selectedSport || undefined, selectedCity || undefined, selectedCountry || undefined);
  const sportLabelMap = Object.fromEntries(SPORTS.map(sport => [sport, sportLabel(sport)]));
  const countryLabelMap = Object.fromEntries(COUNTRIES.map(c => [c, countryLabel(c)]));

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
          <div className="grid grid-cols-3 gap-2">
            <SelectField label="" value={selectedSport} onChange={setSelectedSport} options={SPORTS} placeholder={t('search.allSports')} labels={sportLabelMap} />
            <SelectField label="" value={selectedCountry} onChange={handleCountryChange} options={COUNTRIES} placeholder={t('search.allCountries')} labels={countryLabelMap} />
            <SelectField label="" value={selectedCity} onChange={setSelectedCity} options={cities} placeholder={t('search.allCities')} />
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-2">
          {summary && (
            <p className="text-xs text-muted-foreground mb-3">{summary}</p>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
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
                    className="w-full flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left active:bg-secondary/50 transition-colors shadow-sm"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary overflow-hidden">
                      {item.logo_url
                        ? <img src={item.logo_url} alt="" className="h-full w-full object-cover" />
                        : item.name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{item.name}</p>
                        <span className="shrink-0 flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                          <Building2 className="h-3 w-3" />{t('search.school')}
                        </span>
                      </div>
                      {item.sport?.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.sport.map((s: string) => `${SPORT_ICONS[s] ?? '🎯'} ${sportLabel(s)}`).join(' · ')}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {item.city && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />{item.city}
                          </span>
                        )}
                        {item.coach_count > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />{t('search.coachCount', { count: item.coach_count })}
                          </span>
                        )}
                      </div>
                      {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>}
                    </div>
                  </button>
                ) : (
                  <button
                    key={`coach-${item.id}`}
                    onClick={() => navigate(`/search/coach/${item.id}`)}
                    className="w-full flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left active:bg-secondary/50 transition-colors shadow-sm"
                  >
                    <Avatar url={item.avatar_url} name={item.full_name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{item.full_name}</p>
                        <span className="shrink-0 flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
                          <UserCheck className="h-3 w-3" />{t('search.coach')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {item.sport && (
                          <span className="text-sm text-muted-foreground">
                            {SPORT_ICONS[item.sport] ?? '🎯'} {sportLabel(item.sport)}
                          </span>
                        )}
                        {item.city && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />{item.city}
                          </span>
                        )}
                      </div>
                      {item.schools?.name ? (
                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />{item.schools.name}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">{t('search.independentCoach')}</p>
                      )}
                      {item.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.bio}</p>}
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
