import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMySchool, useUpdateSchool, useRespondSchoolMember } from '@/hooks/school/useSchools';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, MapPin, UserPlus, CheckCircle2, X, Users } from 'lucide-react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import CoachHeader from '@/components/coach/CoachHeader';
import { SPORTS, CITIES, sportLabel } from '@/lib/constants';
import SelectField from '@/components/shared/SelectField';
import ShareLinkButton from '@/components/shared/ShareLinkButton';
import PlaceAutocompleteInput from '@/components/shared/PlaceAutocompleteInput';
import Avatar from '@/components/shared/Avatar';
import { useUnsavedChanges } from '@/hooks/shared/useUnsavedChanges';
import UnsavedChangesDialog from '@/components/shared/UnsavedChangesDialog';
import { localizeErrorMessage } from '@/lib/localizedErrors';
import { SessioLoader } from '@/components/SessioLogo';

type Venue = { name: string; address: string };

export default function SchoolProfileEditor() {
  const { t } = useTranslation('school');
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: school, isLoading } = useMySchool();
  const update = useUpdateSchool(school?.id ?? '');
  const respond = useRespondSchoolMember();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [sport, setSport] = useState('');
  const [description, setDescription] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [newVenueName, setNewVenueName] = useState(() => localStorage.getItem('_newVenueName') ?? '');
  const [newVenueAddress, setNewVenueAddress] = useState(() => localStorage.getItem('_newVenueAddress') ?? '');
  function updateNewVenueName(v: string) { setNewVenueName(v); localStorage.setItem('_newVenueName', v); }
  function updateNewVenueAddress(v: string) { setNewVenueAddress(v); localStorage.setItem('_newVenueAddress', v); }

  useEffect(() => {
    if (school) {
      setName(school.name ?? '');
      setCity(school.city ?? '');
      setSport(school.sport ?? '');
      setDescription(school.description ?? '');
      setVenues(((school as any).venues as Venue[]) ?? []);
    }
  }, [school]);

  const isDirty = name !== (school?.name ?? '')
    || city !== (school?.city ?? '')
    || sport !== (school?.sport ?? '')
    || description !== (school?.description ?? '');
  const blocker = useUnsavedChanges(isDirty);

  function addVenue() {
    if (!newVenueName.trim() || !newVenueAddress.trim()) return;
    const updated = [...venues, { name: newVenueName.trim(), address: newVenueAddress.trim() }];
    setVenues(updated);
    updateNewVenueName('');
    updateNewVenueAddress('');
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
  const inviteLink = inviteCode ? `${window.location.origin}/join-school/${inviteCode}` : '';

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
          <SelectField label={t('common:form.city')} value={city} onChange={setCity} options={CITIES} placeholder={t('common:form.selectCity')} />
          <SelectField label={t('common:form.sport')} value={sport} onChange={setSport} options={SPORTS} placeholder={t('common:form.selectSport')} labels={Object.fromEntries(SPORTS.map(s => [s, sportLabel(s)]))} />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('profile.description')}</label>
            <textarea rows={3} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <button onClick={() => update.mutate({ name, city, sport, description, venues })} disabled={update.isPending}
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

        {/* Venues */}
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
            <input placeholder={t('profile.venueName')} value={newVenueName} onChange={e => updateNewVenueName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <PlaceAutocompleteInput value={newVenueAddress} onChange={updateNewVenueAddress}
              placeholder={t('profile.venueAddress')}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="button" onClick={addVenue} disabled={!newVenueName.trim() || !newVenueAddress.trim()}
              className="flex items-center gap-1.5 text-sm font-medium text-primary disabled:opacity-40">
              <Plus className="h-4 w-4" /> {t('profile.addVenue')}
            </button>
          </div>
        </div>

      </main>
      <CoachBottomNav />
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
