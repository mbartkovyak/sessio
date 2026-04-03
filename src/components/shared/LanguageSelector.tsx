import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const LANG_META: Record<string, { label: string; flag: string }> = {
  en: { label: 'English', flag: '🇬🇧' },
  fr: { label: 'Français', flag: '🇫🇷' },
  pl: { label: 'Polski', flag: '🇵🇱' },
  uk: { label: 'Українська', flag: '🇺🇦' },
};

export default function LanguageSelector({ compact }: { compact?: boolean } = {}) {
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
    return <CompactDropdown current={i18n.language} onChange={handleChange} />;
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

function CompactDropdown({ current, onChange }: { current: string; onChange: (lang: string) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  // Position the portal dropdown below the trigger button
  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || dropRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open, updatePos]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 backdrop-blur-sm px-3 py-1.5 text-sm text-white"
      >
        <span>{LANG_META[current]?.flag}</span>
        <span>{LANG_META[current]?.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-white/60" />
      </button>
      {open && createPortal(
        <div
          ref={dropRef}
          className="fixed rounded-lg border border-white/20 bg-neutral-900 overflow-hidden"
          style={{ top: pos.top, right: pos.right, zIndex: 99999 }}
        >
          {SUPPORTED_LANGS.map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => { onChange(lang); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10 ${lang === current ? 'bg-white/10' : ''}`}
            >
              <span>{LANG_META[lang]?.flag}</span>
              <span>{LANG_META[lang]?.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
