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
};

export default function LanguageSelector({ compact }: { compact?: boolean } = {}) {
  const { i18n, t } = useTranslation('common');
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function handleChange(lang: string) {
    i18n.changeLanguage(lang);
    localStorage.setItem('sessio_lang', lang);
    setOpen(false);
    if (user) {
      supabase.from('profiles').update({ language: lang }).eq('id', user.id);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  if (compact) {
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 backdrop-blur-sm px-3 py-1.5 text-sm text-white"
        >
          <span>{LANG_META[i18n.language]?.flag}</span>
          <span>{LANG_META[i18n.language]?.label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-white/60" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 rounded-lg border border-white/20 bg-black/70 backdrop-blur-md overflow-hidden z-50">
            {SUPPORTED_LANGS.map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => handleChange(lang)}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10 ${lang === i18n.language ? 'bg-white/10' : ''}`}
              >
                <span>{LANG_META[lang]?.flag}</span>
                <span>{LANG_META[lang]?.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <label className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-1.5">
        <Globe className="h-3.5 w-3.5" /> {t('form.language')}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span>{LANG_META[i18n.language]?.flag} {LANG_META[i18n.language]?.label}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-input bg-background shadow-lg overflow-hidden z-50">
          {SUPPORTED_LANGS.map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => handleChange(lang)}
              className={`flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-secondary ${lang === i18n.language ? 'bg-secondary' : ''}`}
            >
              <span>{LANG_META[lang]?.flag}</span>
              <span>{LANG_META[lang]?.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
