import { Component, inject } from '@angular/core';
import { formatMoney } from '../../core/format';
import { TPipe } from '../../i18n/i18n';
import { Panel } from '../../shared/panel';
import { AnalyticsService } from '../analytics/analytics.service';

/** Самые продаваемые товары (за всё время) */
@Component({
  selector: 'app-top-products',
  imports: [Panel, TPipe],
  template: `
    <app-panel heading="Найпопулярніші товари">
      @if (products().length) {
        <ol>
          @for (p of products(); track p.productId; let i = $index) {
            <li>
              <span class="rank" aria-hidden="true">{{ i + 1 }}</span>
              <div class="main">
                <span class="title">{{ p.name }}</span>
                <span class="sub">{{ 'Продано: {n} шт.' | t: { n: p.qty } }}</span>
              </div>
              <span class="sum">{{ money(p.revenue) }}</span>
            </li>
          }
        </ol>
      } @else {
        <p class="empty">{{ 'Продажів ще немає' | t }}</p>
      }
    </app-panel>
  `,
  styleUrl: './dashboard-list.scss',
})
export class TopProducts {
  protected readonly products = inject(AnalyticsService).topProducts;

  protected money(value: number): string {
    return formatMoney(value);
  }
}
