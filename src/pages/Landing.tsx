import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

const features = [
  {
    emoji: '📩',
    title: 'Auto-Confirm',
    desc: 'Players get a notification before each session and confirm with one tap. No chasing.',
  },
  {
    emoji: '🔄',
    title: 'Auto-Backfill',
    desc: 'When someone declines, the next player on the waitlist is instantly notified of the open spot.',
  },
  {
    emoji: '📊',
    title: 'Zero Admin',
    desc: 'See who\'s in, who\'s out, and how full each session is — all in one glance.',
  },
];

const steps = [
  { n: '1', title: 'Create groups', desc: 'Set up your recurring training sessions with sport, time, location and capacity.' },
  { n: '2', title: 'Invite players', desc: 'Share a simple 8-character code. Players join in seconds, no app required.' },
  { n: '3', title: 'Let Sessio handle the rest', desc: 'Automatic confirmations, reminders and waitlist backfill — you just coach.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && profile?.onboarding_complete) {
      navigate(profile.role === 'coach' ? '/coach/dashboard' : '/player/dashboard');
    }
  }, [loading, profile, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-5 py-4 md:px-8">
        <span className="text-xl font-bold tracking-tight text-foreground">sessio</span>
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
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Free for coaches
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
            Stop managing your groups on WhatsApp
          </h1>
          <p className="mb-8 text-lg text-white/60 md:text-xl">
            Automatic session confirmations and backfill for sports coaches.
            Your players confirm with one tap. Empty spots fill themselves.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate('/auth')}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 min-h-[44px]"
            >
              Start as Coach
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/10 min-h-[44px]"
            >
              Join as Player
            </button>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-5 py-14 md:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">Everything you need, nothing you don't</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map(({ emoji, title, desc }) => (
              <div key={title} className="rounded-2xl bg-card p-6 card-shadow-md">
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
          <h2 className="mb-10 text-center text-2xl font-bold text-foreground">How it works</h2>
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
          <h2 className="mb-3 text-2xl font-bold text-white">Get started for free</h2>
          <p className="mb-6 text-white/60">No credit card needed. Set up your first group in 2 minutes.</p>
          <button
            onClick={() => navigate('/auth')}
            className="rounded-xl bg-primary px-8 py-3.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 min-h-[44px]"
          >
            Create my account →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-5 py-6 text-center text-sm text-muted-foreground">
        © 2025 Sessio. All rights reserved.
      </footer>
    </div>
  );
}
