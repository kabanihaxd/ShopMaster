import { computed, inject, Service } from '@angular/core';
import { liveCollection } from '../../core/firestore';
import { OrdersService } from '../orders/orders.service';
import { toCustomer } from './customer';

/** Сводка по клиенту из его заказов */
export interface CustomerStats {
  orders: number;
  /** Сумма неотменённых заказов, $ */
  spent: number;
  lastOrder: Date | null;
}

const EMPTY_STATS: CustomerStats = { orders: 0, spent: 0, lastOrder: null };

/** Клиенты: живой список и статистика по заказам */
@Service()
export class CustomersService {
  private readonly live = liveCollection('customers', toCustomer);
  private readonly orders = inject(OrdersService);

  readonly customers = this.live.data;
  readonly loading = this.live.loading;
  readonly error = this.live.error;

  readonly byId = computed(() => new Map(this.customers().map((c) => [c.id, c])));

  private readonly statsMap = computed(() => {
    const map = new Map<string, CustomerStats>();
    for (const o of this.orders.orders()) {
      const s = map.get(o.customerId) ?? { ...EMPTY_STATS };
      s.orders++;
      if (o.status !== 'cancelled') s.spent += o.total;
      if (!s.lastOrder || o.createdAt > s.lastOrder) s.lastOrder = o.createdAt;
      map.set(o.customerId, s);
    }
    return map;
  });

  stats(customerId: string): CustomerStats {
    return this.statsMap().get(customerId) ?? EMPTY_STATS;
  }
}
