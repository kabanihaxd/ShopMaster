import { effect, inject, Service, signal } from '@angular/core';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { AuthService } from './auth';
import { CurrencyCode, isCurrency, setCurrency } from './format';
import { db } from './firestore';

export interface StoreSettings {
  currency: CurrencyCode;
  lowStockThreshold: number;
}

const DEFAULTS: StoreSettings = { currency: 'USD', lowStockThreshold: 10 };

/**
 * Настройки магазина (общие для всех менеджеров): документ Firestore `settings/store`.
 * Язык и тема — личные, хранятся в браузере (см. i18n и ThemeService).
 */
@Service()
export class SettingsService {
  private readonly auth = inject(AuthService);

  readonly currency = signal<CurrencyCode>(DEFAULTS.currency);
  /** Остаток, при котором (и ниже) товар считается заканчивающимся */
  readonly lowStockThreshold = signal(DEFAULTS.lowStockThreshold);
  /** Настройки получены из базы (например, накладная ждёт валюту перед печатью) */
  readonly loaded = signal(false);

  constructor() {
    effect((onCleanup) => {
      if (!this.auth.user()) return;
      const unsubscribe = onSnapshot(doc(db(), 'settings', 'store'), (snap) => {
        const d = snap.data() ?? {};
        this.currency.set(isCurrency(d['currency']) ? d['currency'] : DEFAULTS.currency);
        const threshold = Number(d['lowStockThreshold']);
        this.lowStockThreshold.set(
          Number.isInteger(threshold) && threshold >= 0 ? threshold : DEFAULTS.lowStockThreshold,
        );
        this.loaded.set(true);
      });
      onCleanup(unsubscribe);
    });

    // Валюта применяется ко всем суммам в интерфейсе
    effect(() => setCurrency(this.currency()));
  }

  async save(settings: StoreSettings): Promise<void> {
    await setDoc(doc(db(), 'settings', 'store'), settings, { merge: true });
  }
}
