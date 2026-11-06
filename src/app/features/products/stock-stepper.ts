import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TPipe } from '../../i18n/i18n';

/** Остаток на складе с кнопками −1 / +1 */
@Component({
  selector: 'app-stock-stepper',
  imports: [MatButtonModule, MatIconModule, TPipe],
  template: `
    <div class="stepper" role="group" [attr.aria-label]="'Залишок товару «{name}»' | t: { name: name() }">
      <button
        mat-icon-button
        [disabled]="stock() <= 0"
        (click)="changed.emit(-1)"
        [attr.aria-label]="'Зменшити на 1' | t"
      >
        <mat-icon>remove</mat-icon>
      </button>
      <span class="value" aria-live="polite">{{ stock() }}</span>
      <button mat-icon-button (click)="changed.emit(1)" [attr.aria-label]="'Збільшити на 1' | t">
        <mat-icon>add</mat-icon>
      </button>
    </div>
    @if (low()) {
      <span class="low">
        <mat-icon aria-hidden="true">warning</mat-icon>
        {{ (stock() === 0 ? 'Немає' : 'Мало') | t }}
      </span>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .stepper {
      display: flex;
      align-items: center;
    }
    .value {
      min-width: 32px;
      font-weight: 500;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    .low {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 12px;
      font-weight: 500;
      color: var(--app-warning);
    }
    .low mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
  `,
})
export class StockStepper {
  readonly name = input.required<string>();
  readonly stock = input.required<number>();
  readonly low = input(false);
  /** Изменение остатка: −1 или +1 */
  readonly changed = output<number>();
}
