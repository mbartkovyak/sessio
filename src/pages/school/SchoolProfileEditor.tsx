import { useState } from 'react';
import { useMySchool, useUpdateSchool } from '@/hooks/school/useSchools';
import CoachBottomNav from '@/components/coach/CoachBottomNav';

export default function SchoolProfileEditor() {
  const { data: school, isLoading } = useMySchool();
  const update = useUpdateSchool(school?.id ?? '');

  const [name, setName] = useState(school?.name ?? '');
  const [city, setCity] = useState(school?.city ?? '');
  const [sport, setSport] = useState(school?.sport ?? '');
  const [description, setDescription] = useState(school?.description ?? '');

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-4">
        <h1 className="text-lg font-bold text-foreground">School Profile</h1>
      </header>
      <main className="flex-1 px-4 py-6 max-w-md mx-auto w-full space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">School Name</label>
          <input
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={name} onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">City</label>
          <input
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={city} onChange={e => setCity(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Sport</label>
          <input
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={sport} onChange={e => setSport(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
          <textarea
            rows={4}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            value={description} onChange={e => setDescription(e.target.value)}
          />
        </div>
        <button
          onClick={() => update.mutate({ name, city, sport, description })}
          disabled={update.isPending}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {update.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </main>
      <CoachBottomNav />
    </div>
  );
}
