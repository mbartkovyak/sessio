import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string | undefined | null): string {
  if (!name?.trim()) return '';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
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
