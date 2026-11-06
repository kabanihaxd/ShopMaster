import { Component, DOCUMENT, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme';
import { lang } from './i18n/i18n';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {
  constructor() {
    // Создаём сервис темы сразу, чтобы data-theme применился до первой отрисовки страниц
    inject(ThemeService);

    const doc = inject(DOCUMENT);
    effect(() => {
      doc.documentElement.lang = lang();
    });
  }
}
