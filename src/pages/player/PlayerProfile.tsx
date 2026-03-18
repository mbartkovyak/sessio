import { useNavigate } from 'react-router-dom';
import { LogOut, Mail } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import { useAuth } from '@/contexts/AuthContext';

export default function PlayerProfile() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? '?';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="font-semibold text-foreground">Profile</h1>
        </div>
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
            <h2 className="text-xl font-bold text-foreground">{profile?.full_name ?? 'Athlete'}</h2>
            <span className="mt-1 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">Athlete</span>
          </div>

          {/* Contact */}
          <div className="rounded-xl border border-border bg-card divide-y divide-border shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground truncate">{profile?.email}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-border bg-card divide-y divide-border shadow-sm">
            <button
              onClick={async () => { await signOut(); navigate('/auth'); }}
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
