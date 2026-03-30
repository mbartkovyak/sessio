import { useState, useEffect } from 'react';
import { User, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import CoachHeader from '@/components/coach/CoachHeader';
import { COUNTRIES, CITIES_BY_COUNTRY, SPORTS, sportLabel, countryLabel, type Country } from '@/lib/constants';
import Avatar from '@/components/shared/Avatar';
import SelectField from '@/components/shared/SelectField';
import AccountActions from '@/components/shared/AccountActions';
import VenueManager, { type Venue } from '@/components/shared/VenueManager';
import PhoneInput from '@/components/shared/PhoneInput';
import { useUnsavedChanges } from '@/hooks/shared/useUnsavedChanges';
import UnsavedChangesDialog from '@/components/shared/UnsavedChangesDialog';
import LanguageSelector from '@/components/shared/LanguageSelector';
import { useTranslation } from 'react-i18next';
import { localizeErrorMessage } from '@/lib/localizedErrors';

export default function CoachProfileEditor() {
  const { profile, user, refreshProfile } = useAuth();
  const { t } = useTranslation('coach');
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [country, setCountry] = useState(profile?.country ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [sport, setSport] = useState(profile?.sport ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [venues, setVenues] = useState<Venue[]>(((profile as any)?.venues as Venue[]) ?? []);

  // Sync form state when profile updates (e.g. after save + refreshProfile)
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
      setCountry(profile.country ?? '');
      setCity(profile.city ?? '');
      setBio(profile.bio ?? '');
      setSport(profile.sport ?? '');
      setPhone(profile.phone ?? '');
      setVenues(((profile as any)?.venues as Venue[]) ?? []);
    }
  }, [profile]);

  const isDirty = firstName !== (profile?.first_name ?? '')
    || lastName !== (profile?.last_name ?? '')
    || phone !== (profile?.phone ?? '')
    || country !== (profile?.country ?? '')
    || city !== (profile?.city ?? '')
    || bio !== (profile?.bio ?? '')
    || sport !== (profile?.sport ?? '');
  const cities = country ? CITIES_BY_COUNTRY[country as Country] ?? [] : [];
  function handleCountryChange(c: string) { setCountry(c); setCity(''); }
  const countryLabels = Object.fromEntries(COUNTRIES.map(c => [c, countryLabel(c)]));
  const blocker = useUnsavedChanges(isDirty);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone || null, country, city, bio, sport, venues })
      .eq('id', user.id);
    setSaving(false);
    if (error) { toast.error(localizeErrorMessage(error, t('common:errors.somethingWentWrong'))); return; }
    toast.success(t('profile.profileUpdated'));
    await refreshProfile();
  }

  function addVenue(venue: Venue) {
    const updated = [...venues, venue];
    setVenues(updated);
    if (user) supabase.from('profiles').update({ venues: updated }).eq('id', user.id).then(({ error }) => {
      if (error) toast.error(localizeErrorMessage(error, t('common:errors.somethingWentWrong')));
      else refreshProfile();
    });
  }

  function removeVenue(idx: number) {
    const updated = venues.filter((_, i) => i !== idx);
    setVenues(updated);
    if (user) supabase.from('profiles').update({ venues: updated }).eq('id', user.id).then(({ error }) => {
      if (error) toast.error(localizeErrorMessage(error, t('common:errors.somethingWentWrong')));
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
                <User className="h-3.5 w-3.5" /> {t('profile.firstName')}
              </label>
              <input
                className="w-full rounded-xl border border-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={firstName} onChange={e => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                <User className="h-3.5 w-3.5" /> {t('profile.lastName')}
              </label>
              <input
                className="w-full rounded-xl border border-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={lastName} onChange={e => setLastName(e.target.value)}
              />
            </div>
            <PhoneInput value={phone} onChange={setPhone} />
            <LanguageSelector />
            <SelectField label={t('common:form.country')} value={country} onChange={handleCountryChange} options={COUNTRIES} placeholder={t('common:form.selectCountry')} labels={countryLabels} />
            <SelectField label={t('common:form.city')} value={city} onChange={setCity} options={cities} placeholder={t('common:form.selectCity')} />
            <SelectField label={t('common:form.sport')} value={sport} onChange={setSport} options={SPORTS} placeholder={t('common:form.selectSport')} labels={Object.fromEntries(SPORTS.map(s => [s, sportLabel(s)]))} />
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
            disabled={saving || !country}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? t('profile.saving') : t('common:actions.save')}
          </button>
        </div>

        <VenueManager venues={venues} onAdd={addVenue} onRemove={removeVenue} title={t('profile.venues')} />

        <AccountActions />
      </main>
      <CoachBottomNav />
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
