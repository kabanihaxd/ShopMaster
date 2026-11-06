import { Component, computed, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { formatDate, formatMoney } from '../../core/format';
import { TPipe } from '../../i18n/i18n';
import { Customer } from './customer';
import { CustomersService, CustomerStats } from './customers.service';

type SortKey = 'name' | 'spent' | 'orders' | 'recent';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'За ім’ям (А–Я)' },
  { key: 'spent', label: 'Найбільше витратили' },
  { key: 'orders', label: 'Найбільше замовлень' },
  { key: 'recent', label: 'Нещодавно замовляли' },
];

interface Row extends Customer {
  stats: CustomerStats;
}

const COMPARE: Record<SortKey, (a: Row, b: Row) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  spent: (a, b) => b.stats.spent - a.stats.spent,
  orders: (a, b) => b.stats.orders - a.stats.orders,
  recent: (a, b) => (b.stats.lastOrder?.getTime() ?? 0) - (a.stats.lastOrder?.getTime() ?? 0),
};

/** Список клиентов со сводкой по их заказам */
@Component({
  selector: 'app-customers',
  imports: [MatFormFieldModule, MatIconModule, MatInputModule, MatProgressBarModule, MatSelectModule, MatTableModule, RouterLink, TPipe],
  templateUrl: './customers.html',
  styleUrl: './customers.scss',
})
export default class Customers {
  protected readonly service = inject(CustomersService);

  protected readonly sorts = SORTS;
  protected readonly columns = ['name', 'contacts', 'orders', 'spent', 'last'];

  protected readonly search = signal('');
  protected readonly sort = signal<SortKey>('name');

  protected readonly visible = computed<Row[]>(() => {
    const query = this.search().trim().toLowerCase();
    return this.service
      .customers()
      .filter(
        (c) =>
          !query ||
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.phone.replace(/\s/g, '').includes(query.replace(/\s/g, '')),
      )
      .map((c) => ({ ...c, stats: this.service.stats(c.id) }))
      .sort(COMPARE[this.sort()]);
  });

  protected readonly errorKey = computed(() => {
    const code = this.service.error();
    if (!code) return null;
    return code === 'permission-denied'
      ? 'Немає доступу до бази. Перевірте правила Firestore.'
      : 'Не вдалося завантажити клієнтів. Перевірте з’єднання.';
  });

  protected readonly trackById = (_: number, c: Row) => c.id;

  protected money(value: number): string {
    return formatMoney(value);
  }

  protected date(value: Date | null): string {
    return value ? formatDate(value) : '—';
  }
}
