import { ChartConfiguration, ScriptableContext } from 'chart.js';
import { formatMoney, formatNumber, locale } from '../../core/format';
import { Theme } from '../../core/theme';
import { t } from '../../i18n/i18n';
import { centerTextPlugin, chartColors, crosshairPlugin, withAlpha } from '../../shared/chart';
import { Bucket } from './stats';

/** Подписи оси X: «6 лист.» по дням или «лист. 26» по месяцам */
export function bucketLabels(buckets: Bucket[], byMonth: boolean): string[] {
  const fmt = new Intl.DateTimeFormat(
    locale(),
    byMonth ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' },
  );
  return buckets.map((b) => fmt.format(b.start));
}

/** Вертикальный градиент «цвет → прозрачный» под линией */
function areaGradient(color: string, strength: number) {
  return (ctx: ScriptableContext<'line'>) => {
    const { chart } = ctx;
    const area = chart.chartArea;
    if (!area) return withAlpha(color, strength / 2);
    const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, withAlpha(color, strength));
    g.addColorStop(1, withAlpha(color, 0));
    return g;
  };
}

/** Столбики появляются по очереди, слева направо */
function staggered(step: number) {
  return {
    delay: (ctx: { type: string; mode: string; dataIndex: number }) =>
      ctx.type === 'data' && ctx.mode === 'default' ? ctx.dataIndex * step : 0,
  };
}

/**
 * Продажи: доход — область с градиентом, заказы — столбики (правая ось),
 * previous — пунктирный доход за предыдущий такой же период.
 */
export function salesChart(
  buckets: Bucket[],
  byMonth: boolean,
  theme: Theme,
  previous?: Bucket[],
): ChartConfiguration {
  const c = chartColors(theme);
  const prevRevenue = previous?.slice(-buckets.length).map((b) => b.revenue) ?? [];
  const showPrevious = prevRevenue.some((v) => v > 0);

  const config: ChartConfiguration<'line' | 'bar'> = {
    type: 'bar',
    data: {
      labels: bucketLabels(buckets, byMonth),
      datasets: [
        {
          type: 'line',
          label: t('Дохід'),
          data: buckets.map((b) => b.revenue),
          borderColor: c.accent,
          borderWidth: 2.5,
          backgroundColor: areaGradient(c.accent, theme === 'dark' ? 0.45 : 0.3),
          fill: 'origin',
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
          pointHoverBackgroundColor: c.accent,
          pointHoverBorderColor: c.surface,
          yAxisID: 'y',
          order: 1,
        },
        ...(showPrevious
          ? [
              {
                type: 'line' as const,
                label: t('Попередній період'),
                data: prevRevenue,
                borderColor: c.previous,
                borderWidth: 1.5,
                borderDash: [6, 5],
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: c.previous,
                tension: 0.4,
                fill: false,
                yAxisID: 'y',
                order: 2,
              },
            ]
          : []),
        {
          type: 'bar',
          label: t('Замовлення'),
          data: buckets.map((b) => b.orders),
          backgroundColor: withAlpha(c.success, theme === 'dark' ? 0.35 : 0.3),
          hoverBackgroundColor: c.success,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 18,
          yAxisID: 'orders',
          order: 3,
        },
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      animation: staggered(buckets.length > 31 ? 6 : 25),
      plugins: {
        legend: { labels: { color: c.text, usePointStyle: true, boxHeight: 8, padding: 16 } },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              ctx.dataset.yAxisID === 'y'
                ? ` ${ctx.dataset.label}: ${formatMoney(Number(ctx.raw))}`
                : ` ${ctx.dataset.label}: ${formatNumber(Number(ctx.raw))}`,
          },
        },
      },
      scales: {
        x: { ticks: { color: c.text, maxRotation: 0, autoSkipPadding: 12 }, grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { color: c.text, callback: (v) => formatMoney(Number(v), 0) },
          grid: { color: c.grid },
          border: { display: false },
        },
        orders: {
          position: 'right',
          beginAtZero: true,
          // Столбики занимают нижнюю часть, чтобы не перекрывать линию дохода
          grace: '120%',
          ticks: { color: c.text, precision: 0 },
          grid: { display: false },
          border: { display: false },
        },
      },
    },
    plugins: [crosshairPlugin],
  };
  return config as unknown as ChartConfiguration;
}

/** Кольцевая диаграмма с итогом в центре: подписи уже переведены */
export function doughnutChart(
  labels: string[],
  values: number[],
  theme: Theme,
  /** Свои цвета секторов (например, цвета статусов); иначе общая палитра */
  colors?: string[],
  /** Подпись под числом в центре, например «замовлень» */
  caption = '',
  /** Своя легенда/список рядом с графиком: без встроенной легенды и подсказки, с колбэком наведения */
  external?: { onHover: (index: number | null) => void },
): ChartConfiguration {
  const c = chartColors(theme);
  const total = values.reduce((s, v) => s + v, 0);
  const config: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors ?? c.palette,
          borderColor: c.surface,
          borderWidth: 3,
          borderRadius: 6,
          spacing: 2,
          hoverOffset: 10,
        },
      ],
    },
    options: {
      cutout: '70%',
      layout: { padding: 8 },
      animation: { animateRotate: true, animateScale: true, duration: 1100 },
      onHover: external ? (_e, elements) => external.onHover(elements[0]?.index ?? null) : undefined,
      plugins: {
        legend: external
          ? { display: false }
          : { position: 'bottom', labels: { color: c.text, usePointStyle: true, boxHeight: 8, padding: 14 } },
        tooltip: {
          enabled: !external,
          callbacks: {
            label: (ctx) => {
              const v = Number(ctx.raw);
              const share = total ? Math.round((v / total) * 100) : 0;
              return ` ${ctx.label}: ${formatNumber(v)} (${share}%)`;
            },
          },
        },
        centerText: { value: formatNumber(total), caption, color: c.strong, muted: c.text },
      },
    },
    plugins: [centerTextPlugin],
  };
  return config as unknown as ChartConfiguration;
}

/** Горизонтальные столбцы «выручка по категориям» с градиентом */
export function categoryChart(labels: string[], values: number[], theme: Theme): ChartConfiguration {
  const c = chartColors(theme);
  const config: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: t('Дохід'),
          data: values,
          backgroundColor: (ctx) => {
            const color = c.palette[ctx.dataIndex % c.palette.length];
            const area = ctx.chart.chartArea;
            if (!area) return color;
            const g = ctx.chart.ctx.createLinearGradient(area.left, 0, area.right, 0);
            g.addColorStop(0, withAlpha(color, 0.35));
            g.addColorStop(1, color);
            return g;
          },
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 26,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      animation: staggered(90),
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${formatMoney(Number(ctx.raw))}` } },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: c.text, callback: (v) => formatMoney(Number(v), 0) },
          grid: { color: c.grid },
          border: { display: false },
        },
        y: { ticks: { color: c.text }, grid: { display: false }, border: { display: false } },
      },
    },
  };
  return config as unknown as ChartConfiguration;
}
