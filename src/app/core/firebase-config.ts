import type { FirebaseOptions } from 'firebase/app';

/**
 * Ключи веб-приложения из Firebase Console:
 * Project settings → General → Your apps → Web app → SDK setup and configuration → Config.
 *
 * Пока apiKey пустой, админка работает в демо-режиме без входа и без базы.
 * Эти ключи не секретные (они всё равно попадают в браузер) — защищают данные правила Firestore.
 */
export const firebaseConfig: FirebaseOptions = {
  apiKey: 'AIzaSyAt_ixUjZxfOcaaQnFUos-_r-T4RjiwJo8',
  authDomain: 'shopmaster-bdccc.firebaseapp.com',
  projectId: 'shopmaster-bdccc',
  storageBucket: 'shopmaster-bdccc.firebasestorage.app',
  messagingSenderId: '66469739430',
  appId: '1:66469739430:web:bcb3e5d18f46d5faa56d67',
};
