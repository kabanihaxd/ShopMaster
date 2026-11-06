/** Пользователь попросил систему уменьшить анимации */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Плавное замедление к концу */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
