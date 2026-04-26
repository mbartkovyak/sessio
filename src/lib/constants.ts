export const SPORTS = ['Tennis', 'Swimming', 'Running', 'Fitness', 'Yoga', 'Football', 'Badminton', 'Boxing', 'Other'] as const;

/** iOS App Store link for the Sessio mobile app. Update here if the listing changes. */
export const APP_STORE_URL = 'https://apps.apple.com/fr/app/sessio/id6761731307?l=en-GB';


export const COUNTRIES = ['US', 'Poland', 'Ukraine'] as const;
export type Country = typeof COUNTRIES[number];

export const COUNTRY_CURRENCY: Record<Country, string> = {
  US: 'USD',
  Poland: 'PLN',
  Ukraine: 'UAH',
};

/** Get currency code for a country. Returns empty string if unknown. */
export function currencyForCountry(country: string | null | undefined): string {
  if (!country) return '';
  return COUNTRY_CURRENCY[country as Country] ?? '';
}

export const CITIES_BY_COUNTRY: Record<Country, readonly string[]> = {
  US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin', 'Jacksonville', 'San Jose', 'Fort Worth', 'Columbus', 'Charlotte', 'Indianapolis', 'San Francisco', 'Seattle', 'Denver', 'Nashville', 'Washington DC', 'Oklahoma City', 'Boston', 'Portland', 'Miami'],
  Poland: ['Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk', 'Łódź', 'Katowice', 'Lublin', 'Białystok', 'Szczecin', 'Rzeszów', 'Toruń', 'Bydgoszcz', 'Częstochowa', 'Radom', 'Sosnowiec', 'Kielce', 'Gliwice', 'Olsztyn', 'Bielsko-Biała', 'Gdynia', 'Opole', 'Zielona Góra', 'Tychy', 'Gorzów Wielkopolski'],
  Ukraine: ['Київ', 'Харків', 'Одеса', 'Дніпро', 'Донецьк', 'Запоріжжя', 'Львів', 'Кривий Ріг', 'Миколаїв', 'Маріуполь', 'Вінниця', 'Херсон', 'Полтава', 'Чернігів', 'Черкаси', 'Житомир', 'Суми', 'Рівне', 'Івано-Франківськ', 'Тернопіль', 'Луцьк', 'Хмельницький', 'Ужгород', 'Чернівці', 'Кропивницький'],
};

export const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊', Other: '🎯',
};

import i18n from '@/i18n';

/** Translate a country key for display. DB stores English key. */
export function countryLabel(country: string): string {
  return i18n.t(`countries.${country}`, { ns: 'common', defaultValue: country });
}

/** Translate a sport key for display. DB stores English key. */
export function sportLabel(sport: string): string {
  return i18n.t(`sports.${sport}`, { ns: 'common', defaultValue: sport });
}

/** Translate an array of sport keys, joined with " · ". */
export function sportLabels(sports: string[] | null | undefined): string {
  if (!sports || sports.length === 0) return '';
  return sports.map(sportLabel).join(' · ');
}

/** Translate a full day name for display. */
export function dayLabel(day: string): string {
  return i18n.t(`days.${day}`, { ns: 'common', defaultValue: day });
}

/** Translate a short day name for display. */
export function dayShortLabel(day: string): string {
  return i18n.t(`daysShort.${day}`, { ns: 'common', defaultValue: day });
}
