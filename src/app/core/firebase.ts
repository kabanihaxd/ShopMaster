import { FirebaseApp, initializeApp } from 'firebase/app';
import { firebaseConfig } from './firebase-config';

/** Ключи вставлены — работаем с настоящим Firebase; иначе демо-режим */
export const firebaseConfigured = !!firebaseConfig.apiKey;

let app: FirebaseApp | undefined;

/** Единственный экземпляр Firebase-приложения (создаётся при первом обращении) */
export function firebaseApp(): FirebaseApp {
  app ??= initializeApp(firebaseConfig);
  return app;
}
