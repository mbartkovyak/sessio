import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, Mail, Phone, Users2, ChevronRight, Save } from 'lucide-react';
import PlayerBottomNav from '@/components/PlayerBottomNav';
import { usePlayerMemberships } from '@/hooks/usePlayerData';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const SPORTS = ['Tennis', 'Swimming', 'Running', 'Fitness', 'Yoga', 'Football', 'Badminton', 'Boxing', 'Other'];
const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊', Other: '🎯',
};

export default function PlayerProfile() {
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: memberships = [] } = usePlayerMemberships();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) ?? '?';

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name, phone })
        .eq('id', profile!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      setEditing(false);
      toast.success('Profile saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  const leaveGroup = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('group_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['player-memberships'] });
      toast.success('Left group');
    },
  });

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const activeGroups = memberships.filter(m => m.status === 'active');
  const waitlistGroups = memberships.filter(m => m.status === 'waitlist');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <h1 className="font-semibold text-foreground">Profile</h1>
        {editing ? (
          <button
            onClick={() => saveProfile.mutate()}
            disabled={saveProfile.isPending}
            className="flex items-center gap-1 text-sm font-medium text-primary min-h-[44px] px-2"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-primary min-h-[44px] px-2"
          >
            Edit
          </button>
        )}
      </header>

      <main className="flex-1 px-4 py-6 pb-24 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center pt-4 pb-2">
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary overflow-hidden">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" className="h-20 w-20 object-cover" />
              : initials}
          </div>
          {editing ? (
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="text-center text-xl font-bold text-foreground bg-transparent border-b-2 border-primary outline-none pb-1 w-48"
            />
          ) : (
            <h2 className="text-xl font-bold text-foreground">{profile?.full_name ?? 'Player'}</h2>
          )}
          <span className="mt-1 rounded-full bg-success/10 px-3 py-0.5 text-xs font-medium text-success">Player</span>
        </div>

        {/* Contact */}
        <div className="rounded-xl border border-border bg-card divide-y divide-border card-shadow">
          <div className="flex items-center gap-3 px-4 py-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground truncate">{profile?.email}</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            {editing ? (
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Your phone number"
                className="text-sm text-foreground bg-transparent outline-none flex-1"
              />
            ) : (
              <span className="text-sm text-foreground">{profile?.phone || <span className="text-muted-foreground">No phone added</span>}</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Active Groups', value: activeGroups.length },
              { label: 'Waitlist', value: waitlistGroups.length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4 card-shadow text-center">
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* My Groups */}
        {memberships.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">My Groups</h3>
            <div className="rounded-xl border border-border bg-card divide-y divide-border card-shadow">
              {memberships.map((m: any) => {
                const group = m.groups;
                const sportIcon = SPORT_ICONS[group?.sport] ?? '🎯';
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl">{sportIcon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{group?.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.status}</p>
                    </div>
                    <button
                      onClick={() => leaveGroup.mutate(m.id)}
                      className="text-xs text-destructive min-h-[44px] px-2"
                    >
                      Leave
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="rounded-xl border border-border bg-card divide-y divide-border card-shadow">
          <button
            onClick={() => navigate('/coach/dashboard')}
            className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground min-h-[44px]"
          >
            <span>Switch to Coach view</span>
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

      <PlayerBottomNav />
    </div>
  );
}
