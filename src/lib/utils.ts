import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string | undefined | null): string {
  if (!name?.trim()) return '';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

/** Slugify text for URL paths. Mirrors the PG slugify_text function for live-preview UX.
 *  Latin + Cyrillic UA/RU + Polish/German diacritics. The DB enforces uniqueness — this is preview-only. */
export function slugify(input: string | null | undefined): string {
  if (!input) return '';
  let s = input.toLowerCase();
  // Multi-char Cyrillic
  s = s.replace(/щ/g, 'shch').replace(/ч/g, 'ch').replace(/ш/g, 'sh').replace(/ж/g, 'zh');
  s = s.replace(/х/g, 'kh').replace(/ц/g, 'ts').replace(/ю/g, 'iu').replace(/я/g, 'ia');
  s = s.replace(/є/g, 'ie').replace(/ї/g, 'i').replace(/й/g, 'i');
  // Single-char Cyrillic + diacritics
  const map: Record<string, string> = {
    а:'a',б:'b',в:'v',г:'h',ґ:'g',д:'d',е:'e',з:'z',и:'y',і:'i',к:'k',л:'l',м:'m',н:'n',
    о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',ь:'',ы:'y',э:'e',ё:'e',ъ:'',
    ą:'a',ć:'c',ę:'e',ł:'l',ń:'n',ó:'o',ś:'s',ź:'z',ż:'z',
    ä:'a',ö:'o',ü:'u',č:'c',ď:'d',ě:'e',ň:'n',ř:'r',š:'s',ť:'t',ů:'u',ž:'z',
  };
  s = s.split('').map(ch => map[ch] ?? ch).join('');
  s = s.replace(/ß/g, 'ss');
  // Anything else → hyphens
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (s.length > 50) s = s.slice(0, 50).replace(/-+$/, '');
  return s;
}

/** Normalize a user-entered time string to HH:MM format.
 *  Handles: "9" → "09:00", "9:5" → "09:05", "14:3" → "14:03", "09:00" → "09:00".
 *  Returns null if the input is not a valid time. */
export function normalizeTime(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = match[2] != null ? parseInt(match[2], 10) : 0;
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
