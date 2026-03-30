import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import Avatar from '@/components/shared/Avatar';
import {
  useAbonamentTypes,
  useCreateAbonamentType,
  useDeleteAbonamentType,
  useSchoolAbonaments,
  useActivateAbonament,
} from '@/hooks/training/useAbonaments';

export default function AbonamentSection({ schoolId }: { schoolId: string }) {
  const { t } = useTranslation('coach');
  const { data: types = [] } = useAbonamentTypes(schoolId);
  const { data: playerAbonaments = [] } = useSchoolAbonaments(schoolId);
  const createType = useCreateAbonamentType();
  const deleteType = useDeleteAbonamentType();
  const activate = useActivateAbonament();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [sessionsCount, setSessionsCount] = useState('');
  const [price, setPrice] = useState('');

  const pending = playerAbonaments.filter((pa: any) => pa.status === 'pending');
  const active = playerAbonaments.filter((pa: any) => pa.status === 'active' || pa.status === 'used_up');

  function handleCreate() {
    if (!name.trim() || !sessionsCount) return;
    createType.mutate(
      {
        school_id: schoolId,
        name: name.trim(),
        sessions_count: parseInt(sessionsCount),
        price: price ? parseFloat(price) : null,
      },
      {
        onSuccess: () => {
          setName('');
          setSessionsCount('');
          setPrice('');
          setShowForm(false);
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground text-sm">{t('abonaments.title')}</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-medium text-primary"
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
              <label className="text-xs text-muted-foreground">{t('abonaments.sessionsCount')}</label>
              <input
                type="number"
                min="1"
                value={sessionsCount}
                onChange={(e) => setSessionsCount(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('abonaments.price')} {t('abonaments.optional')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="—"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-border py-2 text-sm font-medium text-foreground min-h-[36px]"
            >
              {t('common:actions.cancel')}
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || !sessionsCount || createType.isPending}
              className="rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground min-h-[36px] disabled:opacity-50"
            >
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
                <p className="text-xs text-muted-foreground">
                  {type.sessions_count} {t('abonaments.sessionsCount').toLowerCase()}
                  {type.price != null && ` · ${type.price} ${type.currency}`}
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm(t('abonaments.deleteTypeConfirm'))) {
                    deleteType.mutate({ id: type.id, schoolId });
                  }
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Pending pass requests */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t('abonaments.pendingRequests')} <span className="font-normal">({pending.length})</span>
          </h3>
          <div className="space-y-2">
            {pending.map((pa: any) => (
              <div key={pa.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar url={pa.profiles?.avatar_url} name={pa.profiles?.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{pa.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pa.abonament_types?.name} · {pa.sessions_total} {t('abonaments.sessionsCount').toLowerCase()}
                      {pa.abonament_types?.price != null && ` · ${pa.abonament_types.price} ${pa.abonament_types.currency}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => activate.mutate({ id: pa.id, schoolId })}
                  disabled={activate.isPending}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-success/10 py-2 text-xs font-bold text-success min-h-[36px] disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t('abonaments.activate')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active passes overview */}
      {active.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t('abonaments.activePasses')} <span className="font-normal">({active.length})</span>
          </h3>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {active.map((pa: any) => (
              <div key={pa.id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar url={pa.profiles?.avatar_url} name={pa.profiles?.full_name} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{pa.profiles?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{pa.abonament_types?.name}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  pa.status === 'used_up'
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-success/10 text-success'
                }`}>
                  {pa.status === 'used_up'
                    ? t('abonaments.usedUp')
                    : t('abonaments.remaining', { remaining: pa.sessions_remaining, total: pa.sessions_total })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
