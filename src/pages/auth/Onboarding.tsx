import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ChevronDown, ArrowLeft, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SessioLogo } from '@/components/SessioLogo';
import { toast } from 'sonner';
import { SPORTS, CITIES, sportLabel } from '@/lib/constants';
import PlaceAutocompleteInput from '@/components/shared/PlaceAutocompleteInput';
import PhoneInput, { isValidPhone } from '@/components/shared/PhoneInput';
import { localizeErrorMessage } from '@/lib/localizedErrors';

type Step = 'name' | 'train-or-coach' | 'coach-type' | 'coach-details' | 'school-details';

export default function Onboarding() {
  const { user, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'common']);
  const [step, setStep] = useState<Step>('name');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const [coachType, setCoachType] = useState<'solo' | 'school' | 'join' | null>(null);
  const [sport, setSport] = useState('');
  const [schoolSports, setSchoolSports] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fresh training invite → skip role selection, they're an athlete
  // "Fresh" = set within the last 10 minutes (prevents stale sessionStorage from forcing athlete)
  const hasTrainingInvite = (() => {
    const code = sessionStorage.getItem('pending_invite');
    const ts = Number(sessionStorage.getItem('pending_invite_ts') || 0);
    return !!code && Date.now() - ts < 10 * 60 * 1000;
  })();

  // Pre-fill invite code from pending school invite (via /join-school/:code link)
  useEffect(() => {
    const pending = sessionStorage.getItem('pending_school_invite');
    if (pending) {
      sessionStorage.removeItem('pending_school_invite');
      setInviteCode(pending.toUpperCase());
      setCoachType('join');
    }
  }, []);

  function getPostOnboardingPath(role: string) {
    const pendingInvite = sessionStorage.getItem('pending_invite');
    if (pendingInvite) {
      sessionStorage.removeItem('pending_invite');
      sessionStorage.removeItem('pending_invite_ts');
      return `/join/${pendingInvite}`;
    }
    return role === 'player' ? '/player' : '/coach';
  }

  function goBack() {
    setError('');
    if (step === 'train-or-coach') setStep('name');
    else if (step === 'coach-type') setStep('train-or-coach');
    else if (step === 'coach-details' || step === 'school-details') setStep('coach-type');
  }

  // ── Submit: Athlete ──
  async function submitAthlete() {
    if (!user) { setError(t('common:errors.notSignedIn')); return; }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone, role: 'player', onboarding_complete: true })
        .eq('id', user.id);
      if (error) { setError(localizeErrorMessage(error, t('common:errors.somethingWentWrong'))); setLoading(false); return; }
      await refreshProfile();
      navigate(getPostOnboardingPath('player'));
    } catch (e: any) {
      setError(localizeErrorMessage(e, t('common:errors.somethingWentWrong')));
      setLoading(false);
    }
  }

  // ── Submit: Solo Coach ──
  async function submitSoloCoach() {
    if (!user) { setError(t('common:errors.notSignedIn')); return; }
    if (!city || !sport) return;
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone, role: 'coach', sport, city, onboarding_complete: true })
        .eq('id', user.id);
      if (error) { setError(localizeErrorMessage(error, t('common:errors.somethingWentWrong'))); setLoading(false); return; }
      await refreshProfile();
      navigate(getPostOnboardingPath('coach'));
    } catch (e: any) {
      setError(localizeErrorMessage(e, t('common:errors.somethingWentWrong')));
      setLoading(false);
    }
  }

  // ── Submit: Open School ──
  async function submitSchoolOwner() {
    if (!user) { setError(t('common:errors.notSignedIn')); return; }
    if (!city || !schoolName.trim() || schoolSports.length === 0) return;
    setLoading(true);
    setError('');
    const primarySport = schoolSports[0];
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone, role: 'school_owner', sport: primarySport, city, onboarding_complete: true })
        .eq('id', user.id);
      if (profileError) { setError(localizeErrorMessage(profileError, t('common:errors.somethingWentWrong'))); setLoading(false); return; }

      const venues = venueName.trim() && venueAddress.trim()
        ? [{ name: venueName.trim(), address: venueAddress.trim() }]
        : [];
      const { data: newSchool, error: schoolError } = await supabase
        .from('schools')
        .insert({ name: schoolName.trim(), sport: primarySport, city, owner_id: user.id, venues })
        .select('id')
        .single();
      if (schoolError) { setError(localizeErrorMessage(schoolError, t('common:errors.somethingWentWrong'))); setLoading(false); return; }

      // Auto-add owner as coach in the school
      if (newSchool) {
        await supabase
          .from('school_members')
          .insert({ school_id: (newSchool).id, coach_id: user.id, status: 'approved' });
      }

      await refreshProfile();
      navigate(getPostOnboardingPath('school_owner'));
    } catch (e: any) {
      setError(localizeErrorMessage(e, t('common:errors.somethingWentWrong')));
      setLoading(false);
    }
  }

  // ── Submit: Join School (via invite link — sport/city inherited from school) ──
  async function submitJoinSchool() {
    if (!user) { setError(t('common:errors.notSignedIn')); return; }
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      // Extract code from full URL if pasted (e.g. https://…/join-school/ABC123)
      const raw = inviteCode.trim();
      const codeMatch = raw.match(/join-school\/([A-Za-z0-9]+)/);
      const code = (codeMatch ? codeMatch[1] : raw).toUpperCase();

      // Look up school by invite code
      const { data: school, error: lookupError } = await supabase
        .from('schools')
        .select('id, name, sport, city')
        .eq('invite_code', code)
        .maybeSingle();

      if (lookupError || !school) {
        setError(t('auth:onboarding.invalidInviteCode'));
        setLoading(false);
        return;
      }

      const s = school as any;

      // Update profile as coach — inherit sport/city from school
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone, role: 'coach', sport: s.sport, city: s.city, onboarding_complete: true })
        .eq('id', user.id);
      if (profileError) { setError(localizeErrorMessage(profileError, t('common:errors.somethingWentWrong'))); setLoading(false); return; }

      // Request to join school (pending approval)
      const { error: memberError } = await supabase
        .from('school_members')
        .insert({ school_id: s.id, coach_id: user.id, status: 'pending' });
      if (memberError && !memberError.message.includes('duplicate')) {
        setError(localizeErrorMessage(memberError, t('common:errors.somethingWentWrong')));
        setLoading(false);
        return;
      }

      await refreshProfile();
      toast.success(t('auth:onboarding.requestSent', { name: s.name }));
      navigate(getPostOnboardingPath('coach'));
    } catch (e: any) {
      setError(localizeErrorMessage(e, t('common:errors.somethingWentWrong')));
      setLoading(false);
    }
  }

  const showBack = step !== 'name';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="fixed top-0 left-0 right-0 z-10 px-4 py-4 header-gradient">
        <div className="max-w-md mx-auto flex items-center gap-3 text-white">
          {showBack && (
            <button onClick={goBack} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 -ml-2">
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
          )}
          <SessioLogo size={28} />
          <div className="flex-1" />
          <button
            onClick={async () => { await signOut(); navigate('/auth'); }}
            className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" /> {t('auth:onboarding.signOut')}
          </button>
        </div>
      </header>
      {/* Spacer for fixed header */}
      <div className="px-4 py-4 header-gradient" style={{ visibility: 'hidden' }} aria-hidden="true" inert="">
        <div className="max-w-md mx-auto h-9" />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm">

          {/* ── Step: Name ── */}
          {step === 'name' && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-foreground">{t('auth:onboarding.nameTitle')}</h1>
              <p className="mb-6 text-muted-foreground">{t('auth:onboarding.nameSubtitle')}</p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder={t('auth:onboarding.firstName')}
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                />
                <input
                  type="text"
                  placeholder={t('auth:onboarding.lastName')}
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                />
                <PhoneInput value={phone} onChange={setPhone} required />
                <button
                  onClick={() => coachType === 'join' ? submitJoinSchool() : hasTrainingInvite ? submitAthlete() : setStep('train-or-coach')}
                  disabled={!firstName.trim() || !lastName.trim() || !isValidPhone(phone) || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground disabled:opacity-50 min-h-[44px]"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {coachType === 'join' ? t('auth:onboarding.joinSchool') : hasTrainingInvite ? t('auth:onboarding.joinTraining') : t('common:actions.continue')}
                </button>
                {error && <p className="text-sm text-destructive mt-2">{error}</p>}
              </div>
            </div>
          )}

          {/* ── Step: Train or Coach ── */}
          {step === 'train-or-coach' && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-foreground">{t('auth:onboarding.roleTitle')}</h1>
              <p className="mb-6 text-muted-foreground">{t('auth:onboarding.roleSubtitle')}</p>
              <div className="space-y-3">
                <button
                  onClick={() => submitAthlete()}
                  disabled={loading}
                  className="w-full rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary/40 active:scale-[0.98]"
                >
                  <div className="mb-1 text-2xl">🎾</div>
                  <div className="font-semibold text-foreground">{t('auth:onboarding.iTrain')}</div>
                  <div className="text-sm text-muted-foreground">{t('auth:onboarding.iTrainDesc')}</div>
                </button>
                <button
                  onClick={() => setStep('coach-type')}
                  className="w-full rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary/40 active:scale-[0.98]"
                >
                  <div className="mb-1 text-2xl">🏋️</div>
                  <div className="font-semibold text-foreground">{t('auth:onboarding.iCoach')}</div>
                  <div className="text-sm text-muted-foreground">{t('auth:onboarding.iCoachDesc')}</div>
                </button>
                {loading && (
                  <div className="flex justify-center py-2"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </div>
          )}

          {/* ── Step: Coach Type ── */}
          {step === 'coach-type' && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-foreground">{t('auth:onboarding.coachTypeTitle')}</h1>
              <p className="mb-6 text-muted-foreground">{t('auth:onboarding.coachTypeSubtitle')}</p>
              <div className="space-y-3">
                <button
                  onClick={() => { setCoachType('solo'); setStep('coach-details'); }}
                  className="w-full rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary/40 active:scale-[0.98]"
                >
                  <div className="mb-1 text-2xl">👤</div>
                  <div className="font-semibold text-foreground">{t('auth:onboarding.soloCoach')}</div>
                  <div className="text-sm text-muted-foreground">{t('auth:onboarding.soloCoachDesc')}</div>
                </button>
                <button
                  onClick={() => { setCoachType('school'); setStep('school-details'); }}
                  className="w-full rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary/40 active:scale-[0.98]"
                >
                  <div className="mb-1 text-2xl">🏫</div>
                  <div className="font-semibold text-foreground">{t('auth:onboarding.openSchool')}</div>
                  <div className="text-sm text-muted-foreground">{t('auth:onboarding.openSchoolDesc')}</div>
                </button>
                <button
                  onClick={() => { setCoachType('join'); setStep('coach-details'); }}
                  className="w-full rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary/40 active:scale-[0.98]"
                >
                  <div className="mb-1 text-2xl">🔗</div>
                  <div className="font-semibold text-foreground">{t('auth:onboarding.joinSchoolOption')}</div>
                  <div className="text-sm text-muted-foreground">{t('auth:onboarding.joinSchoolDesc')}</div>
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Coach Details (solo) ── */}
          {step === 'coach-details' && coachType !== 'join' && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-foreground">{t('auth:onboarding.coachingSetup')}</h1>
              <p className="mb-6 text-muted-foreground">{t('auth:onboarding.almostThere')}</p>
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">{t('common:form.sport')}</label>
                  <div className="relative">
                    <select value={sport} onChange={e => setSport(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3.5 pr-9 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]">
                      <option value="">{t('common:form.selectSport')}</option>
                      {SPORTS.map(s => <option key={s} value={s}>{sportLabel(s)}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">{t('common:form.city')}</label>
                  <div className="relative">
                    <select value={city} onChange={e => setCity(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3.5 pr-9 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]">
                      <option value="">{t('common:form.selectCity')}</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  onClick={submitSoloCoach}
                  disabled={!city || !sport || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground disabled:opacity-50 min-h-[44px]"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('common:actions.getStarted')}
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Join School (code only — sport/city come from school) ── */}
          {step === 'coach-details' && coachType === 'join' && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-foreground">{t('auth:onboarding.joinYourSchool')}</h1>
              <p className="mb-6 text-muted-foreground">{t('auth:onboarding.almostThere')}</p>
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">{t('auth:onboarding.schoolInviteCode')}</label>
                  <input
                    type="text"
                    placeholder={t('auth:onboarding.enterCode')}
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value)}
                    autoFocus
                    className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  onClick={submitJoinSchool}
                  disabled={!inviteCode.trim() || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground disabled:opacity-50 min-h-[44px]"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('auth:onboarding.joinSchool')}
                </button>
              </div>
            </div>
          )}

          {/* ── Step: School Details (open school) ── */}
          {step === 'school-details' && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-foreground">{t('auth:onboarding.setupSchoolTitle')}</h1>
              <p className="mb-6 text-muted-foreground">{t('auth:onboarding.setupSchoolSubtitle')}</p>
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">{t('auth:onboarding.schoolName')}</label>
                  <input
                    type="text"
                    placeholder={t('auth:onboarding.schoolNamePlaceholder')}
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    autoFocus
                    className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">{t('common:form.sport')}</label>
                  {schoolSports.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {schoolSports.map(s => (
                        <span key={s} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {sportLabel(s)}
                          <button type="button" onClick={() => setSchoolSports(prev => prev.filter(x => x !== s))} className="ml-0.5 text-primary/60 hover:text-primary">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <select
                      value=""
                      onChange={e => {
                        const val = e.target.value;
                        if (val && !schoolSports.includes(val)) setSchoolSports(prev => [...prev, val]);
                      }}
                      className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3.5 pr-9 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                    >
                      <option value="">{schoolSports.length === 0 ? t('common:form.selectSport') : t('common:form.addSport')}</option>
                      {SPORTS.filter(s => !schoolSports.includes(s)).map(s => <option key={s} value={s}>{sportLabel(s)}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">{t('common:form.city')}</label>
                  <div className="relative">
                    <select value={city} onChange={e => setCity(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3.5 pr-9 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]">
                      <option value="">{t('common:form.selectCity')}</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">{t('auth:onboarding.mainVenue')}</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder={t('auth:onboarding.venueName')}
                      value={venueName}
                      onChange={e => setVenueName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                    />
                    {venueName && (
                        <PlaceAutocompleteInput
                          value={venueAddress}
                          onChange={setVenueAddress}
                          placeholder={t('auth:onboarding.venueAddress')}
                          className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                        />
                    )}
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  onClick={submitSchoolOwner}
                  disabled={!city || !schoolName.trim() || schoolSports.length === 0 || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground disabled:opacity-50 min-h-[44px]"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('auth:onboarding.createSchool')}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
