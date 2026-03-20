import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string | undefined | null): string {
  return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';
}
