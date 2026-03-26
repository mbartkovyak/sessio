import i18n from '@/i18n';
import { resolveSupportedLanguage } from '@/lib/notificationI18n';

export function localizeErrorMessage(error: unknown, fallbackMessage: string) {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : '';

  const language = resolveSupportedLanguage(i18n.resolvedLanguage ?? i18n.language);
  if (language === 'en' && message) return message;
  return fallbackMessage;
}
