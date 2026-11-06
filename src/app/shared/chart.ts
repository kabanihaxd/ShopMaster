import { afterRenderEffect, Component, DestroyRef, ElementRef, inject, input, viewChild } from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartType,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  Plugin,
  PointElement,
  Tooltip,
} from 'chart.js';
import { currencyCode, locale } from '../core/format';
import { Theme } from '../core/theme';
import { prefersReducedMotion } from './motion';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);
Chart.defaults.font.family = 'Roboto, sans-serif';

// Анимации: плавное появление и переходы между данными (если пользователь не просил меньше движения).
// ВАЖНО: менять свойства, а не заменять объект целиком. Замена теряет служебные настройки Chart.js,
// анимация падает с «this._fn is not a function», и общий цикл анимации всех графиков
// останавливается — графики замирают на середине кадра и не реагируют на мышь.
if (prefersReducedMotion()) {
  Chart.defaults.animation = false;
} else if (Chart.defaults.animation) {
  Object.assign(Chart.defaults.animation, { duration: 900, easing: 'easeOutQuart' });
}

// Подсказки в едином стиле
Object.assign(Chart.defaults.plugins.tooltip, {
  backgroundColor: 'rgba(17, 19, 26, 0.92)',
  borderColor: 'rgba(255, 255, 255, 0.08)',
  borderWidth: 1,
  padding: 12,
  cornerRadius: 10,
  boxPadding: 6,
  usePointStyle: true,
  titleFont: { weight: 600 },
  caretSize: 6,
});

declare module 'chart.js' {
  interface PluginOptionsByType<TType extends ChartType> {
    /** Текст в центре кольцевой диаграммы */
    centerText?: { value: string; caption: string; color: string; muted: string };
  }
}

/** Вертикальная линия под курсором (для линейных графиков) */
export const crosshairPlugin: Plugin = {
  id: 'crosshair',
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements() ?? [];
    if (!active.length) return;
    const x = active[0].element.x;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(128, 128, 140, 0.6)';
    ctx.stroke();
    ctx.restore();
  },
};

/**
 * Итог в центре «бублика»: options.plugins.centerText.
 * Если сектор под курсором (или подсвечен снаружи) — показывает его число и долю.
 */
export const centerTextPlugin: Plugin<'doughnut'> = {
  id: 'centerText',
  afterDatasetsDraw(chart) {
    const opts = chart.options.plugins?.centerText;
    if (!opts?.value) return;
    let { value, caption = '' } = opts;
    const { color = '#888', muted = '#888' } = opts;
    let accent = color;

    const active = chart.getActiveElements()[0];
    if (active) {
      const data = chart.data.datasets[0].data as number[];
      const total = data.reduce((s, v) => s + v, 0);
      const v = data[active.index] ?? 0;
      value = new Intl.NumberFormat(locale()).format(v);
      const share = total ? Math.round((v / total) * 100) : 0;
      caption = `${chart.data.labels?.[active.index] ?? ''} · ${share}%`;
      const bg = chart.data.datasets[0].backgroundColor;
      if (Array.isArray(bg) && typeof bg[active.index] === 'string') accent = bg[active.index] as string;
    }

    const { left, right, top, bottom } = chart.chartArea;
    const x = (left + right) / 2;
    const y = (top + bottom) / 2;
    const ctx = chart.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accent;
    ctx.font = '700 28px Roboto, sans-serif';
    ctx.fillText(value, x, y - 9);
    ctx.fillStyle = muted;
    ctx.font = '500 12px Roboto, sans-serif';
    ctx.fillText(caption, x, y + 16);
    ctx.restore();
  },
};

/** #rrggbb → rgba(r, g, b, alpha) */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Цвета графиков под тему (CSS-переменные с light-dark() Chart.js прочитать не может) */
export function chartColors(theme: Theme) {
  const dark = theme === 'dark';
  return {
    text: dark ? '#a3a3aa' : '#5b6170',
    strong: dark ? '#f2f2f3' : '#14161a',
    grid: dark ? '#26262a' : '#e6e9ef',
    surface: dark ? '#0b0b0c' : '#ffffff',
    accent: dark ? '#748ffc' : '#4263eb',
    accentSoft: dark ? 'rgba(116, 143, 252, 0.25)' : 'rgba(66, 99, 235, 0.15)',
    success: dark ? '#4ade80' : '#13803a',
    previous: dark ? '#6b6b75' : '#9aa1b0',
    /** Те же цвета, что у бейджей статусов заказа (status-badge.ts) */
    status: {
      new: dark ? '#93c5fd' : '#1d4ed8',
      processing: dark ? '#fbbf24' : '#a15c00',
      shipped: dark ? '#d8b4fe' : '#7e22ce',
      delivered: dark ? '#4ade80' : '#13803a',
      cancelled: dark ? '#f87171' : '#c62828',
    },
    /** Для категорий и статусов */
    palette: dark
      ? ['#748ffc', '#4ade80', '#fbbf24', '#f87171', '#c084fc', '#22d3ee', '#f472b6', '#a3e635']
      : ['#4263eb', '#13803a', '#b45309', '#c62828', '#7e22ce', '#0e7490', '#be185d', '#4d7c0f'],
  };
}

/**
 * Обёртка над Chart.js. При смене конфигурации того же типа график не пересоздаётся,
 * а плавно перетекает к новым данным.
 * label — текстовое описание для скринридеров (canvas сам по себе им не виден).
 */
@Component({
  selector: 'app-chart',
  host: { '[style.height.px]': 'height()' },
  template: `<canvas #canvas role="img" [attr.aria-label]="label()"></canvas>`,
  styles: `
    :host {
      display: block;
      position: relative;
      min-width: 0;
    }
  `,
})
export class ChartView {
  readonly config = input.required<ChartConfiguration>();
  readonly label = input.required<string>();
  readonly height = input(280);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;
  /** Отпечаток последней отрисованной конфигурации */
  private lastKey = '';

  constructor() {
    // После отрисовки DOM: к этому моменту у контейнера уже есть высота,
    // иначе Chart.js берёт размер canvas по умолчанию (150px) и график «сплющивается»
    afterRenderEffect(() => {
      const config = this.config();
      // Те же данные пришли повторно (например, Firestore переподключился) — не трогаем график,
      // иначе сбрасывается подсказка под курсором и заново проигрывается анимация.
      // Функции в JSON не попадают, поэтому язык и валюту (от них зависят подписи) добавляем явно.
      const key = JSON.stringify([config.type, config.data, config.options, locale(), currencyCode()]);
      if (this.chart && key === this.lastKey) return;
      this.lastKey = key;

      const options = { responsive: true, maintainAspectRatio: false, ...config.options };
      const chart = this.chart;
      if (chart && (chart.config as { type?: string }).type === config.type) {
        try {
          chart.data = config.data;
          chart.options = options;
          chart.update();
          return;
        } catch {
          // Не смогли обновить на месте — пересоздадим ниже
        }
      }
      chart?.destroy();
      this.chart = new Chart(this.canvas().nativeElement, { ...config, options });
    });
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }

  /** Подсветить элемент снаружи (например, при наведении на строку списка); null — снять */
  setActive(index: number | null) {
    const chart = this.chart;
    if (!chart) return;
    chart.setActiveElements(index === null ? [] : [{ datasetIndex: 0, index }]);
    chart.update();
  }
}
