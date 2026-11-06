import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AnalyticsService } from '../features/analytics/analytics.service';
import { t, TPipe } from '../i18n/i18n';
import { HelpDialog } from './help-dialog';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  /** Счётчик на пункте меню (0 — не показывать) */
  badge?: number;
  /** Цвет счётчика: предупреждение (низкий остаток) */
  warn?: boolean;
}

/**
 * Боковое меню: логотип, статус, MAIN MENU, раздел «Акаунт» и кнопка сворачивания.
 * В свёрнутом виде (72px) видны только иконки, подписи — во всплывающих подсказках.
 */
@Component({
  selector: 'app-sidebar',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule, TPipe],
  host: { '[class.collapsed]': 'collapsed()' },
  template: `
    <div class="brand">
      <span class="logo" aria-hidden="true">
        <mat-icon>shopping_bag</mat-icon>
        <span class="logo-dot"></span>
      </span>
      <div class="brand-text">
        <span class="name">ShopMaster</span>
        <span class="sub">{{ 'Адмін-панель' | t }}</span>
      </div>
      <span class="status"><span class="dot" aria-hidden="true"></span>{{ 'Онлайн' | t }}</span>
    </div>

    <nav [attr.aria-label]="'Головне меню' | t">
      <h2 class="section main-title">{{ 'Головне меню' | t }}</h2>
      <ul>
        @for (item of main(); track item.path) {
          <li><ng-container *ngTemplateOutlet="link; context: { $implicit: item }" /></li>
        }
      </ul>

      <h2 class="section account">{{ 'Акаунт' | t }}</h2>
      <ul>
        <li><ng-container *ngTemplateOutlet="link; context: { $implicit: settingsItem }" /></li>
        <li>
          <button
            type="button"
            class="item"
            (click)="openHelp()"
            [matTooltip]="collapsed() ? ('Допомога' | t) : ''"
            matTooltipPosition="right"
          >
            <mat-icon aria-hidden="true">help</mat-icon>
            <span class="label">{{ 'Допомога' | t }}</span>
          </button>
        </li>
      </ul>
    </nav>

    @if (collapsible()) {
      <button
        type="button"
        class="item toggle"
        (click)="toggleCollapse.emit()"
        [attr.aria-expanded]="!collapsed()"
        [attr.aria-label]="(collapsed() ? 'Розгорнути меню' : 'Згорнути меню') | t"
        [matTooltip]="collapsed() ? ('Розгорнути меню' | t) : ''"
        matTooltipPosition="right"
      >
        <mat-icon aria-hidden="true">keyboard_double_arrow_left</mat-icon>
        <span class="label" aria-hidden="true">{{ 'Згорнути' | t }}</span>
      </button>
    }

    <ng-template #link let-item>
      <a
        class="item"
        [routerLink]="item.path"
        routerLinkActive="active"
        ariaCurrentWhenActive="page"
        (click)="navigate.emit()"
        [matTooltip]="collapsed() ? tooltip(item) : ''"
        matTooltipPosition="right"
      >
        <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
        <span class="label">{{ item.label | t }}</span>
        @if (item.badge) {
          <span class="badge" [class.warn]="item.warn">
            <span aria-hidden="true">{{ item.badge }}</span>
            <span class="sr-only">{{ badgeText(item) }}</span>
          </span>
        }
      </a>
    </ng-template>
  `,
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly analytics = inject(AnalyticsService);
  private readonly dialog = inject(MatDialog);

  /** Свёрнуто до иконок */
  readonly collapsed = input(false);
  /** Показывать кнопку сворачивания (на телефоне меню — шторка, она не нужна) */
  readonly collapsible = input(true);

  /** Клик по пункту меню (на телефоне шторка после этого закрывается) */
  readonly navigate = output();
  readonly toggleCollapse = output();

  protected readonly main = computed((): NavItem[] => [
    { path: '/dashboard', icon: 'grid_view', label: 'Дашборд' },
    {
      path: '/products',
      icon: 'deployed_code',
      label: 'Товари',
      badge: this.analytics.lowStock().length,
      warn: true,
    },
    { path: '/orders', icon: 'shopping_cart', label: 'Замовлення', badge: this.analytics.newOrders().length },
    { path: '/customers', icon: 'group', label: 'Клієнти' },
    { path: '/analytics', icon: 'monitoring', label: 'Аналітика' },
  ]);

  protected readonly settingsItem: NavItem = { path: '/settings', icon: 'settings', label: 'Налаштування' };

  /** Пояснение к счётчику для скринридера */
  protected badgeText(item: NavItem): string {
    return item.warn
      ? t('{n} товарів із низьким залишком', { n: item.badge ?? 0 })
      : t('{n} нових замовлень', { n: item.badge ?? 0 });
  }

  protected tooltip(item: NavItem): string {
    return item.badge ? `${t(item.label)} · ${item.badge}` : t(item.label);
  }

  protected openHelp() {
    this.navigate.emit();
    this.dialog.open(HelpDialog, { width: '560px', maxWidth: 'calc(100vw - 32px)' });
  }
}
