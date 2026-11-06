import { effect, inject, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * Открывает элемент по id из query-параметра (например, /orders?order=abc из уведомления),
 * как только данные загрузились, и убирает параметр из адреса — чтобы обновление страницы
 * не открывало карточку повторно, а повторный клик по той же ссылке снова срабатывал.
 * Вызывать в конструкторе компонента страницы.
 */
export function openByQueryParam<T extends { id: string }>(options: {
  param: string;
  /** Значение параметра (input страницы, привязанный через withComponentInputBinding) */
  id: () => string | undefined;
  items: () => T[];
  loading: () => boolean;
  open: (item: T) => void;
}) {
  const router = inject(Router);
  const route = inject(ActivatedRoute);

  effect(() => {
    const id = options.id();
    if (!id || options.loading()) return;
    const item = options.items().find((i) => i.id === id);
    untracked(() => {
      if (item) options.open(item);
      void router.navigate([], {
        relativeTo: route,
        queryParams: { [options.param]: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  });
}
