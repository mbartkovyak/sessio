import { useNavigate } from 'react-router-dom';
import { LogOut, Mail, ChevronRight } from 'lucide-react';
import PlayerBottomNav from '@/components/PlayerBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useMyTrainings } from '@/hooks/useTrainings';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PlayerProfile() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: memberships = [] } = useMyTrainings();

  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? '?';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <h1 className="font-semibold text-foreground">Profile</h1>
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center pt-4 pb-2">
            <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary overflow-hidden">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                : initials}
            </div>
            <h2 className="text-xl font-bold text-foreground">{profile?.full_name ?? 'Player'}</h2>
            <span className="mt-1 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">Player</span>
          </div>

          {/* Contact */}
          <div className="rounded-xl border border-border bg-card divide-y divide-border shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground truncate">{profile?.email}</span>
            </div>
          </div>

          {/* My Trainings */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">My Trainings</h3>
            {memberships.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">Not in any training yet</p>
                <button
                  onClick={() => navigate('/search')}
                  className="mt-3 text-sm font-medium text-primary"
                >
                  Find a coach →
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card divide-y divide-border shadow-sm">
                {memberships.map((m: any) => {
                  const training = m.trainings;
                  const coach = training?.profiles;
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{training?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {DAYS[training?.day_of_week ?? 0]} · {training?.start_time?.slice(0, 5)} · {coach?.full_name}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.role === 'waitlist' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                      }`}>{m.role}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-border bg-card divide-y divide-border shadow-sm">
            <button
              onClick={() => navigate('/coach')}
              className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground min-h-[44px]"
            >
              <span>Switch to Coach view</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={async () => { await signOut(); navigate('/'); }}
              className="flex w-full items-center gap-2 px-4 py-3.5 text-sm font-medium text-destructive min-h-[44px]"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}
