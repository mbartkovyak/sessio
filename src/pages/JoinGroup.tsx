import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { MapPin, Clock, Users, Mail } from 'lucide-react';
import { toast } from 'sonner';

const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊', Other: '🎯',
};
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function JoinGroup() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<any>(null);
  const [groupLoading, setGroupLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Fetch group details from invite code
  useEffect(() => {
    if (!inviteCode) return;
    supabase
      .from('groups')
      .select(`*, profiles!groups_coach_id_fkey(full_name, avatar_url)`)
      .eq('invite_code', inviteCode.toUpperCase())
      .eq('is_active', true)
      .single()
      .then(({ data }) => {
        setGroup(data);
        setGroupLoading(false);
      });
  }, [inviteCode]);

  // Update page meta for OG previews
  useEffect(() => {
    if (!group) return;
    const coach = group.profiles;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    document.title = `Join ${group.name} on Sessio`;
    const setMeta = (prop: string, content: string, attr = 'property') => {
      let el = document.querySelector(`meta[${attr}="${prop}"]`) as HTMLMetaElement;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, prop); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta('og:title', `Join ${group.name} on Sessio`);
    setMeta('og:description', `${group.sport} · Every ${days[group.day_of_week]} at ${group.start_time?.slice(0,5)} · Coach ${coach?.full_name ?? ''}`);
    setMeta('twitter:title', `Join ${group.name} on Sessio`, 'name');
    setMeta('twitter:description', `${group.sport} · Every ${days[group.day_of_week]} at ${group.start_time?.slice(0,5)} · Coach ${coach?.full_name ?? ''}`, 'name');
    return () => { document.title = 'Sessio — Sports Coaching, Simplified'; };
  }, [group]);
  useEffect(() => {
    if (loading || !session || !profile || !group) return;
    if (!profile.onboarding_complete || !profile.role) {
      // Save invite code so we can auto-join after onboarding
      sessionStorage.setItem('pending_invite', inviteCode ?? '');
      navigate('/onboarding');
      return;
    }
    if (profile.role !== 'player') {
      // Coach trying to join
      navigate('/coach/dashboard');
      return;
    }
    autoJoin();
  }, [loading, session, profile, group]);

  async function autoJoin() {
    if (!group || !profile) return;
    setJoining(true);
    try {
      // Check already member
      const { data: existing } = await supabase
        .from('group_members')
        .select('id, status')
        .eq('group_id', group.id)
        .eq('player_id', profile.id)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'waitlist') {
          toast.info("You're on the waitlist for this group");
        } else {
          toast.info("You're already in this group");
        }
        navigate('/player/dashboard');
        return;
      }

      // Count active
      const { count: activeCount } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id)
        .eq('status', 'active');

      const isFull = (activeCount ?? 0) >= group.capacity;
      if (isFull && !group.allow_waitlist) {
        toast.error('This group is full and has no waitlist');
        navigate('/player/dashboard');
        return;
      }

      const status = isFull ? 'waitlist' : 'active';
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, player_id: profile.id, status });

      if (error) throw error;

      if (status === 'waitlist') {
        toast.success("You've been added to the waitlist!");
      } else {
        toast.success(`You've joined ${group.name}! 🎉`);
      }
      navigate('/player/dashboard');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to join group');
      navigate('/player/dashboard');
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    sessionStorage.setItem('pending_invite', inviteCode ?? '');
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin + '/auth/callback',
    });
    if (error) {
      toast.error('Failed to start Google sign in');
      setGoogleLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem('pending_invite', inviteCode ?? '');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/auth/callback' },
    });
    if (error) {
      toast.error(error.message);
    } else {
      setEmailSent(true);
    }
  }

  if (groupLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mb-3 text-5xl">🔍</div>
        <h2 className="text-xl font-bold text-foreground">Group not found</h2>
        <p className="mt-2 text-muted-foreground">This invite link may be expired or invalid.</p>
        <button onClick={() => navigate('/')} className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground min-h-[44px]">
          Go home
        </button>
      </div>
    );
  }

  const sportIcon = SPORT_ICONS[group.sport] ?? '🎯';
  const coach = group.profiles;
  const coachInitials = coach?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) ?? '?';

  // Logged-in view: one-tap join
  if (session && profile?.onboarding_complete) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-center border-b border-border bg-card px-4 py-4">
          <span className="text-lg font-bold tracking-tight text-foreground">sessio</span>
        </header>
        <main className="flex-1 px-4 py-8">
          <GroupDetailsCard group={group} sportIcon={sportIcon} coachInitials={coachInitials} />
          <button
            onClick={autoJoin}
            disabled={joining}
            className="mt-6 w-full rounded-2xl bg-primary py-4 text-center text-lg font-bold text-primary-foreground min-h-[56px] disabled:opacity-60 transition-opacity active:opacity-80"
          >
            {joining ? 'Joining...' : `Join ${group.name}`}
          </button>
        </main>
      </div>
    );
  }

  // Guest view: auth then join
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-center border-b border-border bg-card px-4 py-4">
        <span className="text-lg font-bold tracking-tight text-foreground">sessio</span>
      </header>

      <main className="flex-1 px-4 py-8 space-y-6">
        {/* Coach invite */}
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {coach?.avatar_url
              ? <img src={coach.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
              : coachInitials}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{coach?.full_name ?? 'Your coach'}</span> invited you to join
          </p>
        </div>

        <GroupDetailsCard group={group} sportIcon={sportIcon} coachInitials={coachInitials} />

        <p className="text-center text-sm text-muted-foreground">
          Join in 30 seconds. No app to download.
        </p>

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
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-medium text-foreground min-h-[44px] hover:bg-secondary transition-colors"
              >
                <Mail className="h-4 w-4" />
                Continue with Email
              </button>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-foreground py-3 text-sm font-semibold text-background min-h-[44px]"
                >
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

function GroupDetailsCard({ group, sportIcon, coachInitials }: { group: any; sportIcon: string; coachInitials: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 card-shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-4xl">{sportIcon}</span>
        <div>
          <h2 className="text-xl font-bold text-foreground">{group.name}</h2>
          <p className="text-sm text-muted-foreground">{group.sport} · {group.level}</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>{DAYS[group.day_of_week]}s at {group.start_time?.slice(0, 5)} – {group.end_time?.slice(0, 5)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>{group.location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>{group.capacity} spots per session</span>
        </div>
      </div>
    </div>
  );
}
