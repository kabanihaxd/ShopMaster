import { Component, computed, inject } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { formatMoney, formatNumber } from '../../core/format';
import { t, TPipe } from '../../i18n/i18n';
import { AnalyticsService } from '../analytics/analytics.service';
import { LowStock } from './low-stock';
import { QuickStats } from './quick-stats';
import { RecentActivity } from './recent-activity';
import { RecentOrders } from './recent-orders';
import { RevenueStats } from './revenue-stats';
import { SalesChart } from './sales-chart';
import { StatCard, StatTone } from './stat-card';
import { TopProducts } from './top-products';

const money = (n: number) => formatMoney(n, 0);
const count = (n: number) => formatNumber(Math.round(n));

/** Главная страница: ключевые показатели, график продаж и сводные блоки */
@Component({
  selector: 'app-dashboard',
  imports: [
    MatProgressBarModule,
    StatCard,
    SalesChart,
    RevenueStats,
    RecentOrders,
    TopProducts,
    LowStock,
    RecentActivity,
    QuickStats,
    TPipe,
  ],
  template: `
    @if (analytics.loading()) {
      <mat-progress-bar mode="indeterminate" [attr.aria-label]="'Завантаження…' | t" />
    }
    <div class="welcome rise">
      <p class="greeting">{{ greeting() | t }}</p>
      <p class="lead">{{ 'Ось що відбувається у вашому магазині.' | t }}</p>
    </div>

    <section aria-labelledby="stats-title">
      <h2 id="stats-title" class="sr-only">{{ 'Ключові показники' | t }}</h2>
      <div class="stats">
        @for (s of stats(); track s.label; let i = $index) {
          <app-stat-card
            class="rise"
            [style.--i]="i + 1"
            [label]="s.label"
            [amount]="s.amount"
            [format]="s.format"
            [trend]="s.trend"
            [icon]="s.icon"
            [tone]="s.tone"
            [change]="s.change"
            [hint]="s.hint"
            [note]="s.note"
          />
        }
      </div>
    </section>

    <div class="row wide-first">
      <app-sales-chart class="rise" style="--i: 5" />
      <app-revenue-stats class="rise" style="--i: 6" />
    </div>

    <div class="row thirds">
      <app-recent-orders class="rise" style="--i: 7" />
      <app-top-products class="rise" style="--i: 8" />
      <app-low-stock class="rise" style="--i: 9" />
    </div>

    <div class="row wide-first">
      <app-recent-activity class="rise" style="--i: 10" />
      <app-quick-stats class="rise" style="--i: 11" />
    </div>
  `,
  styles: `
    .welcome {
      margin-bottom: 20px;
    }
    .greeting {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .lead {
      margin: 4px 0 0;
      color: var(--app-muted);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .row {
      display: grid;
      gap: 16px;
      margin-top: 16px;
    }
    .wide-first {
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    }
    .thirds {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    @media (max-width: 1199px) {
      .thirds {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 899px) {
      .wide-first,
      .thirds {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export default class Dashboard {
  protected readonly analytics = inject(AnalyticsService);

  /** Приветствие по времени суток */
  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 5 || hour >= 18) return 'Доброго вечора!';
    return hour < 12 ? 'Доброго ранку!' : 'Доброго дня!';
  });

  protected readonly stats = computed(() => {
    const k = this.analytics.kpis();
    const spark = this.analytics.sparks();
    const card = (
      label: string,
      amount: number,
      icon: string,
      tone: StatTone,
      opts: { change?: number; note?: string; trend?: number[]; money?: boolean } = {},
    ) => ({
      label,
      amount,
      icon,
      tone,
      change: opts.change,
      hint: opts.change === undefined ? '' : 'за 30 днів',
      note: opts.note ?? '',
      trend: opts.trend ?? [],
      format: opts.money ? money : count,
    });
    return [
      card('Загальний дохід', k.revenue, 'payments', 'blue', {
        change: k.revenueChange,
        trend: spark.revenue,
        money: true,
      }),
      card('Усього замовлень', k.orders, 'shopping_cart', 'purple', {
        change: k.ordersChange,
        trend: spark.orders,
      }),
      card('Усього товарів', k.products, 'deployed_code', 'orange', {
        note: t('{n} у продажу', { n: k.activeProducts }),
      }),
      card('Усього клієнтів', k.customers, 'group', 'green', {
        note: t('+{n} нових за 30 днів', { n: k.newCustomers }),
        trend: spark.customers,
      }),
    ];
  });
}
