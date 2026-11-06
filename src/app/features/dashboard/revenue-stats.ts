import { Component, computed, inject } from '@angular/core';
import { formatMoney } from '../../core/format';
import { TPipe } from '../../i18n/i18n';
import { CountUp } from '../../shared/count-up';
import { Panel } from '../../shared/panel';
import { AnalyticsService } from '../analytics/analytics.service';

/** Статистика доходов: сегодня, 7 дней, месяц, средний чек */
@Component({
  selector: 'app-revenue-stats',
  imports: [CountUp, Panel, TPipe],
  template: `
    <app-panel heading="Статистика доходів">
      <dl>
        @for (row of rows(); track row.label) {
          <div class="row">
            <dt>{{ row.label | t }}</dt>
            <dd><app-count-up [value]="row.value" [format]="money" /></dd>
          </div>
        }
      </dl>
    </app-panel>
  `,
  styles: `
    dl {
      margin: 0;
    }
    .row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 0;
      border-bottom: 1px solid var(--app-border);
    }
    .row:last-child {
      border-bottom: none;
    }
    dt {
      color: var(--app-muted);
    }
    dd {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class RevenueStats {
  private readonly analytics = inject(AnalyticsService);

  protected readonly money = (n: number) => formatMoney(n);

  protected readonly rows = computed(() => {
    const s = this.analytics.revenueStats();
    return [
      { label: 'Сьогодні', value: s.today },
      { label: 'Останні 7 днів', value: s.week },
      { label: 'Цей місяць', value: s.month },
      { label: 'Середній чек', value: s.average },
    ];
  });
}
