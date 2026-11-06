import { Component, computed, inject } from '@angular/core';
import { formatPercent } from '../../core/format';
import { TPipe } from '../../i18n/i18n';
import { Panel } from '../../shared/panel';
import { AnalyticsService } from '../analytics/analytics.service';

let nextId = 0;

/** Быстрая статистика: доли в процентах с полосками */
@Component({
  selector: 'app-quick-stats',
  imports: [Panel, TPipe],
  template: `
    <app-panel heading="Швидка статистика">
      <ul>
        @for (r of rows(); track r.label; let i = $index) {
          <li>
            <div class="line">
              <span [id]="r.id">{{ r.label | t }}</span>
              <span class="value">{{ r.text }}</span>
            </div>
            <div
              class="track"
              role="progressbar"
              [attr.aria-labelledby]="r.id"
              aria-valuemin="0"
              aria-valuemax="100"
              [attr.aria-valuenow]="r.rounded"
              [attr.aria-valuetext]="r.text"
            >
              <div
                class="bar"
                [class]="r.tone"
                [style.width.%]="r.value"
                [style.--d]="400 + i * 120 + 'ms'"
              ></div>
            </div>
          </li>
        }
      </ul>
    </app-panel>
  `,
  styles: `
    ul {
      display: flex;
      flex-direction: column;
      gap: 18px;
      margin: 4px 0 0;
      padding: 0;
      list-style: none;
    }
    .line {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 14px;
      color: var(--app-muted);
    }
    .value {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--app-text);
    }
    .track {
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: light-dark(#e6e9ef, #26262a);
    }
    .bar {
      height: 100%;
      border-radius: inherit;
      background: var(--app-accent);
      transition: width 0.6s ease;
      animation: grow 1s cubic-bezier(0.2, 0.7, 0.2, 1) backwards;
      animation-delay: var(--d, 0ms);
    }
    @keyframes grow {
      from {
        width: 0;
      }
    }
    .bar.green {
      background: light-dark(#13803a, #4ade80);
    }
    .bar.red {
      background: light-dark(#c62828, #f87171);
    }
    .bar.orange {
      background: light-dark(#b45309, #fb923c);
    }
    @media (prefers-reduced-motion: reduce) {
      .bar {
        transition: none;
        animation: none;
      }
    }
  `,
})
export class QuickStats {
  private readonly analytics = inject(AnalyticsService);
  private readonly uid = nextId++;

  protected readonly rows = computed(() => {
    const s = this.analytics.quickStats();
    return [
      { label: 'Доставлені замовлення', value: s.delivered, tone: 'green' },
      { label: 'Скасовані замовлення', value: s.cancelled, tone: 'red' },
      { label: 'Товари в наявності', value: s.inStock, tone: 'blue' },
      { label: 'Повторні покупці', value: s.repeat, tone: 'orange' },
    ].map((r, i) => ({
      ...r,
      id: `quick-${this.uid}-${i}`,
      rounded: Math.round(r.value),
      text: formatPercent(r.value),
    }));
  });
}
