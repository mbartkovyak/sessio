import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { MoreVertical, LogOut, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sportLabel } from '@/lib/constants';
import { useLeaveTraining } from '@/hooks/training/useTrainings';
import { useAuth } from '@/contexts/AuthContext';
import ChatView from '@/components/shared/ChatView';
import AppHeader from '@/components/shared/AppHeader';

function useTrainingInfo(id: string | undefined) {
  return useQuery({
    queryKey: ['training-info', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from('trainings')
        .select('name, sport, coach_id, coach:profiles(id, full_name)')
        .eq('id', id!)
        .single();
      return data as any;
    },
  });
}

export default function PlayerChat() {
  const { id } = useParams<{ id: string }>();
  const { data: training } = useTrainingInfo(id);
  const { t } = useTranslation('common');
  const { profile } = useAuth();
  const navigate = useNavigate();
  const leave = useLeaveTraining();
  const [showMenu, setShowMenu] = useState(false);
  const isAthlete = profile?.role === 'player';

  function handleLeave() {
    setShowMenu(false);
    if (!training || !id) return;
    if (!confirm(t('chat.leaveConfirm', { name: training.name }))) return;
    leave.mutate(
      { trainingId: id, coachId: training.coach_id, trainingName: training.name },
      { onSuccess: () => navigate('/player/messages', { replace: true }) },
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      <AppHeader
        title={training?.name ?? t('chat.chatTitle')}
        subtitle={training?.sport ? `${sportLabel(training.sport)} · ${t('chat.group')}` : undefined}
        back
        right={isAthlete ? (
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10">
              <MoreVertical className="h-4.5 w-4.5 text-white/70" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 z-50 w-48 rounded-xl bg-card border border-border shadow-lg py-1 animate-in fade-in zoom-in-95 duration-150">
                  {training?.coach_id && (
                    <button
                      onClick={() => { setShowMenu(false); navigate(`/player/dm/${training.coach_id}`); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <MessageCircle className="h-4 w-4 text-primary" />
                      {t('chat.messageCoach')} {training.coach?.full_name?.split(' ')[0] ?? ''}
                    </button>
                  )}
                  <button
                    onClick={handleLeave}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('chat.leaveTraining')}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : undefined}
      />
      {id && <ChatView trainingId={id} className="flex-1 min-h-0" />}
    </div>
  );
}
