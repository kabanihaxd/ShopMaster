import { computed, effect, inject, Service } from '@angular/core';
import { addDoc, collection, deleteDoc, doc, DocumentData, setDoc, updateDoc } from 'firebase/firestore';
import { AuthService } from '../../core/auth';
import { db, liveCollection } from '../../core/firestore';
import { ReadOnlyGuard } from '../../core/read-only';
import { t } from '../../i18n/i18n';
import { Category } from './product';
import { ProductsService } from './products.service';

/** Стартовые категории (фиксированные id — повторный запуск из другой вкладки ничего не задвоит) */
export const DEFAULT_CATEGORIES: { id: string; name: string }[] = [
  { id: 'electronics', name: 'Електроніка' },
  { id: 'clothing', name: 'Одяг' },
  { id: 'home', name: 'Дім і сад' },
  { id: 'sport', name: 'Спорт' },
  { id: 'beauty', name: 'Краса' },
];

const toCategory = (id: string, d: DocumentData): Category => ({ id, name: String(d['name'] ?? '') });

/** Категории товаров. Пустую базу один раз заполняем стартовым набором (на языке интерфейса). */
@Service()
export class CategoriesService {
  private readonly live = liveCollection('categories', toCategory);
  private readonly products = inject(ProductsService);
  private readonly auth = inject(AuthService);
  private readonly guard = inject(ReadOnlyGuard);

  readonly categories = computed(() =>
    [...this.live.data()].sort((a, b) => a.name.localeCompare(b.name)),
  );
  readonly loading = this.live.loading;

  readonly nameById = computed(() => new Map(this.categories().map((c) => [c.id, c.name])));

  /** Сколько товаров в каждой категории */
  readonly productCount = computed(() => {
    const map = new Map<string, number>();
    for (const p of this.products.products()) map.set(p.categoryId, (map.get(p.categoryId) ?? 0) + 1);
    return map;
  });

  constructor() {
    let seeded = false;
    effect(() => {
      if (seeded || this.auth.isGuest() || this.live.loading() || this.live.error() || this.live.data().length) return;
      seeded = true;
      for (const c of DEFAULT_CATEGORIES) {
        void setDoc(doc(db(), 'categories', c.id), { name: t(c.name) });
      }
    });
  }

  /** Есть ли уже категория с таким названием (без учёта регистра) */
  exists(name: string, exceptId?: string): boolean {
    const n = name.trim().toLowerCase();
    return this.categories().some((c) => c.id !== exceptId && c.name.trim().toLowerCase() === n);
  }

  async add(name: string): Promise<void> {
    this.guard.check();
    await addDoc(collection(db(), 'categories'), { name: name.trim() });
  }

  async rename(id: string, name: string): Promise<void> {
    this.guard.check();
    await updateDoc(doc(db(), 'categories', id), { name: name.trim() });
  }

  /** Удалять можно только пустую категорию (проверяется в интерфейсе) */
  async remove(id: string): Promise<void> {
    this.guard.check();
    await deleteDoc(doc(db(), 'categories', id));
  }
}
