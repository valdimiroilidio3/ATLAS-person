// Núcleo de localização da ATLAS.
// - Chave = string em inglês (natural key); o dicionário pt traduz.
// - 'en' é identidade: se a chave não existir, devolve a própria chave.
// - O idioma predefinido é Português (pt).

import { en, LOCALES, pt, type Locale } from './dictionaries';

export type { Locale };
export { LOCALES };

let currentLocale: Locale = 'pt';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export type TranslateParams = Record<string, string | number>;

export function translate(key: string, params?: TranslateParams, locale: Locale = currentLocale): string {
  const dict = locale === 'pt' ? pt : en;
  let text = dict[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/** Tradução com o idioma atualmente ativo (usado pelo motor). */
export function t(key: string, params?: TranslateParams): string {
  return translate(key, params, currentLocale);
}
