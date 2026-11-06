import { effect, inject, signal } from '@angular/core';
import {
  collection,
  DocumentData,
  Firestore,
  getFirestore,
  onSnapshot,
} from 'firebase/firestore';
import { AuthService } from './auth';
import { firebaseApp } from './firebase';

let firestore: Firestore | undefined;

/** Единственный экземпляр Firestore */
export function db(): Firestore {
  firestore ??= getFirestore(firebaseApp());
  return firestore;
}

/** Живая коллекция: данные, загрузка и ошибка в виде сигналов */
export interface LiveCollection<T> {
  readonly data: () => T[];
  readonly loading: () => boolean;
  /** Код ошибки Firestore (например, permission-denied) или null */
  readonly error: () => string | null;
}

/**
 * Подписка на коллекцию Firestore, пока пользователь вошёл.
 * После выхода подписка снимается, данные очищаются. Вызывать в контексте внедрения (поле сервиса).
 */
export function liveCollection<T>(
  path: string,
  map: (id: string, data: DocumentData) => T,
): LiveCollection<T> {
  const auth = inject(AuthService);
  const data = signal<T[]>([]);
  const loading = signal(true);
  const error = signal<string | null>(null);

  effect((onCleanup) => {
    if (!auth.user()) {
      data.set([]);
      loading.set(true);
      return;
    }
    const unsubscribe = onSnapshot(
      collection(db(), path),
      (snap) => {
        // Повторный снимок без изменений (после переподключения) — не пересчитываем всё приложение
        if (!loading() && snap.docChanges().length === 0) return;
        data.set(snap.docs.map((d) => map(d.id, d.data())));
        loading.set(false);
        error.set(null);
      },
      (e) => {
        error.set(e.code);
        loading.set(false);
      },
    );
    onCleanup(unsubscribe);
  });

  return { data: data.asReadonly(), loading: loading.asReadonly(), error: error.asReadonly() };
}
