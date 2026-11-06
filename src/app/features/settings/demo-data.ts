import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  Timestamp,
  where,
  writeBatch,
  WriteBatch,
} from 'firebase/firestore';
import { db } from '../../core/firestore';
import { t } from '../../i18n/i18n';
import { DEFAULT_CATEGORIES } from '../products/categories.service';
import { OrderItem, OrderStatus } from '../orders/order';

/**
 * Демо-данные: товары, клиенты и заказы за последние ~4 месяца, чтобы графики были живыми.
 * Все документы помечены `demo: true` — их можно удалить одной кнопкой, не трогая настоящие.
 */

const PRODUCTS: [name: string, category: string, price: number][] = [
  ['iPhone 15 128GB', 'electronics', 899],
  ['Samsung Galaxy S24', 'electronics', 849],
  ['AirPods Pro 2', 'electronics', 249],
  ['Xiaomi Redmi Note 13', 'electronics', 229],
  ['Sony WH-1000XM5', 'electronics', 349],
  ['Kindle Paperwhite', 'electronics', 149],
  ['Levi’s 501 Jeans', 'clothing', 89],
  ['Nike Tech Fleece Hoodie', 'clothing', 110],
  ['Adidas Originals T-Shirt', 'clothing', 35],
  ['The North Face Jacket', 'clothing', 220],
  ['Philips Air Fryer XL', 'home', 159],
  ['Tefal Pan Set', 'home', 79],
  ['IKEA Desk Lamp', 'home', 25],
  ['Dyson V12 Vacuum', 'home', 599],
  ['Garden Hose 25m', 'home', 39],
  ['Nike Air Zoom Pegasus', 'sport', 130],
  ['Yoga Mat Pro', 'sport', 45],
  ['Dumbbell Set 20kg', 'sport', 75],
  ['Garmin Forerunner 265', 'sport', 449],
  ['La Roche-Posay Cream', 'beauty', 28],
  ['Dyson Airwrap', 'beauty', 549],
  ['CeraVe Cleanser', 'beauty', 16],
];

const FIRST = ['Оксана', 'Андрій', 'Марія', 'Олег', 'Ірина', 'Дмитро', 'Наталія', 'Сергій', 'Юлія', 'Тарас', 'Jana', 'Peter', 'Lucia', 'Martin', 'Zuzana'];
const LAST = ['Коваленко', 'Шевчук', 'Бондар', 'Мельник', 'Ткаченко', 'Kováč', 'Horváth', 'Novák', 'Kravets', 'Lysenko'];
const CITIES = ['Київ', 'Львів', 'Одеса', 'Дніпро', 'Харків', 'Bratislava', 'Košice', 'Žilina', 'Ужгород', 'Вінниця'];
const LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya', á: 'a', č: 'c', é: 'e', í: 'i', ó: 'o', š: 's', ú: 'u', ý: 'y', ž: 'z',
};

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
const between = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const latin = (s: string) =>
  [...s.toLowerCase()].map((ch) => LATIN[ch] ?? (/[a-z0-9]/.test(ch) ? ch : '')).join('');

/** Статус по «возрасту» заказа: старые в основном доставлены, свежие — новые/в обработке */
function statusFor(daysAgo: number): OrderStatus {
  const r = Math.random();
  if (daysAgo > 10) return r < 0.88 ? 'delivered' : r < 0.96 ? 'cancelled' : 'shipped';
  if (daysAgo > 3) return r < 0.4 ? 'delivered' : r < 0.75 ? 'shipped' : r < 0.93 ? 'processing' : 'cancelled';
  return r < 0.55 ? 'new' : r < 0.9 ? 'processing' : 'shipped';
}

/** Пишет документы пачками (лимит Firestore — 500 операций на batch) */
class Batcher {
  private batch: WriteBatch = writeBatch(db());
  private count = 0;
  private readonly pending: Promise<void>[] = [];

  set(path: string, id: string | null, data: object) {
    const ref = id ? doc(db(), path, id) : doc(collection(db(), path));
    this.batch.set(ref, data);
    if (++this.count === 450) this.flush();
    return ref.id;
  }

  delete(path: string, id: string) {
    this.batch.delete(doc(db(), path, id));
    if (++this.count === 450) this.flush();
  }

  private flush() {
    this.pending.push(this.batch.commit());
    this.batch = writeBatch(db());
    this.count = 0;
  }

  async done() {
    if (this.count) this.flush();
    await Promise.all(this.pending);
  }
}

export async function hasDemoData(): Promise<boolean> {
  const snap = await getDocs(query(collection(db(), 'products'), where('demo', '==', true), limit(1)));
  return !snap.empty;
}

