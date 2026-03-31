import { useState } from 'react';
import { X, Search, UserPlus, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Avatar from '@/components/shared/Avatar';

type Athlete = { id: string; full_name: string | null; avatar_url: string | null; email?: string | null; is_placeholder?: boolean };

interface AddMemberSheetProps {
  open: boolean;
  onClose: () => void;
  athletes: Athlete[];
  existingMemberIds: Set<string>;
  onAddExisting: (athlete: Athlete) => void;
  onAddManual: (data: { firstName: string; lastName: string; phone?: string; email?: string }) => void;
  adding?: boolean;
}

export default function AddMemberSheet({ open, onClose, athletes, existingMemberIds, onAddExisting, onAddManual, adding }: AddMemberSheetProps) {
  const { t } = useTranslation('coach');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'search' | 'manual'>('search');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  if (!open) return null;

  const available = athletes.filter(a => !existingMemberIds.has(a.id));
  const filtered = search.trim()
    ? available.filter(a =>
        (a.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (a.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : available;

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return;
    onAddManual({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    });
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setMode('search');
  }

  function handleClose() {
    setSearch('');
    setMode('search');
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-t-2xl bg-card border-t border-border shadow-xl max-h-[75dvh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h3 className="font-semibold text-foreground text-sm">{t('detail.addMemberTitle')}</h3>
          <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {mode === 'search' ? (
          <>
            {/* Search */}
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
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {filtered.length === 0 && available.length === 0 && !search.trim() ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t('detail.noAthletesToAdd')}</p>
              ) : filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t('detail.noAthletesFound')}</p>
              ) : (
                <div className="space-y-1">
                  {filtered.map(a => (
                    <button
                      key={a.id}
                      onClick={() => onAddExisting(a)}
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

            {/* Add manually button */}
            <div className="px-4 py-3 border-t border-border shrink-0">
              <button
                onClick={() => setMode('manual')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <User className="h-4 w-4" />
                {t('detail.addManually')}
              </button>
            </div>
          </>
        ) : (
          /* Manual add form */
          <form onSubmit={handleManualSubmit} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <p className="text-xs text-muted-foreground">{t('detail.addManuallyHint')}</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder={t('detail.firstName')}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
                required
              />
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder={t('detail.lastName')}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder={t('detail.phonePlaceholder')}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('detail.emailPlaceholder')}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMode('search')}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground min-h-[44px]"
              >
                {t('common:actions.back')}
              </button>
              <button
                type="submit"
                disabled={!firstName.trim() || adding}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground min-h-[44px] disabled:opacity-50"
              >
                {adding ? '...' : t('detail.addMember')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
