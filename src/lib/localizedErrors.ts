import i18n from '@/i18n';
import { resolveSupportedLanguage } from '@/lib/notificationI18n';

export function localizeErrorMessage(error: unknown, fallbackMessage: string) {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : '';

  // Callers can opt the message in for any language by setting __localized=true
  // on the thrown Error (e.g. SESSION_FULL in useUpsertAttendance, which calls
  // i18n.t() to produce a UK/PL/DE string and must not be swallowed).
  if (error && typeof error === 'object' && (error as { __localized?: boolean }).__localized) {
    return message || fallbackMessage;
  }

  const language = resolveSupportedLanguage(i18n.resolvedLanguage ?? i18n.language);
  if (language === 'en' && message) return message;
  return fallbackMessage;
}
