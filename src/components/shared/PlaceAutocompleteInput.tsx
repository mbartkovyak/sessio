import { useEffect, useRef, useState, useCallback } from 'react';
import { CapacitorHttp } from '@capacitor/core';
import { isNative } from '@/lib/platform';
import { openExternal } from '@/components/shared/VenueLink';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// ── Web: Google Maps JS widget ──────────────────────────────────────

let loadPromise: Promise<void> | null = null;
let googleMapsAuthFailed = false;

function loadGoogleMaps(): Promise<void> {
  if (googleMapsAuthFailed) return Promise.reject('Auth failed');
  if ((window as any).google?.maps?.places) return Promise.resolve();
  if (loadPromise) return loadPromise;
  if (!API_KEY) return Promise.reject('No API key');

  (window as any).gm_authFailure = () => { googleMapsAuthFailed = true; };

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

// ── Native: Places REST API via fetch (bypasses origin check) ───────

interface Prediction {
  description: string;
  place_id: string;
}

let sessionToken = crypto.randomUUID();

async function fetchPredictions(input: string): Promise<Prediction[]> {
  if (!API_KEY || input.length < 2) return [];
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json`;
  const params = {
    input,
    types: 'establishment|geocode',
    key: API_KEY,
    sessiontoken: sessionToken,
  };
  try {
    const res = await CapacitorHttp.get({ url, params });
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    if (data.status === 'OK') return data.predictions;
    return [];
  } catch {
    return [];
  }
}

// ── Component ───────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (address: string) => void;
  onPlaceSelect?: (address: string) => void;
  placeholder?: string;
  className?: string;
}

export default function PlaceAutocompleteInput({ value, onChange, onPlaceSelect, placeholder, className }: Props) {
  // Use native REST approach if in Capacitor OR if Google auth failed on web
  const [useRest, setUseRest] = useState(isNative);

  if (useRest || !API_KEY) {
    return <RestAutocomplete value={value} onChange={onChange} onPlaceSelect={onPlaceSelect} placeholder={placeholder} className={className} />;
  }

  return <WebAutocomplete value={value} onChange={onChange} onPlaceSelect={onPlaceSelect} placeholder={placeholder} className={className} onAuthFail={() => setUseRest(true)} />;
}

// ── Web widget version ──────────────────────────────────────────────

function WebAutocomplete({ value, onChange, onPlaceSelect, placeholder, className, onAuthFail }: Props & { onAuthFail: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [local, setLocal] = useState(value);

  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onChangeRef.current = onChange;
  onPlaceSelectRef.current = onPlaceSelect;

  useEffect(() => {
    setLocal(value);
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (googleMapsAuthFailed) { onAuthFail(); return; }
    loadGoogleMaps().then(() => setLoaded(true)).catch(() => onAuthFail());
  }, []);

  // Watch for auth failure after script loads (e.g. when first prediction request fires)
  useEffect(() => {
    const orig = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      googleMapsAuthFailed = true;
      onAuthFail();
    };
    return () => { (window as any).gm_authFailure = orig; };
  }, [onAuthFail]);

  useEffect(() => {
    if (!loaded || !inputRef.current || autocompleteRef.current) return;

    try {
      const ac = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment', 'geocode'],
      });

      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        const addr = place.formatted_address || place.name || '';
        if (addr) {
          setLocal(addr);
          onChangeRef.current(addr);
          onPlaceSelectRef.current?.(addr);
        }
      });

      autocompleteRef.current = ac;

      return () => {
        (window as any).google.maps.event.clearInstanceListeners(ac);
      };
    } catch {
      onAuthFail();
    }
  }, [loaded, onAuthFail]);

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        defaultValue={local}
        onChange={(e) => { setLocal(e.target.value); onChange(e.target.value); }}
        placeholder={placeholder}
        className={className}
      />
      {local && <MapsLink address={local} />}
    </div>
  );
}

// ── REST API version (Capacitor + fallback) ─────────────────────────

function RestAutocomplete({ value, onChange, onPlaceSelect, placeholder, className }: Props) {
  const [local, setLocal] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocal(value); }, [value]);

  // Close dropdown on outside tap
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocal(val);
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) { setPredictions([]); setShowDropdown(false); return; }

    debounceRef.current = setTimeout(async () => {
      const results = await fetchPredictions(val);
      setPredictions(results);
      setShowDropdown(results.length > 0);
    }, 300);
  }, [onChange]);

  function selectPrediction(p: Prediction) {
    setLocal(p.description);
    onChange(p.description);
    onPlaceSelect?.(p.description);
    setPredictions([]);
    setShowDropdown(false);
    // Reset session token after selection (Google best practice for billing)
    sessionToken = crypto.randomUUID();
  }

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <input
        value={local}
        onChange={handleInput}
        onFocus={() => { if (predictions.length > 0) setShowDropdown(true); }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {showDropdown && predictions.length > 0 && (
        <ul className="absolute z-[10000] left-0 right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {predictions.map((p) => (
            <li
              key={p.place_id}
              className="px-3 py-2.5 text-sm cursor-pointer hover:bg-muted active:bg-muted/80 border-b border-border last:border-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectPrediction(p)}
            >
              {p.description}
            </li>
          ))}
        </ul>
      )}
      {local && <MapsLink address={local} />}
    </div>
  );
}

// ── Shared ───────────────────────────────────────────────────────────

function MapsLink({ address }: { address: string }) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => openExternal(e, url)}
      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
    >
      View on Maps ↗
    </a>
  );
}
