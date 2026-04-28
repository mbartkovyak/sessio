import { MapPin } from 'lucide-react';
import { openExternal } from '@/components/shared/VenueLink';

export type VenueItem = { name: string; address: string };

interface Props {
  venues: VenueItem[];
}

export default function VenueScroll({ venues }: Props) {
  if (!venues.length) return null;

  return (
    <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
      {venues.map((v, i) => {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address || v.name)}`;
        return (
          <a
            key={`${v.name}-${i}`}
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => openExternal(e, mapsUrl)}
            className="flex shrink-0 w-56 flex-col gap-1 rounded-xl border border-border bg-card p-4 shadow-sm transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-semibold text-foreground truncate">{v.name}</p>
            </div>
            {v.address && (
              <p className="text-xs text-muted-foreground line-clamp-2">{v.address}</p>
            )}
          </a>
        );
      })}
    </div>
  );
}
