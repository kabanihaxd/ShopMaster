import type { Lang } from './i18n';
import { APP } from './tr-app';

/** Строка перевода: [украинский оригинал (он же ключ), русский, английский, словацкий] */
export type Entry = [uk: string, ru: string, en: string, sk: string];

const ALL: Entry[] = [...APP];

export const TRANSLATIONS = new Map<string, Record<Exclude<Lang, 'uk'>, string>>(
  ALL.map(([uk, ru, en, sk]) => [uk, { ru, en, sk }]),
);
