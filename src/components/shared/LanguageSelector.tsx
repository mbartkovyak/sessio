import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { SUPPORTED_LANGS } from '@/i18n';

const LANG_LABELS: Record<string, string> = {
  en: 'English',
  pl: 'Polski',
  uk: 'Українська',
};

export default function LanguageSelector() {
  const { i18n } = useTranslation();

  function handleChange(lang: string) {
    i18n.changeLanguage(lang);
    localStorage.setItem('sessio_lang', lang);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <select
        value={i18n.language}
        onChange={e => handleChange(e.target.value)}
        className="appearance-none bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
      >
        {SUPPORTED_LANGS.map(lang => (
          <option key={lang} value={lang}>{LANG_LABELS[lang]}</option>
        ))}
      </select>
    </div>
  );
}
