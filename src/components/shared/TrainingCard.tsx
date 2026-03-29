import { MapPin } from 'lucide-react';
import { SPORT_ICONS, DAYS_SHORT, dayShortLabel } from '@/lib/constants';
import type { ReactNode } from 'react';

export interface TrainingCardProps {
  training: {
    sport?: string;
    name?: string;
    type?: string;
    start_time?: string;
    end_time?: string;
    venue?: string;
    days_of_week?: number[];
    day_of_week?: number;
  };
  onClick?: () => void;
  /** Optional badge or extra content rendered after the name */
  badge?: ReactNode;
  /** Optional content rendered below the meta line */
  extra?: ReactNode;
  /** Custom footer replacing the default venue display */
  footer?: ReactNode;
  /** 'list' = horizontal row (default), 'grid' = stacked layout */
  variant?: 'list' | 'grid';
  className?: string;
}

export default function TrainingCard({
  training,
  onClick,
  badge,
  extra,
  footer,
  variant = 'list',
  className = '',
}: TrainingCardProps) {
  const icon = SPORT_ICONS[training.sport ?? ''] ?? '🎯';
  const days = (training.days_of_week ?? (training.day_of_week != null ? [training.day_of_week] : []))
    .map((d: number) => dayShortLabel(DAYS_SHORT[d]))
    .filter(Boolean)
    .join(', ');
  const start = training.start_time?.slice(0, 5);
  const end = training.end_time?.slice(0, 5);
  const timeRange = start && end ? `${start} – ${end}` : start;

  const Tag = onClick ? 'button' : 'div';

  if (variant === 'grid') {
    return (
      <Tag
        onClick={onClick}
        className={`rounded-2xl bg-white p-4 text-left shadow-sm transition-all active:scale-[0.97] ${className}`}
        style={{ border: '1px solid hsl(203 20% 90%)' }}
      >
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-xl">{icon}</span>
          {badge}
        </div>
        <p className="font-semibold text-foreground text-sm leading-tight">{training.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">{[days, timeRange].filter(Boolean).join(' · ')}</p>
        {training.venue && (
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />{training.venue.split(',')[0]}
          </p>
        )}
        {extra}
      </Tag>
    );
  }

  const content = (
    <>
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-foreground truncate">{training.name}</p>
          {badge}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{[days, timeRange].filter(Boolean).join(' · ')}</p>
        {extra}
      </div>
    </>
  );

  // Custom footer with interactive elements — split from clickable area
  if (footer) {
    return (
      <div className={`w-full rounded-xl border border-border bg-card shadow-sm overflow-hidden text-left ${className}`}>
        <Tag
          onClick={onClick}
          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all active:scale-[0.98]"
        >
          {content}
        </Tag>
        {footer}
      </div>
    );
  }

  // No custom footer — entire card (including venue) is clickable
  return (
    <Tag
      onClick={onClick}
      className={`w-full rounded-xl border border-border bg-card shadow-sm overflow-hidden text-left transition-all active:scale-[0.98] ${className}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {content}
      </div>
      {training.venue && (
        <div className="flex items-center gap-1.5 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />{training.venue.split(',')[0]}
        </div>
      )}
    </Tag>
  );
}
