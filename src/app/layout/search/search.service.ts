import { inject, Service } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { t } from '../../i18n/i18n';
import { CommandPalette } from './command-palette';

/** Открывает глобальный поиск (Ctrl+K / кнопка в шапке), не больше одного окна сразу */
@Service()
export class SearchService {
  private readonly dialog = inject(MatDialog);
  private ref: MatDialogRef<CommandPalette> | null = null;

  open() {
    if (this.ref) return;
    this.ref = this.dialog.open(CommandPalette, {
      width: '640px',
      maxWidth: 'calc(100vw - 32px)',
      position: { top: '12vh' },
      panelClass: 'command-palette-panel',
      ariaLabel: t('Пошук'),
      autoFocus: 'first-tabbable',
    });
    this.ref.afterClosed().subscribe(() => (this.ref = null));
  }
}
