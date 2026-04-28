import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import AppHeader from '@/components/shared/AppHeader';
import UpcomingSessionsCalendar from '@/components/shared/UpcomingSessionsCalendar';
import { useCoachUpcomingSessions } from '@/hooks/school/useSchools';
import { supabase } from '@/integrations/supabase/client';

export default function CoachSchedule() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('player');

  const { data: profile } = useQuery({
    queryKey: ['profile-name', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', id!).maybeSingle();
      return data;
    },
  });
  const { data: sessions = [], isLoading } = useCoachUpcomingSessions(id);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader
        title={profile?.full_name ?? t('coachProfile.title')}
        subtitle={t('schedule.subtitle')}
        back
      />
      <main className="flex-1 pb-6">
        <div className="max-w-md mx-auto px-4 py-4 space-y-1">
          <UpcomingSessionsCalendar
            sessions={sessions}
            isLoading={isLoading}
            emptyState={
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">{t('coachProfile.noUpcomingSessions')}</p>
              </div>
            }
          />
        </div>
      </main>
    </div>
  );
}
