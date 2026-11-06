import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { formatMoney } from '../../core/format';
import { BulkBar } from '../../shared/bulk-bar';
import { openByQueryParam } from '../../shared/open-by-query';
import { Selection } from '../../shared/selection';
import { SettingsService } from '../../core/settings';
import { t, TPipe } from '../../i18n/i18n';
import { confirmAction } from '../../shared/confirm-dialog';
import { CategoriesService } from './categories.service';
import { Product } from './product';
import { ProductDialog, ProductDialogData } from './product-dialog';
import { ProductsService } from './products.service';
import { StockStepper } from './stock-stepper';

type SortKey = 'name' | 'price-asc' | 'price-desc' | 'stock-asc';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'За назвою (А–Я)' },
  { key: 'price-asc', label: 'Спочатку дешевші' },
  { key: 'price-desc', label: 'Спочатку дорожчі' },
  { key: 'stock-asc', label: 'Спочатку з меншим залишком' },
];

const COMPARE: Record<SortKey, (a: Product, b: Product) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  'stock-asc': (a, b) => a.stock - b.stock,
};

/** Страница товаров: поиск, фильтр по категории, сортировка, CRUD и остатки */
@Component({
  selector: 'app-products',
  imports: [
    BulkBar,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    StockStepper,
    TPipe,
  ],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export default class Products {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly service = inject(ProductsService);
  protected readonly categories = inject(CategoriesService);
  private readonly settings = inject(SettingsService);

  /** ?product=<id> — сразу открыть карточку товара (ссылка из уведомлений о низком остатке) */
  readonly product = input<string>();

  constructor() {
    openByQueryParam({
      param: 'product',
      id: this.product,
      items: this.service.products,
      loading: this.service.loading,
      open: (p) => this.openDialog(p),
    });
  }

  protected readonly sorts = SORTS;
  protected readonly columns = ['select', 'image', 'name', 'category', 'price', 'stock', 'status', 'actions'];

  protected readonly search = signal('');
  protected readonly category = signal('');
  protected readonly sort = signal<SortKey>('name');

  /** Товары после поиска, фильтра и сортировки */
  protected readonly visible = computed(() => {
    const query = this.search().trim().toLowerCase();
    const category = this.category();
    return this.service
      .products()
      .filter(
        (p) =>
          (!category || p.categoryId === category) &&
          (!query || p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query)),
      )
      .sort(COMPARE[this.sort()]);
  });

  protected readonly filtered = computed(() => !!this.search().trim() || !!this.category());

  /** Выбранные товары для массовых действий */
  protected readonly selection = new Selection(this.visible);
  protected readonly bulkBusy = signal(false);

  /** Скрыть или показать выбранные товары */
  protected async bulkActive(active: boolean) {
    const ids = this.selection.selected().map((p) => p.id);
    const done = active ? 'Показано товарів: {n}' : 'Приховано товарів: {n}';
    await this.runBulk(() => this.service.setActiveMany(ids, active), done, ids.length);
  }

  protected async bulkRemove() {
    const ids = this.selection.selected().map((p) => p.id);
    const ok = await confirmAction(this.dialog, {
      title: 'Видалити вибрані товари?',
      message: 'Буде видалено назавжди товарів: {n}.',
      params: { n: ids.length },
      confirm: 'Видалити',
    });
    if (!ok) return;
    await this.runBulk(() => this.service.removeMany(ids), 'Видалено товарів: {n}', ids.length);
  }

  private async runBulk(action: () => Promise<void>, done: string, n: number) {
    this.bulkBusy.set(true);
    try {
      await action();
      this.selection.clear();
      this.snackBar.open(t(done, { n }), t('Закрити'), { duration: 4000 });
    } catch {
      this.toast('Не вдалося виконати дію. Спробуйте ще раз.');
    } finally {
      this.bulkBusy.set(false);
    }
  }

  protected readonly errorKey = computed(() => {
    const code = this.service.error();
    if (!code) return null;
    return code === 'permission-denied'
      ? 'Немає доступу до бази. Перевірте правила Firestore.'
      : 'Не вдалося завантажити товари. Перевірте з’єднання.';
  });

  protected readonly trackById = (_: number, p: Product) => p.id;

  protected price(p: Product): string {
    return formatMoney(p.price);
  }

  protected isLow(p: Product): boolean {
    return p.stock <= this.settings.lowStockThreshold();
  }

  protected categoryName(id: string): string {
    return this.categories.nameById().get(id) ?? '—';
  }

  protected resetFilters() {
    this.search.set('');
    this.category.set('');
  }

  protected openDialog(product?: Product) {
    const data: ProductDialogData = { product };
    this.dialog
      .open(ProductDialog, { data, width: '640px', maxWidth: '95vw', autoFocus: 'first-tabbable' })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.toast(product ? 'Зміни збережено' : 'Товар додано');
      });
  }

  protected async remove(product: Product) {
    const ok = await confirmAction(this.dialog, {
      title: 'Видалити товар?',
      message: 'Товар «{name}» буде видалено назавжди.',
      params: { name: product.name },
      confirm: 'Видалити',
    });
    if (!ok) return;
    try {
      await this.service.remove(product.id);
      this.toast('Товар «{name}» видалено', product.name);
    } catch {
      this.toast('Не вдалося видалити товар');
    }
  }

  protected async changeStock(product: Product, delta: number) {
    try {
      await this.service.changeStock(product, delta);
    } catch {
      this.toast('Не вдалося змінити залишок');
    }
  }

  private toast(key: string, name?: string) {
    this.snackBar.open(t(key, { name }), t('Закрити'), { duration: 4000 });
  }
}
