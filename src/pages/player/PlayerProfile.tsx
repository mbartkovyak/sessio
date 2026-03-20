import { useState } from 'react';
import { User } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Avatar from '@/components/shared/Avatar';
import AccountActions from '@/components/shared/AccountActions';

export default function PlayerProfile() {
  const { profile, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(profile?.full_name ?? '');

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name })
      .eq('id', user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Profile updated');
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="font-semibold text-foreground">Profile</h1>
        </div>
      </header>

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          <div className="flex flex-col items-center pt-4 pb-2">
            <div className="mb-3">
              <Avatar url={profile?.avatar_url} name={profile?.full_name} size="2xl" />
            </div>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <span className="mt-1 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">Athlete</span>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-1.5">
              <User className="h-3.5 w-3.5" /> Full Name
            </label>
            <input
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={name} onChange={e => setName(e.target.value)}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          <AccountActions />
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}
