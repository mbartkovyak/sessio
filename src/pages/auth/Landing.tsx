import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Clock, Users, CalendarCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SessioLogo, SessioLoader } from '@/components/SessioLogo';
import LanguageSelector from '@/components/shared/LanguageSelector';

export default function Landing() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();
  const { t } = useTranslation('auth');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <SessioLoader />
      </div>
    );
  }

  if (profile) {
    const target = !profile.onboarding_complete ? '/onboarding'
      : profile.role === 'player' ? '/player' : '/coach';
    return <Navigate to={target} replace />;
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (isStandalone) return <Navigate to="/auth" replace />;

  const features = [
    { icon: Clock, title: t('landing.feature1Title'), desc: t('landing.feature1Desc') },
    { icon: Users, title: t('landing.feature2Title'), desc: t('landing.feature2Desc') },
    { icon: CalendarCheck, title: t('landing.feature3Title'), desc: t('landing.feature3Desc') },
  ];

  const steps = [
    { n: '1', title: t('landing.step1Title'), desc: t('landing.step1Desc') },
    { n: '2', title: t('landing.step2Title'), desc: t('landing.step2Desc') },
    { n: '3', title: t('landing.step3Title'), desc: t('landing.step3Desc') },
  ];

  return (
    <div className="min-h-screen bg-[#111]">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-5 py-4 md:px-10 max-w-5xl mx-auto">
        <SessioLogo />
        <div className="flex items-center gap-3">
          <LanguageSelector compact />
          <button
            onClick={() => navigate('/auth')}
            className="rounded-full bg-white/10 backdrop-blur-sm border border-white/15 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 min-h-[44px]"
          >
            {t('landing.signInUp')}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-5 pt-12 pb-20 md:px-10 md:pt-20 md:pb-28 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-5 text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-[3.25rem]">
            {t('landing.heroTitle1')}<br className="hidden sm:block" /> {t('landing.heroTitle2')}
          </h1>
          <p className="mb-10 text-base text-white/50 md:text-lg max-w-lg mx-auto leading-relaxed">
            {t('landing.heroSubtitle')}
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-3.5 text-base font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] min-h-[48px] shadow-[0_0_24px_rgba(230,120,30,0.3)]"
          >
            {t('landing.getStartedFree')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-5 py-16 md:px-10 bg-[#0a0a0a]">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-white">{t('landing.featuresTitle')}</h2>
          <p className="mb-10 text-center text-white/40">{t('landing.featuresSubtitle')}</p>
          <div className="grid gap-5 md:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6 transition-colors hover:bg-white/[0.06]">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="mb-2 font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/45">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-16 md:px-10">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-white">{t('landing.stepsTitle')}</h2>
          <p className="mb-10 text-center text-white/40">{t('landing.stepsSubtitle')}</p>
          <div className="space-y-6">
            {steps.map(({ n, title, desc }, i) => (
              <div key={n} className="flex gap-4 items-start">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                  {n}
                </div>
                <div className="pt-0.5">
                  <h3 className="mb-1 font-semibold text-white">{title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-5 py-16 text-center md:px-10">
        <div className="mx-auto max-w-md rounded-3xl bg-white/[0.04] border border-white/[0.08] px-8 py-10">
          <h2 className="mb-3 text-xl font-bold text-white">{t('landing.ctaTitle')}</h2>
          <p className="mb-6 text-sm text-white/40">{t('landing.ctaSubtitle')}</p>
          <button
            onClick={() => navigate('/auth')}
            className="rounded-full bg-accent px-8 py-3.5 text-base font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] min-h-[48px]"
          >
            {t('landing.ctaButton')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] px-5 py-6 text-center text-sm text-white/30">
        <p>{t('landing.footer')}</p>
        <div className="mt-2 flex justify-center gap-4">
          <button onClick={() => navigate('/privacy')} className="underline underline-offset-2 hover:text-white/50">Privacy</button>
          <button onClick={() => navigate('/terms')} className="underline underline-offset-2 hover:text-white/50">Terms</button>
        </div>
      </footer>
    </div>
  );
}
