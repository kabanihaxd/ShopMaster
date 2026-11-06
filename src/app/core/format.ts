import { signal } from '@angular/core';
import { lang, Lang } from '../i18n/i18n';

const LOCALES: Record<Lang, string> = { uk: 'uk-UA', ru: 'ru-RU', en: 'en-US', sk: 'sk-SK' };

/** Валюты магазина; label — ключ перевода */
export const CURRENCIES = [
  { code: 'USD', label: 'Долар США' },
  { code: 'EUR', label: 'Євро' },
  { code: 'UAH', label: 'Українська гривня' },
  { code: 'PLN', label: 'Польський злотий' },
  { code: 'CZK', label: 'Чеська крона' },
  { code: 'GBP', label: 'Британський фунт' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

export function isCurrency(value: unknown): value is CurrencyCode {
  return CURRENCIES.some((c) => c.code === value);
}

const currency = signal<CurrencyCode>('USD');

/** Валюта магазина (задаётся в Settings, хранится в Firestore) */
export const currencyCode = currency.asReadonly();

export function setCurrency(code: CurrencyCode) {
  currency.set(code);
}

/** Символ валюты для подписей полей: «$», «€», «₴»… */
export function currencySymbol(): string {
  const parts = new Intl.NumberFormat(locale(), { style: 'currency', currency: currency() }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value ?? currency();
}

/** Локаль для чисел и дат по текущему языку (читает сигнал — computed пересчитается при смене языка) */
export function locale(): string {
  return LOCALES[lang()];
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat(locale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Сумма в валюте магазина (читает сигналы языка и валюты) */
export function formatMoney(value: number, digits = 2): string {
  return new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency: currency(),
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** «6 лист. 2026 р., 14:20» по языку интерфейса */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(locale(), { dateStyle: 'medium' }).format(date);
}

/** 12.5 → «12,5 %» / «12.5%» */
export function formatPercent(value: number, digits = 1): string {
  return new Intl.NumberFormat(locale(), {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value / 100);
}
