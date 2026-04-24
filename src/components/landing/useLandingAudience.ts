import { useState, useEffect } from 'react';

export type Audience = 'coach' | 'athlete';

const STORAGE_KEY = 'sessio_landing_audience';

function read(): Audience {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'coach' || stored === 'athlete') return stored;
  } catch {}
  return 'coach';
}

export function useLandingAudience(): [Audience, (a: Audience) => void] {
  const [audience, setAudience] = useState<Audience>(read);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, audience); } catch {}
  }, [audience]);

  return [audience, setAudience];
}
