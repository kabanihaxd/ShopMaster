import { computed, inject, Service } from '@angular/core';
import {
  arrayUnion,
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { AuthService } from '../../core/auth';
import { db, liveCollection } from '../../core/firestore';
import { ReadOnlyGuard } from '../../core/read-only';
import { allowedStatuses, Order, OrderItem, OrderStatus, toOrder } from './order';

/** Данные для ручного создания заказа */
export interface NewOrder {
  /** Существующий клиент (id) или новый (контакты) */
  customer: { id: string } | { name: string; email: string; phone: string };
  address: string;
  note: string;
  items: { productId: string; qty: number }[];
}

/** Ошибка создания заказа: code — что пошло не так, name — какой товар */
export class OrderError extends Error {
  constructor(
    readonly code: 'stock' | 'missing-product' | 'missing-customer',
    readonly productName = '',
  ) {
    super(code);
  }
}

/** Заказы: живой список, создание (со списанием остатков) и смена статуса */
@Service()
export class OrdersService {
  private readonly live = liveCollection('orders', toOrder);
  private readonly auth = inject(AuthService);
  private readonly guard = inject(ReadOnlyGuard);

  /** Сначала новые */
  readonly orders = computed(() =>
    [...this.live.data()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  );
  readonly loading = this.live.loading;
  readonly error = this.live.error;

  /**
   * Создаёт заказ одной транзакцией: проверяет и списывает остатки,
   * выдаёт следующий номер, при необходимости создаёт клиента. Возвращает номер заказа.
   */
  async create(input: NewOrder): Promise<number> {
    this.guard.check();
    // Одинаковые товары в нескольких строках складываем
    const qtyById = new Map<string, number>();
    for (const i of input.items) qtyById.set(i.productId, (qtyById.get(i.productId) ?? 0) + i.qty);

    const database = db();
    const counterRef = doc(database, 'meta', 'counters');
    const productRefs = [...qtyById.keys()].map((id) => doc(database, 'products', id));

    return runTransaction(database, async (tx) => {
      // — сначала все чтения —
      const counter = await tx.get(counterRef);
      const productSnaps = await Promise.all(productRefs.map((ref) => tx.get(ref)));
      const existing = 'id' in input.customer ? await tx.get(doc(database, 'customers', input.customer.id)) : null;

      const items: OrderItem[] = productSnaps.map((snap) => {
        if (!snap.exists()) throw new OrderError('missing-product');
        const p = snap.data();
        const qty = qtyById.get(snap.id) ?? 0;
        if (Number(p['stock'] ?? 0) < qty) throw new OrderError('stock', String(p['name'] ?? ''));
        return {
          productId: snap.id,
          name: String(p['name'] ?? ''),
          sku: String(p['sku'] ?? ''),
          price: Number(p['price'] ?? 0),
          qty,
        };
      });

      let customerRef = existing?.ref;
      let contact: { name: string; email: string; phone: string };
      if (existing) {
        if (!existing.exists()) throw new OrderError('missing-customer');
        const c = existing.data();
        contact = { name: String(c['name'] ?? ''), email: String(c['email'] ?? ''), phone: String(c['phone'] ?? '') };
      } else {
        contact = input.customer as typeof contact;
        customerRef = doc(collection(database, 'customers'));
      }

      // — потом все записи —
      const number = Number(counter.data()?.['orderNumber'] ?? 1000) + 1;
      tx.set(counterRef, { orderNumber: number }, { merge: true });

      productSnaps.forEach((snap) =>
        tx.update(snap.ref, { stock: increment(-(qtyById.get(snap.id) ?? 0)), updatedAt: serverTimestamp() }),
      );

      if (!existing && customerRef) {
        tx.set(customerRef, { ...contact, address: input.address, createdAt: Timestamp.now() });
      }

      tx.set(doc(collection(database, 'orders')), {
        number,
        customerId: customerRef?.id ?? '',
        customerName: contact.name,
        customerEmail: contact.email,
        customerPhone: contact.phone,
        address: input.address,
        note: input.note,
        items,
        total: Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100,
        status: 'new',
        createdAt: Timestamp.now(),
        history: [this.historyEntry('new')],
      });

      return number;
    });
  }

  /** Сменить статус. При отмене товары возвращаются на склад (если они ещё существуют). */
  async setStatus(order: Order, status: OrderStatus): Promise<void> {
    this.guard.check();
    const database = db();
    const orderRef = doc(database, 'orders', order.id);

    await runTransaction(database, async (tx) => {
      const fresh = await tx.get(orderRef);
      const current = fresh.data()?.['status'];
      if (current === status || current === 'cancelled' || current === 'delivered') return;

      if (status === 'cancelled') {
        const snaps = await Promise.all(order.items.map((i) => tx.get(doc(database, 'products', i.productId))));
        snaps.forEach((snap, idx) => {
          if (snap.exists()) {
            tx.update(snap.ref, { stock: increment(order.items[idx].qty), updatedAt: serverTimestamp() });
          }
        });
      }
      tx.update(orderRef, {
        status,
        updatedAt: serverTimestamp(),
        history: arrayUnion(this.historyEntry(status)),
      });
    });
  }

  /**
   * Сменить статус сразу нескольким заказам. Заказы, которые нельзя перевести в этот статус
   * (завершённые или «назад по цепочке»), пропускаются. Возвращает число обновлённых и пропущенных.
   */
  async setStatusMany(orders: Order[], status: OrderStatus): Promise<{ updated: number; skipped: number }> {
    this.guard.check();
    let updated = 0;
    let skipped = 0;
    for (const order of orders) {
      if (!allowedStatuses(order.status).includes(status)) {
        skipped++;
        continue;
      }
      try {
        await this.setStatus(order, status);
        updated++;
      } catch {
        skipped++;
      }
    }
    return { updated, skipped };
  }

  /** Запись истории (serverTimestamp внутри массива Firestore не разрешает — берём время клиента) */
  private historyEntry(status: OrderStatus) {
    return { status, at: Timestamp.now(), by: this.auth.user()?.email ?? '' };
  }
}
