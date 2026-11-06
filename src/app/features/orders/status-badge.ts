import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TPipe } from '../../i18n/i18n';
import { ORDER_STATUSES, OrderStatus } from './order';

/** Цветной бейдж статуса заказа (цвет дублируется иконкой и текстом) */
@Component({
  selector: 'app-status-badge',
  imports: [MatIconModule, TPipe],
  host: { '[class]': 'status()' },
  template: `
    <mat-icon aria-hidden="true">{{ meta().icon }}</mat-icon>
    {{ meta().label | t }}
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 10px 2px 6px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      color: var(--c);
      background: color-mix(in srgb, var(--c) 16%, transparent);
    }
    mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    :host(.new) {
      --c: light-dark(#1d4ed8, #93c5fd);
    }
    :host(.processing) {
      --c: var(--app-warning);
    }
    :host(.shipped) {
      --c: light-dark(#7e22ce, #d8b4fe);
    }
    :host(.delivered) {
      --c: var(--app-success);
    }
    :host(.cancelled) {
      --c: var(--app-danger);
    }
  `,
})
export class StatusBadge {
  readonly status = input.required<OrderStatus>();
  protected readonly meta = computed(
    () => ORDER_STATUSES.find((s) => s.value === this.status()) ?? ORDER_STATUSES[0],
  );
}
