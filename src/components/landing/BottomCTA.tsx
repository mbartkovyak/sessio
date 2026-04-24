import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Audience } from './useLandingAudience';

export default function BottomCTA({ audience }: { audience: Audience }) {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const { profile } = useAuth();

  const signedIn = !!profile;
  const appHome = profile?.role === 'player' ? '/player' : '/coach';
  const href = signedIn ? appHome : '/auth/sign-up';
  const label = signedIn
    ? t('landing.nav.openApp')
    : t(`landing.bottomCta.${audience}.button`);

  return (
    <section className="relative z-10 px-5 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-3xl">
        <div className="relative overflow-hidden rounded-3xl border border-[#111]/8 bg-white px-6 py-14 text-center shadow-[0_20px_60px_-30px_rgba(0,0,0,0.15)] md:px-14 md:py-20">
          {/* Ambient glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(230,120,30,0.14) 0%, transparent 70%)',
            }}
          />

          <div className="relative">
            <h2 className="mx-auto mb-4 max-w-xl text-3xl font-bold leading-tight tracking-[-0.02em] text-[#111] md:text-[2.25rem]">
              {t(`landing.bottomCta.${audience}.title`)}
            </h2>
            <p className="mx-auto mb-8 max-w-md text-base text-[#111]/55 md:text-lg">
              {t(`landing.bottomCta.${audience}.sub`)}
            </p>
            <button
              onClick={() => navigate(href)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-3.5 text-base font-semibold text-white shadow-[0_4px_24px_rgba(230,120,30,0.35)] transition-all hover:brightness-110 hover:shadow-[0_6px_40px_rgba(230,120,30,0.5)] active:scale-[0.98] min-h-[48px]"
            >
              {label}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
