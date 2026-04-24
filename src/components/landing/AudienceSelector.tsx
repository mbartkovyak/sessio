import { useTranslation } from 'react-i18next';
import type { Audience } from './useLandingAudience';

export default function AudienceSelector({
  audience,
  onChange,
}: {
  audience: Audience;
  onChange: (a: Audience) => void;
}) {
  const { t } = useTranslation('auth');

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur-sm">
      <Tab active={audience === 'coach'} onClick={() => onChange('coach')}>
        {t('landing.audienceSelector.coach')}
      </Tab>
      <Tab active={audience === 'athlete'} onClick={() => onChange('athlete')}>
        {t('landing.audienceSelector.athlete')}
      </Tab>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-full px-4 py-2 text-sm font-medium transition-all min-h-[40px] ${
        active
          ? 'bg-white text-[#111] shadow-[0_0_20px_rgba(255,255,255,0.15)]'
          : 'text-white/60 hover:text-white/90'
      }`}
    >
      {children}
    </button>
  );
}
