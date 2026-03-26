import { useState, useEffect } from 'react';
import { User, FileText, Plus, Trash2, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import CoachHeader from '@/components/coach/CoachHeader';
import { CITIES, SPORTS } from '@/lib/constants';
import Avatar from '@/components/shared/Avatar';
import SelectField from '@/components/shared/SelectField';
import AccountActions from '@/components/shared/AccountActions';
import PlaceAutocompleteInput from '@/components/shared/PlaceAutocompleteInput';
import PhoneInput from '@/components/shared/PhoneInput';
import { useUnsavedChanges } from '@/hooks/shared/useUnsavedChanges';
import UnsavedChangesDialog from '@/components/shared/UnsavedChangesDialog';
import LanguageSelector from '@/components/shared/LanguageSelector';
import { useTranslation } from 'react-i18next';

type Venue = { name: string; address: string };

export default function CoachProfileEditor() {
  const { profile, user, refreshProfile } = useAuth();
  const { t } = useTranslation('coach');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [sport, setSport] = useState(profile?.sport ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [venues, setVenues] = useState<Venue[]>(((profile as any)?.venues as Venue[]) ?? []);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');

  // Sync form state when profile updates (e.g. after save + refreshProfile)
  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? '');
      setCity(profile.city ?? '');
      setBio(profile.bio ?? '');
      setSport(profile.sport ?? '');
      setPhone(profile.phone ?? '');
      setVenues(((profile as any)?.venues as Venue[]) ?? []);
    }
  }, [profile]);

  const isDirty = name !== (profile?.full_name ?? '')
    || phone !== (profile?.phone ?? '')
    || city !== (profile?.city ?? '')
    || bio !== (profile?.bio ?? '')
    || sport !== (profile?.sport ?? '');
  const blocker = useUnsavedChanges(isDirty);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name, phone: phone || null, city, bio, sport, venues })
      .eq('id', user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('profile.profileUpdated'));
    await refreshProfile();
  }

  function addVenue() {
    if (!newVenueName.trim() || !newVenueAddress.trim()) return;
    const updated = [...venues, { name: newVenueName.trim(), address: newVenueAddress.trim() }];
    setVenues(updated);
    setNewVenueName('');
    setNewVenueAddress('');
    // Auto-save venues
    if (user) supabase.from('profiles').update({ venues: updated }).eq('id', user.id).then(({ error }) => {
      if (error) toast.error(error.message);
      else refreshProfile();
    });
  }

  function removeVenue(idx: number) {
    const updated = venues.filter((_, i) => i !== idx);
    setVenues(updated);
    if (user) supabase.from('profiles').update({ venues: updated }).eq('id', user.id).then(({ error }) => {
      if (error) toast.error(error.message);
      else refreshProfile();
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <CoachHeader title={t('profile.title')} />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-5">
        <div className="rounded-2xl bg-white p-5 shadow-sm space-y-5" style={{ border: '1px solid hsl(203 20% 90%)' }}>
          <div className="flex flex-col items-center gap-3">
            <Avatar url={profile?.avatar_url} name={profile?.full_name} size="2xl" />
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                <User className="h-3.5 w-3.5" /> {t('profile.fullName')}
              </label>
              <input
                className="w-full rounded-xl border border-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={name} onChange={e => setName(e.target.value)}
              />
            </div>
            <PhoneInput value={phone} onChange={setPhone} />
            <SelectField label={t('common:form.city')} value={city} onChange={setCity} options={CITIES} placeholder={t('common:form.selectCity')} />
            <SelectField label={t('common:form.sport')} value={sport} onChange={setSport} options={SPORTS} placeholder={t('common:form.selectSport')} />
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3.5 w-3.5" /> {t('profile.bio')}
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
            {saving ? t('profile.saving') : t('common:actions.save')}
          </button>
        </div>

        {/* Venues — same pattern as SchoolProfileEditor */}
        <div>
          <h2 className="font-semibold text-foreground text-sm mb-3">{t('profile.venues')}</h2>
          {venues.length > 0 && (
            <div className="space-y-2 mb-3">
              {venues.map((v, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{v.name}</p>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`}
                      target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                      {v.address} ↗
                    </a>
                  </div>
                  <button onClick={() => removeVenue(i)} className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2 rounded-xl border border-dashed p-3" style={{ borderColor: 'rgba(0,0,0,0.2)' }}>
            <input placeholder={t('profile.venueName')} value={newVenueName} onChange={e => setNewVenueName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <PlaceAutocompleteInput value={newVenueAddress} onChange={setNewVenueAddress}
              placeholder={t('profile.venueAddress')}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="button" onClick={addVenue} disabled={!newVenueName.trim() || !newVenueAddress.trim()}
              className="flex items-center gap-1.5 text-sm font-medium text-primary disabled:opacity-40">
              <Plus className="h-4 w-4" /> {t('profile.addVenue')}
            </button>
          </div>
        </div>

        <LanguageSelector />
        <AccountActions />
      </main>
      <CoachBottomNav />
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
