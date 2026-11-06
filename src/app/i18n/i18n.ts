import { Pipe, PipeTransform, signal } from '@angular/core';
import { TRANSLATIONS } from './translations';

export type Lang = 'uk' | 'ru' | 'en' | 'sk';

/** Языки на выбор. Украинский — основной: тексты в коде написаны по-украински и служат ключами перевода. */
export const LANGS: { code: Lang; name: string }[] = [
  { code: 'uk', name: 'Українська' },
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
  { code: 'sk', name: 'Slovenčina' },
];

/** Значения для `{имя}` в тексте (пустые показываются как пустая строка) */
export type Params = Record<string, string | number | null | undefined>;

const LANG_KEY = 'shopmaster.lang';

function readLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    return LANGS.some((l) => l.code === saved) ? (saved as Lang) : 'uk';
  } catch {
    return 'uk';
  }
}

const current = signal<Lang>(readLang());

/** Текущий язык (сигнал: всё, что его читает, обновляется при смене языка) */
export const lang = current.asReadonly();

export function setLang(code: Lang) {
  current.set(code);
  try {
    localStorage.setItem(LANG_KEY, code);
  } catch {
    // не запомнится — после перезагрузки снова украинский
  }
}

/**
 * Перевод. Ключ — сам украинский текст; `{имя}` в тексте заменяется значением из params.
 * Если перевода нет, показывается украинский оригинал.
 */
export function t(text: string, params?: Params): string {
  const language = current();
  const translated = language === 'uk' ? text : (TRANSLATIONS.get(text)?.[language] ?? text);
  return params
    ? translated.replace(/\{(\w+)\}/g, (whole, key: string) =>
        key in params ? String(params[key] ?? '') : whole,
      )
    : translated;
}

/** `{{ 'Додати' | t }}` или `{{ 'Знайдено: {n}' | t: { n: count } }}` */
@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  transform(text: string, params?: Params): string {
    return t(text, params);
  }
}
