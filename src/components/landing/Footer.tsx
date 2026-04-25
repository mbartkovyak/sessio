import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  return (
    <footer
      className="relative z-10 bg-[#141414] px-5 pt-3 text-center text-sm text-white/40"
      style={{ paddingBottom: 'max(24px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 24px)))' }}
    >
      {/* Ambient orange halo anchored to the very bottom of the page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[520px]"
        style={{
          background:
            'radial-gradient(ellipse 60% 70% at 50% 100%, rgba(249,133,16,0.26) 0%, rgba(249,133,16,0.06) 40%, transparent 75%)',
        }}
      />
      <div className="relative">
        <p>{t('landing.footer.copyright')}</p>
        <div className="mt-2 flex justify-center gap-4">
          <button onClick={() => navigate('/privacy')} className="underline underline-offset-2 hover:text-white/70 transition-colors">
            {t('landing.footer.privacy')}
          </button>
          <button onClick={() => navigate('/terms')} className="underline underline-offset-2 hover:text-white/70 transition-colors">
            {t('landing.footer.terms')}
          </button>
        </div>
      </div>
    </footer>
  );
}
