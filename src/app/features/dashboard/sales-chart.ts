import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { formatMoney } from '../../core/format';
import { ThemeService } from '../../core/theme';
import { t, TPipe } from '../../i18n/i18n';
import { ChartView } from '../../shared/chart';
import { Panel } from '../../shared/panel';
import { AnalyticsService } from '../analytics/analytics.service';
import { salesChart } from '../analytics/charts';

/** График продаж за неделю или месяц */
@Component({
  selector: 'app-sales-chart',
  imports: [MatButtonToggleModule, ChartView, Panel, TPipe],
  template: `
    <app-panel heading="Продажі">
      <mat-button-toggle-group
        action
        hideSingleSelectionIndicator
        [value]="days()"
        (change)="days.set($event.value)"
        [attr.aria-label]="'Період' | t"
      >
        <mat-button-toggle [value]="7">{{ 'Тиждень' | t }}</mat-button-toggle>
        <mat-button-toggle [value]="30">{{ 'Місяць' | t }}</mat-button-toggle>
      </mat-button-toggle-group>
      <app-chart [config]="config()" [label]="summary()" [height]="300" />
    </app-panel>
  `,
})
export class SalesChart {
  private readonly analytics = inject(AnalyticsService);
  private readonly theme = inject(ThemeService);

  protected readonly days = signal(7);
  private readonly buckets = computed(() => this.analytics.series(this.days()));

  private readonly previous = computed(() => this.analytics.previousSeries(this.days()));

  protected readonly config = computed(() =>
    salesChart(this.buckets(), false, this.theme.theme(), this.previous()),
  );

  protected readonly summary = computed(() => {
    const b = this.buckets();
    return t('Графік продажів за {days} дн.: дохід {revenue}, замовлень {orders}', {
      days: this.days(),
      revenue: formatMoney(b.reduce((s, x) => s + x.revenue, 0)),
      orders: b.reduce((s, x) => s + x.orders, 0),
    });
  });
}
