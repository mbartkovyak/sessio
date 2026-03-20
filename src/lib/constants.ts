export const SPORTS = ['Tennis', 'Swimming', 'Running', 'Fitness', 'Yoga', 'Football', 'Badminton', 'Boxing', 'Other'] as const;

export const CITIES = ['Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk', 'Łódź', 'Katowice', 'Lublin', 'Białystok', 'Szczecin', 'Rzeszów', 'Toruń', 'Bydgoszcz', 'Częstochowa', 'Radom', 'Sosnowiec', 'Kielce', 'Gliwice', 'Olsztyn', 'Bielsko-Biała'] as const;

export const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const SPORT_ICONS: Record<string, string> = {
  Tennis: '🎾', Swimming: '🏊', Running: '🏃', Fitness: '💪',
  Yoga: '🧘', Football: '⚽', Badminton: '🏸', Boxing: '🥊', Other: '🎯',
};
