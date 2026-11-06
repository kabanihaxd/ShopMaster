import { DocumentData, Timestamp } from 'firebase/firestore';

/** Клиент в Firestore: коллекция `customers` */
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: Date;
}

export function toDate(value: unknown): Date {
  return value instanceof Timestamp ? value.toDate() : new Date(0);
}

export function toCustomer(id: string, d: DocumentData): Customer {
  return {
    id,
    name: String(d['name'] ?? ''),
    email: String(d['email'] ?? ''),
    phone: String(d['phone'] ?? ''),
    address: String(d['address'] ?? ''),
    createdAt: toDate(d['createdAt']),
  };
}
