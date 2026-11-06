import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TPipe } from '../i18n/i18n';

const TOPICS = [
  { icon: 'grid_view', title: 'Дашборд', text: 'Ключові показники магазину, графік продажів і товари, які закінчуються.' },
  { icon: 'deployed_code', title: 'Товари', text: 'Додавайте, редагуйте й видаляйте товари, змінюйте залишок кнопками «+» і «−».' },
  { icon: 'shopping_cart', title: 'Замовлення', text: 'Створюйте замовлення вручну та змінюйте їх статус. Скасування повертає товар на склад.' },
  { icon: 'monitoring', title: 'Аналітика', text: 'Звіти за обраний період і вивантаження замовлень у CSV.' },
  { icon: 'settings', title: 'Налаштування', text: 'Валюта, мова, тема, поріг низького залишку, категорії та демо-дані.' },
];

/** Короткая справка по разделам админки */
@Component({
  selector: 'app-help-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, TPipe],
  template: `
    <h2 mat-dialog-title>{{ 'Допомога' | t }}</h2>
    <mat-dialog-content>
      <ul>
        @for (topic of topics; track topic.title) {
          <li>
            <span class="icon" aria-hidden="true"><mat-icon>{{ topic.icon }}</mat-icon></span>
            <div>
              <h3>{{ topic.title | t }}</h3>
              <p>{{ topic.text | t }}</p>
            </div>
          </li>
        }
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button mat-dialog-close cdkFocusInitial>{{ 'Зрозуміло' | t }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    ul {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      gap: 14px;
    }
    .icon {
      flex: none;
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      color: var(--app-active-text);
      background: color-mix(in srgb, var(--app-accent) 18%, transparent);
    }
    h3 {
      margin: 0 0 2px;
      font-size: 15px;
      font-weight: 600;
      color: var(--app-text);
    }
    p {
      margin: 0;
      color: var(--app-muted);
    }
  `,
})
export class HelpDialog {
  protected readonly topics = TOPICS;
}
