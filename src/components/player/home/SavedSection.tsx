import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMyFavouriteSchools, useMyFavouriteCoaches } from '@/hooks/school/useSchools';
import Avatar from '@/components/shared/Avatar';

type Item =
  | { kind: 'school'; id: string; name: string; logo_url: string | null }
  | { kind: 'coach'; id: string; name: string; avatar_url: string | null };

export default function SavedSection() {
  const { t } = useTranslation('player');
  const navigate = useNavigate();
  const { data: schools = [] } = useMyFavouriteSchools();
  const { data: coaches = [] } = useMyFavouriteCoaches();

  const items: Item[] = [
    ...schools
      .filter(f => !!f.school)
      .map(f => ({
        kind: 'school' as const,
        id: f.school!.id,
        name: f.school!.name ?? '',
        logo_url: f.school!.logo_url ?? null,
      })),
    ...coaches
      .filter(f => !!f.coach)
      .map(f => ({
        kind: 'coach' as const,
        id: f.coach!.id,
        name: f.coach!.full_name ?? '',
        avatar_url: f.coach!.avatar_url ?? null,
      })),
  ];

  if (!items.length) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('saved.title')}</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {items.map(item => (
          <button
            key={`${item.kind}-${item.id}`}
            onClick={() => navigate(item.kind === 'school' ? `/s/${item.id}` : `/search/coach/${item.id}`)}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 min-w-[100px] shrink-0 active:bg-secondary/50 shadow-sm"
          >
            <Avatar
              url={item.kind === 'school' ? item.logo_url : item.avatar_url}
              name={item.name}
              size="lg"
            />
            <p className="text-xs font-medium text-foreground text-center truncate w-full">{item.name}</p>
            <p className="text-[10px] text-muted-foreground -mt-1">
              {item.kind === 'school' ? t('saved.school') : t('saved.coach')}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
