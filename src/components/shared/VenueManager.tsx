import { useState } from 'react';
import { Trash2, MapPin } from 'lucide-react';
import PlaceAutocompleteInput from '@/components/shared/PlaceAutocompleteInput';
import { useTranslation } from 'react-i18next';

export type Venue = { name: string; address: string };

// ── Add form (name + address + save/add button) ─────────────────

interface VenueAddFormProps {
  onSave: (venue: Venue) => void;
  /** Shows "back" link — used in TrainingForm's add-new-venue mode */
  onCancel?: () => void;
  saveLabel?: string;
}

export function VenueAddForm({ onSave, onCancel, saveLabel }: VenueAddFormProps) {
  const { t } = useTranslation('common');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  function handleSave() {
    if (!name.trim() || !address.trim()) return;
    onSave({ name: name.trim(), address: address.trim() });
    setName('');
    setAddress('');
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed p-3" style={{ borderColor: 'rgba(0,0,0,0.2)' }}>
      <input
        placeholder={t('venue.name')}
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <PlaceAutocompleteInput
        value={address}
        onChange={setAddress}
        placeholder={t('venue.address')}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex items-center justify-between">
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">
            {t('venue.backToList')}
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || !address.trim()}
          className={onCancel
            ? 'rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40'
            : 'flex items-center gap-1.5 text-sm font-medium text-primary disabled:opacity-40'
          }
        >
          {onCancel
            ? (saveLabel ?? t('venue.save'))
            : (saveLabel ?? t('venue.add'))
          }
        </button>
      </div>
    </div>
  );
}

// ── Full manager (list + add form) ──────────────────────────────

interface VenueManagerProps {
  venues: Venue[];
  onAdd: (venue: Venue) => void;
  onRemove?: (index: number) => void;
  title?: string;
}

export default function VenueManager({ venues, onAdd, onRemove, title }: VenueManagerProps) {
  return (
    <div>
      {title && <h2 className="font-semibold text-foreground text-sm mb-3">{title}</h2>}
      {venues.length > 0 && (
        <div className="space-y-2 mb-3">
          {venues.map((v, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{v.name}</p>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`}
                  target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
                  {v.address} ↗
                </a>
              </div>
              {onRemove && (
                <button type="button" onClick={() => onRemove(i)} className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <VenueAddForm onSave={onAdd} />
    </div>
  );
}
