import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { formatDateTime, formatMoney } from '../../core/format';
import { t, TPipe } from '../../i18n/i18n';
import { BulkBar } from '../../shared/bulk-bar';
import { confirmAction } from '../../shared/confirm-dialog';
import { openByQueryParam } from '../../shared/open-by-query';
import { Selection } from '../../shared/selection';
import { itemCount, Order, ORDER_STATUSES, OrderStatus } from './order';
import { OrderDetails } from './order-details';
import { NewOrderDialog } from './new-order';
import { OrdersService } from './orders.service';
import { StatusBadge } from './status-badge';

/** Страница заказов: поиск, фильтр по статусу, карточка заказа и ручное создание */
@Component({
  selector: 'app-orders',
  imports: [
    BulkBar,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    StatusBadge,
    TPipe,
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export default class Orders {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly service = inject(OrdersService);

  /** ?order=<id> — сразу открыть карточку заказа (ссылка из уведомлений и ленты активности) */
  readonly order = input<string>();

  protected readonly statuses = ORDER_STATUSES;
  protected readonly columns = ['select', 'number', 'date', 'customer', 'items', 'total', 'status', 'actions'];

  protected readonly search = signal('');
  protected readonly status = signal<OrderStatus | ''>('');

  protected readonly visible = computed(() => {
    const query = this.search().trim().toLowerCase().replace(/^[#№]/, '');
    const status = this.status();
    return this.service
      .orders()
      .filter(
        (o) =>
          (!status || o.status === status) &&
          (!query ||
            String(o.number).includes(query) ||
            o.customerName.toLowerCase().includes(query) ||
            o.customerEmail.toLowerCase().includes(query)),
      );
  });

  /** Выбранные заказы для массовой смены статуса */
  protected readonly selection = new Selection(this.visible);
  /** В какие статусы можно перевести пачкой («Новий» — только при создании) */
  protected readonly bulkStatuses = ORDER_STATUSES.filter((s) => s.value !== 'new');
  protected readonly bulkStatus = signal<OrderStatus | null>(null);
  protected readonly bulkBusy = signal(false);

  protected readonly filtered = computed(() => !!this.search().trim() || !!this.status());

  /** Количество заказов по статусам — для подписей в фильтре */
  protected readonly counts = computed(() => {
    const map = new Map<OrderStatus, number>();
    for (const o of this.service.orders()) map.set(o.status, (map.get(o.status) ?? 0) + 1);
    return map;
  });

  protected readonly errorKey = computed(() => {
    const code = this.service.error();
    if (!code) return null;
    return code === 'permission-denied'
      ? 'Немає доступу до бази. Перевірте правила Firestore.'
      : 'Не вдалося завантажити замовлення. Перевірте з’єднання.';
  });

  constructor() {
    openByQueryParam({
      param: 'order',
      id: this.order,
      items: this.service.orders,
      loading: this.service.loading,
      open: (o) => this.open(o),
    });
  }

  protected readonly trackById = (_: number, o: Order) => o.id;
  protected readonly itemCount = itemCount;

  protected date(o: Order): string {
    return formatDateTime(o.createdAt);
  }

  protected money(value: number): string {
    return formatMoney(value);
  }

  protected resetFilters() {
    this.search.set('');
    this.status.set('');
  }

  protected open(order: Order) {
    this.dialog.open(OrderDetails, { data: order, width: '600px', maxWidth: '95vw' });
  }

  /** Сменить статус всем выбранным; неподходящие (завершённые, «назад») пропускаются */
  protected async applyBulk() {
    const status = this.bulkStatus();
    const orders = this.selection.selected();
    if (!status || !orders.length) return;
    if (status === 'cancelled') {
      const ok = await confirmAction(this.dialog, {
        title: 'Скасувати вибрані замовлення?',
        message: 'Буде скасовано замовлень: {n}. Товари повернуться на склад.',
        params: { n: orders.length },
        confirm: 'Скасувати замовлення',
      });
      if (!ok) return;
    }
    this.bulkBusy.set(true);
    const { updated, skipped } = await this.service.setStatusMany(orders, status);
    this.bulkBusy.set(false);
    this.selection.clear();
    this.bulkStatus.set(null);
    const message = skipped
      ? t('Оновлено: {u}. Пропущено: {s} — їхній статус не можна змінити на цей.', { u: updated, s: skipped })
      : t('Оновлено замовлень: {n}', { n: updated });
    this.snackBar.open(message, t('Закрити'), { duration: 5000 });
  }

  protected create() {
    this.dialog
      .open(NewOrderDialog, { width: '680px', maxWidth: '95vw', autoFocus: 'first-tabbable' })
      .afterClosed()
      .subscribe((number?: number) => {
        if (number) {
          this.snackBar.open(t('Замовлення №{n} створено', { n: number }), t('Закрити'), { duration: 4000 });
        }
      });
  }
}
