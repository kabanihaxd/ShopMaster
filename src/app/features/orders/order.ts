import { DocumentData } from 'firebase/firestore';
import { toDate } from '../customers/customer';

export type OrderStatus = 'new' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

/** Статусы по порядку; label — ключ перевода */
export const ORDER_STATUSES: { value: OrderStatus; label: string; icon: string }[] = [
  { value: 'new', label: 'Новий', icon: 'fiber_new' },
  { value: 'processing', label: 'В обробці', icon: 'pending' },
  { value: 'shipped', label: 'Відправлено', icon: 'local_shipping' },
  { value: 'delivered', label: 'Доставлено', icon: 'task_alt' },
  { value: 'cancelled', label: 'Скасовано', icon: 'cancel' },
];

export const STATUS_LABEL = new Map(ORDER_STATUSES.map((s) => [s.value, s.label]));

/** Доставленный и отменённый заказ больше не меняются */
export function isFinal(status: OrderStatus): boolean {
  return status === 'delivered' || status === 'cancelled';
}

/** Куда можно перевести заказ: только вперёд по цепочке или в «Скасовано» */
export function allowedStatuses(current: OrderStatus): OrderStatus[] {
  if (isFinal(current)) return [];
  const order: OrderStatus[] = ['new', 'processing', 'shipped', 'delivered'];
  return [...order.slice(order.indexOf(current) + 1), 'cancelled'];
}

/** Позиция заказа (название и цена сохраняются на момент покупки) */
export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
}

/** Запись истории заказа: на какой статус, когда и кто перевёл */
export interface StatusChange {
  status: OrderStatus;
  /** null — время неизвестно (заказы, созданные до появления истории) */
  at: Date | null;
  /** Почта менеджера; пусто — неизвестно */
  by: string;
}

/** Заказ в Firestore: коллекция `orders` */
export interface Order {
  id: string;
  /** Человекочитаемый номер: 1001, 1002, … */
  number: number;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  note: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
  /** История статусов, от старых к новым */
  history: StatusChange[];
}

export function toOrder(id: string, d: DocumentData): Order {
  const items = Array.isArray(d['items']) ? (d['items'] as DocumentData[]) : [];
  return {
    id,
    number: Number(d['number'] ?? 0),
    customerId: String(d['customerId'] ?? ''),
    customerName: String(d['customerName'] ?? ''),
    customerEmail: String(d['customerEmail'] ?? ''),
    customerPhone: String(d['customerPhone'] ?? ''),
    address: String(d['address'] ?? ''),
    note: String(d['note'] ?? ''),
    items: items.map((i) => ({
      productId: String(i['productId'] ?? ''),
      name: String(i['name'] ?? ''),
      sku: String(i['sku'] ?? ''),
      price: Number(i['price'] ?? 0),
      qty: Number(i['qty'] ?? 0),
    })),
    total: Number(d['total'] ?? 0),
    status: (STATUS_LABEL.has(d['status']) ? d['status'] : 'new') as OrderStatus,
    createdAt: toDate(d['createdAt']),
    history: toHistory(d),
  };
}

function isStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && STATUS_LABEL.has(value as OrderStatus);
}

/** История из документа; для старых заказов без истории — создание + текущий статус */
function toHistory(d: DocumentData): StatusChange[] {
  const raw = Array.isArray(d['history']) ? (d['history'] as DocumentData[]) : [];
  const history = raw
    .filter((h) => isStatus(h['status']))
    .map((h) => ({
      status: h['status'] as OrderStatus,
      at: h['at'] ? toDate(h['at']) : null,
      by: String(h['by'] ?? ''),
    }));
  if (history.length) return history;

  const status = isStatus(d['status']) ? d['status'] : 'new';
  const created: StatusChange = { status: 'new', at: toDate(d['createdAt']), by: '' };
  return status === 'new' ? [created] : [created, { status, at: null, by: '' }];
}

export function itemCount(order: Order): number {
  return order.items.reduce((sum, i) => sum + i.qty, 0);
}
