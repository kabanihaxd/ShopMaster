import { Component, input } from '@angular/core';
import { TPipe } from '../i18n/i18n';

let nextId = 0;

/** Карточка-блок с заголовком (h2) и необязательной ссылкой/кнопкой справа: <a action> */
@Component({
  selector: 'app-panel',
  imports: [TPipe],
  template: `
    <section [attr.aria-labelledby]="id">
      <header>
        <h2 [id]="id">{{ heading() | t }}</h2>
        <ng-content select="[action]" />
      </header>
      <ng-content />
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    section {
      height: 100%;
      box-sizing: border-box;
      padding: 16px 20px 20px;
      border: 1px solid var(--app-border);
      border-radius: var(--app-radius);
      background: var(--app-surface);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 40px;
      margin-bottom: 8px;
    }
    h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  `,
})
export class Panel {
  /** Ключ перевода заголовка */
  readonly heading = input.required<string>();
  protected readonly id = `panel-${nextId++}`;
}
