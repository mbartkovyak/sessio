import { useTranslation } from 'react-i18next';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { Calendar } from 'lucide-react';

export default function SchoolCalendar() {
  const { t } = useTranslation('school');
  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="safe-area-top sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <h1 className="text-lg font-bold text-foreground">{t('calendar.title')}</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 max-w-md mx-auto w-full text-center gap-3">
        <Calendar className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{t('calendar.comingSoon')}</p>
      </main>
      <CoachBottomNav />
    </div>
  );
}
