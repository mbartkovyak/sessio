import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { User, FileText } from 'lucide-react';
import { CITIES, SPORTS } from '@/lib/constants';
import Avatar from '@/components/shared/Avatar';
import SelectField from '@/components/shared/SelectField';
import AccountActions from '@/components/shared/AccountActions';

export default function CoachProfileEditor() {
  const { profile, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [sport, setSport] = useState(profile?.sport ?? '');

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name, city, bio, sport })
      .eq('id', user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Profile updated');
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-bold text-foreground">Profile</h1>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-5">
        <div className="flex flex-col items-center gap-3">
          <Avatar url={profile?.avatar_url} name={profile?.full_name} size="2xl" />
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-1.5">
              <User className="h-3.5 w-3.5" /> Full Name
            </label>
            <input
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={name} onChange={e => setName(e.target.value)}
            />
          </div>
          <SelectField label="City" value={city} onChange={setCity} options={CITIES} placeholder="Select city" />
          <SelectField label="Sport" value={sport} onChange={setSport} options={SPORTS} placeholder="Select sport" />
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-1.5">
              <FileText className="h-3.5 w-3.5" /> Bio
            </label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              value={bio} onChange={e => setBio(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <AccountActions />
      </main>
      <CoachBottomNav />
    </div>
  );
}
