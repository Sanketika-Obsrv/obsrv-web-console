import { translations } from '../locales/translations';

export function t(key: string, lang = 'en'): string {
  const keys = key.split('.');
  let value: any = (translations as Record<string, any>)[lang];
  for (const k of keys) {
    value = value[k];
    if (value === undefined) return key;
  }
  return value;
}
