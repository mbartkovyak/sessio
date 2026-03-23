import { SPORT_ICONS, DAYS_SHORT } from '@/lib/constants';
import type { ReactNode } from 'react';

export interface TrainingCardProps {
  training: {
    sport?: string;
    name?: string;
    type?: string;
    start_time?: string;
    venue?: string;
    days_of_week?: number[];
    day_of_week?: number;
  };
  onClick?: () => void;
  /** Optional badge or extra content rendered after the name */
  badge?: ReactNode;
  /** Optional content rendered below the meta line */
  extra?: ReactNode;
  /** 'list' = horizontal row (default), 'grid' = stacked layout */
  variant?: 'list' | 'grid';
  className?: string;
}

export default function TrainingCard({
  training,
  onClick,
  badge,
  extra,
  variant = 'list',
  className = '',
}: TrainingCardProps) {
  const icon = SPORT_ICONS[training.sport ?? ''] ?? '🎯';
  const days = (training.days_of_week ?? (training.day_of_week != null ? [training.day_of_week] : []))
    .map((d: number) => DAYS_SHORT[d])
    .filter(Boolean)
    .join(', ');
  const time = training.start_time?.slice(0, 5);
  const meta = [days, time, training.venue].filter(Boolean).join(' \u00B7 ');

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
        <p className="mt-1 text-xs text-muted-foreground">{meta || '\u2014'}</p>
        {extra}
      </Tag>
    );
  }

  return (
    <Tag
      onClick={onClick}
      className={`w-full flex items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm transition-all active:scale-[0.98] ${className}`}
      style={{ border: '1px solid hsl(203 20% 90%)' }}
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground truncate">{training.name}</p>
          {badge}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{meta}</p>
        {extra}
      </div>
    </Tag>
  );
}
