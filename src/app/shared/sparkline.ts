import { afterRenderEffect, Component, computed, ElementRef, input, viewChild } from '@angular/core';
import { prefersReducedMotion } from './motion';

let nextId = 0;

// Ширина viewBox близка к реальной ширине карточки — линия почти не растягивается
const W = 240;
const H = 36;

/**
 * Мини-график тренда (декоративный, aria-hidden): линия «прорисовывается»,
 * под ней мягкая заливка. Цвет — currentColor.
 */
@Component({
  selector: 'app-sparkline',
  host: { 'aria-hidden': 'true' },
  template: `
    @if (paths(); as p) {
      <svg [attr.viewBox]="viewBox" preserveAspectRatio="none" focusable="false">
          <defs>
            <linearGradient [id]="gradientId" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="currentColor" stop-opacity="0.28" />
              <stop offset="1" stop-color="currentColor" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path #area class="area" [attr.d]="p.area" [attr.fill]="'url(#' + gradientId + ')'" />
          <path #line class="line" [attr.d]="p.line" pathLength="1" />
        </svg>
    }
  `,
  styles: `
    :host {
      display: block;
      height: 36px;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .line {
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 1;
    }
  `,
})
export class Sparkline {
  readonly values = input.required<number[]>();

  private readonly line = viewChild<ElementRef<SVGPathElement>>('line');
  private readonly area = viewChild<ElementRef<SVGPathElement>>('area');

  protected readonly viewBox = `0 0 ${W} ${H}`;
  protected readonly gradientId = `spark-${nextId++}`;

  constructor() {
    // При каждом новом наборе данных линия «прорисовывается» заново, затем проявляется заливка
    afterRenderEffect(() => {
      this.paths();
      const line = this.line()?.nativeElement;
      const area = this.area()?.nativeElement;
      if (!line || !area || prefersReducedMotion()) return;
      line.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
        duration: 1400,
        delay: 200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'backwards',
      });
      area.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 800, delay: 900, fill: 'backwards' });
    });
  }

  /** Сглаженная линия (кривые Безье через середины отрезков) и область под ней */
  protected readonly paths = computed(() => {
    const v = this.values();
    if (v.length < 2) return null;
    const max = Math.max(...v);
    const min = Math.min(...v);
    const range = max - min || 1;
    const pts = v.map((y, i) => [(i / (v.length - 1)) * W, H - 3 - ((y - min) / range) * (H - 6)]);
    let line = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const mx = (x0 + x1) / 2;
      line += ` C${mx.toFixed(1)},${y0.toFixed(1)} ${mx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
    }
    return { line, area: `${line} L${W},${H} L0,${H} Z` };
  });
}
