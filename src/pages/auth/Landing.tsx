import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SessioLogo } from '@/components/SessioLogo';
import LanguageSelector from '@/components/shared/LanguageSelector';

export default function Landing() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const { t } = useTranslation('auth');

  useEffect(() => {
    if (loading) return;
    if (!profile) return;
    if (!profile.onboarding_complete) {
      navigate('/onboarding', { replace: true });
    } else {
      navigate(profile.role === 'player' ? '/player' : '/coach', { replace: true });
    }
  }, [loading, profile, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const features = [
    { emoji: '📬', title: t('landing.feature1Title'), desc: t('landing.feature1Desc') },
    { emoji: '🔁', title: t('landing.feature2Title'), desc: t('landing.feature2Desc') },
    { emoji: '📋', title: t('landing.feature3Title'), desc: t('landing.feature3Desc') },
  ];

  const steps = [
    { n: '1', title: t('landing.step1Title'), desc: t('landing.step1Desc') },
    { n: '2', title: t('landing.step2Title'), desc: t('landing.step2Desc') },
    { n: '3', title: t('landing.step3Title'), desc: t('landing.step3Desc') },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="safe-area-top flex items-center justify-between px-5 pt-12 pb-4 md:px-8">
        <SessioLogo />
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <button
            onClick={() => navigate('/auth')}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 min-h-[44px]"
          >
            {t('landing.signInUp')}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-gradient px-5 py-16 md:px-8 md:py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
            {t('landing.heroTitle1')}<br className="hidden sm:block" /> {t('landing.heroTitle2')}
          </h1>
          <p className="mb-10 text-lg text-white/65 md:text-xl max-w-xl mx-auto">
            {t('landing.heroSubtitle')}
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-8 py-3.5 font-semibold text-accent-foreground transition-colors hover:bg-accent/90 min-h-[44px]"
          >
            {t('landing.getStartedFree')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-5 py-14 md:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-foreground">{t('landing.featuresTitle')}</h2>
          <p className="mb-8 text-center text-muted-foreground">{t('landing.featuresSubtitle')}</p>
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
          <h2 className="mb-2 text-center text-2xl font-bold text-foreground">{t('landing.stepsTitle')}</h2>
          <p className="mb-10 text-center text-muted-foreground">{t('landing.stepsSubtitle')}</p>
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
          <h2 className="mb-3 text-2xl font-bold text-white">{t('landing.ctaTitle')}</h2>
          <p className="mb-6 text-white/65">{t('landing.ctaSubtitle')}</p>
          <button
            onClick={() => navigate('/auth')}
            className="rounded-xl bg-accent px-8 py-3.5 font-semibold text-accent-foreground transition-colors hover:bg-accent/90 min-h-[44px]"
          >
            {t('landing.ctaButton')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-5 py-6 text-center text-sm text-muted-foreground">
        {t('landing.footer')}
      </footer>
    </div>
  );
}
