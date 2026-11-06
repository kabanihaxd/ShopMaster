import { Component, computed, input } from '@angular/core';
import { locale } from '../../core/format';
import { lang, t, TPipe } from '../../i18n/i18n';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

/**
 * Тепловая карта заказов «день недели × час».
 * Таблица — чтобы скринридер мог пройти по ячейкам; цвет ячейки — доля от максимума.
 */
@Component({
  selector: 'app-heatmap',
  imports: [TPipe],
  template: `
    @if (peak(); as p) {
      <p class="peak">
        <span class="pulse" aria-hidden="true"></span>
        {{ 'Пік: {day}, {from}:00–{to}:00 — {n} замовл.' | t: p }}
      </p>
    }
    <div class="wrap">
      <table>
        <caption class="sr-only">{{ 'Замовлення за днями тижня та годинами' | t }}</caption>
        <thead>
          <tr>
            <td></td>
            @for (h of hours; track h) {
              <th scope="col">
                <span [class.sr-only]="h % 3 !== 0">{{ h }}</span>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.day; let r = $index) {
            <tr>
              <th scope="row">{{ row.day }}</th>
              @for (cell of row.cells; track $index; let h = $index) {
                <td>
                  <span
                    class="cell"
                    [style.--level]="cell.level"
                    [style.--d]="(r + h) * 12 + 'ms'"
                    [class.zero]="!cell.value"
                    [title]="cell.title"
                  ></span>
                  <span class="sr-only">{{ cell.value }}</span>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
    <div class="legend" aria-hidden="true">
      <span>{{ 'Менше' | t }}</span>
      @for (l of [0.08, 0.3, 0.55, 0.8, 1]; track l) {
        <span class="cell static" [style.--level]="l"></span>
      }
      <span>{{ 'Більше' | t }}</span>
    </div>
  `,
  styleUrl: './heatmap.scss',
})
export class Heatmap {
  /** 7 строк (пн…нд) × 24 часа */
  readonly grid = input.required<number[][]>();

  protected readonly hours = HOURS;

  private readonly dayNames = computed(() => {
    lang();
    const fmt = new Intl.DateTimeFormat(locale(), { weekday: 'short' });
    // 2024-01-01 — понедельник
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
  });

  private readonly max = computed(() => Math.max(1, ...this.grid().flat()));

  protected readonly rows = computed(() =>
    this.grid().map((hours, d) => ({
      day: this.dayNames()[d],
      cells: hours.map((value, h) => ({
        value,
        // Минимальная заметность для ненулевых ячеек
        level: value ? 0.12 + (value / this.max()) * 0.88 : 0,
        title: `${this.dayNames()[d]}, ${h}:00–${h + 1}:00 — ${t('{n} замовл.', { n: value })}`,
      })),
    })),
  );

  protected readonly peak = computed(() => {
    let best = { d: 0, h: 0, n: 0 };
    this.grid().forEach((hours, d) =>
      hours.forEach((n, h) => {
        if (n > best.n) best = { d, h, n };
      }),
    );
    if (!best.n) return null;
    return { day: this.dayNames()[best.d], from: best.h, to: best.h + 1, n: best.n };
  });
}
