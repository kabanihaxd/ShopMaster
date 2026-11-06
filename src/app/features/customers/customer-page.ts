import { Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { formatDate, formatDateTime, formatMoney, formatNumber } from '../../core/format';
import { t, TPipe } from '../../i18n/i18n';
import { Panel } from '../../shared/panel';
import { topProducts } from '../analytics/stats';
import { StatCard } from '../dashboard/stat-card';
import { NewOrderData, NewOrderDialog } from '../orders/new-order';
import { itemCount, Order } from '../orders/order';
import { OrderDetails } from '../orders/order-details';
import { OrdersService } from '../orders/orders.service';
import { StatusBadge } from '../orders/status-badge';
import { CustomersService } from './customers.service';

const money0 = (n: number) => formatMoney(n, 0);
const money2 = (n: number) => formatMoney(n);
const count = (n: number) => formatNumber(Math.round(n));

/** Карточка клиента: контакты, показатели, любимые товары и история заказов */
@Component({
  selector: 'app-customer-page',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, RouterLink, Panel, StatCard, StatusBadge, TPipe],
  templateUrl: './customer-page.html',
  styleUrl: './customer-page.scss',
})
export default class CustomerPage {
  private readonly customers = inject(CustomersService);
  private readonly ordersService = inject(OrdersService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** id из адреса /customers/:id */
  readonly id = input.required<string>();

  protected readonly loading = computed(() => this.customers.loading() || this.ordersService.loading());
  protected readonly customer = computed(() => this.customers.byId().get(this.id()));

  /** Заказы клиента, сначала новые */
  protected readonly orders = computed(() =>
    this.ordersService.orders().filter((o) => o.customerId === this.id()),
  );

  protected readonly initials = computed(() =>
    (this.customer()?.name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join(''),
  );

  protected readonly since = computed(() => {
    const c = this.customer();
    return c && c.createdAt.getTime() > 0 ? formatDate(c.createdAt) : null;
  });

  protected readonly stats = computed(() => {
    const orders = this.orders();
    const paid = orders.filter((o) => o.status !== 'cancelled');
    const spent = paid.reduce((s, o) => s + o.total, 0);
    const last = orders[0]?.createdAt;
    return [
      { label: 'Замовлень', amount: orders.length, format: count, value: '', icon: 'shopping_cart', tone: 'purple' as const },
      { label: 'Витратив', amount: spent, format: money0, value: '', icon: 'payments', tone: 'blue' as const },
      {
        label: 'Середній чек',
        amount: paid.length ? spent / paid.length : 0,
        format: money2,
        value: '',
        icon: 'receipt_long',
        tone: 'green' as const,
      },
      {
        label: 'Останнє замовлення',
        amount: undefined,
        format: count,
        value: last ? formatDate(last) : '—',
        icon: 'schedule',
        tone: 'orange' as const,
      },
    ];
  });

  /** Любимые товары клиента (по количеству) */
  protected readonly favorites = computed(() => topProducts(this.orders(), 3));

  protected date(o: Order): string {
    return formatDateTime(o.createdAt);
  }

  protected money(value: number): string {
    return formatMoney(value);
  }

  protected items(o: Order): number {
    return itemCount(o);
  }

  protected open(order: Order) {
    this.dialog.open(OrderDetails, { data: order, width: '600px', maxWidth: '95vw' });
  }

  protected createOrder() {
    const data: NewOrderData = { customerId: this.id() };
    this.dialog
      .open(NewOrderDialog, { data, width: '680px', maxWidth: '95vw', autoFocus: 'first-tabbable' })
      .afterClosed()
      .subscribe((number?: number) => {
        if (number) {
          this.snackBar.open(t('Замовлення №{n} створено', { n: number }), t('Закрити'), { duration: 4000 });
        }
      });
  }
}
