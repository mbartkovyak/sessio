import { useState } from 'react';
import { CheckCircle2, XCircle, Users } from 'lucide-react';
import { useUpsertAttendance } from '@/hooks/training/useTrainings';
import { toast } from 'sonner';
import { SPORT_ICONS } from '@/lib/constants';
import { relativeTime } from './relativeTime';
import VenueLink from '@/components/shared/VenueLink';

export default function ConfirmationCard({ attendance }: { attendance: any }) {
  const session = attendance.training_sessions;
  const training = session?.trainings;
  const upsert = useUpsertAttendance();
  const [dismissed, setDismissed] = useState(false);
  const sportIcon = SPORT_ICONS[training?.sport] ?? '🎯';

  if (dismissed || attendance.status !== 'pending') return null;

  async function confirm() {
    await upsert.mutateAsync({ sessionId: attendance.session_id, status: 'confirmed' });
    setDismissed(true);
    toast.success("You're in! 🎉");
  }

  async function decline() {
    await upsert.mutateAsync({ sessionId: attendance.session_id, status: 'declined' });
    setDismissed(true);
    toast.success("Marked as can't make it");
  }

  return (
    <div className="card-elevated-lg rounded-2xl p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-2xl">
          {sportIcon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-base leading-tight">{training?.name}</h3>
          <p className="text-sm font-semibold text-primary mt-0.5">
            {relativeTime(session?.session_date, session?.start_time)}
          </p>
        </div>
      </div>
      <div className="mb-4 space-y-1.5 pl-0.5">
        {training?.venue && (
          <div className="text-sm">
            <VenueLink venue={training.venue} className="text-muted-foreground" />
          </div>
        )}
        {training?.coach?.full_name && (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            {training.coach.full_name}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={confirm}
          disabled={upsert.isPending}
          className="flex items-center justify-center gap-2 rounded-xl bg-success py-3.5 text-sm font-bold text-success-foreground min-h-[48px] active:scale-[0.97] transition-transform disabled:opacity-60"
        >
          <CheckCircle2 className="h-4.5 w-4.5" />
          I'm coming
        </button>
        <button
          onClick={decline}
          disabled={upsert.isPending}
          className="flex items-center justify-center gap-2 rounded-xl border border-destructive/25 bg-destructive/8 py-3.5 text-sm font-bold text-destructive min-h-[48px] active:scale-[0.97] transition-transform disabled:opacity-60"
        >
          <XCircle className="h-4.5 w-4.5" />
          Can't make it
        </button>
      </div>
    </div>
  );
}
