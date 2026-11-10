import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth';
import { TPipe } from '../i18n/i18n';
import { LangSwitch } from './lang-switch';
import { SearchService } from './search/search.service';
import { Notifications } from './notifications';
import { ThemeToggle } from './theme-toggle';

/** Верхняя панель: заголовок страницы, язык, тема и аккаунт */
@Component({
  selector: 'app-topbar',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, TPipe, LangSwitch, Notifications, ThemeToggle],
  template: `
    <header>
      @if (showMenuButton()) {
        <button mat-icon-button (click)="menuClick.emit()" [attr.aria-label]="'Відкрити меню' | t">
          <mat-icon>menu</mat-icon>
        </button>
      }
      <h1>{{ pageTitle() | t }}</h1>
      @if (auth.isGuest()) {
        <span class="demo" [matTooltip]="'Демо-доступ: можна лише переглядати дані' | t">
          <mat-icon aria-hidden="true">visibility</mat-icon>
          <span>{{ 'Демо · перегляд' | t }}</span>
        </span>
      }
      <span class="spacer"></span>

      <button type="button" class="search" (click)="search.open()" [attr.aria-label]="'Пошук (Ctrl+K)' | t">
        <mat-icon aria-hidden="true">search</mat-icon>
        <span class="search-text" aria-hidden="true">{{ 'Пошук…' | t }}</span>
        <kbd aria-hidden="true">Ctrl K</kbd>
      </button>

      <app-lang-switch />
      <app-notifications />
      <app-theme-toggle />

      @if (auth.user(); as user) {
        <button
          mat-icon-button
          [matMenuTriggerFor]="accountMenu"
          [attr.aria-label]="'Обліковий запис' | t"
        >
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #accountMenu="matMenu" xPosition="before">
          <p class="email">{{ auth.isGuest() ? ('Гість · лише перегляд' | t) : user.email }}</p>
          <button mat-menu-item (click)="signOut()">
            <mat-icon aria-hidden="true">logout</mat-icon>
            {{ 'Вийти' | t }}
          </button>
        </mat-menu>
      }
    </header>
  `,
  styles: `
    header {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 4px;
      height: 64px;
      padding: 0 16px 0 24px;
      border-bottom: 1px solid var(--app-border);
      background: var(--app-bg);
    }
    h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .spacer {
      flex: 1;
    }
    .demo {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      gap: 6px;
      margin-left: 12px;
      padding: 4px 10px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-accent) 14%, transparent);
      color: var(--app-text);
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .demo mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      color: var(--app-accent);
    }
    .search {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 38px;
      margin-right: 8px;
      padding: 0 8px 0 12px;
      border: 1px solid var(--app-border);
      border-radius: 10px;
      background: var(--app-surface);
      font: inherit;
      color: var(--app-muted);
      cursor: pointer;
      transition:
        border-color 0.15s,
        color 0.15s;
    }
    .search:hover {
      border-color: color-mix(in srgb, var(--app-accent) 50%, var(--app-border));
      color: var(--app-text);
    }
    .search:focus-visible {
      outline: 2px solid var(--app-accent);
      outline-offset: 2px;
    }
    .search mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }
    .search-text {
      min-width: 120px;
      text-align: left;
    }
    kbd {
      padding: 2px 6px;
      border: 1px solid var(--app-border);
      border-radius: 5px;
      font: 600 11px/1.3 Roboto, sans-serif;
      background: var(--app-hover);
    }
    .email {
      margin: 0;
      padding: 8px 16px;
      font-size: 13px;
      color: var(--app-muted);
    }
    @media (max-width: 899px) {
      .search {
        width: 40px;
        height: 40px;
        margin-right: 0;
        padding: 0;
        justify-content: center;
        border-color: transparent;
        background: none;
      }
      .search-text,
      kbd {
        display: none;
      }
      .demo span {
        display: none;
      }
      .demo {
        padding: 6px;
        margin-left: 8px;
      }
    }
    @media (max-width: 599px) {
      header {
        padding: 0 8px;
      }
      h1 {
        font-size: 18px;
      }
    }
  `,
})
export class Topbar {
  protected readonly auth = inject(AuthService);
  protected readonly search = inject(SearchService);
  private readonly router = inject(Router);

  /** Ключ перевода заголовка текущей страницы */
  readonly pageTitle = input.required<string>();
  readonly showMenuButton = input(false);
  readonly menuClick = output();

  protected async signOut() {
    await this.auth.signOut();
    await this.router.navigateByUrl('/login');
  }
}
