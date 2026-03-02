import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users, Calendar, Bell, LogOut, Plus,
  Clock, TrendingUp
} from 'lucide-react';

export default function CoachDashboard() {
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
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Coach</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
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
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Hey, {profile?.full_name?.split(' ')[0] ?? 'Coach'} 👋
          </h1>
          <p className="text-muted-foreground">Here's what's happening with your groups</p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: 'Groups', value: '0', icon: Users },
            { label: 'This week', value: '0', icon: Calendar },
            { label: 'Pending', value: '0', icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-card p-4 card-shadow text-center">
              <div className="mb-1 flex justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-xl font-bold text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Create first group CTA */}
        <div className="mb-6 rounded-2xl bg-primary p-5 text-primary-foreground">
          <div className="mb-3">
            <TrendingUp className="h-6 w-6 opacity-80" />
          </div>
          <h2 className="mb-1 text-lg font-bold">Create your first group</h2>
          <p className="mb-4 text-sm opacity-80">
            Add a recurring training group and invite your players
          </p>
          <button className="flex items-center gap-2 rounded-xl bg-primary-foreground/15 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-primary-foreground/25 min-h-[44px]">
            <Plus className="h-4 w-4" />
            New Group
          </button>
        </div>

        {/* Groups list placeholder */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">My Groups</h2>
            <button className="flex items-center gap-1 text-sm font-medium text-primary">
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card p-8 text-center card-shadow">
            <div className="mb-2 text-3xl">🏋️</div>
            <p className="font-medium text-foreground">No groups yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a group to start managing sessions
            </p>
          </div>
        </div>

        {/* Upcoming sessions */}
        <div className="mt-6">
          <h2 className="mb-3 font-semibold text-foreground">Upcoming Sessions</h2>
          <div className="rounded-xl border border-border bg-card p-8 text-center card-shadow">
            <div className="mb-2 text-3xl">📅</div>
            <p className="font-medium text-foreground">No sessions scheduled</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sessions will appear here once you create groups
            </p>
          </div>
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="sticky bottom-0 border-t border-border bg-card">
        <div className="flex">
          {[
            { icon: Calendar, label: 'Sessions', active: false },
            { icon: Users, label: 'Groups', active: true },
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
