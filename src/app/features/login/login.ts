import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService, authErrorKey } from '../../core/auth';
import { firebaseConfigured } from '../../core/firebase';
import { TPipe } from '../../i18n/i18n';
import { LangSwitch } from '../../layout/lang-switch';
import { ThemeToggle } from '../../layout/theme-toggle';

/** Сообщение под формой: ключ перевода + параметры */
interface Notice {
  kind: 'error' | 'info';
  key: string;
  email?: string;
}

/** Вход менеджера по почте и паролю */
@Component({
  selector: 'app-login',
  imports: [
    FormRoot,
    FormField,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    RouterLink,
    TPipe,
    LangSwitch,
    ThemeToggle,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export default class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly configured = firebaseConfigured;
  protected readonly showPassword = signal(false);
  protected readonly notice = signal<Notice | null>(null);

  private readonly model = signal({ email: '', password: '' });

  protected readonly loginForm = form(
    this.model,
    (p) => {
      required(p.email, { message: 'Введіть пошту' });
      email(p.email, { message: 'Некоректна адреса пошти' });
      required(p.password, { message: 'Введіть пароль' });
    },
    {
      submission: {
        action: async () => {
          this.notice.set(null);
          const { email, password } = this.model();
          try {
            await this.auth.signIn(email, password);
            await this.router.navigateByUrl('/dashboard');
          } catch (e) {
            this.notice.set({ kind: 'error', key: authErrorKey(e) });
          }
          return undefined;
        },
      },
    },
  );

  protected async resetPassword() {
    const field = this.loginForm.email();
    if (field.invalid()) {
      field.markAsTouched();
      return;
    }
    const email = this.model().email.trim();
    try {
      await this.auth.resetPassword(email);
      this.notice.set({
        kind: 'info',
        key: 'Ми надіслали лист для зміни пароля на {email}.',
        email,
      });
    } catch (e) {
      this.notice.set({ kind: 'error', key: authErrorKey(e) });
    }
  }
}
