import { afterNextRender, Component, computed, effect, inject, Injector, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { formatDate, formatDateTime, formatMoney } from '../../core/format';
import { SettingsService } from '../../core/settings';
import { TPipe } from '../../i18n/i18n';
import { itemCount, STATUS_LABEL } from './order';
import { OrdersService } from './orders.service';

/**
 * Накладная для печати: /print/orders/:id (открывается в новой вкладке из карточки заказа).
 * Всегда светлая и на белом листе A4; как только данные загрузились — открывается диалог печати.
 */
@Component({
  selector: 'app-invoice',
  imports: [MatButtonModule, MatIconModule, TPipe],
  templateUrl: './invoice.html',
  styleUrl: './invoice.scss',
})
export default class Invoice {
  private readonly orders = inject(OrdersService);
  private readonly settings = inject(SettingsService);
  private readonly injector = inject(Injector);

  readonly id = input.required<string>();

  protected readonly order = computed(() => this.orders.orders().find((o) => o.id === this.id()));
  protected readonly ready = computed(() => !this.orders.loading() && this.settings.loaded());
  protected readonly statusLabel = STATUS_LABEL;

  protected readonly printedAt = formatDateTime(new Date());
  private readonly printed = signal(false);

  constructor() {
    // Печать один раз, когда заказ и валюта магазина загружены и страница отрисована
    effect(() => {
      if (!this.ready() || !this.order() || this.printed()) return;
      this.printed.set(true);
      afterNextRender(() => setTimeout(() => window.print(), 250), { injector: this.injector });
    });
  }

  protected money(value: number): string {
    return formatMoney(value);
  }

  protected date(value: Date): string {
    return formatDate(value);
  }

  protected count(): number {
    const o = this.order();
    return o ? itemCount(o) : 0;
  }

  protected print() {
    window.print();
  }

  protected close() {
    window.close();
  }
}
