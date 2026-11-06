import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { formatDateTime, formatMoney, locale } from '../../core/format';
import { t, TPipe } from '../../i18n/i18n';
import { Panel } from '../../shared/panel';
import { ActivityEvent, AnalyticsService } from '../analytics/analytics.service';
import { STATUS_LABEL } from '../orders/order';

type Tone = 'blue' | 'green' | 'purple' | 'orange' | 'red';

interface Row {
  id: string;
  icon: string;
  tone: Tone;
  title: string;
  text: string;
  ago: string;
  exact: string;
  link: string;
  query: Record<string, string> | null;
}

/** «5 хв тому», «вчора», «3 дні тому» — на языке интерфейса */
function timeAgo(date: Date, now: Date): string {
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  const minutes = Math.round((date.getTime() - now.getTime()) / 60000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(days, 'day');
  return rtf.format(Math.round(days / 30), 'month');
}

const ORDER_TONE: Record<string, Tone> = {
  new: 'blue',
  processing: 'orange',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
};

/** Лента последних событий магазина: новые заказы и новые клиенты */
@Component({
  selector: 'app-recent-activity',
  imports: [MatButtonModule, MatIconModule, RouterLink, Panel, TPipe],
  template: `
    <app-panel heading="Остання активність">
      <a mat-button action routerLink="/orders">{{ 'Усі' | t }}</a>
      @if (rows().length) {
        <ul>
          @for (r of rows(); track r.id) {
            <li>
              <a class="row" [routerLink]="r.link" [queryParams]="r.query">
                <span class="icon" [class]="r.tone" aria-hidden="true"><mat-icon>{{ r.icon }}</mat-icon></span>
                <span class="body">
                  <span class="title">{{ r.title }}</span>
                  <span class="text">{{ r.text }}</span>
                </span>
                <time [attr.datetime]="r.exact" [title]="r.exact">{{ r.ago }}</time>
              </a>
            </li>
          }
        </ul>
      } @else {
        <p class="empty">{{ 'Подій ще немає' | t }}</p>
      }
    </app-panel>
  `,
  styleUrl: './recent-activity.scss',
})
export class RecentActivity {
  private readonly analytics = inject(AnalyticsService);

  protected readonly rows = computed(() => {
    const now = new Date();
    return this.analytics.activity().map((e) => this.toRow(e, now));
  });

  private toRow(e: ActivityEvent, now: Date): Row {
    const common = { id: e.kind + e.id, ago: timeAgo(e.date, now), exact: formatDateTime(e.date) };
    if (e.kind === 'customer') {
      return {
        ...common,
        icon: 'person_add',
        tone: 'purple',
        title: t('Новий клієнт'),
        text: [e.customer.name, e.customer.email].filter(Boolean).join(' · '),
        link: '/customers',
        query: null,
      };
    }
    const o = e.order;
    return {
      ...common,
      icon: o.status === 'cancelled' ? 'remove_shopping_cart' : 'shopping_cart',
      tone: ORDER_TONE[o.status] ?? 'blue',
      title: t('Замовлення №{n}', { n: o.number }) + ' · ' + t(STATUS_LABEL.get(o.status) ?? ''),
      text: `${o.customerName} · ${formatMoney(o.total)}`,
      link: '/orders',
      query: { order: o.id },
    };
  }
}
