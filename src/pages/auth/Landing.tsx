import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { SessioLogo } from '@/components/SessioLogo';

const features = [
  {
    emoji: '📬',
    title: 'Instant Confirmations',
    desc: 'Athletes get a heads-up before each training and confirm with one tap. No follow-up, no guessing who shows up.',
  },
  {
    emoji: '🔁',
    title: 'Smart Waitlist',
    desc: 'Someone cancels? The next athlete on the waitlist gets the spot automatically — zero effort from you.',
  },
  {
    emoji: '📋',
    title: 'Full Visibility',
    desc: 'See who\'s confirmed, who\'s out, and how full each training is — from one screen, before you even leave home.',
  },
];

const steps = [
  { n: '1', title: 'Create your trainings', desc: 'Set up recurring trainings with sport, time, location and capacity. Takes two minutes.' },
  { n: '2', title: 'Invite your athletes', desc: 'Share a join code. Your existing athletes sign up in seconds — they don\'t need an account first.' },
  { n: '3', title: 'Show up and coach', desc: 'Confirmations, reminders and waitlist backfill run automatically. Your job is just to coach.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!profile) return;
    if (!profile.onboarding_complete) {
      navigate('/onboarding', { replace: true });
    } else {
      const home = profile.role === 'school_owner' ? '/school' : profile.role === 'coach' ? '/coach' : '/player';
      navigate(home, { replace: true });
    }
  }, [loading, profile, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-5 py-4 md:px-8">
        <SessioLogo />
        <button
          onClick={() => navigate('/auth')}
          className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary min-h-[44px]"
        >
          Sign In
        </button>
      </nav>

      {/* Hero */}
      <section className="hero-gradient px-5 py-16 md:px-8 md:py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
            Coach more.<br className="hidden sm:block" /> Coordinate less.
          </h1>
          <p className="mb-10 text-lg text-white/65 md:text-xl max-w-xl mx-auto">
            Sessio automates training confirmations, reminders, and waitlist backfill for sports coaches.
            Your athletes confirm in one tap. You just show up.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate('/auth')}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 min-h-[44px]"
            >
              Join as Coach
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/15 min-h-[44px]"
            >
              Join as Athlete
            </button>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-5 py-14 md:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-foreground">Built for coaches, not spreadsheets</h2>
          <p className="mb-8 text-center text-muted-foreground">Everything you need to run group trainings without the daily back-and-forth.</p>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map(({ emoji, title, desc }) => (
              <div key={title} className="rounded-2xl bg-card p-6 card-shadow-md border border-border/60">
                <div className="mb-3 text-3xl">{emoji}</div>
                <h3 className="mb-2 font-bold text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-secondary/50 px-5 py-14 md:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-foreground">Up and running in minutes</h2>
          <p className="mb-10 text-center text-muted-foreground">Your athletes don't need to download anything first.</p>
          <div className="space-y-6">
            {steps.map(({ n, title, desc }) => (
              <div key={n} className="flex gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {n}
                </div>
                <div className="pt-1">
                  <h3 className="mb-1 font-bold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="hero-gradient px-5 py-14 text-center md:px-8">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-3 text-2xl font-bold text-white">Ready to just coach?</h2>
          <p className="mb-6 text-white/65">No credit card. No migration pain. Bring your existing athletes in minutes.</p>
          <button
            onClick={() => navigate('/auth')}
            className="rounded-xl bg-primary px-8 py-3.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 min-h-[44px]"
          >
            Create my account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-5 py-6 text-center text-sm text-muted-foreground">
        © 2026 Sessio. All rights reserved.
      </footer>
    </div>
  );
}
