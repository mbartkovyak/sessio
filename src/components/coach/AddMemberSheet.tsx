import { useState } from 'react';
import { X, UserPlus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Avatar from '@/components/shared/Avatar';

interface Athlete {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface AddMemberSheetProps {
  athletes: Athlete[];
  existingMemberIds: string[];
  onAdd: (userId: string) => void;
  onClose: () => void;
  adding?: boolean;
}

export default function AddMemberSheet({ athletes, existingMemberIds, onAdd, onClose, adding }: AddMemberSheetProps) {
  const { t } = useTranslation('coach');
  const [search, setSearch] = useState('');

  const existingSet = new Set(existingMemberIds);
  const available = athletes.filter(a => !existingSet.has(a.id));
  const filtered = search.trim()
    ? available.filter(a =>
        (a.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (a.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : available;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] flex flex-col rounded-t-2xl bg-card shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="font-semibold text-foreground">{t('detail.addMemberTitle')}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        {available.length > 2 && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('detail.searchAthletes')}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {available.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('detail.noAthletesToAdd')}</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('detail.noAthletesFound')}</p>
          ) : (
            <div className="space-y-1">
              {filtered.map(athlete => (
                <button
                  key={athlete.id}
                  onClick={() => onAdd(athlete.id)}
                  disabled={adding}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-secondary transition-colors disabled:opacity-50 text-left"
                >
                  <Avatar url={athlete.avatar_url} name={athlete.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{athlete.full_name ?? athlete.email ?? t('common:profile.unknown')}</p>
                  </div>
                  <UserPlus className="h-4 w-4 text-primary shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
