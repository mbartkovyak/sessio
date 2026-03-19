import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMySchool, useUpdateSchool } from '@/hooks/school/useSchools';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, LogOut, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import CoachBottomNav from '@/components/coach/CoachBottomNav';

const SPORTS = ['Tennis', 'Swimming', 'Running', 'Fitness', 'Yoga', 'Football', 'Badminton', 'Boxing', 'Other'];
const CITIES = ['Warszawa', 'Kraków', 'Wrocław', 'Poznań', 'Gdańsk', 'Łódź', 'Katowice', 'Lublin', 'Białystok', 'Szczecin', 'Rzeszów', 'Toruń', 'Bydgoszcz', 'Częstochowa', 'Radom', 'Sosnowiec', 'Kielce', 'Gliwice', 'Olsztyn', 'Bielsko-Biała'];

export default function SchoolProfileEditor() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: school, isLoading } = useMySchool();
  const update = useUpdateSchool(school?.id ?? '');
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [sport, setSport] = useState('');
  const [description, setDescription] = useState('');

  // Populate form when school data loads
  useEffect(() => {
    if (school) {
      setName(school.name ?? '');
      setCity(school.city ?? '');
      setSport(school.sport ?? '');
      setDescription(school.description ?? '');
    }
  }, [school]);

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
          <div className="relative">
            <select value={city} onChange={e => setCity(e.target.value)}
              className="w-full appearance-none rounded-xl border border-input bg-background px-4 py-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select city</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Sport</label>
          <div className="relative">
            <select value={sport} onChange={e => setSport(e.target.value)}
              className="w-full appearance-none rounded-xl border border-input bg-background px-4 py-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select sport</option>
              {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
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

        <button
          onClick={async () => { await signOut(); navigate('/auth'); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>

        <button
          onClick={async () => {
            if (!confirm('Delete all your data? This cannot be undone.')) return;
            setDeleting(true);
            const { error } = await supabase.rpc('delete_my_account' as any);
            if (error) { toast.error(error.message); setDeleting(false); return; }
            await signOut();
            navigate('/auth');
          }}
          disabled={deleting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 py-3 text-sm font-medium text-destructive disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting…' : 'Delete Account'}
        </button>
      </main>
      <CoachBottomNav />
    </div>
  );
}
