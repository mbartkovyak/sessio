import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en_common from './locales/en/common.json';
import en_auth from './locales/en/auth.json';
import en_player from './locales/en/player.json';
import en_coach from './locales/en/coach.json';
import en_school from './locales/en/school.json';

import pl_common from './locales/pl/common.json';
import pl_auth from './locales/pl/auth.json';
import pl_player from './locales/pl/player.json';
import pl_coach from './locales/pl/coach.json';
import pl_school from './locales/pl/school.json';

import uk_common from './locales/uk/common.json';
import uk_auth from './locales/uk/auth.json';
import uk_player from './locales/uk/player.json';
import uk_coach from './locales/uk/coach.json';
import uk_school from './locales/uk/school.json';

export const SUPPORTED_LANGS = ['en', 'pl', 'uk'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

function detectLanguage(): SupportedLang {
  const cached = localStorage.getItem('sessio_lang');
  if (cached && SUPPORTED_LANGS.includes(cached as SupportedLang)) {
    return cached as SupportedLang;
  }
  const browserLang = navigator.language?.slice(0, 2);
  if (browserLang && SUPPORTED_LANGS.includes(browserLang as SupportedLang)) {
    return browserLang as SupportedLang;
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { common: en_common, auth: en_auth, player: en_player, coach: en_coach, school: en_school },
    pl: { common: pl_common, auth: pl_auth, player: pl_player, coach: pl_coach, school: pl_school },
    uk: { common: uk_common, auth: uk_auth, player: uk_player, coach: uk_coach, school: uk_school },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
