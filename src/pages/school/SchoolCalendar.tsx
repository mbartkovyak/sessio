import CoachBottomNav from '@/components/CoachBottomNav';
import { Calendar } from 'lucide-react';

export default function SchoolCalendar() {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <h1 className="text-lg font-bold text-foreground">School Calendar</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 max-w-md mx-auto w-full text-center gap-3">
        <Calendar className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">School calendar coming soon</p>
      </main>
      <CoachBottomNav />
    </div>
  );
}
