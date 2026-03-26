import i18n, { SUPPORTED_LANGS, type SupportedLang } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';

export function resolveSupportedLanguage(lang?: string | null): SupportedLang {
  return SUPPORTED_LANGS.includes(lang as SupportedLang)
    ? (lang as SupportedLang)
    : 'en';
}

export function getFixedTForLanguage(lang?: string | null, ns: 'common' | 'coach' = 'common') {
  return i18n.getFixedT(resolveSupportedLanguage(lang ?? i18n.resolvedLanguage ?? i18n.language), ns);
}

export function getFixedTForCurrentLanguage(ns: 'common' | 'coach' = 'common') {
  return getFixedTForLanguage(i18n.resolvedLanguage ?? i18n.language, ns);
}

export async function getFixedTForUser(userId: string, ns: 'common' | 'coach' = 'common') {
  const { data } = await supabase
    .from('profiles')
    .select('language')
    .eq('id', userId)
    .maybeSingle();

  return getFixedTForLanguage(data?.language, ns);
}

export async function groupUsersByLanguage(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return {} as Partial<Record<SupportedLang, string[]>>;

  const fallbackLang = resolveSupportedLanguage(i18n.resolvedLanguage ?? i18n.language);
  const { data } = await supabase
    .from('profiles')
    .select('id, language')
    .in('id', uniqueUserIds);

  const languageByUserId = new Map<string, SupportedLang>(
    uniqueUserIds.map(userId => [userId, fallbackLang]),
  );

  for (const profile of data ?? []) {
    languageByUserId.set(profile.id, resolveSupportedLanguage(profile.language));
  }

  const groups: Partial<Record<SupportedLang, string[]>> = {};
  for (const userId of uniqueUserIds) {
    const language = languageByUserId.get(userId) ?? fallbackLang;
    groups[language] ??= [];
    groups[language]!.push(userId);
  }

  return groups;
}
