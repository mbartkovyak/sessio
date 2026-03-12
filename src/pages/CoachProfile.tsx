import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, ChevronRight, Mail, Phone, Users2, BarChart2 } from 'lucide-react';
import CoachBottomNav from '@/components/CoachBottomNav';
import { useGroups } from '@/hooks/useGroups';

export default function CoachProfile() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: groups = [] } = useGroups();

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? '?';

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <h1 className="font-semibold text-foreground">Profile</h1>
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Avatar & name */}
        <div className="flex flex-col items-center pt-4 pb-2">
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="h-20 w-20 rounded-full object-cover" />
            ) : initials}
          </div>
          <h2 className="text-xl font-bold text-foreground">{profile?.full_name ?? 'Coach'}</h2>
          <span className="mt-1 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">Coach</span>
        </div>

        {/* Contact info */}
        <div className="rounded-xl border border-border bg-card divide-y divide-border card-shadow">
          <div className="flex items-center gap-3 px-4 py-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground truncate">{profile?.email}</span>
          </div>
          {profile?.phone && (
            <div className="flex items-center gap-3 px-4 py-3">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground">{profile.phone}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Active Groups', value: groups.length, icon: Users2 },
              { label: 'Avg Attendance', value: '—', icon: BarChart2 },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4 card-shadow">
                <Icon className="h-5 w-5 text-primary mb-2" />
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="rounded-xl border border-border bg-card divide-y divide-border card-shadow">
          <button
            onClick={() => navigate('/player/dashboard')}
            className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground min-h-[44px]"
          >
            <span>Switch to Player view</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-4 py-3.5 text-sm font-medium text-destructive min-h-[44px]"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </main>

      <CoachBottomNav />
    </div>
  );
}
