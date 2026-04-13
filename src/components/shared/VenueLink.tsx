import { MapPin } from 'lucide-react';
import { isNative } from '@/lib/platform';

/** On native, opens URL with the OS handler (Maps app, Safari). On web, no-op (browser handles it). */
export function openExternal(e: React.MouseEvent, url: string) {
  if (!isNative) return;
  e.preventDefault();
  window.open(url, '_blank');
}

/** Renders venue text as a tappable Google Maps link */
export default function VenueLink({ venue, className = '' }: { venue: string; className?: string }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => { e.stopPropagation(); openExternal(e, mapsUrl); }}
      className={`inline-flex items-center gap-0.5 text-primary hover:underline ${className}`}
    >
      <MapPin className="h-2.5 w-2.5 shrink-0" />{venue}
    </a>
  );
}
