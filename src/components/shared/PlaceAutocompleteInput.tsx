import { useEffect, useRef, useState } from 'react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Load Google Maps script once
let loadPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if ((window as any).google?.maps?.places) return Promise.resolve();
  if (loadPromise) return loadPromise;
  if (!API_KEY) return Promise.reject('No API key');
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject('Failed to load Google Maps');
    document.head.appendChild(script);
  });
  return loadPromise;
}

interface Props {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  className?: string;
}

export default function PlaceAutocompleteInput({ value, onChange, placeholder, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  // Track local input value so it's fully controlled
  const [local, setLocal] = useState(value);

  // Sync from parent when value changes externally (e.g. draft restore)
  useEffect(() => {
    setLocal(value);
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (!API_KEY) return;
    loadGoogleMaps().then(() => setLoaded(true)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loaded || !inputRef.current || autocompleteRef.current) return;

    const ac = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      const addr = place.formatted_address || place.name || '';
      if (addr) {
        setLocal(addr);
        onChange(addr);
      }
    });

    autocompleteRef.current = ac;

    return () => {
      (window as any).google.maps.event.clearInstanceListeners(ac);
    };
  }, [loaded]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLocal(e.target.value);
    onChange(e.target.value);
  }

  // No API key → plain controlled input
  if (!API_KEY) {
    return (
      <div className="space-y-1">
        <input
          value={local}
          onChange={handleChange}
          placeholder={placeholder}
          className={className}
        />
        {local.trim().length > 5 && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Verify on Google Maps ↗
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        defaultValue={local}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
      />
      {local && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          View on Maps ↗
        </a>
      )}
    </div>
  );
}
