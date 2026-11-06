import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { formatDateTime, formatMoney } from '../../core/format';
import { TPipe } from '../../i18n/i18n';
import { Panel } from '../../shared/panel';
import { AnalyticsService } from '../analytics/analytics.service';
import { Order } from '../orders/order';
import { StatusBadge } from '../orders/status-badge';

/** Последние 5 заказов */
@Component({
  selector: 'app-recent-orders',
  imports: [MatButtonModule, RouterLink, Panel, StatusBadge, TPipe],
  template: `
    <app-panel heading="Останні замовлення">
      <a mat-button action routerLink="/orders">{{ 'Усі' | t }}</a>
      @if (orders().length) {
        <ul>
          @for (o of orders(); track o.id) {
            <li>
              <a class="link" routerLink="/orders" [queryParams]="{ order: o.id }">
                <div class="main">
                  <span class="title">№{{ o.number }} · {{ o.customerName }}</span>
                  <span class="sub">{{ date(o) }}</span>
                </div>
                <div class="side">
                  <span class="sum">{{ money(o.total) }}</span>
                  <app-status-badge [status]="o.status" />
                </div>
              </a>
            </li>
          }
        </ul>
      } @else {
        <p class="empty">{{ 'Замовлень ще немає' | t }}</p>
      }
    </app-panel>
  `,
  styleUrl: './dashboard-list.scss',
})
export class RecentOrders {
  protected readonly orders = inject(AnalyticsService).recentOrders;

  protected date(o: Order): string {
    return formatDateTime(o.createdAt);
  }

  protected money(value: number): string {
    return formatMoney(value);
  }
}
