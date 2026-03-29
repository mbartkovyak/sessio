import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sportLabel } from '@/lib/constants';
import Avatar from './Avatar';

interface CoachCardProps {
  coach: {
    id: string;
    full_name: string | null;
    avatar_url?: string | null;
    sport?: string | null;
  };
  /** Subtitle override — defaults to sport label */
  subtitle?: string;
  /** Show the DM button on the right (default true) */
  showMessage?: boolean;
}

export default function CoachCard({ coach, subtitle, showMessage = true }: CoachCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <button
        onClick={() => navigate(`/search/coach/${coach.id}`)}
        className="flex flex-1 items-center gap-3 min-w-0 text-left hover:opacity-80 transition-opacity"
      >
        <Avatar url={coach.avatar_url} name={coach.full_name} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{coach.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {subtitle ?? (coach.sport ? sportLabel(coach.sport) : '')}
          </p>
        </div>
      </button>
      {showMessage && (
        <button
          onClick={() => navigate(`/player/dm/${coach.id}`)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
          title={t('chat.messageCoach')}
        >
          <MessageCircle className="h-4 w-4 text-primary" />
        </button>
      )}
    </div>
  );
}
