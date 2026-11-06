import { Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { formatNumber, formatPercent } from '../../core/format';
import { ThemeService } from '../../core/theme';
import { t, TPipe } from '../../i18n/i18n';
import { chartColors, ChartView } from '../../shared/chart';
import { CountUp } from '../../shared/count-up';
import { ORDER_STATUSES, OrderStatus } from '../orders/order';
import { doughnutChart } from './charts';

/**
 * Заказы по статусам: «бублик» + список с долями + сводка.
 * Наведение на строку подсвечивает сектор, наведение на сектор — строку.
 */
@Component({
  selector: 'app-status-breakdown',
  imports: [MatIconModule, ChartView, CountUp, TPipe],
  template: `
    <div class="layout">
      <app-chart
        class="donut"
        [config]="config()"
        [label]="label()"
        [height]="240"
        (mouseleave)="active.set(null)"
      />

      <ul class="list">
        @for (r of rows(); track r.status; let i = $index) {
          <li
            [class.active]="active() === i"
            [class.dim]="active() !== null && active() !== i"
            [class.zero]="!r.value"
            [style.--c]="r.color"
            [style.--d]="i * 80 + 'ms'"
            (mouseenter)="highlight(i)"
            (mouseleave)="highlight(null)"
          >
            <span class="icon" aria-hidden="true"><mat-icon>{{ r.icon }}</mat-icon></span>
            <span class="name">{{ r.label | t }}</span>
            <span class="count">{{ r.valueText }}</span>
            <span class="pct">{{ r.shareText }}</span>
            <span class="track" aria-hidden="true">
              <span class="bar" [style.width.%]="r.share"></span>
            </span>
          </li>
        }
      </ul>
    </div>

    <dl class="summary">
      @for (s of summary(); track s.label; let i = $index) {
        <div class="cell" [class]="s.tone" [style.--d]="400 + i * 100 + 'ms'">
          <dt>{{ s.label | t }}</dt>
          <dd><app-count-up [value]="s.value" [format]="s.format" /></dd>
          <span class="hint">{{ s.hint }}</span>
        </div>
      }
    </dl>
  `,
  styleUrl: './status-breakdown.scss',
})
export class StatusBreakdown {
  private readonly theme = inject(ThemeService);
  private readonly chart = viewChild.required(ChartView);

  /** Число заказов по статусам за период */
  readonly statuses = input.required<Map<OrderStatus, number>>();

  /** Индекс подсвеченного статуса (строка/сектор) */
  protected readonly active = signal<number | null>(null);

  private readonly total = computed(() => [...this.statuses().values()].reduce((s, v) => s + v, 0));

  protected readonly rows = computed(() => {
    const colors = chartColors(this.theme.theme()).status;
    const total = this.total();
    return ORDER_STATUSES.map((s) => {
      const value = this.statuses().get(s.value) ?? 0;
      const share = total ? (value / total) * 100 : 0;
      return {
        status: s.value,
        label: s.label,
        icon: s.icon,
        color: colors[s.value],
        value,
        share,
        valueText: formatNumber(value),
        shareText: formatPercent(share),
      };
    });
  });

  protected readonly config = computed(() =>
    doughnutChart(
      this.rows().map((r) => t(r.label)),
      this.rows().map((r) => r.value),
      this.theme.theme(),
      this.rows().map((r) => r.color),
      t('замовлень'),
      // Наведение на сектор подсвечивает строку списка
      { onHover: (index) => this.active.set(index) },
    ),
  );

  protected readonly label = computed(
    () =>
      `${t('Замовлення за статусами')}: ` +
      this.rows()
        .filter((r) => r.value)
        .map((r) => `${t(r.label)} — ${r.valueText} (${r.shareText})`)
        .join(', '),
  );

  /** Сводка: успешность, сколько в работе, доля отмен */
  protected readonly summary = computed(() => {
    const get = (s: OrderStatus) => this.statuses().get(s) ?? 0;
    const total = this.total();
    const pct = (n: number) => (total ? (n / total) * 100 : 0);
    const inWork = get('new') + get('processing') + get('shipped');
    const percent = (n: number) => formatPercent(n);
    const count = (n: number) => formatNumber(Math.round(n));
    return [
      {
        label: 'Успішно доставлено',
        value: pct(get('delivered')),
        format: percent,
        hint: t('{n} замовл.', { n: get('delivered') }),
        tone: 'good',
      },
      {
        label: 'Зараз у роботі',
        value: inWork,
        format: count,
        hint: t('нові, в обробці, відправлені'),
        tone: 'info',
      },
      {
        label: 'Частка скасувань',
        value: pct(get('cancelled')),
        format: percent,
        hint: t('{n} замовл.', { n: get('cancelled') }),
        tone: 'bad',
      },
    ];
  });

  /** Наведение на строку подсвечивает сектор */
  protected highlight(index: number | null) {
    if (index !== null && !this.rows()[index].value) index = null;
    this.active.set(index);
    this.chart().setActive(index);
  }
}
