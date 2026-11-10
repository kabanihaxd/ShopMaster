import { inject, Service } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { t } from '../i18n/i18n';
import { AuthService } from './auth';

/** Попытка изменить данные в гостевом режиме (сообщение уже показано) */
export class ReadOnlyError extends Error {
  constructor() {
    super('read-only');
  }
}

/** Ошибку уже объяснили пользователю — своё сообщение об ошибке не показываем */
export function isReadOnly(error: unknown): boolean {
  return error instanceof ReadOnlyError;
}

/**
 * Гость (вход «посмотреть демо») может только смотреть.
 * Правила Firestore всё равно отклонят запись, но проверяем заранее:
 * без мигания оптимистичных изменений и с понятным сообщением.
 */
@Service()
export class ReadOnlyGuard {
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  /** Бросает ReadOnlyError, если сейчас гостевой режим */
  check(): void {
    if (!this.auth.isGuest()) return;
    this.snackBar.open(
      t('Демо-режим: зміни недоступні. Тут можна лише переглядати дані.'),
      t('Закрити'),
      { duration: 5000 },
    );
    throw new ReadOnlyError();
  }
}
