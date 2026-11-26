import { ko, type TranslationKey } from './ko.ts';
import { en } from './en.ts';
import type { Language, TranslationParams } from '../types/i18n.ts';

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = {
  ko,
  en,
};

export function translate(
  lang: Language,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES.ko;
  let template = dict[key] ?? DICTIONARIES.ko[key] ?? key;

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      template = template.replace(
        new RegExp(`\\{${paramKey}\\}`, 'g'),
        String(paramValue),
      );
    }
  }

  return template;
}

export type { TranslationKey };
export { ko, en };
