import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  return (
    <footer
      className="relative z-10 border-t border-white/[0.06] px-5 pt-6 text-center text-sm text-white/30"
      style={{ paddingBottom: 'max(24px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 24px)))' }}
    >
      <p>{t('landing.footer.copyright')}</p>
      <div className="mt-2 flex justify-center gap-4">
        <button onClick={() => navigate('/privacy')} className="underline underline-offset-2 hover:text-white/50 transition-colors">
          {t('landing.footer.privacy')}
        </button>
        <button onClick={() => navigate('/terms')} className="underline underline-offset-2 hover:text-white/50 transition-colors">
          {t('landing.footer.terms')}
        </button>
      </div>
    </footer>
  );
}
