import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../core/auth';
import { firebaseConfigured } from '../core/firebase';
import { SettingsService } from '../core/settings';
import { AppTitleStrategy } from '../core/title-strategy';
import { TPipe } from '../i18n/i18n';
import { SearchService } from './search/search.service';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

const COLLAPSED_KEY = 'shopmaster.sidebarCollapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Каркас админки: боковое меню + верхняя панель + содержимое страницы */
@Component({
  selector: 'app-shell',
  // Ctrl+K / ⌘K — глобальный поиск с любой страницы
  host: { '(document:keydown)': 'onKeydown($event)' },
  imports: [MatSidenavModule, RouterOutlet, Sidebar, Topbar, TPipe],
  template: `
    <a class="skip" href="#content" (click)="focusContent($event)">{{ 'Перейти до вмісту' | t }}</a>
    <mat-sidenav-container class="container" autosize>
      <mat-sidenav
        [class.collapsed]="collapsed()"
        [mode]="mobile() ? 'over' : 'side'"
        [opened]="opened()"
        (openedChange)="opened.set($event)"
      >
        <app-sidebar
          [collapsed]="collapsed()"
          [collapsible]="!mobile()"
          (toggleCollapse)="toggleCollapse()"
          (navigate)="mobile() && opened.set(false)"
        />
      </mat-sidenav>
      <mat-sidenav-content>
        <app-topbar
          [pageTitle]="titles.pageTitle()"
          [showMenuButton]="mobile()"
          (menuClick)="opened.set(true)"
        />
        <main id="content" tabindex="-1">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .container {
      height: 100dvh;
    }
    mat-sidenav.collapsed {
      width: 72px;
    }
    main {
      padding: 24px;
      outline: none;
    }
    .skip {
      position: absolute;
      top: -48px;
      left: 8px;
      z-index: 10;
      padding: 8px 16px;
      border-radius: 8px;
      background: var(--app-accent);
      color: #fff;
    }
    .skip:focus {
      top: 8px;
    }
    @media (max-width: 599px) {
      main {
        padding: 16px;
      }
    }
  `,
})
export class Shell {
  protected readonly titles = inject(AppTitleStrategy);

  protected readonly mobile = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 899px)')
      .pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  /** На широком экране меню всегда открыто, на телефоне — шторка по кнопке */
  protected readonly opened = linkedSignal(() => !this.mobile());

  /** Пользователь свернул меню до иконок (запоминаем между визитами) */
  private readonly collapsedPref = signal(readCollapsed());
  /** На телефоне меню — шторка, там всегда полная ширина */
  protected readonly collapsed = computed(() => !this.mobile() && this.collapsedPref());

  constructor() {
    // Сессия закончилась (вышли в другой вкладке, аккаунт отключён) — на страницу входа
    // Настройки магазина (валюта, порог остатка) нужны на всех страницах
    inject(SettingsService);

    const auth = inject(AuthService);
    const router = inject(Router);
    effect(() => {
      if (firebaseConfigured && auth.user() === null) void router.navigateByUrl('/login');
    });
  }

  protected toggleCollapse() {
    const value = !this.collapsedPref();
    this.collapsedPref.set(value);
    try {
      localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0');
    } catch {
      // Хранилище недоступно (приватный режим) — просто не запоминаем
    }
  }

  private readonly search = inject(SearchService);

  protected onKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.search.open();
    }
  }

  protected focusContent(event: Event) {
    event.preventDefault();
    document.getElementById('content')?.focus();
  }
}
