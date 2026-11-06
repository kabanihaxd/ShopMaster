import { describe, expect, it } from 'vitest';
import { setLang, t } from './i18n';
import { APP } from './tr-app';

describe('i18n', () => {
  it('перекладає ключ і підставляє параметри', () => {
    setLang('en');
    expect(t('Товари')).toBe('Products');
    expect(t('Невідомий {n}', { n: 3 })).toBe('Невідомий 3');
    setLang('uk');
    expect(t('Товари')).toBe('Товари');
  });

  it('у всіх мовах однакові {плейсхолдери}', () => {
    const names = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const row of APP) {
      expect(row.map(names), row[0]).toEqual(row.map(() => names(row[0])));
    }
  });

  it('ключі не повторюються', () => {
    const keys = APP.map((r) => r[0]);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
