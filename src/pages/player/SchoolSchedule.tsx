import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import AppHeader from '@/components/shared/AppHeader';
import UpcomingSessionsCalendar from '@/components/shared/UpcomingSessionsCalendar';
import { useSchool, useSchoolUpcomingSessions } from '@/hooks/school/useSchools';

export default function SchoolSchedule() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('player');

  const { data: school } = useSchool(id);
  const { data: sessions = [], isLoading } = useSchoolUpcomingSessions(school?.id);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader
        title={school?.name ?? t('schoolProfile.title')}
        subtitle={t('schedule.subtitle')}
        back
      />
      <main className="flex-1 pb-6">
        <div className="max-w-md mx-auto px-4 py-4 space-y-1">
          <UpcomingSessionsCalendar
            sessions={sessions}
            isLoading={isLoading}
            showCoach
            emptyState={
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">{t('schoolProfile.noUpcomingSessions')}</p>
              </div>
            }
          />
        </div>
      </main>
    </div>
  );
}
