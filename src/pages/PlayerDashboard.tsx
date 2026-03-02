import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, LogOut, Calendar, Users } from 'lucide-react';

export default function PlayerDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <div>
          <span className="text-lg font-bold tracking-tight text-foreground">sessio</span>
          <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Player</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            onClick={handleSignOut}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
          >
            <LogOut className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Hey, {profile?.full_name?.split(' ')[0] ?? 'Player'} 👋
          </h1>
          <p className="text-muted-foreground">Your upcoming sessions</p>
        </div>

        {/* Pending confirmations */}
        <div className="mb-6">
          <h2 className="mb-3 font-semibold text-foreground">Action Required</h2>
          <div className="rounded-xl border border-border bg-card p-8 text-center card-shadow">
            <div className="mb-2 text-3xl">✅</div>
            <p className="font-medium text-foreground">All caught up!</p>
            <p className="mt-1 text-sm text-muted-foreground">No sessions to confirm right now</p>
          </div>
        </div>

        {/* My groups */}
        <div className="mb-6">
          <h2 className="mb-3 font-semibold text-foreground">My Groups</h2>
          <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
            <div className="mb-2 text-3xl">🏃</div>
            <p className="font-medium text-foreground">No groups yet</p>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              Ask your coach for an invite code
            </p>
            <button className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground min-h-[44px]">
              Join a Group
            </button>
          </div>
        </div>

        {/* Upcoming sessions */}
        <div>
          <h2 className="mb-3 font-semibold text-foreground">Upcoming Sessions</h2>
          <div className="rounded-xl border border-border bg-card p-8 text-center card-shadow">
            <div className="mb-2 text-3xl">📅</div>
            <p className="font-medium text-foreground">No sessions yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sessions will appear here after joining a group
            </p>
          </div>
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="sticky bottom-0 border-t border-border bg-card">
        <div className="flex">
          {[
            { icon: Calendar, label: 'Sessions', active: true },
            { icon: Users, label: 'Groups', active: false },
            { icon: Bell, label: 'Alerts', active: false },
          ].map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors min-h-[44px] ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
