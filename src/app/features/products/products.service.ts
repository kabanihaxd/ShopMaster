import { computed, inject, Service } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, liveCollection } from '../../core/firestore';
import { ReadOnlyGuard } from '../../core/read-only';
import { Product, ProductInput, toProduct } from './product';

/** Товары: живой список из Firestore и операции CRUD */
@Service()
export class ProductsService {
  private readonly live = liveCollection('products', toProduct);
  private readonly guard = inject(ReadOnlyGuard);

  readonly products = this.live.data;
  readonly loading = this.live.loading;
  readonly error = this.live.error;

  readonly byId = computed(() => new Map(this.products().map((p) => [p.id, p])));

  async add(input: ProductInput): Promise<void> {
    this.guard.check();
    await addDoc(collection(db(), 'products'), {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async update(id: string, input: ProductInput): Promise<void> {
    this.guard.check();
    await updateDoc(doc(db(), 'products', id), { ...input, updatedAt: serverTimestamp() });
  }

  async remove(id: string): Promise<void> {
    this.guard.check();
    await deleteDoc(doc(db(), 'products', id));
  }

  /** Изменить остаток на delta штук (атомарно, без гонок между вкладками) */
  async changeStock(product: Product, delta: number): Promise<void> {
    if (product.stock + delta < 0) return;
    this.guard.check();
    await updateDoc(doc(db(), 'products', product.id), {
      stock: increment(delta),
      updatedAt: serverTimestamp(),
    });
  }

  /** Скрыть или показать сразу несколько товаров */
  async setActiveMany(ids: string[], active: boolean): Promise<void> {
    await this.batched(ids, (batch, ref) => batch.update(ref, { active, updatedAt: serverTimestamp() }));
  }

  /** Удалить сразу несколько товаров */
  async removeMany(ids: string[]): Promise<void> {
    await this.batched(ids, (batch, ref) => batch.delete(ref));
  }

  /** Пакетная запись по 450 операций (лимит Firestore — 500 на batch) */
  private async batched(
    ids: string[],
    apply: (batch: ReturnType<typeof writeBatch>, ref: ReturnType<typeof doc>) => void,
  ): Promise<void> {
    this.guard.check();
    for (let i = 0; i < ids.length; i += 450) {
      const batch = writeBatch(db());
      for (const id of ids.slice(i, i + 450)) apply(batch, doc(db(), 'products', id));
      await batch.commit();
    }
  }
}
