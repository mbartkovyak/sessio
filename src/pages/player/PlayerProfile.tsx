import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import PlayerBottomNav from '@/components/player/PlayerBottomNav';
import AppHeader from '@/components/shared/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Avatar from '@/components/shared/Avatar';
import AccountActions from '@/components/shared/AccountActions';
import LanguageSelector from '@/components/shared/LanguageSelector';
import PhoneInput from '@/components/shared/PhoneInput';
import { useUnsavedChanges } from '@/hooks/shared/useUnsavedChanges';
import UnsavedChangesDialog from '@/components/shared/UnsavedChangesDialog';
import { localizeErrorMessage } from '@/lib/localizedErrors';

export default function PlayerProfile() {
  const { t } = useTranslation('player');
  const { profile, user, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  const isDirty = name !== (profile?.full_name ?? '')
    || phone !== (profile?.phone ?? '');
  const blocker = useUnsavedChanges(isDirty);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name, phone: phone || null })
      .eq('id', user.id);
    setSaving(false);
    if (error) { toast.error(localizeErrorMessage(error, t('common:errors.somethingWentWrong'))); return; }
    toast.success(t('profile.profileUpdated'));
    await refreshProfile();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title={t('profile.title')} />

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-6 space-y-6">
          <div className="flex flex-col items-center pt-4 pb-2">
            <div className="mb-3">
              <Avatar url={profile?.avatar_url} name={profile?.full_name} size="2xl" />
            </div>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <span className="mt-1 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">{t('profile.athlete')}</span>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-1.5">
              <User className="h-3.5 w-3.5" /> {t('profile.fullName')}
            </label>
            <input
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={name} onChange={e => setName(e.target.value)}
            />
          </div>

          <PhoneInput value={phone} onChange={setPhone} />
          <LanguageSelector />

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? t('profile.saving') : t('common:actions.save')}
          </button>

          <AccountActions />
        </div>
      </main>

      <PlayerBottomNav />
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
