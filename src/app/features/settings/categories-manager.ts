import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TPipe } from '../../i18n/i18n';
import { confirmAction } from '../../shared/confirm-dialog';
import { Panel } from '../../shared/panel';
import { CategoriesService } from '../products/categories.service';
import { Category } from '../products/product';
import { isReadOnly } from '../../core/read-only';

/** Управление категориями: добавить, переименовать, удалить пустую */
@Component({
  selector: 'app-categories-manager',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTooltipModule, Panel, TPipe],
  templateUrl: './categories-manager.html',
  styleUrl: './categories-manager.scss',
})
export class CategoriesManager {
  private readonly dialog = inject(MatDialog);
  protected readonly service = inject(CategoriesService);

  protected readonly newName = signal('');
  protected readonly addError = signal('');

  /** id категории, которую сейчас переименовывают */
  protected readonly editingId = signal<string | null>(null);
  protected readonly editName = signal('');
  protected readonly editError = signal('');
  protected readonly failed = signal(false);

  private validate(name: string, exceptId?: string): string {
    if (!name.trim()) return 'Введіть назву';
    if (name.trim().length > 60) return 'Не довше 60 символів';
    if (this.service.exists(name, exceptId)) return 'Така категорія вже є';
    return '';
  }

  protected async add(event: Event) {
    event.preventDefault();
    const error = this.validate(this.newName());
    this.addError.set(error);
    if (error) return;
    await this.run(() => this.service.add(this.newName()));
    this.newName.set('');
  }

  protected startEdit(c: Category) {
    this.editingId.set(c.id);
    this.editName.set(c.name);
    this.editError.set('');
  }

  protected async saveEdit(c: Category) {
    const error = this.validate(this.editName(), c.id);
    this.editError.set(error);
    if (error) return;
    await this.run(() => this.service.rename(c.id, this.editName()));
    this.editingId.set(null);
  }

  protected async remove(c: Category) {
    const ok = await confirmAction(this.dialog, {
      title: 'Видалити категорію?',
      message: 'Категорію «{name}» буде видалено.',
      params: { name: c.name },
      confirm: 'Видалити',
    });
    if (ok) await this.run(() => this.service.remove(c.id));
  }

  protected count(c: Category): number {
    return this.service.productCount().get(c.id) ?? 0;
  }

  private async run(action: () => Promise<void>) {
    this.failed.set(false);
    try {
      await action();
    } catch (e) {
      if (!isReadOnly(e)) this.failed.set(true);
    }
  }
}
