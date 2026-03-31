import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, UserPlus, X } from 'lucide-react';
import Avatar from '@/components/shared/Avatar';
import {
  useAbonamentTypes,
  useCreateAbonamentType,
  useDeleteAbonamentType,
  useSchoolAbonaments,
  useAssignAbonament,
  useSearchPlayers,
  isAbonamentActive,
} from '@/hooks/training/useAbonaments';

export default function AbonamentSection({ schoolId }: { schoolId: string }) {
  const { t } = useTranslation('coach');
  const [showForm, setShowForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; full_name: string | null; avatar_url: string | null } | null>(null);
  const [assignTypeId, setAssignTypeId] = useState('');
  const [name, setName] = useState('');
  const [sessionsCount, setSessions] = useState('');
  const [durationDays, setDuration] = useState('');
  const [price, setPrice] = useState('');

  const { data: types = [] } = useAbonamentTypes(schoolId);
  const { data: playerAbonaments = [] } = useSchoolAbonaments(schoolId);
  const { data: searchResults = [] } = useSearchPlayers(playerSearch, schoolId);
  const createType = useCreateAbonamentType();
  const deleteType = useDeleteAbonamentType();
  const assign = useAssignAbonament();

  const active = playerAbonaments.filter((pa: any) => isAbonamentActive(pa));
  const inactive = playerAbonaments.filter((pa: any) => !isAbonamentActive(pa) && (pa.status === 'used_up' || pa.status === 'expired' || (pa.expires_at && new Date(pa.expires_at) < new Date())));

  const hasLimit = !!sessionsCount || !!durationDays;

  function handleCreate() {
    if (!name.trim() || !hasLimit) return;
    createType.mutate(
      {
        school_id: schoolId,
        name: name.trim(),
        sessions_count: sessionsCount ? parseInt(sessionsCount) : null,
        duration_days: durationDays ? parseInt(durationDays) : null,
        price: price ? parseFloat(price) : null,
      },
      {
        onSuccess: () => {
          setName(''); setSessions(''); setDuration(''); setPrice('');
          setShowForm(false);
        },
      },
    );
  }

  function handleAssign() {
    if (!assignTypeId || !selectedPlayer) return;
    const type = types.find((t: any) => t.id === assignTypeId);
    if (!type) return;
    assign.mutate(
      {
        abonamentTypeId: assignTypeId,
        schoolId,
        playerId: selectedPlayer.id,
        sessionsCount: type.sessions_count,
        durationDays: type.duration_days,
      },
      {
        onSuccess: () => {
          setAssignTypeId(''); setSelectedPlayer(null); setPlayerSearch('');
          setShowAssign(false);
        },
      },
    );
  }

  function resetAssign() {
    setShowAssign(false); setAssignTypeId(''); setSelectedPlayer(null); setPlayerSearch('');
  }

  function typeLabel(type: any) {
    const parts: string[] = [];
    if (type.sessions_count) parts.push(t('abonaments.sessionsLabel', { count: type.sessions_count }));
    if (type.duration_days) parts.push(t('abonaments.daysLabel', { count: type.duration_days }));
    if (type.price != null) parts.push(`${type.price} ${type.currency}`);
    return parts.join(' · ');
  }

  function passStatusLabel(pa: any) {
    if (pa.status === 'used_up') return { text: t('abonaments.usedUp'), cls: 'bg-muted text-muted-foreground' };
    if (pa.status === 'expired' || (pa.expires_at && new Date(pa.expires_at) < new Date())) {
      return { text: t('abonaments.expired'), cls: 'bg-destructive/10 text-destructive' };
    }
    // Active — show remaining info
    const parts: string[] = [];
    if (pa.sessions_remaining != null) parts.push(t('abonaments.remaining', { remaining: pa.sessions_remaining, total: pa.sessions_total }));
    else parts.push(t('abonaments.unlimited'));
    if (pa.expires_at) {
      const days = Math.ceil((new Date(pa.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days > 0) parts.push(t('abonaments.expiresIn', { days }));
    }
    return { text: parts.join(' · '), cls: 'bg-success/10 text-success' };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground text-sm">{t('abonaments.title')}</h2>
        <div className="flex items-center gap-2">
          {types.length > 0 && !showAssign && (
            <button onClick={() => setShowAssign(true)} className="flex items-center gap-1 text-xs font-medium text-primary">
              <UserPlus className="h-3.5 w-3.5" /> {t('abonaments.assign')}
            </button>
          )}
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1 text-xs font-medium text-primary">
              <Plus className="h-3.5 w-3.5" /> {t('abonaments.addType')}
            </button>
          )}
        </div>
      </div>

      {/* Add type form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('abonaments.typeNamePlaceholder')}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">{t('abonaments.sessionsCount')} {t('abonaments.optional')}</label>
              <input type="number" min="1" value={sessionsCount} onChange={(e) => setSessions(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="—" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('abonaments.durationDays')} {t('abonaments.optional')}</label>
              <input type="number" min="1" value={durationDays} onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder={t('abonaments.durationPlaceholder')} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t('abonaments.price')} {t('abonaments.optional')}</label>
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="—" />
          </div>
          {!hasLimit && name.trim() && (
            <p className="text-xs text-warning">{t('abonaments.sessionsOrDuration')}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setShowForm(false); setName(''); setSessions(''); setDuration(''); setPrice(''); }}
              className="rounded-lg border border-border py-2 text-sm font-medium text-foreground min-h-[36px]">
              {t('common:actions.cancel')}
            </button>
            <button onClick={handleCreate} disabled={!name.trim() || !hasLimit || createType.isPending}
              className="rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground min-h-[36px] disabled:opacity-50">
              {t('abonaments.createType')}
            </button>
          </div>
        </div>
      )}

      {/* Pass types list */}
      {types.length === 0 && !showForm ? (
        <p className="text-xs text-muted-foreground">{t('abonaments.noTypes')}</p>
      ) : types.length > 0 ? (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {types.map((type: any) => (
            <div key={type.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">{type.name}</p>
                <p className="text-xs text-muted-foreground">{typeLabel(type)}</p>
              </div>
              <button
                onClick={() => { if (confirm(t('abonaments.deleteTypeConfirm'))) deleteType.mutate({ id: type.id, schoolId }); }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors">
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Assign pass form */}
      {showAssign && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2.5">
          <p className="text-xs font-semibold text-foreground">{t('abonaments.assign')}</p>

          {/* Player search */}
          {selectedPlayer ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <Avatar url={selectedPlayer.avatar_url} name={selectedPlayer.full_name} size="xs" />
              <span className="flex-1 text-sm font-medium text-foreground truncate">{selectedPlayer.full_name}</span>
              <button onClick={() => { setSelectedPlayer(null); setPlayerSearch(''); }} className="text-xs text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder={t('detail.searchAthletes')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                autoFocus
              />
              {playerSearch.length >= 2 && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPlayer(p); setPlayerSearch(''); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
                    >
                      <Avatar url={p.avatar_url} name={p.full_name} size="xs" />
                      <span className="text-sm text-foreground truncate">{p.full_name}</span>
                      {p.is_placeholder && <span className="text-[10px] text-muted-foreground shrink-0">{t('detail.offlineAthlete')}</span>}
                    </button>
                  ))}
                </div>
              )}
              {playerSearch.length >= 2 && searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">{t('detail.noAthletesFound')}</p>
              )}
            </div>
          )}

          {/* Pass type */}
          <select value={assignTypeId} onChange={(e) => setAssignTypeId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">{t('abonaments.selectType')}</option>
            {types.map((type: any) => (
              <option key={type.id} value={type.id}>{type.name} ({typeLabel(type)})</option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={resetAssign}
              className="rounded-lg border border-border py-2 text-sm font-medium text-foreground min-h-[36px]">
              {t('common:actions.cancel')}
            </button>
            <button onClick={handleAssign} disabled={!assignTypeId || !selectedPlayer || assign.isPending}
              className="rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground min-h-[36px] disabled:opacity-50">
              {t('abonaments.assign')}
            </button>
          </div>
        </div>
      )}

      {/* Active passes */}
      {active.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t('abonaments.activePasses')} <span className="font-normal">({active.length})</span>
          </h3>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {active.map((pa: any) => {
              const s = passStatusLabel(pa);
              return (
                <div key={pa.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar url={pa.profiles?.avatar_url} name={pa.profiles?.full_name} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{pa.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{pa.abonament_types?.name}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
