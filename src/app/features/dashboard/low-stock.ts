import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../../core/settings';
import { TPipe } from '../../i18n/i18n';
import { Panel } from '../../shared/panel';
import { AnalyticsService } from '../analytics/analytics.service';

/** Товары с низким остатком (до 6 штук в списке) */
@Component({
  selector: 'app-low-stock',
  imports: [MatButtonModule, MatIconModule, RouterLink, Panel, TPipe],
  template: `
    <app-panel heading="Закінчуються на складі">
      <a mat-button action routerLink="/products">{{ 'Товари' | t }}</a>
      @if (items().length) {
        <ul>
          @for (p of shown(); track p.id) {
            <li>
              <a class="link" routerLink="/products" [queryParams]="{ product: p.id }">
                <div class="main">
                  <span class="title">{{ p.name }}</span>
                  <span class="sub">{{ p.sku }}</span>
                </div>
                <span class="stock" [class.out]="p.stock === 0">
                  <mat-icon aria-hidden="true">{{ p.stock === 0 ? 'block' : 'warning' }}</mat-icon>
                  {{ (p.stock === 0 ? 'Немає' : '{n} шт.') | t: { n: p.stock } }}
                </span>
              </a>
            </li>
          }
        </ul>
        @if (items().length > shown().length) {
          <p class="more">{{ 'І ще {n}' | t: { n: items().length - shown().length } }}</p>
        }
      } @else {
        <p class="empty ok">
          <mat-icon aria-hidden="true">check_circle</mat-icon>
          {{ 'Усіх товарів достатньо (більше {n} шт.)' | t: { n: threshold() } }}
        </p>
      }
    </app-panel>
  `,
  styleUrl: './dashboard-list.scss',
})
export class LowStock {
  protected readonly items = inject(AnalyticsService).lowStock;
  protected readonly threshold = inject(SettingsService).lowStockThreshold;
  protected readonly shown = computed(() => this.items().slice(0, 6));
}
