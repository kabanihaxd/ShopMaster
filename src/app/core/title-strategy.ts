import { effect, inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { t } from '../i18n/i18n';

/**
 * Заголовок страницы: `title` маршрута — это ключ перевода.
 * Ключ хранится в сигнале, чтобы и вкладка браузера, и шапка обновлялись при смене языка.
 */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly key = signal('');

  /** Ключ перевода заголовка текущей страницы */
  readonly pageTitle = this.key.asReadonly();

  constructor() {
    super();
    effect(() => {
      const key = this.key();
      this.title.setTitle(key ? `${t(key)} · ShopMaster` : 'ShopMaster');
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key.set(this.buildTitle(snapshot) ?? '');
  }
}
