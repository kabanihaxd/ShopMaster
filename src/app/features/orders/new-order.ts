import { Component, computed, inject, signal } from '@angular/core';
import {
  applyEach,
  email,
  form,
  FormField,
  FormRoot,
  maxLength,
  required,
  validate,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { formatMoney } from '../../core/format';
import { Params, TPipe } from '../../i18n/i18n';
import { CustomersService } from '../customers/customers.service';
import { ProductsService } from '../products/products.service';
import { NewOrder, OrderError, OrdersService } from './orders.service';

interface OrderModel {
  mode: 'existing' | 'new';
  customerId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  note: string;
  items: { productId: string; qty: number }[];
}

/** Необязательные данные диалога: заранее выбранный клиент (со страницы клиента) */
export interface NewOrderData {
  customerId?: string;
}

/** Ручное создание заказа менеджером (например, принятого по телефону) */
@Component({
  selector: 'app-new-order',
  imports: [
    FormRoot,
    FormField,
    MatButtonModule,
    MatButtonToggleModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TPipe,
  ],
  templateUrl: './new-order.html',
  styleUrl: './new-order.scss',
})
export class NewOrderDialog {
  private readonly orders = inject(OrdersService);
  private readonly products = inject(ProductsService);
  private readonly ref = inject<MatDialogRef<NewOrderDialog, number>>(MatDialogRef);
  protected readonly customers = inject(CustomersService);
  private readonly data = inject<NewOrderData | null>(MAT_DIALOG_DATA, { optional: true });
  private readonly preset = this.data?.customerId ? this.customers.byId().get(this.data.customerId) : undefined;

  /** Товары, которые можно продать: активные и в наличии */
  protected readonly available = computed(() =>
    this.products
      .products()
      .filter((p) => p.active && p.stock > 0)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  protected readonly sortedCustomers = computed(() =>
    [...this.customers.customers()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  protected readonly saveError = signal<{ key: string; params?: Params } | null>(null);

  private readonly model = signal<OrderModel>({
    mode: this.preset || this.customers.customers().length ? 'existing' : 'new',
    customerId: this.preset?.id ?? '',
    name: '',
    email: '',
    phone: '',
    address: this.preset?.address ?? '',
    note: '',
    items: [{ productId: '', qty: 1 }],
  });

  protected readonly orderForm = form(
    this.model,
    (p) => {
      const isExisting = ({ valueOf }: { valueOf: (path: typeof p.mode) => string }) =>
        valueOf(p.mode) === 'existing';
      required(p.customerId, { message: 'Оберіть клієнта', when: isExisting });
      required(p.name, { message: 'Введіть ім’я клієнта', when: (ctx) => !isExisting(ctx) });
      email(p.email, { message: 'Некоректна адреса пошти' });
      required(p.address, { message: 'Введіть адресу доставки' });
      maxLength(p.note, 500, { message: 'Не довше 500 символів' });
      validate(p.items, ({ value }) =>
        value().length ? undefined : { kind: 'empty', message: 'Додайте хоча б один товар' },
      );
      applyEach(p.items, (item) => {
        required(item.productId, { message: 'Оберіть товар' });
        validate(item.qty, ({ value, valueOf }) => {
          const qty = value();
          if (!Number.isInteger(qty) || qty < 1) return { kind: 'qty', message: 'Ціле число від 1' };
          const stock = this.products.byId().get(valueOf(item.productId))?.stock ?? Infinity;
          return qty > stock ? { kind: 'stock', message: 'Більше, ніж є на складі' } : undefined;
        });
      });
    },
    {
      submission: {
        action: async () => {
          this.saveError.set(null);
          try {
            const number = await this.orders.create(this.toNewOrder());
            this.ref.close(number);
          } catch (e) {
            this.saveError.set(this.errorMessage(e));
          }
          return undefined;
        },
      },
    },
  );

  /** Сумма заказа по текущим ценам */
  protected readonly total = computed(() =>
    formatMoney(
      this.model().items.reduce(
        (sum, i) => sum + (this.products.byId().get(i.productId)?.price ?? 0) * (Number(i.qty) || 0),
        0,
      ),
    ),
  );

  protected stockHint(productId: string): number | null {
    return this.products.byId().get(productId)?.stock ?? null;
  }

  protected addItem() {
    this.model.update((m) => ({ ...m, items: [...m.items, { productId: '', qty: 1 }] }));
  }

  protected removeItem(index: number) {
    this.model.update((m) => ({ ...m, items: m.items.filter((_, i) => i !== index) }));
  }

  /** При выборе клиента подставляем его адрес, если поле ещё пустое */
  protected onCustomerPicked(id: string) {
    const address = this.customers.byId().get(id)?.address ?? '';
    if (address && !this.model().address.trim()) {
      this.model.update((m) => ({ ...m, address }));
    }
  }

  private toNewOrder(): NewOrder {
    const m = this.model();
    return {
      customer:
        m.mode === 'existing'
          ? { id: m.customerId }
          : { name: m.name.trim(), email: m.email.trim(), phone: m.phone.trim() },
      address: m.address.trim(),
      note: m.note.trim(),
      items: m.items.map((i) => ({ productId: i.productId, qty: i.qty })),
    };
  }

  private errorMessage(e: unknown): { key: string; params?: Params } {
    if (e instanceof OrderError) {
      if (e.code === 'stock') return { key: 'Товару «{name}» не вистачає на складі', params: { name: e.productName } };
      if (e.code === 'missing-product') return { key: 'Один із товарів уже видалено' };
      return { key: 'Клієнта не знайдено' };
    }
    return { key: 'Не вдалося зберегти. Перевірте з’єднання й спробуйте ще раз.' };
  }
}
