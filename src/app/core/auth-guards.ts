import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from './auth';
import { firebaseConfigured } from './firebase';

/** Админка — только после входа (в демо-режиме без Firebase пускаем всех) */
export const authGuard: CanMatchFn = async () => {
  if (!firebaseConfigured) return true;
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  return auth.user() ? true : router.createUrlTree(['/login']);
};

/** Страница входа — только для тех, кто ещё не вошёл */
export const guestGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  return auth.user() ? router.createUrlTree(['/dashboard']) : true;
};
