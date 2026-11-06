import { Component } from '@angular/core';
import { CategoriesManager } from './categories-manager';
import { DemoPanel } from './demo-panel';
import { InterfaceSettingsPanel } from './interface-settings';
import { StoreSettingsPanel } from './store-settings';

/** Настройки: магазин, интерфейс, категории и демо-данные */
@Component({
  selector: 'app-settings',
  imports: [StoreSettingsPanel, InterfaceSettingsPanel, CategoriesManager, DemoPanel],
  template: `
    <div class="grid">
      <div class="column">
        <app-store-settings />
        <app-interface-settings />
        <app-demo-panel />
      </div>
      <app-categories-manager />
    </div>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
      gap: 16px;
      max-width: 1200px;
    }
    .column {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }
    @media (max-width: 899px) {
      .grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export default class Settings {}
