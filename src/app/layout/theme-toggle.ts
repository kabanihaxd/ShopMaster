import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../core/theme';
import { TPipe } from '../i18n/i18n';

/** Кнопка переключения тёмной/светлой темы */
@Component({
  selector: 'app-theme-toggle',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, TPipe],
  template: `
    <button
      mat-icon-button
      (click)="theme.toggle()"
      [attr.aria-label]="label() | t"
      [matTooltip]="label() | t"
    >
      <mat-icon>{{ isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
  protected readonly isDark = computed(() => this.theme.theme() === 'dark');
  protected readonly label = computed(() =>
    this.isDark() ? 'Увімкнути світлу тему' : 'Увімкнути темну тему',
  );
}
