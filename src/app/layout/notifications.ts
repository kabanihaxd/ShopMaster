import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { formatMoney } from '../core/format';
import { AnalyticsService } from '../features/analytics/analytics.service';
import { t, TPipe } from '../i18n/i18n';

interface Notice {
  id: string;
  icon: string;
  tone: 'info' | 'warn' | 'danger';
  title: string;
  text: string;
  link: string;
  /** Какую карточку открыть на странице */
  query: Record<string, string>;
}

/** Колокольчик: новые заказы и товары, которые заканчиваются */
@Component({
  selector: 'app-notifications',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, RouterLink, TPipe],
  template: `
    <button
      mat-icon-button
      class="bell"
      [matMenuTriggerFor]="menu"
      [attr.aria-label]="buttonLabel()"
      [matTooltip]="'Сповіщення' | t"
    >
      <mat-icon>notifications</mat-icon>
      @if (total()) {
        <span class="badge" aria-hidden="true">{{ total() > 99 ? '99+' : total() }}</span>
      }
    </button>

    <mat-menu #menu="matMenu" xPosition="before" class="notices-menu">
      <p class="head">{{ 'Сповіщення' | t }}</p>
      @for (n of notices(); track n.id) {
        <a mat-menu-item [routerLink]="n.link" [queryParams]="n.query" class="notice">
          <span class="icon" [class]="n.tone" aria-hidden="true">
            <mat-icon>{{ n.icon }}</mat-icon>
          </span>
          <span class="body">
            <span class="title">{{ n.title }}</span>
            <span class="text">{{ n.text }}</span>
          </span>
        </a>
      } @empty {
        <p class="empty">{{ 'Немає нових сповіщень' | t }}</p>
      }
      @if (total() > notices().length) {
        <p class="more">{{ 'Ще {n}…' | t: { n: total() - notices().length } }}</p>
      }
    </mat-menu>
  `,
  styleUrl: './notifications.scss',
})
export class Notifications {
  private readonly analytics = inject(AnalyticsService);

  protected readonly total = computed(
    () => this.analytics.newOrders().length + this.analytics.lowStock().length,
  );

  protected readonly buttonLabel = computed(() =>
    this.total() ? t('Сповіщення: {n}', { n: this.total() }) : t('Сповіщення'),
  );

  /** Не больше 6 строк: сначала новые заказы, потом остатки */
  protected readonly notices = computed((): Notice[] => {
    const orders = this.analytics
      .newOrders()
      .slice(0, 3)
      .map(
        (o): Notice => ({
          id: 'o' + o.id,
          icon: 'shopping_cart',
          tone: 'info',
          title: t('Нове замовлення №{n}', { n: o.number }),
          text: `${o.customerName} · ${formatMoney(o.total)}`,
          link: '/orders',
          query: { order: o.id },
        }),
      );
    const stock = this.analytics
      .lowStock()
      .slice(0, 6 - orders.length)
      .map(
        (p): Notice => ({
          id: 'p' + p.id,
          icon: p.stock === 0 ? 'remove_shopping_cart' : 'inventory_2',
          tone: p.stock === 0 ? 'danger' : 'warn',
          title: p.stock === 0 ? t('Закінчився товар') : t('Мало на складі'),
          text: `${p.name} · ${t('{n} шт.', { n: p.stock })}`,
          link: '/products',
          query: { product: p.id },
        }),
      );
    return [...orders, ...stock];
  });
}
