import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ChevronDown } from 'lucide-react';

const SPORTS = ['Tennis', 'Swimming', 'Running', 'Fitness', 'Yoga', 'Football', 'Badminton', 'Boxing', 'Other'];
const CITIES = ['Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk', 'Łódź', 'Katowice', 'Lublin', 'Białystok', 'Szczecin', 'Rzeszów', 'Toruń', 'Bydgoszcz', 'Częstochowa', 'Radom', 'Sosnowiec', 'Kielce', 'Gliwice', 'Olsztyn', 'Bielsko-Biała'];

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'coach' | 'player' | null>(null);
  const [sport, setSport] = useState('Tennis');
  const [city, setCity] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Total steps: player = 2, coach = 3
  const totalSteps = role === 'coach' ? 3 : 2;

  async function handlePlayerSubmit() {
    if (!fullName.trim()) return;
    setLoading(true);
    setError('');
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        role: 'player',
        onboarding_complete: true,
      })
      .eq('id', user!.id);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    await refreshProfile();
    navigate('/player');
  }

  async function handleCoachSubmit() {
    if (!fullName.trim() || !city.trim()) return;
    setLoading(true);
    setError('');

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        role: 'coach',
        sport,
        city: city.trim(),
        onboarding_complete: true,
      } as any)
      .eq('id', user!.id);

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (schoolName.trim()) {
      const { error: schoolError } = await supabase
        .from('schools' as any)
        .insert({ name: schoolName.trim(), sport, city: city.trim(), owner_id: user!.id });
      if (schoolError) {
        setError(schoolError.message);
        setLoading(false);
        return;
      }
    }

    await refreshProfile();
    navigate('/coach');
  }

  function handleStep2Continue() {
    if (!role) return;
    if (role === 'player') {
      handlePlayerSubmit();
    } else {
      setStep(3);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center px-6 py-5">
        <span className="text-xl font-bold tracking-tight text-foreground">sessio</span>
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Progress */}
          <div className="mb-8">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Setup</span>
              <span>{step}/{totalSteps}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Step 1: Name + Phone */}
          {step === 1 && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-foreground">What's your name?</h1>
              <p className="mb-6 text-muted-foreground">Let's set up your profile</p>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                  autoFocus
                />
                <input
                  type="tel"
                  placeholder="Phone number (optional)"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                />
                <button
                  onClick={() => setStep(2)}
                  disabled={!fullName.trim()}
                  className="w-full rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 min-h-[44px]"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Role selection */}
          {step === 2 && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-foreground">I am a…</h1>
              <p className="mb-6 text-muted-foreground">This sets up your experience</p>

              <div className="space-y-3">
                <button
                  onClick={() => setRole('coach')}
                  className={`w-full rounded-xl border-2 p-5 text-left transition-all min-h-[44px] ${
                    role === 'coach'
                      ? 'border-primary bg-accent'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="mb-1 text-2xl">🏋️</div>
                  <div className="font-semibold text-foreground">Coach</div>
                  <div className="text-sm text-muted-foreground">Create trainings and manage athletes</div>
                </button>

                <button
                  onClick={() => setRole('player')}
                  className={`w-full rounded-xl border-2 p-5 text-left transition-all min-h-[44px] ${
                    role === 'player'
                      ? 'border-primary bg-accent'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="mb-1 text-2xl">🏃</div>
                  <div className="font-semibold text-foreground">Athlete</div>
                  <div className="text-sm text-muted-foreground">Join trainings and confirm attendance</div>
                </button>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <button
                  onClick={handleStep2Continue}
                  disabled={!role || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 min-h-[44px]"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {role === 'coach' ? 'Continue' : 'Get started'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Coach details */}
          {step === 3 && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-foreground">Your coaching setup</h1>
              <p className="mb-6 text-muted-foreground">Tell us a bit more about what you do</p>

              <div className="space-y-5">
                {/* Sport picker */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Your sport</label>
                  <div className="flex flex-wrap gap-2">
                    {SPORTS.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSport(s)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
                          sport === s
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">City</label>
                  <div className="relative">
                    <select
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-3.5 pr-9 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                    >
                      <option value="">Select city</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                {/* School name (optional) */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    Do you coach at a school? <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="School name"
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <button
                  onClick={handleCoachSubmit}
                  disabled={!city.trim() || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 min-h-[44px]"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Get started
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
