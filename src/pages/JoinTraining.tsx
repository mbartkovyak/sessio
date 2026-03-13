import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { MapPin, Clock, Users, Mail, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊', Other: '🎯',
};
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function JoinTraining() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [training, setTraining] = useState<any>(null);
  const [trainingLoading, setTrainingLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Fetch training from invite_code
  useEffect(() => {
    if (!inviteCode) return;
    // Try new trainings table first
    supabase
      .from('trainings' as any)
      .select('*, profiles:coach_id(full_name, avatar_url)')
      .eq('invite_code', inviteCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTraining({ ...data, _type: 'training' });
          setTrainingLoading(false);
          return;
        }
        // Fallback: legacy groups table
        supabase
          .from('groups')
          .select('*, profiles:coach_id(full_name, avatar_url)')
          .eq('invite_code', inviteCode.toUpperCase())
          .eq('is_active', true)
          .maybeSingle()
          .then(({ data: legacyData }) => {
            if (legacyData) setTraining({ ...legacyData, _type: 'group' });
            setTrainingLoading(false);
          });
      });
  }, [inviteCode]);

  // Auto-join once auth resolves
  useEffect(() => {
    if (!session || !profile || !training) return;
    if (loading) return;
    if (!profile.onboarding_complete || !profile.role) {
      sessionStorage.setItem('pending_invite', inviteCode ?? '');
      navigate('/onboarding');
      return;
    }
    if (profile.role !== 'player') {
      navigate('/coach');
      return;
    }
    autoJoin();
  }, [loading, session, profile, training]);

  async function autoJoin() {
    if (!training || !profile) return;
    setJoining(true);
    try {
      if (training._type === 'training') {
        const { data: existing } = await supabase
          .from('training_members' as any)
          .select('id, role')
          .eq('training_id', training.id)
          .eq('user_id', profile.id)
          .maybeSingle();

        if (existing) {
          toast.info(existing.role === 'waitlist' ? "You're on the waitlist" : "You're already in this training");
          navigate('/player');
          return;
        }

        const { count: activeCount } = await supabase
          .from('training_members' as any)
          .select('*', { count: 'exact', head: true })
          .eq('training_id', training.id)
          .eq('role', 'regular');

        const isFull = training.max_players && (activeCount ?? 0) >= training.max_players;
        if (isFull && !training.allow_waitlist) {
          toast.error('This training is full');
          navigate('/player');
          return;
        }

        // If approval required, create a join request instead
        if (training.booking_mode === 'approval') {
          const { error } = await supabase
            .from('join_requests' as any)
            .upsert({ user_id: profile.id, training_id: training.id, status: 'pending' }, { onConflict: 'user_id,training_id' });
          if (error) throw error;
          toast.success('Join request sent! The coach will review it.');
          navigate('/player');
          return;
        }

        const memberRole = isFull ? 'waitlist' : 'regular';
        const { error } = await supabase
          .from('training_members' as any)
          .insert({ training_id: training.id, user_id: profile.id, role: memberRole });
        if (error) throw error;
        toast.success(memberRole === 'waitlist' ? "Added to waitlist!" : `Joined ${training.name}! 🎉`);
        navigate('/player');
      } else {
        // Legacy group join
        const { data: existing } = await supabase.from('group_members').select('id, status').eq('group_id', training.id).eq('player_id', profile.id).maybeSingle();
        if (existing) { toast.info("Already in this group"); navigate('/player'); return; }
        const { count: activeCount } = await supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', training.id).eq('status', 'active');
        const isFull = (activeCount ?? 0) >= training.capacity;
        const status = (isFull && training.allow_waitlist) ? 'waitlist' : isFull ? null : 'active';
        if (!status) { toast.error('Group is full'); navigate('/player'); return; }
        await supabase.from('group_members').insert({ group_id: training.id, player_id: profile.id, status });
        toast.success(`Joined ${training.name}! 🎉`);
        navigate('/player');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to join');
      navigate('/player');
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    sessionStorage.setItem('pending_invite', inviteCode ?? '');
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin + '/auth/callback',
    });
    if (error) { toast.error('Sign in failed'); setGoogleLoading(false); }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem('pending_invite', inviteCode ?? '');
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.origin + '/auth/callback' },
    });
    if (error) toast.error(error.message);
    else setEmailSent(true);
  }

  if (trainingLoading || (loading && session)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!training) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="text-5xl mb-3">🔍</div>
        <h2 className="text-xl font-bold text-foreground">Not found</h2>
        <p className="mt-2 text-muted-foreground">This invite link may be expired or invalid.</p>
        <button onClick={() => navigate('/')} className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground min-h-[44px]">Go home</button>
      </div>
    );
  }

  const coach = training.profiles;
  const coachInitials = coach?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? '?';
  const sportIcon = SPORT_ICONS[training.sport] ?? '🎯';

  const TrainingCard = () => (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-4xl">{sportIcon}</span>
        <div>
          <h2 className="text-xl font-bold text-foreground">{training.name}</h2>
          <p className="text-sm text-muted-foreground">{training.sport}</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>{DAYS[(training.day_of_week ?? 0)]}s at {(training.start_time ?? '').slice(0, 5)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>{training.venue ?? training.location}</span>
        </div>
        {training.max_players && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{training.max_players} spots per session</span>
          </div>
        )}
      </div>
    </div>
  );

  // Logged-in view
  if (session && profile?.onboarding_complete) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-center border-b border-border bg-card px-4 py-4">
          <span className="text-lg font-bold tracking-tight text-foreground">sessio</span>
        </header>
        <main className="flex-1 px-4 py-8 max-w-sm mx-auto w-full">
          <TrainingCard />
          <button
            onClick={autoJoin}
            disabled={joining}
            className="mt-6 w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground min-h-[56px] disabled:opacity-60 active:opacity-80 transition-opacity"
          >
            {joining ? 'Joining...' : `Join ${training.name}`}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-center border-b border-border bg-card px-4 py-4">
        <span className="text-lg font-bold tracking-tight text-foreground">sessio</span>
      </header>
      <main className="flex-1 px-4 py-8 space-y-5 max-w-sm mx-auto w-full">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary overflow-hidden">
            {coach?.avatar_url ? <img src={coach.avatar_url} alt="" className="h-full w-full object-cover" /> : coachInitials}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{coach?.full_name ?? 'Your coach'}</span> invited you to join
          </p>
        </div>

        <TrainingCard />

        <p className="text-center text-sm text-muted-foreground">Join in 30 seconds. No app to download.</p>

        {emailSent ? (
          <div className="rounded-2xl bg-success/10 border border-success/20 p-5 text-center">
            <div className="mb-2 text-3xl">📩</div>
            <p className="font-semibold text-foreground">Check your email</p>
            <p className="mt-1 text-sm text-muted-foreground">We sent a magic link to <strong>{email}</strong></p>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground min-h-[56px] disabled:opacity-60 active:opacity-80 transition-opacity"
            >
              {googleLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            {!showEmailForm ? (
              <button
                onClick={() => setShowEmailForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-medium text-foreground min-h-[44px]"
              >
                <Mail className="h-4 w-4" />
                Continue with Email
              </button>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email" required placeholder="your@email.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
                />
                <button type="submit" className="w-full rounded-xl bg-foreground py-3 text-sm font-semibold text-background min-h-[44px]">
                  Send Magic Link
                </button>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
