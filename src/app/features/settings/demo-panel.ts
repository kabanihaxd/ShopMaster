import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReadOnlyGuard } from '../../core/read-only';
import { t, TPipe } from '../../i18n/i18n';
import { confirmAction } from '../../shared/confirm-dialog';
import { Panel } from '../../shared/panel';
import { CategoriesService } from '../products/categories.service';
import { createDemoData, hasDemoData, removeDemoData } from './demo-data';

/** Заполнить базу демо-данными или удалить их */
@Component({
  selector: 'app-demo-panel',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, Panel, TPipe],
  template: `
    <app-panel heading="Демо-дані">
      <p class="text">
        {{ 'Додає 22 товари, 28 клієнтів і замовлення за останні 4 місяці, щоб побачити графіки й звіти в дії. Демо-записи позначені й видаляються окремо — ваші дані не зміняться.' | t }}
      </p>
      @if (busy()) {
        <mat-progress-bar mode="indeterminate" [attr.aria-label]="'Зачекайте…' | t" />
      }
      <div class="actions">
        @if (hasDemo()) {
          <button mat-stroked-button class="danger" [disabled]="busy()" (click)="remove()">
            <mat-icon>delete_sweep</mat-icon>
            {{ 'Видалити демо-дані' | t }}
          </button>
        } @else {
          <button mat-flat-button [disabled]="busy() || hasDemo() === null" (click)="create()">
            <mat-icon>auto_awesome</mat-icon>
            {{ 'Заповнити демо-даними' | t }}
          </button>
        }
      </div>
      @if (failed()) {
        <p class="error" role="alert">{{ 'Не вдалося виконати. Перевірте з’єднання й спробуйте ще раз.' | t }}</p>
      }
    </app-panel>
  `,
  styles: `
    .text {
      margin: 0 0 16px;
      color: var(--app-muted);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
    .danger {
      color: var(--app-danger);
    }
    .error {
      margin: 12px 0 0;
      color: var(--app-danger);
    }
  `,
})
export class DemoPanel implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly categories = inject(CategoriesService);
  private readonly guard = inject(ReadOnlyGuard);

  /** null — ещё проверяем */
  protected readonly hasDemo = signal<boolean | null>(null);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  async ngOnInit() {
    try {
      this.hasDemo.set(await hasDemoData());
    } catch {
      this.hasDemo.set(false);
    }
  }

  protected async create() {
    if (this.readOnly()) return;
    await this.run(async () => {
      const ids = new Set(this.categories.categories().map((c) => c.id));
      const count = await createDemoData(ids);
      this.hasDemo.set(true);
      this.snackBar.open(t('Додано демо-дані: {n} замовлень', { n: count }), t('Закрити'), { duration: 4000 });
    });
  }

  protected async remove() {
    if (this.readOnly()) return;
    const ok = await confirmAction(this.dialog, {
      title: 'Видалити демо-дані?',
      message: 'Буде видалено всі демо-товари, демо-клієнтів і демо-замовлення. Ваші власні дані залишаться.',
      confirm: 'Видалити',
    });
    if (!ok) return;
    await this.run(async () => {
      await removeDemoData();
      this.hasDemo.set(false);
      this.snackBar.open(t('Демо-дані видалено'), t('Закрити'), { duration: 4000 });
    });
  }

  /** Гостю показываем сообщение и ничего не делаем */
  private readOnly(): boolean {
    try {
      this.guard.check();
      return false;
    } catch {
      return true;
    }
  }

  private async run(action: () => Promise<void>) {
    this.busy.set(true);
    this.failed.set(false);
    try {
      await action();
    } catch {
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
