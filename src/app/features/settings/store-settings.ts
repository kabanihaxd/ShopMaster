import { Component, effect, inject, signal, untracked } from '@angular/core';
import { form, FormField, FormRoot, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CURRENCIES } from '../../core/format';
import { SettingsService, StoreSettings } from '../../core/settings';
import { t, TPipe } from '../../i18n/i18n';
import { Panel } from '../../shared/panel';
import { isReadOnly } from '../../core/read-only';

/** Общие настройки магазина: валюта и порог низкого остатка */
@Component({
  selector: 'app-store-settings',
  imports: [FormRoot, FormField, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, Panel, TPipe],
  template: `
    <app-panel heading="Магазин">
      <form [formRoot]="settingsForm" class="form">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'Валюта' | t }}</mat-label>
          <mat-select [formField]="settingsForm.currency">
            @for (c of currencies; track c.code) {
              <mat-option [value]="c.code">{{ c.label | t }} ({{ c.code }})</mat-option>
            }
          </mat-select>
          <mat-hint>{{ 'Ціни не перераховуються — змінюється лише позначення валюти.' | t }}</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'Поріг низького залишку, шт.' | t }}</mat-label>
          <input matInput type="number" step="1" inputmode="numeric" [formField]="settingsForm.lowStockThreshold" />
          @if (settingsForm.lowStockThreshold().errors()[0]; as e) {
            <mat-error>{{ e.message ?? '' | t }}</mat-error>
          } @else {
            <mat-hint>{{ 'Товари з таким залишком і менше позначаються «Мало».' | t }}</mat-hint>
          }
        </mat-form-field>

        <div class="actions">
          @if (error()) {
            <p class="error" role="alert">{{ 'Не вдалося зберегти. Перевірте з’єднання й спробуйте ще раз.' | t }}</p>
          }
          <button mat-flat-button type="submit" [disabled]="settingsForm().submitting() || !settingsForm().dirty()">
            {{ (settingsForm().submitting() ? 'Збереження…' : 'Зберегти') | t }}
          </button>
        </div>
      </form>
    </app-panel>
  `,
  styles: `
    .form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
    }
    .error {
      margin: 0;
      color: var(--app-danger);
    }
  `,
})
export class StoreSettingsPanel {
  private readonly settings = inject(SettingsService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly currencies = CURRENCIES;
  protected readonly error = signal(false);

  private readonly model = signal<StoreSettings>({
    currency: this.settings.currency(),
    lowStockThreshold: this.settings.lowStockThreshold(),
  });

  protected readonly settingsForm = form(
    this.model,
    (p) => {
      validate(p.lowStockThreshold, ({ value }) =>
        Number.isInteger(value()) && value() >= 0 && value() <= 10000
          ? undefined
          : { kind: 'threshold', message: 'Ціле число від 0 до 10000' },
      );
    },
    {
      submission: {
        action: async () => {
          this.error.set(false);
          try {
            await this.settings.save(this.model());
            this.settingsForm().reset();
            this.snackBar.open(t('Налаштування збережено'), t('Закрити'), { duration: 3000 });
          } catch (e) {
            if (!isReadOnly(e)) this.error.set(true);
          }
          return undefined;
        },
      },
    },
  );

  constructor() {
    // Пока пользователь ничего не менял — показываем актуальные значения из базы
    effect(() => {
      const fresh = { currency: this.settings.currency(), lowStockThreshold: this.settings.lowStockThreshold() };
      if (!untracked(() => this.settingsForm().dirty())) this.model.set(fresh);
    });
  }
}
