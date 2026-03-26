import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const LANG_META: Record<string, { label: string; flag: string }> = {
  en: { label: 'English', flag: '🇬🇧' },
  pl: { label: 'Polski', flag: '🇵🇱' },
  uk: { label: 'Українська', flag: '🇺🇦' },
};

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  function handleChange(lang: string) {
    i18n.changeLanguage(lang);
    localStorage.setItem('sessio_lang', lang);
    // Persist to DB for logged-in users
    if (user) {
      supabase.from('profiles').update({ language: lang }).eq('id', user.id);
    }
  }

  return (
    <div className="relative flex items-center gap-1.5">
      <span className="text-base leading-none">{LANG_META[i18n.language]?.flag}</span>
      <span className="text-sm font-medium text-foreground">{LANG_META[i18n.language]?.label}</span>
      <select
        value={i18n.language}
        onChange={e => handleChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        {SUPPORTED_LANGS.map(lang => (
          <option key={lang} value={lang}>{LANG_META[lang]?.label}</option>
        ))}
      </select>
    </div>
  );
}
