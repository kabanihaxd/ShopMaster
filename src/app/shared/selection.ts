import { computed, signal } from '@angular/core';

/**
 * Выделение строк таблицы для массовых действий.
 * Работает поверх видимого списка: то, что скрыто фильтром, в «выбранные» не попадает.
 */
export class Selection<T extends { id: string }> {
  private readonly ids = signal<ReadonlySet<string>>(new Set());

  constructor(private readonly items: () => T[]) {}

  /** Выбранные элементы из видимых */
  readonly selected = computed(() => {
    const ids = this.ids();
    return this.items().filter((i) => ids.has(i.id));
  });
  readonly count = computed(() => this.selected().length);
  readonly all = computed(() => this.items().length > 0 && this.count() === this.items().length);
  readonly some = computed(() => this.count() > 0 && !this.all());

  has(id: string): boolean {
    return this.ids().has(id);
  }

  toggle(id: string) {
    this.ids.update((ids) => {
      const next = new Set(ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Выбрать все видимые или снять выбор, если все уже выбраны */
  toggleAll() {
    this.ids.set(this.all() ? new Set() : new Set(this.items().map((i) => i.id)));
  }

  clear() {
    this.ids.set(new Set());
  }
}
