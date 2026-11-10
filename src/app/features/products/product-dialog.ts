import { Component, inject, signal } from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  maxLength,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { currencySymbol } from '../../core/format';
import { compressImage } from '../../core/image';
import { TPipe } from '../../i18n/i18n';
import { CategoriesService } from './categories.service';
import { emptyProduct, Product, ProductInput } from './product';
import { ProductsService } from './products.service';
import { isReadOnly } from '../../core/read-only';

export interface ProductDialogData {
  /** Нет товара — создаём новый */
  product?: Product;
}

/** Форма добавления и редактирования товара */
@Component({
  selector: 'app-product-dialog',
  imports: [
    FormRoot,
    FormField,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    TPipe,
  ],
  templateUrl: './product-dialog.html',
  styleUrl: './product-dialog.scss',
})
export class ProductDialog {
  private readonly products = inject(ProductsService);
  private readonly ref = inject<MatDialogRef<ProductDialog, boolean>>(MatDialogRef);
  private readonly editing = inject<ProductDialogData>(MAT_DIALOG_DATA).product;

  protected readonly categories = inject(CategoriesService).categories;
  protected readonly isNew = !this.editing;
  protected readonly currency = currencySymbol;
  protected readonly saveError = signal(false);
  protected readonly imageError = signal(false);

  private readonly model = signal<ProductInput>(
    this.editing ? { ...this.editing } : emptyProduct(),
  );

  protected readonly productForm = form(
    this.model,
    (p) => {
      required(p.name, { message: 'Введіть назву' });
      maxLength(p.name, 120, { message: 'Не довше 120 символів' });
      required(p.sku, { message: 'Введіть артикул' });
      pattern(p.sku, /^[A-Za-z0-9._-]+$/, {
        message: 'Лише латинські літери, цифри та «-», «_», «.»',
      });
      validate(p.sku, ({ value }) =>
        this.skuTaken(value()) ? { kind: 'unique', message: 'Товар з таким артикулом уже є' } : undefined,
      );
      required(p.categoryId, { message: 'Оберіть категорію' });
      validate(p.price, ({ value }) =>
        Number.isFinite(value()) && value() > 0
          ? undefined
          : { kind: 'price', message: 'Вкажіть ціну, більшу за 0' },
      );
      validate(p.stock, ({ value }) =>
        Number.isInteger(value()) && value() >= 0
          ? undefined
          : { kind: 'stock', message: 'Залишок — ціле число від 0' },
      );
      maxLength(p.description, 1000, { message: 'Не довше 1000 символів' });
    },
    {
      submission: {
        action: async () => {
          this.saveError.set(false);
          const value = this.model();
          const input: ProductInput = { ...value, name: value.name.trim(), sku: value.sku.trim() };
          try {
            if (this.editing) await this.products.update(this.editing.id, input);
            else await this.products.add(input);
            this.ref.close(true);
          } catch (e) {
            if (!isReadOnly(e)) this.saveError.set(true);
          }
          return undefined;
        },
      },
    },
  );

  protected readonly image = () => this.model().image;

  private skuTaken(sku: string): boolean {
    const normalized = sku.trim().toLowerCase();
    return (
      !!normalized &&
      this.products
        .products()
        .some((p) => p.id !== this.editing?.id && p.sku.toLowerCase() === normalized)
    );
  }

  protected async onFile(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    this.imageError.set(false);
    try {
      if (!file.type.startsWith('image/')) throw new Error('type');
      const dataUrl = await compressImage(file);
      this.model.update((m) => ({ ...m, image: dataUrl }));
    } catch {
      this.imageError.set(true);
    }
  }

  protected removeImage() {
    this.model.update((m) => ({ ...m, image: '' }));
  }
}
