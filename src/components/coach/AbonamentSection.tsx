import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, UserPlus, X, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import Avatar from '@/components/shared/Avatar';
import PhoneInput, { isValidPhone } from '@/components/shared/PhoneInput';
import {
  useAbonamentTypes,
  useCreateAbonamentType,
  useDeleteAbonamentType,
  useSchoolAbonaments,
  useAssignAbonament,
  useSearchPlayers,
  usePendingPassRequests,
  useRespondPassRequest,
  usePassRecentUsages,
  useUndoDeduction,
  isAbonamentActive,
  daysRemaining,
} from '@/hooks/training/useAbonaments';
import { currencyForCountry } from '@/lib/constants';
import { format } from 'date-fns';
import { getDateLocale } from '@/lib/dateFnsLocale';
import { useCreateStandalonePlaceholder } from '@/hooks/training/useTrainings';

export default function AbonamentSection({ schoolId, schoolCountry }: { schoolId: string; schoolCountry?: string | null }) {
  const { t } = useTranslation('coach');
  const [showForm, setShowForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; full_name: string | null; avatar_url: string | null } | null>(null);
  const [assignTypeId, setAssignTypeId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [name, setName] = useState('');
  const [sessionsCount, setSessions] = useState('');
  const [durationDays, setDuration] = useState('');
  const [price, setPrice] = useState('');

  // Refund chooser sheet
  const [refundPass, setRefundPass] = useState<{ id: string; schoolId: string; playerName: string | null } | null>(null);

  const { data: types = [] } = useAbonamentTypes(schoolId);
  const { data: playerAbonaments = [] } = useSchoolAbonaments(schoolId);
  const { data: searchResults = [] } = useSearchPlayers(playerSearch, schoolId);
  const createType = useCreateAbonamentType();
  const deleteType = useDeleteAbonamentType();
  const assign = useAssignAbonament();
  const createPlaceholder = useCreateStandalonePlaceholder();
  const { data: pendingRequests = [] } = usePendingPassRequests(schoolId);
  const respondRequest = useRespondPassRequest();

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
        currency: currencyForCountry(schoolCountry),
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
        startDate: assignStartDate,
      },
      {
        onSuccess: () => {
          setAssignTypeId(''); setSelectedPlayer(null); setPlayerSearch('');
          setAssignStartDate(new Date().toISOString().slice(0, 10));
          setShowAssign(false);
        },
      },
    );
  }

  function resetAssign() {
    setShowAssign(false); setAssignTypeId(''); setSelectedPlayer(null); setPlayerSearch('');
    setAssignStartDate(new Date().toISOString().slice(0, 10));
    setShowAddPerson(false); setNewFirstName(''); setNewLastName(''); setNewPhone(''); setNewEmail('');
  }

  function handleCreatePerson() {
    if (!newFirstName.trim()) return;
    createPlaceholder.mutate(
      { firstName: newFirstName.trim(), lastName: newLastName.trim(), schoolId, phone: newPhone.trim() || undefined, email: newEmail.trim() || undefined },
      {
        onSuccess: (id) => {
          const fullName = `${newFirstName.trim()} ${newLastName.trim()}`.trim();
          setSelectedPlayer({ id, full_name: fullName, avatar_url: null });
          setShowAddPerson(false); setNewFirstName(''); setNewLastName(''); setNewPhone(''); setNewEmail('');
        },
      },
    );
  }

  function typeLabel(type: any) {
    const parts: string[] = [];
    if (type.sessions_count) parts.push(t('abonaments.sessionsLabel', { count: type.sessions_count }));
    if (type.duration_days) parts.push(t('abonaments.daysLabel', { count: type.duration_days }));
    if (type.price != null) parts.push(`${type.price} ${type.currency}`);
    return parts.join(' · ');
  }

  function deriveEndDate(startDate?: string | null, durationDays?: number | null) {
    if (!startDate || !durationDays) return null;
    const end = new Date(startDate);
    end.setDate(end.getDate() + durationDays);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  function requestDateLabel(req: any) {
    const startDate = req.activated_at ? new Date(req.activated_at) : null;
    const endDate = req.expires_at ? new Date(req.expires_at) : deriveEndDate(req.activated_at, req.abonament_types?.duration_days);
    const parts: string[] = [];
    if (startDate) parts.push(t('abonaments.startsOn', { date: format(startDate, 'd MMM yyyy') }));
    parts.push(endDate ? t('abonaments.expiresOn', { date: format(endDate, 'd MMM yyyy') }) : t('abonaments.noEndDate'));
    return parts.join(' · ');
  }

  function passEndLabel(pa: any) {
    const endDate = pa.expires_at ? new Date(pa.expires_at) : null;
    return endDate ? t('abonaments.expiresOn', { date: format(endDate, 'd MMM yyyy') }) : t('abonaments.noEndDate');
  }

  function passStatusLabel(pa: any) {
    if (pa.status === 'used_up') return { text: t('abonaments.usedUp'), cls: 'bg-muted text-muted-foreground' };
    if (pa.status === 'expired' || (pa.expires_at && new Date(pa.expires_at) < new Date())) {
      return { text: t('abonaments.expired'), cls: 'bg-destructive/10 text-destructive' };
    }
    const parts: string[] = [];
    if (pa.sessions_remaining != null) parts.push(t('abonaments.remaining', { remaining: pa.sessions_remaining, total: pa.sessions_total }));
    else parts.push(t('abonaments.unlimited'));
    if (pa.expires_at) {
      const days = daysRemaining(pa.expires_at);
      if (days > 0) parts.push(t('abonaments.expiresIn', { days }));
    }
    return { text: parts.join(' · '), cls: 'bg-success/10 text-success' };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground text-sm">{t('abonaments.title')}</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground transition-all active:scale-[0.97]"
          >
            <Plus className="h-3.5 w-3.5" /> {t('abonaments.addType')}
          </button>
        )}
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

      {/* Assign pass button */}
      {types.length > 0 && !showAssign && (
        <button
          onClick={() => setShowAssign(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground min-h-[44px] transition-all active:scale-[0.97]"
        >
          <UserPlus className="h-4 w-4" /> {t('abonaments.assign')}
        </button>
      )}

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
          ) : showAddPerson ? (
            <div className="space-y-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2.5">
              <p className="text-xs text-muted-foreground">{t('detail.addManuallyHint')}</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={newFirstName} onChange={e => setNewFirstName(e.target.value)} placeholder={t('detail.firstName')}
                  className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm" autoFocus required />
                <input type="text" value={newLastName} onChange={e => setNewLastName(e.target.value)} placeholder={t('detail.lastName')}
                  className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm" />
              </div>
              <PhoneInput value={newPhone} onChange={setNewPhone} required />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowAddPerson(false)} className="rounded-lg border border-border py-1.5 text-xs font-medium text-foreground">
                  {t('common:actions.back')}
                </button>
                <button onClick={handleCreatePerson} disabled={!newFirstName.trim() || !isValidPhone(newPhone) || createPlaceholder.isPending}
                  className="rounded-lg bg-primary py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                  {createPlaceholder.isPending ? '...' : t('abonaments.createPerson')}
                </button>
              </div>
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
              {playerSearch.length >= 2 && (
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
                  {/* Add new person option — always shown at bottom of search results */}
                  <button
                    onClick={() => { setShowAddPerson(true); setPlayerSearch(''); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left border-t border-border hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                      <UserPlus className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-primary">{t('abonaments.addNewPerson')}</span>
                  </button>
                </div>
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

          {/* Start date */}
          <div>
            <label className="text-xs text-muted-foreground">{t('abonaments.startDate')}</label>
            <input type="date" value={assignStartDate} onChange={e => setAssignStartDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>

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

      {/* Pending pass requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t('abonaments.pendingRequests')} <span className="font-normal">({pendingRequests.length})</span>
          </h3>
          <div className="rounded-xl border border-warning/30 bg-warning/5 divide-y divide-warning/20">
            {pendingRequests.map((req: any) => (
              <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar url={req.profiles?.avatar_url} name={req.profiles?.full_name} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{req.profiles?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.abonament_types?.name} · {requestDateLabel(req)}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => respondRequest.mutate({ id: req.id, playerId: req.player_id, schoolId, abonamentType: req.abonament_types, accept: true })}
                    disabled={respondRequest.isPending}
                    className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {t('abonaments.approve')}
                  </button>
                  <button
                    onClick={() => respondRequest.mutate({ id: req.id, playerId: req.player_id, schoolId, abonamentType: req.abonament_types, accept: false })}
                    disabled={respondRequest.isPending}
                    className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-50"
                  >
                    {t('abonaments.decline')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All passes (excluding pending — shown above) */}
      {playerAbonaments.filter((pa: any) => pa.status !== 'pending').length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t('abonaments.activePasses')} <span className="font-normal">({playerAbonaments.filter((pa: any) => pa.status !== 'pending').length})</span>
          </h3>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {playerAbonaments.filter((pa: any) => pa.status !== 'pending').map((pa: any) => {
              const s = passStatusLabel(pa);
              const canRefund = pa.sessions_total != null && pa.sessions_remaining != null && pa.sessions_remaining < pa.sessions_total;
              return (
                <div key={pa.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar url={pa.profiles?.avatar_url} name={pa.profiles?.full_name} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{pa.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pa.abonament_types?.name} · {passEndLabel(pa)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>
                  {canRefund && (
                    <button
                      onClick={() => setRefundPass({ id: pa.id, schoolId, playerName: pa.profiles?.full_name ?? null })}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/40 hover:bg-accent text-foreground transition-colors shrink-0"
                      aria-label={t('abonaments.refundEntry')}
                      title={t('abonaments.refundEntry')}
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {refundPass && (
        <RefundSheet
          passId={refundPass.id}
          schoolId={refundPass.schoolId}
          playerName={refundPass.playerName}
          onClose={() => setRefundPass(null)}
        />
      )}
    </div>
  );
}

function RefundSheet({ passId, schoolId, playerName, onClose }: {
  passId: string;
  schoolId: string;
  playerName: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('coach');
  const { data: usages = [], isLoading } = usePassRecentUsages(passId);
  const undo = useUndoDeduction();

  // Hide already-refunded rows from the list after a successful refund
  const [refundedIds, setRefundedIds] = useState<Set<string>>(new Set());
  const visible = usages.filter(u => !refundedIds.has(u.id));

  function handleRefund(sessionId: string, usageId: string, dateLabel: string) {
    undo.mutate(
      { playerAbonamentId: passId, sessionId, schoolId },
      {
        onSuccess: () => {
          setRefundedIds(prev => new Set(prev).add(usageId));
          toast.success(t('abonaments.refunded', { date: dateLabel }));
        },
      },
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-card shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[80vh]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm">{t('abonaments.refundSheetTitle')}</h3>
            {playerName && <p className="text-xs text-muted-foreground truncate">{playerName}</p>}
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary shrink-0">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <p className="px-4 pb-3 text-xs text-muted-foreground shrink-0">{t('abonaments.refundHint')}</p>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />)}
            </div>
          ) : visible.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('abonaments.noRefundableSessions')}</p>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {visible.map(u => {
                const ts = u.training_sessions;
                const dateLabel = ts?.session_date
                  ? format(new Date(ts.session_date + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() })
                  : '';
                const timeLabel = ts?.start_time?.slice(0, 5);
                return (
                  <div key={u.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ts?.trainings?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {dateLabel}{timeLabel && ` · ${timeLabel}`}
                      </p>
                    </div>
                    <button
                      onClick={() => ts?.id && handleRefund(ts.id, u.id, dateLabel)}
                      disabled={undo.isPending || !ts?.id}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground min-h-[32px] disabled:opacity-50 active:scale-[0.97] transition-transform"
                    >
                      {t('abonaments.refundEntry')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
