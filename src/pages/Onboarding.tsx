import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'coach' | 'player' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!role || !fullName.trim()) return;
    setLoading(true);
    setError('');
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        role,
        onboarding_complete: true,
      })
      .eq('id', user!.id);
    
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    await refreshProfile();
    navigate(role === 'coach' ? '/coach/dashboard' : '/player/dashboard');
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
              <span>{step}/2</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(step / 2) * 100}%` }}
              />
            </div>
          </div>

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
                  <div className="text-sm text-muted-foreground">Create groups and manage sessions</div>
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
                  <div className="font-semibold text-foreground">Player</div>
                  <div className="text-sm text-muted-foreground">Join groups and confirm sessions</div>
                </button>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={!role || loading}
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
