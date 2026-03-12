import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Plus, TrendingUp, MapPin, Clock } from 'lucide-react';
import CoachBottomNav from '@/components/CoachBottomNav';
import { useGroups } from '@/hooks/useGroups';
import { useTodaySessions, useWeekSessions } from '@/hooks/useSessions';
import { useSessionConfirmations } from '@/hooks/useSessions';
import { useGenerateAllSessions } from '@/hooks/useAutomation';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { SessionCardSkeleton, GroupCardSkeleton } from '@/components/SkeletonLoaders';
import CoachWalkthrough from '@/components/CoachWalkthrough';

const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊',
  Other: '🎯',
};

function AttendanceBar({ sessionId, capacity }: { sessionId: string; capacity: number }) {
  const { data: confirmations = [] } = useSessionConfirmations(sessionId);
  const confirmed = confirmations.filter(c => c.status === 'confirmed').length;
  const declined = confirmations.filter(c => c.status === 'declined').length;
  const pending = confirmations.filter(c => c.status === 'pending').length;
  const slots = Math.max(capacity, confirmations.length);

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex gap-1">
        {Array.from({ length: slots }).map((_, i) => {
          const conf = confirmations[i];
          let color = 'bg-muted';
          if (conf?.status === 'confirmed') color = 'bg-success';
          else if (conf?.status === 'declined') color = 'bg-destructive';
          else if (conf?.status === 'pending') color = 'bg-muted-foreground/40';
          return <div key={i} className={`h-2 flex-1 rounded-full ${color}`} />;
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {confirmed}/{capacity} confirmed · {declined} declined · {pending} pending
      </p>
    </div>
  );
}

function TodaySessionCard({ session }: { session: any }) {
  const navigate = useNavigate();
  const group = session.groups;
  const sportIcon = SPORT_ICONS[group?.sport] ?? '🎯';

  return (
    <button
      onClick={() => navigate(`/coach/session/${session.id}`)}
      className="w-full rounded-xl border border-border bg-card p-4 text-left card-shadow active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{sportIcon}</span>
          <div>
            <p className="font-semibold text-foreground">{group?.name}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="max-w-[80px] truncate">{group?.location}</span>
        </div>
      </div>
      <AttendanceBar sessionId={session.id} capacity={group?.capacity ?? 4} />
    </button>
  );
}

function GroupCard({ group }: { group: any }) {
  const navigate = useNavigate();
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const sportIcon = SPORT_ICONS[group.sport] ?? '🎯';

  return (
    <button
      onClick={() => navigate(`/coach/group/${group.id}`)}
      className="rounded-xl border border-border bg-card p-4 text-left card-shadow active:scale-[0.98] transition-transform"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xl">{sportIcon}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {group.level}
        </span>
      </div>
      <p className="font-semibold text-foreground">{group.name}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {days[group.day_of_week]} · {group.start_time?.slice(0, 5)}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {group.capacity} spots
      </p>
    </button>
  );
}

export default function CoachDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: groups = [], isLoading: groupsLoading } = useGroups();
  const { data: todaySessions = [], isLoading: sessionsLoading } = useTodaySessions();
  const { data: weekSessions = [] } = useWeekSessions();
  const generateAll = useGenerateAllSessions();
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  // Auto-generate sessions silently on mount
  useEffect(() => {
    if (groups.length > 0) {
      generateAll.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups.length > 0]);

  const statsThisWeek = weekSessions.length;

  // Show walkthrough for new coaches
  useEffect(() => {
    const key = `sessio_walkthrough_${profile?.id}`;
    if (profile?.id && !localStorage.getItem(key)) {
      // Slight delay so dashboard renders first
      const t = setTimeout(() => setShowWalkthrough(true), 800);
      return () => clearTimeout(t);
    }
  }, [profile?.id]);

  function closeWalkthrough() {
    setShowWalkthrough(false);
    if (profile?.id) localStorage.setItem(`sessio_walkthrough_${profile.id}`, '1');
  }

  // Real-time: live confirmation updates on dashboard
  useEffect(() => {
    const channel = supabase
      .channel('coach-dashboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'confirmations' }, () => {
        qc.invalidateQueries({ queryKey: ['sessions-today'] });
        qc.invalidateQueries({ queryKey: ['confirmations'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {showWalkthrough && <CoachWalkthrough onClose={closeWalkthrough} />}
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <span className="text-lg font-bold tracking-tight text-foreground">sessio</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/coach/notifications')}
            className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Hey, {profile?.full_name?.split(' ')[0] ?? 'Coach'} 👋
          </h1>
          <p className="text-muted-foreground text-sm">Here's your coaching overview</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'This week', value: statsThisWeek.toString() },
            { label: 'Groups', value: groups.length.toString() },
            { label: 'Open spots', value: '—' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-card border border-border p-3 text-center card-shadow">
              <div className="text-xl font-bold text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Today's Sessions */}
        <div>
          <h2 className="mb-3 font-semibold text-foreground">Today's Sessions</h2>
          {sessionsLoading ? (
            <div className="space-y-3">
              <SessionCardSkeleton />
            </div>
          ) : todaySessions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center card-shadow">
              <p className="text-2xl mb-1">📅</p>
              <p className="font-medium text-foreground text-sm">No sessions today</p>
              <p className="text-xs text-muted-foreground mt-1">Sessions are auto-generated for your groups</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((s: any) => <TodaySessionCard key={s.id} session={s} />)}
            </div>
          )}
        </div>

        {/* My Groups */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">My Groups</h2>
            <button
              onClick={() => navigate('/coach/groups/new')}
              className="flex items-center gap-1 text-sm font-medium text-primary min-h-[44px] px-2"
            >
              <Plus className="h-4 w-4" />
              New Group
            </button>
          </div>

          {groupsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <GroupCardSkeleton /><GroupCardSkeleton />
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
              <TrendingUp className="h-6 w-6 opacity-80 mb-2" />
              <h2 className="mb-1 text-lg font-bold">Create your first group</h2>
              <p className="mb-4 text-sm opacity-80">Add a recurring training group and invite your players</p>
              <button
                onClick={() => navigate('/coach/groups/new')}
                className="flex items-center gap-2 rounded-xl bg-primary-foreground/15 px-4 py-2.5 text-sm font-semibold hover:bg-primary-foreground/25 min-h-[48px]"
              >
                <Plus className="h-4 w-4" />
                New Group
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {groups.map((g: any) => <GroupCard key={g.id} group={g} />)}
              <button
                onClick={() => navigate('/coach/groups/new')}
                className="rounded-xl border-2 border-dashed border-border p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[100px]"
              >
                <Plus className="h-6 w-6" />
                <span className="text-sm font-medium">New Group</span>
              </button>
            </div>
          )}
        </div>
      </main>

      <CoachBottomNav />
    </div>
  );
}
