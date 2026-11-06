import { Component, inject } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ThemeService } from '../../core/theme';
import { lang, LANGS, setLang, TPipe } from '../../i18n/i18n';
import { Panel } from '../../shared/panel';

/** Личные настройки интерфейса: язык и тема (хранятся в этом браузере) */
@Component({
  selector: 'app-interface-settings',
  imports: [MatButtonToggleModule, MatFormFieldModule, MatSelectModule, Panel, TPipe],
  template: `
    <app-panel heading="Інтерфейс">
      <mat-form-field appearance="outline" class="field">
        <mat-label>{{ 'Мова' | t }}</mat-label>
        <mat-select [value]="lang()" (valueChange)="setLang($event)">
          @for (l of langs; track l.code) {
            <mat-option [value]="l.code" [attr.lang]="l.code">{{ l.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <p class="label" id="theme-label">{{ 'Тема' | t }}</p>
      <mat-button-toggle-group
        aria-labelledby="theme-label"
        [value]="theme.theme()"
        (change)="theme.theme.set($event.value)"
      >
        <mat-button-toggle value="dark">{{ 'Темна' | t }}</mat-button-toggle>
        <mat-button-toggle value="light">{{ 'Світла' | t }}</mat-button-toggle>
      </mat-button-toggle-group>

      <p class="note">{{ 'Мова й тема зберігаються лише в цьому браузері.' | t }}</p>
    </app-panel>
  `,
  styles: `
    .field {
      width: 100%;
    }
    .label {
      margin: 8px 0;
      color: var(--app-muted);
    }
    .note {
      margin: 16px 0 0;
      font-size: 13px;
      color: var(--app-muted);
    }
  `,
})
export class InterfaceSettingsPanel {
  protected readonly theme = inject(ThemeService);
  protected readonly langs = LANGS;
  protected readonly lang = lang;
  protected readonly setLang = setLang;
}
