import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ChevronDown, ArrowLeft, LogOut } from 'lucide-react';
import { SessioLogo } from '@/components/SessioLogo';
import { toast } from 'sonner';

const SPORTS = ['Tennis', 'Swimming', 'Running', 'Fitness', 'Yoga', 'Football', 'Badminton', 'Boxing', 'Other'];
const CITIES = ['Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk', 'Łódź', 'Katowice', 'Lublin', 'Białystok', 'Szczecin', 'Rzeszów', 'Toruń', 'Bydgoszcz', 'Częstochowa', 'Radom', 'Sosnowiec', 'Kielce', 'Gliwice', 'Olsztyn', 'Bielsko-Biała'];

type Step = 'name' | 'train-or-coach' | 'coach-type' | 'coach-details' | 'school-details';

export default function Onboarding() {
  const { user, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('name');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [coachType, setCoachType] = useState<'solo' | 'school' | 'join' | null>(null);
  const [sport, setSport] = useState('Tennis');
  const [city, setCity] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill invite code from pending school invite (via /join-school/:code link)
  useEffect(() => {
    const pending = sessionStorage.getItem('pending_school_invite');
    if (pending) {
      sessionStorage.removeItem('pending_school_invite');
      setInviteCode(pending.toUpperCase());
      setCoachType('join');
    }
  }, []);

  function goBack() {
    setError('');
    if (step === 'train-or-coach') setStep('name');
    else if (step === 'coach-type') setStep('train-or-coach');
    else if (step === 'coach-details' || step === 'school-details') setStep('coach-type');
  }

  // ── Submit: Athlete ──
  async function submitAthlete() {
    if (!user) { setError('Not signed in — please reload and try again'); return; }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null, role: 'player', onboarding_complete: true })
        .eq('id', user.id);
      if (error) { setError(error.message); setLoading(false); return; }
      await refreshProfile();
      navigate('/player');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
      setLoading(false);
    }
  }

  // ── Submit: Solo Coach ──
  async function submitSoloCoach() {
    if (!user) { setError('Not signed in — please reload and try again'); return; }
    if (!city) return;
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null, role: 'coach', sport, city, onboarding_complete: true } as any)
        .eq('id', user.id);
      if (error) { setError(error.message); setLoading(false); return; }
      await refreshProfile();
      navigate('/coach');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
      setLoading(false);
    }
  }

  // ── Submit: Open School ──
  async function submitSchoolOwner() {
    if (!user) { setError('Not signed in — please reload and try again'); return; }
    if (!city || !schoolName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null, role: 'school_owner', sport, city, onboarding_complete: true } as any)
        .eq('id', user.id);
      if (profileError) { setError(profileError.message); setLoading(false); return; }

      const { error: schoolError } = await supabase
        .from('schools' as any)
        .insert({ name: schoolName.trim(), sport, city, owner_id: user.id });
      if (schoolError) { setError(schoolError.message); setLoading(false); return; }

      await refreshProfile();
      navigate('/coach');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
      setLoading(false);
    }
  }

  // ── Submit: Join School (via invite link — sport/city inherited from school) ──
  async function submitJoinSchool() {
    if (!user) { setError('Not signed in — please reload and try again'); return; }
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
        .from('schools' as any)
        .select('id, name, sport, city')
        .eq('invite_code', code)
        .maybeSingle();

      if (lookupError || !school) {
        setError('Invalid invite code — check with your school owner');
        setLoading(false);
        return;
      }

      const s = school as any;

      // Update profile as coach — inherit sport/city from school
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null, role: 'coach', sport: s.sport, city: s.city, onboarding_complete: true } as any)
        .eq('id', user.id);
      if (profileError) { setError(profileError.message); setLoading(false); return; }

      // Request to join school (pending approval)
      const { error: memberError } = await supabase
        .from('school_members' as any)
        .insert({ school_id: s.id, coach_id: user.id, status: 'pending' });
      if (memberError && !memberError.message.includes('duplicate')) {
        setError(memberError.message);
        setLoading(false);
        return;
      }

      await refreshProfile();
      toast.success(`Request sent to ${s.name}! The owner will approve you.`);
      navigate('/coach');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
      setLoading(false);
    }
  }

  const showBack = step !== 'name';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center px-6 py-5 gap-3">
        {showBack && (
          <button onClick={goBack} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <SessioLogo size={28} />
        <div className="flex-1" />
        <button
          onClick={async () => { await signOut(); navigate('/auth'); }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm">

          {/* ── Step: Name ── */}
          {step === 'name' && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-foreground">What's your name?</h1>
              <p className="mb-6 text-muted-foreground">Let's set up your profile</p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                />
                <input
                  type="tel"
                  placeholder="Phone number (optional)"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                />
                <button
                  onClick={() => coachType === 'join' ? submitJoinSchool() : setStep('train-or-coach')}
                  disabled={!fullName.trim() || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground disabled:opacity-50 min-h-[44px]"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {coachType === 'join' ? 'Join School' : 'Continue'}
                </button>
                {error && <p className="text-sm text-destructive mt-2">{error}</p>}
              </div>
            </div>
          )}

          {/* ── Step: Train or Coach ── */}
          {step === 'train-or-coach' && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-foreground">How will you use Sessio?</h1>
              <p className="mb-6 text-muted-foreground">You can always change this later</p>
              <div className="space-y-3">
                <button
                  onClick={() => submitAthlete()}
                  disabled={loading}
                  className="w-full rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary/40 active:scale-[0.98]"
                >
                  <div className="mb-1 text-2xl">🎾</div>
                  <div className="font-semibold text-foreground">I train</div>
                  <div className="text-sm text-muted-foreground">Find coaches, join trainings, manage my schedule</div>
                </button>
                <button
                  onClick={() => setStep('coach-type')}
                  className="w-full rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary/40 active:scale-[0.98]"
                >
                  <div className="mb-1 text-2xl">🏋️</div>
                  <div className="font-semibold text-foreground">I coach</div>
                  <div className="text-sm text-muted-foreground">Create trainings, manage athletes, grow your business</div>
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
              <h1 className="mb-1 text-2xl font-bold text-foreground">How do you work?</h1>
              <p className="mb-6 text-muted-foreground">This helps us set up the right tools for you</p>
              <div className="space-y-3">
                <button
                  onClick={() => { setCoachType('solo'); setStep('coach-details'); }}
                  className="w-full rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary/40 active:scale-[0.98]"
                >
                  <div className="mb-1 text-2xl">👤</div>
                  <div className="font-semibold text-foreground">Solo coach</div>
                  <div className="text-sm text-muted-foreground">I manage my own trainings independently</div>
                </button>
                <button
                  onClick={() => { setCoachType('school'); setStep('school-details'); }}
                  className="w-full rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary/40 active:scale-[0.98]"
                >
                  <div className="mb-1 text-2xl">🏫</div>
                  <div className="font-semibold text-foreground">Open a school</div>
                  <div className="text-sm text-muted-foreground">Manage coaches and run a sports business</div>
                </button>
                <button
                  onClick={() => { setCoachType('join'); setStep('coach-details'); }}
                  className="w-full rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary/40 active:scale-[0.98]"
                >
                  <div className="mb-1 text-2xl">🔗</div>
                  <div className="font-semibold text-foreground">Join a school</div>
                  <div className="text-sm text-muted-foreground">I was invited by a school on Sessio</div>
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Coach Details (solo + join) ── */}
          {step === 'coach-details' && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-foreground">
                {coachType === 'join' ? 'Join your school' : 'Your coaching setup'}
              </h1>
              <p className="mb-6 text-muted-foreground">Almost there</p>
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Sport</label>
                  <div className="flex flex-wrap gap-2">
                    {SPORTS.map(s => (
                      <button key={s} type="button" onClick={() => setSport(s)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
                          sport === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                        }`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">City</label>
                  <div className="relative">
                    <select value={city} onChange={e => setCity(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3.5 pr-9 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]">
                      <option value="">Select city</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                {coachType === 'join' && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">School invite code</label>
                    <input
                      type="text"
                      placeholder="Enter code from your school"
                      value={inviteCode}
                      onChange={e => setInviteCode(e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                    />
                  </div>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  onClick={coachType === 'join' ? submitJoinSchool : submitSoloCoach}
                  disabled={!city || loading || (coachType === 'join' && !inviteCode.trim())}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground disabled:opacity-50 min-h-[44px]"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Get started
                </button>
              </div>
            </div>
          )}

          {/* ── Step: School Details (open school) ── */}
          {step === 'school-details' && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-foreground">Set up your school</h1>
              <p className="mb-6 text-muted-foreground">You can add coaches after setup</p>
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">School name</label>
                  <input
                    type="text"
                    placeholder="e.g. Warszawianka Tennis Club"
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    autoFocus
                    className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Sport</label>
                  <div className="flex flex-wrap gap-2">
                    {SPORTS.map(s => (
                      <button key={s} type="button" onClick={() => setSport(s)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
                          sport === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                        }`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">City</label>
                  <div className="relative">
                    <select value={city} onChange={e => setCity(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3.5 pr-9 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]">
                      <option value="">Select city</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  onClick={submitSchoolOwner}
                  disabled={!city || !schoolName.trim() || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground disabled:opacity-50 min-h-[44px]"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create school
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
