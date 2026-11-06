import { describe, expect, it } from 'vitest';
import { Order, OrderStatus } from '../orders/order';
import {
  changePercent,
  countByDay,
  daysSinceFirst,
  heatmap,
  revenueByCategory,
  series,
  topProducts,
  totals,
} from './stats';

const NOW = new Date(2026, 10, 6, 15, 0);

function order(daysAgo: number, total: number, status: OrderStatus = 'new', qty = 1, productId = 'p1'): Order {
  const createdAt = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - daysAgo, 10);
  return {
    id: `${daysAgo}-${total}`,
    number: 1000,
    customerId: 'c1',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    address: '',
    note: '',
    items: [{ productId, name: productId, sku: '', price: total / qty, qty }],
    total,
    status,
    createdAt,
    history: [],
  };
}

describe('stats', () => {
  it('totals: замовлення — усі, дохід і середній чек — без скасованих', () => {
    const t = totals([order(0, 100), order(1, 50, 'cancelled'), order(2, 200, 'delivered', 2)]);
    expect(t).toEqual({ revenue: 300, orders: 3, items: 3, average: 150 });
  });

  it('series рахує скасоване замовлення, але не його дохід', () => {
    const s = series([order(0, 10), order(0, 40, 'cancelled')], 7, NOW);
    expect(s[6]).toMatchObject({ orders: 2, revenue: 10, paid: 1, items: 1 });
  });

  it('daysSinceFirst', () => {
    expect(daysSinceFirst([], NOW)).toBe(1);
    expect(daysSinceFirst([order(0, 1)], NOW)).toBe(1);
    expect(daysSinceFirst([order(0, 1), order(9, 1)], NOW)).toBe(10);
  });

  it('changePercent', () => {
    expect(changePercent(112.5, 100)).toBe(12.5);
    expect(changePercent(80, 100)).toBe(-20);
    expect(changePercent(10, 0)).toBeUndefined();
  });

  it('series по днях: останній бакет — сьогодні', () => {
    const s = series([order(0, 10), order(0, 5), order(6, 7), order(7, 99)], 7, NOW);
    expect(s).toHaveLength(7);
    expect(s[6].revenue).toBe(15);
    expect(s[6].orders).toBe(2);
    expect(s[0].revenue).toBe(7);
    expect(s.reduce((a, b) => a + b.revenue, 0)).toBe(22);
  });

  it('series за рік групує по місяцях', () => {
    const s = series([order(0, 10), order(40, 20)], 365, NOW);
    expect(s.length).toBeGreaterThanOrEqual(12);
    expect(s.length).toBeLessThanOrEqual(13);
    expect(s.at(-1)?.revenue).toBe(10);
  });

  it('topProducts сортує за кількістю', () => {
    const top = topProducts([order(0, 30, 'new', 3, 'a'), order(0, 10, 'new', 1, 'b'), order(0, 50, 'cancelled', 5, 'b')], 5);
    expect(top.map((p) => [p.productId, p.qty])).toEqual([
      ['a', 3],
      ['b', 1],
    ]);
  });

  it('revenueByCategory', () => {
    const map = revenueByCategory([order(0, 30, 'new', 1, 'a'), order(0, 20, 'new', 1, 'b')], (id) =>
      id === 'a' ? 'x' : 'y',
    );
    expect(map.get('x')).toBe(30);
    expect(map.get('y')).toBe(20);
  });

  it('heatmap: понеділок — перший рядок, година — стовпець', () => {
    // NOW — п'ятниця 6.11.2026, замовлення о 10:00
    const grid = heatmap([order(0, 1), order(0, 2), order(4, 3)]);
    expect(grid).toHaveLength(7);
    expect(grid[4][10]).toBe(2);
    expect(grid[0][10]).toBe(1);
  });

  it('countByDay: останній елемент — сьогодні', () => {
    const counts = countByDay([NOW, new Date(2026, 10, 5), new Date(2026, 9, 1)], 3, NOW);
    expect(counts).toEqual([0, 1, 1]);
  });
});
