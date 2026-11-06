import { Component, computed, effect, ElementRef, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { formatDate, formatMoney } from '../../core/format';
import { t, TPipe } from '../../i18n/i18n';
import { CustomersService } from '../../features/customers/customers.service';
import { STATUS_LABEL } from '../../features/orders/order';
import { OrdersService } from '../../features/orders/orders.service';
import { ProductsService } from '../../features/products/products.service';

interface Item {
  key: string;
  icon: string;
  title: string;
  sub: string;
  meta: string;
  /** Куда перейти: путь и (необязательно) query-параметры */
  link: string[];
  query?: Record<string, string>;
}

interface Group {
  key: string;
  title: string;
  items: (Item & { index: number })[];
}

const PAGES: Item[] = [
  { key: 'p-dashboard', icon: 'grid_view', title: 'Дашборд', sub: '', meta: '', link: ['/dashboard'] },
  { key: 'p-products', icon: 'deployed_code', title: 'Товари', sub: '', meta: '', link: ['/products'] },
  { key: 'p-orders', icon: 'shopping_cart', title: 'Замовлення', sub: '', meta: '', link: ['/orders'] },
  { key: 'p-customers', icon: 'group', title: 'Клієнти', sub: '', meta: '', link: ['/customers'] },
  { key: 'p-analytics', icon: 'monitoring', title: 'Аналітика', sub: '', meta: '', link: ['/analytics'] },
  { key: 'p-settings', icon: 'settings', title: 'Налаштування', sub: '', meta: '', link: ['/settings'] },
];

const LIMIT = 5;

/**
 * Глобальный поиск (Ctrl+K): страницы, заказы (по номеру и клиенту), товары (по названию и SKU),
 * клиенты (по имени, почте, телефону). Стрелки — выбор, Enter — открыть, Esc — закрыть.
 */
@Component({
  selector: 'app-command-palette',
  imports: [MatIconModule, TPipe],
  templateUrl: './command-palette.html',
  styleUrl: './command-palette.scss',
})
export class CommandPalette {
  private readonly ref = inject<MatDialogRef<CommandPalette>>(MatDialogRef);
  private readonly router = inject(Router);
  private readonly orders = inject(OrdersService);
  private readonly products = inject(ProductsService);
  private readonly customers = inject(CustomersService);
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  protected readonly query = signal('');
  /** Выделенный результат; новый запрос — снова первый */
  protected readonly active = linkedSignal({ source: this.query, computation: () => 0 });

  protected readonly groups = computed<Group[]>(() => {
    const q = this.query().trim().toLowerCase();
    const raw: { key: string; title: string; items: Item[] }[] = [];

    const pages = PAGES.filter((p) => !q || t(p.title).toLowerCase().includes(q));
    if (pages.length) raw.push({ key: 'pages', title: 'Сторінки', items: pages.map((p) => ({ ...p, title: t(p.title) })) });

    const number = q.replace(/^[#№]/, '');
    const orders = (
      q
        ? this.orders
            .orders()
            .filter(
              (o) =>
                (/^\d+$/.test(number) && String(o.number).includes(number)) ||
                o.customerName.toLowerCase().includes(q) ||
                o.customerEmail.toLowerCase().includes(q),
            )
        : this.orders.orders()
    ).slice(0, LIMIT);
    if (orders.length) {
      raw.push({
        key: 'orders',
        title: q ? 'Замовлення' : 'Останні замовлення',
        items: orders.map((o) => ({
          key: 'o-' + o.id,
          icon: 'receipt_long',
          title: t('Замовлення №{n}', { n: o.number }),
          sub: `${o.customerName} · ${formatDate(o.createdAt)}`,
          meta: `${formatMoney(o.total)} · ${t(STATUS_LABEL.get(o.status) ?? '')}`,
          link: ['/orders'],
          query: { order: o.id },
        })),
      });
    }

    if (q) {
      const products = this.products
        .products()
        .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
        .slice(0, LIMIT);
      if (products.length) {
        raw.push({
          key: 'products',
          title: 'Товари',
          items: products.map((p) => ({
            key: 'pr-' + p.id,
            icon: 'deployed_code',
            title: p.name,
            sub: p.sku,
            meta: `${formatMoney(p.price)} · ${t('{n} шт.', { n: p.stock })}`,
            link: ['/products'],
            query: { product: p.id },
          })),
        });
      }

      const digits = q.replace(/\D/g, '');
      const customers = this.customers
        .customers()
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits)),
        )
        .slice(0, LIMIT);
      if (customers.length) {
        raw.push({
          key: 'customers',
          title: 'Клієнти',
          items: customers.map((c) => ({
            key: 'c-' + c.id,
            icon: 'person',
            title: c.name,
            sub: [c.email, c.phone].filter(Boolean).join(' · '),
            meta: '',
            link: ['/customers', c.id],
          })),
        });
      }
    }

    // Сквозная нумерация для навигации стрелками
    let index = 0;
    return raw.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, index: index++ })) }));
  });

  protected readonly flat = computed(() => this.groups().flatMap((g) => g.items));

  constructor() {
    // Выделенный пункт всегда в зоне видимости
    effect(() => {
      const id = `palette-option-${this.active()}`;
      this.list()?.nativeElement.querySelector(`#${id}`)?.scrollIntoView({ block: 'nearest' });
    });
  }

  protected onKeydown(event: KeyboardEvent) {
    const count = this.flat().length;
    if (!count) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.active.update((i) => (i + 1) % count);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.active.update((i) => (i - 1 + count) % count);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = this.flat()[this.active()];
      if (item) this.choose(item);
    }
  }

  protected choose(item: Item) {
    this.ref.close();
    void this.router.navigate(item.link, { queryParams: item.query });
  }
}
