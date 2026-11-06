import { Service, signal } from '@angular/core';
import {
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { firebaseApp, firebaseConfigured } from './firebase';

/** Коды ошибок Firebase Auth → ключи перевода */
const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-email': 'Некоректна адреса пошти',
  'auth/missing-password': 'Введіть пароль',
  'auth/invalid-credential': 'Невірна пошта або пароль',
  'auth/wrong-password': 'Невірна пошта або пароль',
  'auth/user-not-found': 'Невірна пошта або пароль',
  'auth/user-disabled': 'Цей обліковий запис вимкнено',
  'auth/too-many-requests': 'Забагато спроб. Зачекайте трохи й спробуйте ще раз.',
  'auth/network-request-failed': 'Немає зв’язку з інтернетом',
  'auth/operation-not-allowed': 'Вхід за паролем ще не ввімкнено в Firebase',
};

/** Ключ перевода для ошибки входа */
export function authErrorKey(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return (typeof code === 'string' && AUTH_ERRORS[code]) || 'Не вдалося увійти. Спробуйте ще раз.';
}

/**
 * Вход менеджера по почте и паролю.
 * Регистрации в интерфейсе нет: аккаунты менеджеров создаются в Firebase Console.
 */
@Service()
export class AuthService {
  private readonly auth = firebaseConfigured ? getAuth(firebaseApp()) : null;

  /** undefined — Firebase ещё проверяет сохранённый вход; null — не вошли */
  readonly user = signal<User | null | undefined>(firebaseConfigured ? undefined : null);

  /** Резолвится, когда стало известно, вошёл ли пользователь */
  readonly ready: Promise<void>;

  constructor() {
    this.ready = new Promise((resolve) => {
      if (!this.auth) {
        resolve();
        return;
      }
      onAuthStateChanged(this.auth, (user) => {
        this.user.set(user);
        resolve();
      });
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    if (!this.auth) return;
    await signInWithEmailAndPassword(this.auth, email.trim(), password);
  }

  async resetPassword(email: string): Promise<void> {
    if (!this.auth) return;
    await sendPasswordResetEmail(this.auth, email.trim());
  }

  async signOut(): Promise<void> {
    if (!this.auth) return;
    await signOut(this.auth);
  }
}
