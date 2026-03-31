import { X, Phone, MessageCircle, Ticket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sportLabel } from '@/lib/constants';
import { usePlayerAbonamentHistory, isAbonamentActive } from '@/hooks/training/useAbonaments';
import { format } from 'date-fns';
import { getDateLocale } from '@/lib/dateFnsLocale';
import Avatar from './Avatar';

interface Props {
  profile: {
    id?: string;
    full_name?: string | null;
    avatar_url?: string | null;
    phone?: string | null;
    email?: string | null;
    bio?: string | null;
    sport?: string | null;
    city?: string | null;
    role?: string | null;
  } | null;
  schoolId?: string | null;
  onClose: () => void;
}

export default function ProfileSheet({ profile, schoolId, onClose }: Props) {
  const { t } = useTranslation('common');
  const { data: abonamentHistory = [] } = usePlayerAbonamentHistory(profile?.id, schoolId);

  if (!profile) return null;

  const phone = profile.phone?.replace(/\s/g, '');
  const hasPhone = !!phone;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-md rounded-t-2xl bg-card p-6 pb-8 safe-area-bottom animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <Avatar url={profile.avatar_url} name={profile.full_name} size="2xl" />
          <h2 className="mt-3 text-lg font-bold text-foreground">{profile.full_name ?? t('profile.unknown')}</h2>
          {(profile.sport || profile.city) && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {[profile.sport ? sportLabel(profile.sport) : null, profile.city].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-muted-foreground text-center mb-5">{profile.bio}</p>
        )}

        {/* Abonament info */}
        {abonamentHistory.length > 0 && (
          <div className="mb-5 space-y-3">
            {abonamentHistory.map((pa: any) => {
              const active = isAbonamentActive(pa);
              const isExpired = pa.expires_at && new Date(pa.expires_at) < new Date();
              const statusLabel = pa.status === 'used_up' ? t('profile.passUsedUp')
                : isExpired ? t('profile.passExpired')
                : t('profile.passActive');
              const statusCls = pa.status === 'used_up' ? 'bg-muted text-muted-foreground'
                : isExpired ? 'bg-destructive/10 text-destructive'
                : 'bg-success/10 text-success';

              return (
                <div key={pa.id} className={`rounded-xl border p-3.5 ${active ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'}`}>
                  {/* Pass header */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <Ticket className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{pa.abonament_types?.name}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCls}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* Pass details */}
                  <div className="text-xs text-muted-foreground space-y-0.5 mb-2">
                    {pa.sessions_remaining != null && (
                      <p>{t('profile.passRemaining', { remaining: pa.sessions_remaining, total: pa.sessions_total })}</p>
                    )}
                    {pa.expires_at && (
                      <p>{t('profile.passExpires', { date: format(new Date(pa.expires_at), 'd MMM yyyy', { locale: getDateLocale() }) })}</p>
                    )}
                    <p>{t('profile.passAssigned', { date: format(new Date(pa.activated_at ?? pa.created_at), 'd MMM yyyy', { locale: getDateLocale() }) })}</p>
                  </div>

                  {/* Usage history */}
                  {pa.usage.length > 0 && (
                    <div className="border-t border-border pt-2 mt-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{t('profile.usageHistory')}</p>
                      <div className="space-y-0.5">
                        {pa.usage.slice(0, 10).map((u: any) => (
                          <div key={u.id} className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{u.training_sessions?.trainings?.name ?? '—'}</span>
                            <span>{u.training_sessions?.session_date ? format(new Date(u.training_sessions.session_date + 'T00:00:00'), 'EEE, d MMM', { locale: getDateLocale() }) : '—'}</span>
                          </div>
                        ))}
                        {pa.usage.length > 10 && (
                          <p className="text-[10px] text-muted-foreground">+{pa.usage.length - 10} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Contact actions */}
        <div className="space-y-2">
          {hasPhone && (
            <>
              <a
                href={`tel:${phone}`}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground active:bg-secondary/50 transition-colors"
              >
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{profile.phone}</span>
                <span className="text-xs text-primary">{t('profile.call')}</span>
              </a>
              <a
                href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground active:bg-secondary/50 transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                <span className="flex-1">{t('profile.whatsapp')}</span>
                <span className="text-xs text-primary">{t('profile.open')}</span>
              </a>
            </>
          )}
          {profile.email && (
            <a
              href={`mailto:${profile.email}`}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground active:bg-secondary/50 transition-colors"
            >
              <span className="text-muted-foreground text-sm">@</span>
              <span className="flex-1 truncate">{profile.email}</span>
              <span className="text-xs text-primary">{t('profile.email')}</span>
            </a>
          )}
        </div>

        {!hasPhone && !profile.email && abonamentHistory.length === 0 && (
          <p className="text-sm text-muted-foreground text-center">{t('profile.noContact')}</p>
        )}
      </div>
    </div>
  );
}
