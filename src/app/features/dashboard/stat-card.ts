import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { formatNumber, formatPercent } from '../../core/format';
import { TPipe } from '../../i18n/i18n';
import { CountUp } from '../../shared/count-up';
import { Sparkline } from '../../shared/sparkline';

export type StatTone = 'blue' | 'green' | 'purple' | 'orange';

/** Карточка показателя: цветная иконка, подпись, значение и (необязательно) изменение в процентах */
@Component({
  selector: 'app-stat-card',
  imports: [MatIconModule, CountUp, Sparkline, TPipe],
  host: { '[class]': 'tone()' },
  template: `
    @let c = change();
    <div class="top">
      @if (icon()) {
        <span class="icon" aria-hidden="true"><mat-icon>{{ icon() }}</mat-icon></span>
      }
      @if (c !== undefined) {
        <mat-icon class="trend" [class.down]="c < 0" aria-hidden="true">
          {{ c < 0 ? 'trending_down' : 'trending_up' }}
        </mat-icon>
      }
    </div>
    <h3>{{ label() | t }}</h3>
    <p class="value">
      @if (amount() !== undefined) {
        <app-count-up [value]="amount() ?? 0" [format]="format()" />
      } @else {
        {{ value() }}
      }
    </p>
    @if (c !== undefined) {
      <p class="change" [class.down]="c < 0">
        <span class="sr-only">{{ (c < 0 ? 'Зниження' : 'Зростання') | t }}</span>
        {{ c < 0 ? '−' : '+' }}{{ percent() }}
        @if (hint()) {
          <span class="hint">{{ hint() | t }}</span>
        }
      </p>
    } @else if (note()) {
      <p class="change neutral">{{ note() }}</p>
    }
    @if (trend().length > 1) {
      <app-sparkline class="spark" [values]="trend()" />
    }
  `,
  styles: `
    :host {
      --tone: light-dark(#2c47c4, #748ffc);
      display: block;
      height: 100%;
      box-sizing: border-box;
      padding: 20px;
      border: 1px solid var(--app-border);
      border-radius: var(--app-radius);
      background: var(--app-surface);
      transition:
        box-shadow 0.2s,
        transform 0.2s;
    }
    :host(:hover) {
      box-shadow: 0 6px 20px light-dark(rgb(20 22 26 / 0.08), rgb(0 0 0 / 0.5));
      transform: translateY(-1px);
    }
    :host(.green) {
      --tone: light-dark(#13803a, #4ade80);
    }
    :host(.purple) {
      --tone: light-dark(#7e22ce, #c084fc);
    }
    :host(.orange) {
      --tone: light-dark(#b45309, #fb923c);
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 40px;
      margin-bottom: 14px;
    }
    .spark {
      margin-top: 12px;
      color: var(--tone);
    }
    .icon {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      color: var(--tone);
      background: color-mix(in srgb, var(--tone) 15%, transparent);
    }
    .trend {
      color: var(--app-success);
    }
    .trend.down {
      color: var(--app-danger);
    }
    h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: var(--app-muted);
    }
    .value {
      margin: 4px 0 0;
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
      font-variant-numeric: tabular-nums;
    }
    .change {
      margin: 6px 0 0;
      font-size: 13px;
      font-weight: 500;
      color: var(--app-success);
    }
    .change.down {
      color: var(--app-danger);
    }
    .change.neutral {
      font-weight: 400;
      color: var(--app-muted);
    }
    .hint {
      margin-left: 4px;
      font-weight: 400;
      color: var(--app-muted);
    }
    @media (prefers-reduced-motion: reduce) {
      :host {
        transition: none;
      }
      :host(:hover) {
        transform: none;
      }
    }
  `,
})
export class StatCard {
  /** Ключ перевода подписи */
  readonly label = input.required<string>();
  /** Уже отформатированное значение (если не задан amount) */
  readonly value = input('');
  /** Числовое значение — показывается с анимацией «набегания» */
  readonly amount = input<number>();
  readonly format = input<(n: number) => string>((n) => formatNumber(Math.round(n)));
  /** Ряд для мини-графика внизу карточки */
  readonly trend = input<number[]>([]);
  /** Иконка Material Symbols в цветном квадрате */
  readonly icon = input('');
  readonly tone = input<StatTone>('blue');
  /** Изменение в процентах (12.5 = +12,5 %) */
  readonly change = input<number>();
  /** Ключ перевода пояснения к изменению, например «за 30 днів» */
  readonly hint = input('');
  /** Уже переведённая строка под значением, когда изменения нет */
  readonly note = input('');

  protected readonly percent = computed(() => formatPercent(Math.abs(this.change() ?? 0)));
}
