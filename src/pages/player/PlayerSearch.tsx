import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Users, Building2 } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import { useDiscoverableCoaches, useDiscoverableSchools } from '@/hooks/school/useSchools';
import { SPORTS, CITIES } from '@/lib/constants';
import Avatar from '@/components/shared/Avatar';
import SelectField from '@/components/shared/SelectField';

export default function PlayerSearch() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const { data: coaches = [], isLoading: coachesLoading } = useDiscoverableCoaches(search, selectedSport || undefined, selectedCity || undefined);
  const { data: schools = [], isLoading: schoolsLoading } = useDiscoverableSchools(search, selectedSport || undefined, selectedCity || undefined);

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
        schools.length > 0 && `${schools.length} school${schools.length !== 1 ? 's' : ''}`,
        coaches.length > 0 && `${coaches.length} coach${coaches.length !== 1 ? 'es' : ''}`,
      ].filter(Boolean).join(', ')
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="max-w-md mx-auto px-4 py-4 space-y-3">
          <h1 className="text-lg font-bold text-foreground">Discover</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search coaches and schools..."
              className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SelectField label="" value={selectedSport} onChange={setSelectedSport} options={SPORTS} placeholder="All sports" />
            <SelectField label="" value={selectedCity} onChange={setSelectedCity} options={CITIES} placeholder="All cities" />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4">
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
              <p className="font-medium text-foreground">No results found</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different search or filter</p>
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
                        <span className="shrink-0 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <Building2 className="h-2.5 w-2.5" />School
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {item.sport && <span className="text-xs text-muted-foreground">{item.sport}</span>}
                        {item.city && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5" />{item.city}
                          </span>
                        )}
                        {item.coach_count > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Users className="h-2.5 w-2.5" />{item.coach_count} coach{item.coach_count !== 1 ? 'es' : ''}
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
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {item.sport && <span className="text-xs text-muted-foreground">{item.sport}</span>}
                        {item.city && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5" />{item.city}
                          </span>
                        )}
                      </div>
                      {item.schools?.name ? (
                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                          <Building2 className="h-2.5 w-2.5" />{item.schools.name}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">Independent coach</p>
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
