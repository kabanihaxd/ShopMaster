import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { Params, TPipe } from '../i18n/i18n';

export interface ConfirmData {
  /** Ключи перевода */
  title: string;
  message: string;
  confirm: string;
  params?: Params;
}

/** Подтверждение опасного действия (удаление и т.п.) */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, TPipe],
  template: `
    <h2 mat-dialog-title>{{ data.title | t }}</h2>
    <mat-dialog-content>
      <p>{{ data.message | t: data.params }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close cdkFocusInitial>{{ 'Скасувати' | t }}</button>
      <button mat-flat-button class="danger-button" [mat-dialog-close]="true">
        {{ data.confirm | t }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmData>(MAT_DIALOG_DATA);
}

/** Показать подтверждение; true — пользователь согласился */
export async function confirmAction(dialog: MatDialog, data: ConfirmData): Promise<boolean> {
  const ref = dialog.open(ConfirmDialog, { data, maxWidth: '440px', role: 'alertdialog' });
  return (await firstValueFrom(ref.afterClosed())) === true;
}
