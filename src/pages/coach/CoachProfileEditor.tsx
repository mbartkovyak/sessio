import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
  const navigate = useNavigate();
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
      <header className="sticky top-0 z-10 px-4 py-4 header-gradient">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/coach')} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 text-white shrink-0"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold text-white">Profile</h1>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-5">
        <div className="rounded-2xl bg-white p-5 shadow-sm space-y-5" style={{ border: '1px solid hsl(203 20% 90%)' }}>
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
                className="w-full rounded-xl border border-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                className="w-full rounded-xl border border-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
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
        </div>

        <AccountActions />
      </main>
      <CoachBottomNav />
    </div>
  );
}
