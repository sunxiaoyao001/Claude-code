import { useGame, type Language } from '@/store/gameStore';
import { en } from './en';
import { zh } from './zh';

const DICTS: Record<Language, Record<string, string>> = { zh, en };

/** Look up `key` and substitute `{param}` placeholders. Falls back to English, then the key. */
export function translate(lang: Language, key: string, params?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? DICTS.en[key] ?? key;
  if (params) for (const k in params) s = s.split(`{${k}}`).join(String(params[k]));
  return s;
}

export function useT() {
  const lang = useGame((s) => s.settings.language);
  return (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
}
