import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, MapPin } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import { useDiscoverableCoaches } from '@/hooks/school/useSchools';

const SPORTS = ['All', 'Tennis', 'Swimming', 'Running', 'Fitness', 'Yoga', 'Football', 'Badminton', 'Boxing'];
const CITIES = ['All cities', 'Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk', 'Łódź', 'Katowice', 'Lublin', 'Białystok', 'Szczecin', 'Rzeszów', 'Toruń', 'Bydgoszcz', 'Częstochowa', 'Radom', 'Sosnowiec', 'Kielce', 'Gliwice', 'Olsztyn', 'Bielsko-Biała'];

export default function PlayerSearch() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const { data: coaches = [], isLoading } = useDiscoverableCoaches(search, selectedSport || undefined, selectedCity || undefined);

  const initials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-foreground mb-3">Find a Coach</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {SPORTS.map(sport => (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport === 'All' ? '' : sport)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  (sport === 'All' && !selectedSport) || selectedSport === sport
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {sport}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CITIES.map(city => (
              <button
                key={city}
                onClick={() => setSelectedCity(city === 'All cities' ? '' : city)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  (city === 'All cities' && !selectedCity) || selectedCity === city
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : coaches.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-medium text-foreground">No coaches found</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different search or sport</p>
            </div>
          ) : (
            <div className="space-y-2">
              {coaches.map((coach: any) => (
                <button
                  key={coach.id}
                  onClick={() => navigate(`/search/coach/${coach.id}`)}
                  className="w-full flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left active:bg-secondary/50 transition-colors shadow-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary overflow-hidden">
                    {coach.avatar_url
                      ? <img src={coach.avatar_url} alt="" className="h-full w-full object-cover" />
                      : initials(coach.full_name ?? '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{coach.full_name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {coach.sport && <span className="text-xs text-muted-foreground">{coach.sport}</span>}
                      {coach.city && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" />{coach.city}
                        </span>
                      )}
                    </div>
                    {coach.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{coach.bio}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="text-xs font-medium text-foreground">—</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}