/** Создаёт демо-данные. Возвращает количество созданных заказов. */
export async function createDemoData(existingCategoryIds: Set<string>): Promise<number> {
  const out = new Batcher();
  const now = new Date();

  for (const c of DEFAULT_CATEGORIES) {
    if (!existingCategoryIds.has(c.id)) out.set('categories', c.id, { name: t(c.name) });
  }

  const products = PRODUCTS.map(([name, categoryId, price], i) => {
    const stock = i % 6 === 0 ? between(0, 6) : between(12, 80);
    const sku = `DEMO-${String(i + 1).padStart(3, '0')}`;
    const id = out.set('products', null, {
      name, sku, categoryId, price, stock, active: i !== 14, image: '', description: '', demo: true,
      createdAt: Timestamp.fromDate(new Date(now.getTime() - 150 * 864e5)),
    });
    return { id, name, sku, price, weight: price < 100 ? 3 : price < 300 ? 2 : 1 };
  });
  // Дешёвые товары покупают чаще
  const weighted = products.flatMap((p) => Array<typeof p>(p.weight).fill(p));

  const customers = Array.from({ length: 28 }, () => {
    const first = pick(FIRST);
    const last = pick(LAST);
    const name = `${first} ${last}`;
    const email = `${latin(first)}.${latin(last)}${between(1, 99)}@example.com`;
    const slovak = /[a-z]/i.test(first[0]) && !/[а-яіїєґ]/i.test(first);
    const phone = slovak
      ? `+421 9${between(10, 49)} ${between(100, 999)} ${between(100, 999)}`
      : `+380 ${between(50, 99)} ${between(100, 999)} ${between(10, 99)} ${between(10, 99)}`;
    const address = `${pick(CITIES)}, ${t('вул.')} ${pick(LAST)}, ${between(1, 120)}`;
    const id = out.set('customers', null, {
      name, email, phone, address, demo: true,
      createdAt: Timestamp.fromDate(new Date(now.getTime() - between(120, 160) * 864e5)),
    });
    return { id, name, email, phone, address };
  });

  // Номера заказов продолжают общий счётчик
  const counterRef = doc(db(), 'meta', 'counters');
  let number = Number((await getDoc(counterRef)).data()?.['orderNumber'] ?? 1000);

  let created = 0;
  for (let daysAgo = 120; daysAgo >= 0; daysAgo--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    // Рост продаж: от ~1 до ~4 заказов в день, в выходные больше
    const expected = 1 + ((120 - daysAgo) / 120) * 3 + (weekend ? 1 : 0);
    const count = Math.max(0, Math.round(expected + (Math.random() - 0.5) * 2.5));

    for (let k = 0; k < count; k++) {
      const createdAt = new Date(date);
      createdAt.setHours(between(8, 22), between(0, 59));
      if (createdAt > now) continue;

      const customer = pick(customers);
      const lines = new Map<string, OrderItem>();
      for (let n = between(1, 3); n > 0; n--) {
        const p = pick(weighted);
        const line = lines.get(p.id) ?? { productId: p.id, name: p.name, sku: p.sku, price: p.price, qty: 0 };
        line.qty += between(1, 2);
        lines.set(p.id, line);
      }
      const items = [...lines.values()];
      const status = statusFor(daysAgo);
      out.set('orders', null, {
        number: ++number,
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        address: customer.address,
        note: '',
        items,
        total: Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100,
        status,
        createdAt: Timestamp.fromDate(createdAt),
        history: demoHistory(status, createdAt, now),
        demo: true,
      });
      created++;
    }
  }

  out.set('meta', 'counters', { orderNumber: number });
  await out.done();
  return created;
}

/** Удаляет все документы с пометкой demo (категории остаются) */
export async function removeDemoData(): Promise<void> {
  const out = new Batcher();
  for (const path of ['orders', 'customers', 'products']) {
    const snap = await getDocs(query(collection(db(), path), where('demo', '==', true)));
    snap.forEach((d) => out.delete(path, d.id));
  }
  await out.done();
}

/** Правдоподобная история демо-заказа: цепочка статусов с нарастающим временем (не позже «сейчас») */
function demoHistory(final: OrderStatus, created: Date, now: Date) {
  const chain: OrderStatus[] =
    final === 'cancelled' ? ['new', 'cancelled'] : ORDER_FLOW.slice(0, ORDER_FLOW.indexOf(final) + 1);
  // Через сколько часов после создания наступает каждый шаг
  const hours: Record<OrderStatus, number> = { new: 0, processing: 3, shipped: 26, delivered: 74, cancelled: 5 };
  return chain.map((status) => ({
    status,
    at: Timestamp.fromDate(new Date(Math.min(now.getTime(), created.getTime() + hours[status] * 36e5))),
    by: 'demo',
  }));
}

const ORDER_FLOW: OrderStatus[] = ['new', 'processing', 'shipped', 'delivered'];
