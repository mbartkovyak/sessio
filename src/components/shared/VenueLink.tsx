import { MapPin } from 'lucide-react';

/** Renders venue text as a tappable Google Maps link */
export default function VenueLink({ venue, className = '' }: { venue: string; className?: string }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className={`inline-flex items-center gap-0.5 text-primary hover:underline ${className}`}
    >
      <MapPin className="h-2.5 w-2.5 shrink-0" />{venue}
    </a>
  );
}
