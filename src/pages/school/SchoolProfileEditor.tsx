import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMySchool, useUpdateSchool, useRespondSchoolMember } from '@/hooks/school/useSchools';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus, CheckCircle2, X, Users } from 'lucide-react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import CoachHeader from '@/components/coach/CoachHeader';
import { SPORTS, COUNTRIES, CITIES_BY_COUNTRY, sportLabel, countryLabel, type Country } from '@/lib/constants';
import SelectField from '@/components/shared/SelectField';
import ShareLinkButton from '@/components/shared/ShareLinkButton';
import VenueManager, { type Venue } from '@/components/shared/VenueManager';
import PhoneInput from '@/components/shared/PhoneInput';
import Avatar from '@/components/shared/Avatar';
import { useUnsavedChanges } from '@/hooks/shared/useUnsavedChanges';
import UnsavedChangesDialog from '@/components/shared/UnsavedChangesDialog';
import { localizeErrorMessage } from '@/lib/localizedErrors';
import { slugify } from '@/lib/utils';
import { getShareableOrigin } from '@/lib/platform';
import { SessioLoader } from '@/components/SessioLogo';

export default function SchoolProfileEditor() {
  const { t } = useTranslation('school');
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: school, isLoading } = useMySchool();
  const update = useUpdateSchool(school?.id ?? '');
  const respond = useRespondSchoolMember();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [sports, setSports] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [servicesInfo, setServicesInfo] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');

  useEffect(() => {
    if (school) {
      setName(school.name ?? '');
      setSlug(school.slug ?? '');
      setCountry(school.country ?? '');
      setCity(school.city ?? '');
      setSports(school.sport ?? []);
      setDescription(school.description ?? '');
      setVenues(((school as any).venues as Venue[]) ?? []);
      setLegalName(school.legal_name ?? '');
      setTaxId(school.tax_id ?? '');
      setLegalAddress(school.legal_address ?? '');
      setContactPhone(school.contact_phone ?? '');
      setContactEmail(school.contact_email ?? '');
      setServicesInfo(school.services_info ?? '');
      setRefundPolicy(school.refund_policy ?? '');
    }
  }, [school]);

  const isDirty = name !== (school?.name ?? '')
    || slug !== (school?.slug ?? '')
    || country !== (school?.country ?? '')
    || city !== (school?.city ?? '')
    || JSON.stringify(sports) !== JSON.stringify(school?.sport ?? [])
    || description !== (school?.description ?? '')
    || legalName !== (school?.legal_name ?? '')
    || taxId !== (school?.tax_id ?? '')
    || legalAddress !== (school?.legal_address ?? '')
    || contactPhone !== (school?.contact_phone ?? '')
    || contactEmail !== (school?.contact_email ?? '')
    || servicesInfo !== (school?.services_info ?? '')
    || refundPolicy !== (school?.refund_policy ?? '');
  const cities = country ? CITIES_BY_COUNTRY[country as Country] ?? [] : [];
  function handleCountryChange(c: string) { setCountry(c); setCity(''); }
  const countryLabels = Object.fromEntries(COUNTRIES.map(c => [c, countryLabel(c)]));
  const blocker = useUnsavedChanges(isDirty);

  function addVenue(venue: Venue) {
    const updated = [...venues, venue];
    setVenues(updated);
    if (school) update.mutate({ venues: updated });
  }

  function removeVenue(idx: number) {
    const updated = venues.filter((_, i) => i !== idx);
    setVenues(updated);
    if (school) update.mutate({ venues: updated });
  }

  // Coaches
  const coaches = (school)?.school_members ?? [];
  const pendingMembers = (school)?.pending_members ?? [];
  const isSelfCoach = coaches.some((m: any) => m.coach_id === profile?.id);
  const inviteCode = school?.invite_code;
  const inviteLink = inviteCode ? `${getShareableOrigin()}/join-school/${inviteCode}` : '';

  async function removeCoach(memberId: string, coachName: string) {
    if (!confirm(t('profile.removeConfirm', { name: coachName }))) return;
    const { error } = await supabase.from('school_members').delete().eq('id', memberId);
    if (error) toast.error(localizeErrorMessage(error, t('common:errors.somethingWentWrong')));
    else { toast.success(t('profile.coachRemoved')); qc.invalidateQueries({ queryKey: ['my-school'] }); }
  }

  async function addSelfAsCoach() {
    if (!school?.id || !profile?.id) return;
    const { error } = await supabase
      .from('school_members')
      .insert({ school_id: school.id, coach_id: profile.id, status: 'approved' });
    if (error) toast.error(localizeErrorMessage(error, t('common:errors.somethingWentWrong')));
    else { toast.success(t('profile.added')); qc.invalidateQueries({ queryKey: ['my-school'] }); }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <SessioLoader />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <CoachHeader title={t('profile.title')} back />
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-6">

        {/* School info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('profile.schoolName')}</label>
            <input className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('profile.slug')}</label>
            <input
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={slugify(name) || 'my-school'}
              value={slug}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={e => setSlug(e.target.value.toLowerCase())}
              onBlur={() => setSlug(slugify(slug))}
            />
            <p className="text-xs text-muted-foreground mt-1.5 break-all">
              {getShareableOrigin()}/s/<span className="font-medium text-foreground">{slugify(slug) || slugify(name) || 'my-school'}</span>
            </p>
          </div>
          <SelectField label={t('common:form.country')} value={country} onChange={handleCountryChange} options={COUNTRIES} placeholder={t('common:form.selectCountry')} labels={countryLabels} disabled={!!school?.country} />
          <SelectField label={t('common:form.city')} value={city} onChange={setCity} options={cities} placeholder={t('common:form.selectCity')} required />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('common:form.sport')}</label>
            {sports.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {sports.map(s => (
                  <span key={s} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {sportLabel(s)}
                    <button type="button" onClick={() => setSports(prev => prev.filter(x => x !== s))} className="ml-0.5 text-primary/60 hover:text-primary">✕</button>
                  </span>
                ))}
              </div>
            )}
            <select
              value=""
              onChange={e => { const val = e.target.value; if (val && !sports.includes(val)) setSports(prev => [...prev, val]); }}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{sports.length === 0 ? t('common:form.selectSport') : t('common:form.addSport')}</option>
              {SPORTS.filter(s => !sports.includes(s)).map(s => <option key={s} value={s}>{sportLabel(s)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('profile.description')}</label>
            <textarea rows={3} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* Business information — public, used by payment processors (LiqPay, Stripe) */}
          <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">{t('profile.businessInfoTitle')}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t('profile.businessInfoHelper')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('profile.legalName')}</label>
              <input
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t('profile.legalNamePlaceholder')}
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('profile.taxId')}</label>
              <input
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t('profile.taxIdPlaceholder')}
                value={taxId}
                onChange={e => setTaxId(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('profile.legalAddress')}</label>
              <textarea
                rows={2}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder={t('profile.legalAddressPlaceholder')}
                value={legalAddress}
                onChange={e => setLegalAddress(e.target.value)}
              />
            </div>
            <PhoneInput value={contactPhone} onChange={setContactPhone} />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('profile.contactEmail')}</label>
              <input
                type="email"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t('profile.contactEmailPlaceholder')}
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('profile.servicesInfo')}</label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder={t('profile.servicesInfoPlaceholder')}
                value={servicesInfo}
                onChange={e => setServicesInfo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('profile.refundPolicy')}</label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder={t('profile.refundPolicyPlaceholder')}
                value={refundPolicy}
                onChange={e => setRefundPolicy(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={() => update.mutate({
              name, country, city, sport: sports, description, venues,
              // Always send a non-empty slug when name is set — the trigger only fires on INSERT,
              // so an UPDATE with NULL would clear the slug permanently.
              slug: slugify(slug) || slugify(name) || school?.slug || null,
              legal_name: legalName || null,
              tax_id: taxId || null,
              legal_address: legalAddress || null,
              contact_phone: contactPhone || null,
              contact_email: contactEmail || null,
              services_info: servicesInfo || null,
              refund_policy: refundPolicy || null,
            })}
            disabled={update.isPending || !country || !city}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {update.isPending ? t('profile.saving') : t('common:actions.save')}
          </button>
        </div>

        {/* Coaches */}
        <div>
          <h2 className="font-semibold text-foreground text-sm mb-3">{t('profile.coachesSection')}</h2>

          {/* Invite */}
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-2">{t('profile.inviteDesc')}</p>
            <ShareLinkButton url={inviteLink} label={t('profile.shareInvite')} />
          </div>

          {/* Pending */}
          {pendingMembers.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-xs font-medium text-warning">{t('profile.pending', { count: pendingMembers.length })}</p>
              {pendingMembers.map((m: any) => (
                <div key={m.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar url={m.coach?.avatar_url} name={m.coach?.full_name} size="sm" />
                    <p className="font-medium text-foreground text-sm truncate flex-1">{m.coach?.full_name ?? t('profile.coach')}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => respond.mutate({ memberId: m.id, accept: true })} disabled={respond.isPending}
                      className="flex items-center justify-center gap-1 rounded-lg bg-success/10 py-2 text-xs font-bold text-success min-h-[36px]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t('profile.approve')}
                    </button>
                    <button onClick={() => respond.mutate({ memberId: m.id, accept: false })} disabled={respond.isPending}
                      className="flex items-center justify-center gap-1 rounded-lg bg-destructive/10 py-2 text-xs font-bold text-destructive min-h-[36px]">
                      <X className="h-3.5 w-3.5" /> {t('profile.decline')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Coach list */}
          {coaches.length > 0 && (
            <div className="space-y-2 mb-3">
              {coaches.map((m: any) => {
                const isMe = m.coach_id === profile?.id;
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <Avatar url={m.coach?.avatar_url} name={m.coach?.full_name} size="sm" />
                    <p className="font-medium text-foreground text-sm truncate flex-1">
                      {m.coach?.full_name ?? t('profile.coach')}{isMe && <span className="text-primary ml-1">{t('profile.you')}</span>}
                    </p>
                    {!isMe && (
                      <button onClick={() => removeCoach(m.id, m.coach?.full_name ?? 'this coach')}
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-destructive/10 shrink-0">
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add self */}
          {!isSelfCoach && (
            <button onClick={addSelfAsCoach}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors">
              <UserPlus className="h-4 w-4" /> {t('profile.addMyselfCoach')}
            </button>
          )}
        </div>

        <VenueManager venues={venues} onAdd={addVenue} onRemove={removeVenue} title={t('profile.venues')} />

      </main>
      <CoachBottomNav />
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
