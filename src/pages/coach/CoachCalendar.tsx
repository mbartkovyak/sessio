import CoachBottomNav from '@/components/CoachBottomNav';
import { useTrainings, useTrainingSessions } from '@/hooks/useTrainings';
import { useState } from 'react';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CoachCalendar() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const { data: trainings = [] } = useTrainings();
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-foreground">Calendar</h1>
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekOffset(v => v - 1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm font-medium min-w-[110px] text-center">{format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}</span>
              <button onClick={() => setWeekOffset(v => v + 1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(day => (
              <div key={day.toISOString()} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{format(day, 'EEE')}</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>{format(day, 'd')}</div>
              </div>
            ))}
          </div>
        </div>
      </header>
      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-4 py-6">
          {trainings.length === 0 ? (
            <div className="text-center py-16"><div className="text-4xl mb-3">📅</div><p className="font-medium text-foreground">No trainings yet</p></div>
          ) : (
            <div className="space-y-3">
              {trainings.map((t: any) => (
                <button key={t.id} onClick={() => navigate(`/coach/trainings/${t.id}`)}
                  className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][t.day_of_week]} · {t.start_time?.slice(0,5)} · {t.venue}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
      <CoachBottomNav />
    </div>
  );
}
