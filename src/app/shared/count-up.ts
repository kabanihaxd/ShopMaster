import { Component, effect, input, signal, untracked } from '@angular/core';
import { formatNumber } from '../core/format';
import { easeOutCubic, prefersReducedMotion } from './motion';

/**
 * Число, которое «набегает» до нового значения.
 * Скринридер сразу получает итоговое значение, анимированный текст от него скрыт.
 */
@Component({
  selector: 'app-count-up',
  template: `<span aria-hidden="true">{{ format()(shown()) }}</span
    ><span class="sr-only">{{ format()(value()) }}</span>`,
  styles: `
    :host {
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class CountUp {
  readonly value = input.required<number>();
  readonly format = input<(n: number) => string>((n) => formatNumber(Math.round(n)));
  /** Длительность, мс */
  readonly duration = input(1000);

  protected readonly shown = signal(0);

  constructor() {
    effect((onCleanup) => {
      const target = this.value();
      const from = untracked(this.shown);
      if (prefersReducedMotion() || from === target) {
        this.shown.set(target);
        return;
      }
      const duration = untracked(this.duration);
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        this.shown.set(from + (target - from) * easeOutCubic(p));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      let frame = requestAnimationFrame(tick);
      onCleanup(() => cancelAnimationFrame(frame));
    });
  }
}
