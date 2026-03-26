export const SPORTS = ['Tennis', 'Swimming', 'Running', 'Fitness', 'Yoga', 'Football', 'Badminton', 'Boxing', 'Other'] as const;

export const CITIES = ['Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk', 'Łódź', 'Katowice', 'Lublin', 'Białystok', 'Szczecin', 'Rzeszów', 'Toruń', 'Bydgoszcz', 'Częstochowa', 'Radom', 'Sosnowiec', 'Kielce', 'Gliwice', 'Olsztyn', 'Bielsko-Biała'] as const;

export const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊', Other: '🎯',
};

import i18n from '@/i18n';

/** Translate a sport key for display. DB stores English key. */
export function sportLabel(sport: string): string {
  return i18n.t(`sports.${sport}`, { ns: 'common', defaultValue: sport });
}

/** Translate a full day name for display. */
export function dayLabel(day: string): string {
  return i18n.t(`days.${day}`, { ns: 'common', defaultValue: day });
}

/** Translate a short day name for display. */
export function dayShortLabel(day: string): string {
  return i18n.t(`daysShort.${day}`, { ns: 'common', defaultValue: day });
}
