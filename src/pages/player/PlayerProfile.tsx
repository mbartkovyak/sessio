import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Mail, Trash2, User } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function PlayerProfile() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
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
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <span className="mt-1 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">Athlete</span>
          </div>

          {/* Name */}
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
            {saving ? 'Saving…' : 'Save Changes'}
          </button>

          {/* Actions */}
          <div className="rounded-xl border border-border bg-card divide-y divide-border shadow-sm">
            <button
              onClick={async () => { await signOut(); navigate('/auth'); }}
              className="flex w-full items-center gap-2 px-4 py-3.5 text-sm font-medium text-destructive min-h-[44px]"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
            <button
              onClick={async () => {
                if (!confirm('Delete all your data and start over? This cannot be undone.')) return;
                setDeleting(true);
                const { error } = await supabase.rpc('delete_my_account' as any);
                if (error) { toast.error(error.message); setDeleting(false); return; }
                await signOut();
                navigate('/auth');
              }}
              disabled={deleting}
              className="flex w-full items-center gap-2 px-4 py-3.5 text-sm font-medium text-destructive min-h-[44px] disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting…' : 'Delete Account'}
            </button>
          </div>
        </div>
      </main>

      <PlayerBottomNav />
    </div>
  );
}
