import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { formatDateTime, formatMoney, formatNumber, formatPercent } from '../../core/format';
import { ThemeService } from '../../core/theme';
import { t, TPipe } from '../../i18n/i18n';
import { ChartView } from '../../shared/chart';
import { Panel } from '../../shared/panel';
import { StatCard, StatTone } from '../dashboard/stat-card';
import { itemCount, STATUS_LABEL } from '../orders/order';
import { AnalyticsService } from './analytics.service';
import { categoryChart, salesChart } from './charts';
import { downloadCsv, toCsv } from './csv';
import { Heatmap } from './heatmap';
import { StatusBreakdown } from './status-breakdown';

const PERIODS = [
  { days: 7, label: '7 днів' },
  { days: 30, label: '30 днів' },
  { days: 90, label: '90 днів' },
  { days: 365, label: 'Рік' },
  // 0 — весь час: от первого заказа до сегодня (совпадает с карточками дашборда)
  { days: 0, label: 'Весь час' },
];

/** Аналитика за выбранный период: показатели, графики, топ товаров и выгрузка отчёта */
@Component({
  selector: 'app-analytics',
  imports: [MatButtonModule, MatButtonToggleModule, MatIconModule, ChartView, Heatmap, Panel, StatCard, StatusBreakdown, TPipe],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export default class Analytics {
  private readonly analytics = inject(AnalyticsService);
  private readonly theme = inject(ThemeService);

  protected readonly periods = PERIODS;
  /** Выбранный период; 0 — весь час */
  protected readonly selected = signal(0);
  /** Длина периода в днях */
  protected readonly days = computed(() => this.selected() || this.analytics.allTimeDays());
  protected readonly data = computed(() => this.analytics.period(this.days()));

  protected readonly kpis = computed(() => {
    const { totals, change } = this.data();
    const hint = 'до попереднього періоду';
    const series = this.data().series;
    const money0 = (n: number) => formatMoney(n, 0);
    const money2 = (n: number) => formatMoney(n);
    const count = (n: number) => formatNumber(Math.round(n));
    const cards: {
      label: string;
      amount: number;
      format: (n: number) => string;
      trend: number[];
      icon: string;
      tone: StatTone;
      change?: number;
      hint: string;
    }[] = [
      // Без копеек — как на дашборде
      {
        label: 'Дохід',
        amount: totals.revenue,
        format: money0,
        trend: series.map((b) => b.revenue),
        icon: 'payments',
        tone: 'blue',
        change: change.revenue,
        hint,
      },
      {
        label: 'Замовлення',
        amount: totals.orders,
        format: count,
        trend: series.map((b) => b.orders),
        icon: 'shopping_cart',
        tone: 'purple',
        change: change.orders,
        hint,
      },
      {
        label: 'Середній чек',
        amount: totals.average,
        format: money2,
        trend: series.map((b) => (b.paid ? b.revenue / b.paid : 0)),
        icon: 'receipt_long',
        tone: 'green',
        change: change.average,
        hint,
      },
      {
        label: 'Продано товарів',
        amount: totals.items,
        format: count,
        trend: series.map((b) => b.items),
        icon: 'inventory_2',
        tone: 'orange',
        change: change.items,
        hint,
      },
    ];
    return cards;
  });

  protected readonly salesConfig = computed(() =>
    salesChart(this.data().series, this.days() > 90, this.theme.theme(), this.data().previous),
  );
  protected readonly salesLabel = computed(() =>
    t('Дохід і замовлення за {days} дн.: дохід {revenue}, замовлень {orders}', {
      days: this.days(),
      revenue: formatMoney(this.data().totals.revenue),
      orders: this.data().totals.orders,
    }),
  );

  private readonly categoryRows = computed(() =>
    this.data().categories.map((c) => ({ label: c.name || t('Без категорії'), value: c.revenue })),
  );
  protected readonly hasCategories = computed(() => this.categoryRows().length > 0);
  protected readonly categoryConfig = computed(() =>
    categoryChart(
      this.categoryRows().map((r) => r.label),
      this.categoryRows().map((r) => r.value),
      this.theme.theme(),
    ),
  );
  protected readonly categoryLabel = computed(
    () =>
      `${t('Дохід за категоріями')}: ` +
      this.categoryRows()
        .map((r) => `${r.label} — ${formatMoney(r.value)}`)
        .join(', '),
  );
  protected readonly categoryHeight = computed(() => Math.max(160, this.categoryRows().length * 44 + 40));

  protected readonly top = computed(() => {
    const revenue = this.data().totals.revenue;
    const leader = Math.max(0, ...this.data().top.map((p) => p.revenue));
    return this.data().top.map((p) => ({
      ...p,
      revenueText: formatMoney(p.revenue),
      share: revenue ? formatPercent((p.revenue / revenue) * 100) : '—',
      // Ширина полоски — относительно лидера, чтобы разница была заметнее
      sharePct: leader ? (p.revenue / leader) * 100 : 0,
    }));
  });

  protected exportCsv() {
    const header = ['№', t('Дата'), t('Клієнт'), t('Пошта'), t('Товарів'), t('Сума'), t('Статус')];
    const rows = this.data().orders.map((o) => [
      o.number,
      formatDateTime(o.createdAt),
      o.customerName,
      o.customerEmail,
      itemCount(o),
      o.total.toFixed(2),
      t(STATUS_LABEL.get(o.status) ?? ''),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`shopmaster-orders-${this.days()}d-${today}.csv`, toCsv([header, ...rows]));
  }
}
