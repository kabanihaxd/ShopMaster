import { Order, OrderStatus } from '../orders/order';

/** Чистые функции расчёта статистики по заказам (без Angular — легко тестировать) */

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Выручка считается только по неотменённым заказам */
export function isPaid(order: Order): boolean {
  return order.status !== 'cancelled';
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Заказы с from (включительно) по to (не включительно) */
export function inRange(orders: Order[], from: Date, to: Date): Order[] {
  const a = from.getTime();
  const b = to.getTime();
  return orders.filter((o) => {
    const t = o.createdAt.getTime();
    return t >= a && t < b;
  });
}

/**
 * Единое правило для всего приложения:
 * заказы считаются все (включая отменённые), доход, проданные товары и средний чек — без отменённых.
 */
export interface Totals {
  revenue: number;
  /** Все заказы, включая отменённые */
  orders: number;
  /** Проданные штуки (без отменённых заказов) */
  items: number;
  /** Средний чек по неотменённым заказам */
  average: number;
}

export function totals(orders: Order[]): Totals {
  const paid = orders.filter(isPaid);
  const revenue = round2(paid.reduce((s, o) => s + o.total, 0));
  const items = paid.reduce((s, o) => s + o.items.reduce((n, i) => n + i.qty, 0), 0);
  return { revenue, orders: orders.length, items, average: paid.length ? round2(revenue / paid.length) : 0 };
}

/** Сколько дней от первого заказа до сегодня включительно (для периода «весь час») */
export function daysSinceFirst(orders: Order[], now: Date): number {
  if (!orders.length) return 1;
  const first = Math.min(...orders.map((o) => o.createdAt.getTime()));
  const diff = startOfDay(now).getTime() - startOfDay(new Date(first)).getTime();
  return Math.max(1, Math.round(diff / 864e5) + 1);
}

/** Изменение в процентах; без базы для сравнения — undefined */
export function changePercent(current: number, previous: number): number | undefined {
  if (!previous) return undefined;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export interface Bucket {
  /** Начало дня или месяца */
  start: Date;
  revenue: number;
  /** Все заказы, включая отменённые */
  orders: number;
  /** Неотменённые заказы (для среднего чека) */
  paid: number;
  /** Проданные штуки */
  items: number;
}

/**
 * Выручка и число заказов по дням за последние `days` дней, включая сегодня
 * (при days > 90 — по месяцам).
 */
export function series(orders: Order[], days: number, now: Date): Bucket[] {
  const byMonth = days > 90;
  const today = startOfDay(now);
  const buckets: Bucket[] = [];
  const index = new Map<string, Bucket>();
  const keyOf = (d: Date) => (byMonth ? `${d.getFullYear()}-${d.getMonth()}` : startOfDay(d).toDateString());

  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    const start = byMonth ? new Date(day.getFullYear(), day.getMonth(), 1) : day;
    const key = keyOf(start);
    if (!index.has(key)) {
      const bucket = { start, revenue: 0, orders: 0, paid: 0, items: 0 };
      index.set(key, bucket);
      buckets.push(bucket);
    }
  }

  const from = addDays(today, -(days - 1));
  for (const o of inRange(orders, from, addDays(today, 1))) {
    const bucket = index.get(keyOf(o.createdAt));
    if (!bucket) continue;
    bucket.orders++;
    if (!isPaid(o)) continue;
    bucket.revenue = round2(bucket.revenue + o.total);
    bucket.paid++;
    bucket.items += o.items.reduce((n, i) => n + i.qty, 0);
  }
  return buckets;
}

export interface ProductSales {
  productId: string;
  name: string;
  qty: number;
  revenue: number;
}

/** Самые продаваемые товары (по количеству) */
export function topProducts(orders: Order[], limit: number): ProductSales[] {
  const map = new Map<string, ProductSales>();
  for (const o of orders) {
    if (!isPaid(o)) continue;
    for (const i of o.items) {
      const row = map.get(i.productId) ?? { productId: i.productId, name: i.name, qty: 0, revenue: 0 };
      row.qty += i.qty;
      row.revenue = round2(row.revenue + i.price * i.qty);
      map.set(i.productId, row);
    }
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, limit);
}

/** Выручка по категориям: categoryOf(productId) → id категории */
export function revenueByCategory(
  orders: Order[],
  categoryOf: (productId: string) => string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const o of orders) {
    if (!isPaid(o)) continue;
    for (const i of o.items) {
      const key = categoryOf(i.productId);
      map.set(key, round2((map.get(key) ?? 0) + i.price * i.qty));
    }
  }
  return map;
}

export function statusCounts(orders: Order[]): Map<OrderStatus, number> {
  const map = new Map<OrderStatus, number>();
  for (const o of orders) map.set(o.status, (map.get(o.status) ?? 0) + 1);
  return map;
}

/** Сколько дат попало в каждый из последних `days` дней (для спарклайна «новые клиенты») */
export function countByDay(dates: Date[], days: number, now: Date): number[] {
  const today = startOfDay(now).getTime();
  const counts = new Array<number>(days).fill(0);
  for (const d of dates) {
    const ago = Math.round((today - startOfDay(d).getTime()) / 864e5);
    if (ago >= 0 && ago < days) counts[days - 1 - ago]++;
  }
  return counts;
}

/**
 * Тепловая карта «день недели × час»: 7 строк (понедельник первый) по 24 часа,
 * в ячейке — число заказов.
 */
export function heatmap(orders: Order[]): number[][] {
  const grid = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const o of orders) {
    const weekday = (o.createdAt.getDay() + 6) % 7;
    grid[weekday][o.createdAt.getHours()]++;
  }
  return grid;
}
