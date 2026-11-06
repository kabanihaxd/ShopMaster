import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { formatDateTime, formatMoney } from '../../core/format';
import { t, TPipe } from '../../i18n/i18n';
import { confirmAction } from '../../shared/confirm-dialog';
import { allowedStatuses, Order, OrderStatus, STATUS_LABEL } from './order';
import { OrdersService } from './orders.service';
import { StatusBadge } from './status-badge';

/** Карточка заказа: состав, клиент, адрес и смена статуса */
@Component({
  selector: 'app-order-details',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatSelectModule, RouterLink, StatusBadge, TPipe],
  templateUrl: './order-details.html',
  styleUrl: './order-details.scss',
})
export class OrderDetails {
  private readonly service = inject(OrdersService);
  private readonly dialog = inject(MatDialog);
  private readonly initial = inject<Order>(MAT_DIALOG_DATA);

  /** Живая версия заказа (обновляется, если статус поменяли в другой вкладке) */
  protected readonly order = computed(
    () => this.service.orders().find((o) => o.id === this.initial.id) ?? this.initial,
  );
  protected readonly options = computed(() => allowedStatuses(this.order().status));
  protected readonly next = signal<OrderStatus | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal(false);
  protected readonly statusLabel = STATUS_LABEL;

  protected readonly created = computed(() => formatDateTime(this.order().createdAt));

  /** История статусов для ленты: время и кто поменял */
  protected readonly history = computed(() =>
    this.order().history.map((h) => ({
      status: h.status,
      when: h.at ? formatDateTime(h.at) : t('час невідомий'),
      iso: h.at?.toISOString() ?? null,
      by: h.by === 'demo' ? t('демо-дані') : h.by,
    })),
  );

  /** Накладная открывается в новой вкладке и сразу предлагает печать */
  protected print() {
    window.open(`/print/orders/${this.order().id}`, '_blank', 'noopener');
  }
  protected money(value: number): string {
    return formatMoney(value);
  }

  protected async apply() {
    const status = this.next();
    if (!status) return;
    if (status === 'cancelled') {
      const ok = await confirmAction(this.dialog, {
        title: 'Скасувати замовлення?',
        message: 'Замовлення №{n} буде скасовано, а товари повернуться на склад.',
        params: { n: this.order().number },
        confirm: 'Скасувати замовлення',
      });
      if (!ok) return;
    }
    this.saving.set(true);
    this.error.set(false);
    try {
      await this.service.setStatus(this.order(), status);
      this.next.set(null);
    } catch {
      this.error.set(true);
    } finally {
      this.saving.set(false);
    }
  }
}
