import { DOCUMENT, effect, inject, Service, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'shopmaster.theme';

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** Тёмная/светлая тема: пишет data-theme на <html> и запоминает выбор */
@Service()
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  readonly theme = signal<Theme>(readTheme());

  constructor() {
    effect(() => {
      const theme = this.theme();
      this.doc.documentElement.dataset['theme'] = theme;
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // не запомнится — после перезагрузки снова тёмная
      }
    });
  }

  toggle() {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
}
