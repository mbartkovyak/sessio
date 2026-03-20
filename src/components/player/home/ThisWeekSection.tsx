import { relativeTime } from './relativeTime';

export default function ThisWeekSection({ confirmedSessions }: { confirmedSessions: any[] }) {
  if (confirmedSessions.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">This Week</h2>
      <div className="card-elevated rounded-xl divide-y divide-border">
        {confirmedSessions.slice(0, 5).map((a: any) => {
          const session = a.training_sessions;
          const training = session?.trainings;
          return (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="h-2 w-2 rounded-full shrink-0 bg-success" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{training?.name}</p>
                <p className="text-xs text-muted-foreground">{relativeTime(session?.session_date, session?.start_time)}</p>
              </div>
              <span className="text-xs text-success font-semibold bg-success/8 px-2 py-0.5 rounded-full">Confirmed</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
