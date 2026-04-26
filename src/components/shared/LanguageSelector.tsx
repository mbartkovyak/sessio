import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const LANG_META: Record<string, { label: string; flag: string }> = {
  en: { label: 'English', flag: '🇬🇧' },
  pl: { label: 'Polski', flag: '🇵🇱' },
  uk: { label: 'Українська', flag: '🇺🇦' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
};

export default function LanguageSelector({
  compact,
  tone = 'dark',
  compactBare = false,
}: { compact?: boolean; tone?: 'dark' | 'light'; compactBare?: boolean } = {}) {
  const { i18n, t } = useTranslation('common');
  const { user } = useAuth();

  function handleChange(lang: string) {
    i18n.changeLanguage(lang);
    localStorage.setItem('sessio_lang', lang);
    document.documentElement.lang = lang;
    if (user) {
      supabase.from('profiles').update({ language: lang }).eq('id', user.id);
    }
  }

  // Compact: custom button dropdown (no native <select> — iOS overrides styling)
  if (compact) {
    return <CompactDropdown current={i18n.language} onChange={handleChange} tone={tone} bare={compactBare} />;
  }

  // Full: native <select> — fine on light backgrounds
  return (
    <div>
      <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-1.5">
        <Globe className="h-3.5 w-3.5" /> {t('form.language')}
      </label>
      <div className="relative">
        <select
          value={i18n.language}
          onChange={e => handleChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-input bg-background px-4 py-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {SUPPORTED_LANGS.map(lang => (
            <option key={lang} value={lang}>{LANG_META[lang]?.flag} {LANG_META[lang]?.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

function CompactDropdown({
  current,
  onChange,
  tone,
  bare,
}: {
  current: string;
  onChange: (lang: string) => void;
  tone: 'dark' | 'light';
  bare: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const buttonCls =
    bare
      ? (tone === 'light'
          ? 'flex items-center gap-2 bg-transparent px-0 py-0 text-sm text-[#111] transition-colors hover:text-[#111]/70'
          : 'flex items-center gap-2 bg-transparent px-0 py-0 text-sm text-white transition-colors hover:text-white/80')
      : tone === 'light'
      ? 'flex items-center gap-2 rounded-lg border border-[#111]/10 bg-white/70 backdrop-blur-sm px-3 py-1.5 text-sm text-[#111]'
      : 'flex items-center gap-2 rounded-lg border border-white/20 bg-black/30 backdrop-blur-sm px-3 py-1.5 text-sm text-white';

  const chevronCls = bare
    ? (tone === 'light' ? 'h-3.5 w-3.5 text-[#111]/55' : 'h-3.5 w-3.5 text-white/70')
    : (tone === 'light' ? 'h-3.5 w-3.5 text-[#111]/40' : 'h-3.5 w-3.5 text-white/60');

  const panelCls =
    tone === 'light'
      ? 'absolute right-0 top-full mt-1 rounded-lg border border-[#111]/10 bg-white shadow-lg overflow-hidden z-50'
      : 'absolute right-0 top-full mt-1 rounded-lg border border-white/20 bg-black/70 backdrop-blur-md overflow-hidden z-50';

  const itemCls = (active: boolean) =>
    tone === 'light'
      ? `flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#111] hover:bg-[#111]/5 ${active ? 'bg-[#111]/5' : ''}`
      : `flex w-full items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10 ${active ? 'bg-white/10' : ''}`;

  const flagCls =
    bare
      ? 'inline-flex shrink-0 items-center justify-center text-[15px] leading-none [font-family:"Apple_Color_Emoji","Segoe_UI_Emoji","Noto_Color_Emoji",sans-serif]'
      : tone === 'light'
      ? 'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#111]/5 text-[14px] leading-none [font-family:"Apple_Color_Emoji","Segoe_UI_Emoji","Noto_Color_Emoji",sans-serif]'
      : 'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[14px] leading-none [font-family:"Apple_Color_Emoji","Segoe_UI_Emoji","Noto_Color_Emoji",sans-serif]';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={buttonCls}
      >
        <span className={flagCls} aria-hidden="true">{LANG_META[current]?.flag}</span>
        <span className="font-medium">{LANG_META[current]?.label}</span>
        <ChevronDown className={chevronCls} />
      </button>
      {open && (
        <div className={panelCls}>
          {SUPPORTED_LANGS.map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => { onChange(lang); setOpen(false); }}
              className={itemCls(lang === current)}
            >
              <span className={flagCls} aria-hidden="true">{LANG_META[lang]?.flag}</span>
              <span>{LANG_META[lang]?.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
