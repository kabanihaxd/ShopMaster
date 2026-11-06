import { computed, inject, Service } from '@angular/core';
import { SettingsService } from '../../core/settings';
import { Customer } from '../customers/customer';
import { CustomersService } from '../customers/customers.service';
import { Order } from '../orders/order';
import { OrdersService } from '../orders/orders.service';
import { CategoriesService } from '../products/categories.service';
import { ProductsService } from '../products/products.service';
import {
  addDays,
  changePercent,
  countByDay,
  daysSinceFirst,
  heatmap,
  inRange,
  revenueByCategory,
  series,
  startOfDay,
  statusCounts,
  topProducts,
  totals,
} from './stats';

export type ActivityEvent =
  | { kind: 'order'; id: string; date: Date; order: Order }
  | { kind: 'customer'; id: string; date: Date; customer: Customer };

/** Сводные показатели для Dashboard и Analytics (всё пересчитывается при изменении данных) */
@Service()
export class AnalyticsService {
  private readonly ordersService = inject(OrdersService);
  private readonly products = inject(ProductsService);
  private readonly customers = inject(CustomersService);
  private readonly categories = inject(CategoriesService);
  private readonly settings = inject(SettingsService);

  readonly loading = computed(() => this.ordersService.loading() || this.products.loading());

  private readonly orders = this.ordersService.orders;

  /** Карточки дашборда: всего + изменение за 30 дней относительно предыдущих 30 */
  readonly kpis = computed(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const last = totals(inRange(this.orders(), addDays(tomorrow, -30), tomorrow));
    const prev = totals(inRange(this.orders(), addDays(tomorrow, -60), addDays(tomorrow, -30)));
    const all = totals(this.orders());
    return {
      revenue: all.revenue,
      revenueChange: changePercent(last.revenue, prev.revenue),
      orders: all.orders,
      ordersChange: changePercent(last.orders, prev.orders),
      products: this.products.products().length,
      activeProducts: this.products.products().filter((p) => p.active).length,
      customers: this.customers.customers().length,
      newCustomers: this.customers.customers().filter((c) => c.createdAt >= addDays(tomorrow, -30)).length,
    };
  });

  /** Длина периода «весь час» в днях: от первого заказа до сегодня */
  readonly allTimeDays = computed(() => daysSinceFirst(this.orders(), new Date()));

  /** Статистика доходов: сегодня, 7 дней, текущий месяц, средний чек */
  readonly revenueStats = computed(() => {
    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      today: totals(inRange(this.orders(), today, tomorrow)).revenue,
      week: totals(inRange(this.orders(), addDays(tomorrow, -7), tomorrow)).revenue,
      month: totals(inRange(this.orders(), monthStart, tomorrow)).revenue,
      average: totals(this.orders()).average,
    };
  });

  readonly recentOrders = computed(() => this.orders().slice(0, 5));

  /** Заказы со статусом «новий» — ждут обработки (бейдж в меню и уведомления) */
  readonly newOrders = computed(() => this.orders().filter((o) => o.status === 'new'));

  /** Лента «последняя активность»: новые заказы и клиенты, сначала свежие */
  readonly activity = computed((): ActivityEvent[] => {
    const orders = this.orders()
      .slice(0, 8)
      .map((o): ActivityEvent => ({ kind: 'order', id: o.id, date: o.createdAt, order: o }));
    const customers = [...this.customers.customers()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 8)
      .map((c): ActivityEvent => ({ kind: 'customer', id: c.id, date: c.createdAt, customer: c }));
    return [...orders, ...customers].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);
  });

  /** Быстрая статистика в процентах (0–100) */
  readonly quickStats = computed(() => {
    const orders = this.orders();
    const count = (status: string) => orders.filter((o) => o.status === status).length;
    const active = this.products.products().filter((p) => p.active);
    const perCustomer = new Map<string, number>();
    for (const o of orders) perCustomer.set(o.customerId, (perCustomer.get(o.customerId) ?? 0) + 1);
    const buyers = [...perCustomer.values()];
    const share = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);
    return {
      delivered: share(count('delivered'), orders.length),
      cancelled: share(count('cancelled'), orders.length),
      inStock: share(active.filter((p) => p.stock > 0).length, active.length),
      repeat: share(buyers.filter((n) => n > 1).length, buyers.length),
    };
  });

  readonly topProducts = computed(() => topProducts(this.orders(), 5));

  /** Активные товары с остатком не выше порога, сначала самые критичные */
  readonly lowStock = computed(() =>
    this.products
      .products()
      .filter((p) => p.active && p.stock <= this.settings.lowStockThreshold())
      .sort((a, b) => a.stock - b.stock),
  );

  /** Ряд «выручка/заказы» за последние days дней */
  series(days: number) {
    return series(this.orders(), days, new Date());
  }

  /** Тот же ряд за предыдущие days дней (для пунктирной линии сравнения) */
  previousSeries(days: number) {
    return series(this.orders(), days, addDays(new Date(), -days));
  }

  /** Спарклайны карточек дашборда: последние 14 дней */
  readonly sparks = computed(() => {
    const s = series(this.orders(), 14, new Date());
    return {
      revenue: s.map((b) => b.revenue),
      orders: s.map((b) => b.orders),
      customers: countByDay(
        this.customers.customers().map((c) => c.createdAt),
        14,
        new Date(),
      ),
    };
  });

  /** Всё для страницы Analytics за последние days дней (и сравнение с предыдущими days) */
  period(days: number) {
    const tomorrow = addDays(startOfDay(new Date()), 1);
    const current = inRange(this.orders(), addDays(tomorrow, -days), tomorrow);
    const previous = inRange(this.orders(), addDays(tomorrow, -2 * days), addDays(tomorrow, -days));
    const now = totals(current);
    const before = totals(previous);
    const byId = this.products.byId();
    const names = this.categories.nameById();

    return {
      orders: current,
      totals: now,
      change: {
        revenue: changePercent(now.revenue, before.revenue),
        orders: changePercent(now.orders, before.orders),
        average: changePercent(now.average, before.average),
        items: changePercent(now.items, before.items),
      },
      series: series(this.orders(), days, new Date()),
      previous: series(this.orders(), days, addDays(new Date(), -days)),
      heatmap: heatmap(current),
      statuses: statusCounts(current),
      categories: [...revenueByCategory(current, (id) => byId.get(id)?.categoryId ?? '')]
        .map(([id, revenue]) => ({ name: names.get(id) ?? '', revenue }))
        .sort((a, b) => b.revenue - a.revenue),
      top: topProducts(current, 10),
    };
  }
}
