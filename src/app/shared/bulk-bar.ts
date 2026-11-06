import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TPipe } from '../i18n/i18n';

/**
 * Плавающая панель массовых действий внизу страницы: «Вибрано: N», кнопки действий (через ng-content)
 * и «снять выбор». Появляется с анимацией, когда что-то выбрано.
 */
@Component({
  selector: 'app-bulk-bar',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, TPipe],
  template: `
    <div class="bar" role="region" [attr.aria-label]="'Масові дії' | t">
      <button
        mat-icon-button
        (click)="clear.emit()"
        [attr.aria-label]="'Зняти вибір' | t"
        [matTooltip]="'Зняти вибір' | t"
      >
        <mat-icon>close</mat-icon>
      </button>
      <span class="count" aria-live="polite">{{ 'Вибрано: {n}' | t: { n: count() } }}</span>
      <span class="divider" aria-hidden="true"></span>
      <div class="actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    :host {
      position: sticky;
      bottom: 16px;
      z-index: 3;
      display: flex;
      justify-content: center;
      margin-top: 16px;
      pointer-events: none;
    }
    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 12px;
      max-width: 100%;
      padding: 8px 16px 8px 8px;
      border: 1px solid var(--app-border);
      border-radius: 16px;
      background: light-dark(#ffffff, #18181b);
      box-shadow: 0 12px 32px light-dark(rgb(20 22 26 / 0.18), rgb(0 0 0 / 0.6));
      pointer-events: auto;
      animation: pop-up 0.25s cubic-bezier(0.2, 0.7, 0.2, 1);
    }
    .count {
      font-weight: 600;
      white-space: nowrap;
    }
    .divider {
      align-self: stretch;
      width: 1px;
      margin: 4px 0;
      background: var(--app-border);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    @keyframes pop-up {
      from {
        opacity: 0;
        transform: translateY(16px) scale(0.97);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .bar {
        animation: none;
      }
    }
  `,
})
export class BulkBar {
  readonly count = input.required<number>();
  readonly clear = output();
}
