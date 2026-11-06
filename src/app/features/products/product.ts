import { DocumentData } from 'firebase/firestore';

/** Товар в Firestore: коллекция `products` */
export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  categoryId: string;
  /** Цена в валюте магазина */
  price: number;
  /** Остаток на складе, шт. */
  stock: number;
  /** false — товар скрыт (снят с продажи) */
  active: boolean;
  /** Сжатое фото как data URL (WebP/JPEG) или пустая строка */
  image: string;
}

/** Поля, которые редактирует менеджер */
export type ProductInput = Omit<Product, 'id'>;

export function emptyProduct(): ProductInput {
  return {
    name: '',
    sku: '',
    description: '',
    categoryId: '',
    price: 0,
    stock: 0,
    active: true,
    image: '',
  };
}

/** Документ Firestore → Product (с безопасными значениями по умолчанию) */
export function toProduct(id: string, d: DocumentData): Product {
  return {
    id,
    name: String(d['name'] ?? ''),
    sku: String(d['sku'] ?? ''),
    description: String(d['description'] ?? ''),
    categoryId: String(d['categoryId'] ?? ''),
    price: Number(d['price'] ?? 0),
    stock: Number(d['stock'] ?? 0),
    active: d['active'] !== false,
    image: String(d['image'] ?? ''),
  };
}

/** Категория в Firestore: коллекция `categories` */
export interface Category {
  id: string;
  name: string;
}
