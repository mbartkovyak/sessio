import { useState } from 'react';
import { Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useMyJoinRequests } from '@/hooks/training/useTrainings';
import { SPORT_ICONS } from '@/lib/constants';

export default function MyJoinRequests() {
  const { data: requests = [] } = useMyJoinRequests();
  const [expanded, setExpanded] = useState(false);

  if (requests.length === 0) return null;

  const visible = expanded ? requests : requests.slice(0, 3);
  const hasMore = requests.length > 3;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Join Requests</h2>
      <div className="space-y-2">
        {visible.map((req: any) => {
          const training = req.trainings;
          const isPending = req.status === 'pending';
          const icon = SPORT_ICONS[training?.sport] ?? '🎯';

          return (
            <div key={req.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xl shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{training?.name ?? 'Training'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isPending ? (
                    <>
                      <Clock className="h-3 w-3 text-warning" />
                      <span className="text-xs font-medium text-warning">Waiting for approval</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 text-destructive" />
                      <span className="text-xs font-medium text-destructive">Request declined</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-2 text-xs font-medium text-primary mx-auto"
        >
          {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show all ({requests.length})</>}
        </button>
      )}
    </div>
  );
}
