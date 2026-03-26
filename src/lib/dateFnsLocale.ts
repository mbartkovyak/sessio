import { enUS, pl, uk } from 'date-fns/locale';
import i18n from '@/i18n';

const localeMap: Record<string, Locale> = {
  en: enUS,
  pl: pl,
  uk: uk,
};

export function getDateLocale(): Locale {
  return localeMap[i18n.language] ?? enUS;
}
