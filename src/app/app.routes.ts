import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth-guards';

// title — ключ перевода (см. AppTitleStrategy)
export const routes: Routes = [
  {
    path: 'login',
    title: 'Вхід',
    canMatch: [guestGuard],
    loadComponent: () => import('./features/login/login'),
  },
  {
    // Накладная для печати — отдельная страница без меню (открывается в новой вкладке)
    path: 'print/orders/:id',
    title: 'Накладна',
    canMatch: [authGuard],
    loadComponent: () => import('./features/orders/invoice'),
  },
  {
    path: '',
    // Каркас ленивый: Firestore и Material-таблицы грузятся только после входа
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    canMatch: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Дашборд',
        loadComponent: () => import('./features/dashboard/dashboard'),
      },
      {
        path: 'products',
        title: 'Товари',
        loadComponent: () => import('./features/products/products'),
      },
      {
        path: 'orders',
        title: 'Замовлення',
        loadComponent: () => import('./features/orders/orders'),
      },
      {
        path: 'customers',
        title: 'Клієнти',
        loadComponent: () => import('./features/customers/customers'),
      },
      {
        path: 'customers/:id',
        title: 'Клієнт',
        loadComponent: () => import('./features/customers/customer-page'),
      },
      {
        path: 'analytics',
        title: 'Аналітика',
        loadComponent: () => import('./features/analytics/analytics'),
      },
      {
        path: 'settings',
        title: 'Налаштування',
        loadComponent: () => import('./features/settings/settings'),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
