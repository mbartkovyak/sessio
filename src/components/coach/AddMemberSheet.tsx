import { useState, useEffect } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Avatar from '@/components/shared/Avatar';

type Athlete = { id: string; full_name: string | null; avatar_url: string | null; email?: string | null; is_placeholder?: boolean };

interface AddMemberSheetProps {
  open: boolean;
  onClose: () => void;
  athletes: Athlete[];
  existingMemberIds: Set<string>;
  onAdd: (athlete: Athlete) => void;
  adding?: boolean;
}

export default function AddMemberSheet({ open, onClose, athletes, existingMemberIds, onAdd, adding }: AddMemberSheetProps) {
  const { t } = useTranslation('coach');
  const [search, setSearch] = useState('');

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const available = athletes.filter(a => !existingMemberIds.has(a.id));
  const filtered = search.trim()
    ? available.filter(a =>
        (a.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (a.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : available;

  function handleClose() {
    setSearch('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-t-2xl bg-card border-t border-border shadow-xl flex flex-col animate-in slide-in-from-bottom duration-200" style={{ maxHeight: '60dvh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h3 className="font-semibold text-foreground text-sm">{t('detail.addMemberTitle')}</h3>
          <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Search — always visible */}
        <div className="px-4 py-2 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('detail.searchAthletes')}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-2">
          {filtered.length === 0 && available.length === 0 && !search.trim() ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('detail.noAthletesToAdd')}</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('detail.noAthletesFound')}</p>
          ) : (
            <div className="space-y-1">
              {filtered.map(a => (
                <button
                  key={a.id}
                  onClick={() => onAdd(a)}
                  disabled={adding}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50 active:bg-muted transition-colors disabled:opacity-50"
                >
                  <Avatar url={a.avatar_url} name={a.full_name} size="sm" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">{a.full_name ?? a.email ?? '—'}</p>
                    {a.is_placeholder && (
                      <span className="text-xs text-muted-foreground">{t('detail.offlineAthlete')}</span>
                    )}
                  </div>
                  <UserPlus className="h-4 w-4 text-primary shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
