import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { lang, LANGS, setLang, TPipe } from '../i18n/i18n';

/** Кнопка выбора языка интерфейса */
@Component({
  selector: 'app-lang-switch',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, TPipe],
  template: `
    <button mat-button [matMenuTriggerFor]="langMenu">
      <mat-icon aria-hidden="true">translate</mat-icon>
      <span class="sr-only">{{ 'Мова інтерфейсу:' | t }}</span>
      {{ lang().toUpperCase() }}
    </button>
    <mat-menu #langMenu="matMenu">
      @for (l of langs; track l.code) {
        <button
          mat-menu-item
          role="menuitemradio"
          [attr.aria-checked]="l.code === lang()"
          [attr.lang]="l.code"
          (click)="setLang(l.code)"
        >
          <mat-icon aria-hidden="true">{{ l.code === lang() ? 'check' : '' }}</mat-icon>
          {{ l.name }}
        </button>
      }
    </mat-menu>
  `,
})
export class LangSwitch {
  protected readonly langs = LANGS;
  protected readonly lang = lang;
  protected readonly setLang = setLang;
}
