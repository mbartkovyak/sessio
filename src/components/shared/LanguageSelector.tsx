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

  if (compact) {
    return (
      <div className="relative">
        <select
          value={i18n.language}
          onChange={e => handleChange(e.target.value)}
          className="appearance-none rounded-lg border border-white/20 bg-black/30 backdrop-blur-sm pl-3 pr-8 py-1.5 text-sm text-white min-h-[36px]"
        >
          {SUPPORTED_LANGS.map(lang => (
            <option key={lang} value={lang}>{LANG_META[lang]?.flag} {LANG_META[lang]?.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/60" />
      </div>
    );
  }

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
