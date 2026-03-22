import { useState, useEffect } from 'react';
import { useMySchool, useUpdateSchool } from '@/hooks/school/useSchools';
import { toast } from 'sonner';
import { Plus, Trash2, MapPin } from 'lucide-react';
import CoachBottomNav from '@/components/coach/CoachBottomNav';
import { SPORTS, CITIES } from '@/lib/constants';
import SelectField from '@/components/shared/SelectField';
import AccountActions from '@/components/shared/AccountActions';
import PlaceAutocompleteInput from '@/components/shared/PlaceAutocompleteInput';

type Venue = { name: string; address: string };

export default function SchoolProfileEditor() {
  const { data: school, isLoading } = useMySchool();
  const update = useUpdateSchool(school?.id ?? '');

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [sport, setSport] = useState('');
  const [description, setDescription] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');

  useEffect(() => {
    if (school) {
      setName(school.name ?? '');
      setCity(school.city ?? '');
      setSport(school.sport ?? '');
      setDescription(school.description ?? '');
      setVenues(((school as any).venues as Venue[]) ?? []);
    }
  }, [school]);

  function addVenue() {
    if (!newVenueName.trim() || !newVenueAddress.trim()) return;
    setVenues(v => [...v, { name: newVenueName.trim(), address: newVenueAddress.trim() }]);
    setNewVenueName('');
    setNewVenueAddress('');
  }

  function removeVenue(idx: number) {
    const updated = venues.filter((_, i) => i !== idx);
    setVenues(updated);
    // Auto-save immediately so deletion persists
    if (school) {
      update.mutate({ venues: updated });
    }
  }

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
        <SelectField label="City" value={city} onChange={setCity} options={CITIES} placeholder="Select city" />
        <SelectField label="Sport" value={sport} onChange={setSport} options={SPORTS} placeholder="Select sport" />
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
          <textarea
            rows={4}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            value={description} onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* Venues */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Venues</label>
          {venues.length > 0 && (
            <div className="space-y-2 mb-3">
              {venues.map((v, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{v.name}</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate block"
                    >
                      {v.address} ↗
                    </a>
                  </div>
                  <button onClick={() => removeVenue(i)} className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
            <input
              placeholder="Venue name (e.g. Court 3)"
              value={newVenueName}
              onChange={e => setNewVenueName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <PlaceAutocompleteInput
              value={newVenueAddress}
              onChange={setNewVenueAddress}
              placeholder="Full address (e.g. ul. Marszałkowska 12, Warszawa)"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={addVenue}
              disabled={!newVenueName.trim() || !newVenueAddress.trim()}
              className="flex items-center gap-1.5 text-sm font-medium text-primary disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Add venue
            </button>
          </div>
        </div>

        <button
          onClick={() => update.mutate({ name, city, sport, description, venues })}
          disabled={update.isPending}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {update.isPending ? 'Saving...' : 'Save Changes'}
        </button>

        <AccountActions />
      </main>
      <CoachBottomNav />
    </div>
  );
}
