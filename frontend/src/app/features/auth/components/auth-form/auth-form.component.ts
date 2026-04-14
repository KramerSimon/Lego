import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../../core/services/auth.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'lego-auth-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe
  ],
  templateUrl: './auth-form.component.html',
  styleUrl: './auth-form.component.scss'
})
export class AuthFormComponent {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly mode = signal<'login' | 'register'>('login');
  readonly error = signal<string | null>(null);

  readonly loginForm = this.fb.group({
    identifier: this.fb.control('', [Validators.required]),
    password: this.fb.control('', [Validators.required])
  });

  readonly registerForm = this.fb.group(
    {
      username: this.fb.control('', [Validators.required, Validators.minLength(3)]),
      email: this.fb.control('', [Validators.required, Validators.email]),
      full_name: this.fb.control(''),
      password: this.fb.control('', [Validators.required, Validators.minLength(8)]),
      confirm_password: this.fb.control('', [Validators.required])
    },
    { validators: this.passwordsMatchValidator }
  );

  switchMode(mode: 'login' | 'register'): void {
    this.mode.set(mode);
    this.error.set(null);
    this.auth.authError.set(null);
  }

  resendVerificationEmail(): void {
    const email = this.auth.pendingVerificationEmail();
    if (!email || this.auth.authenticating()) {
      return;
    }

    this.error.set(null);
    this.auth.authError.set(null);
    this.auth.resendVerification(email).subscribe((ok) => {
      if (!ok) {
        this.error.set(this.auth.authError() ?? 'Unable to resend verification email for this email/username.');
      }
    });
  }

  submit(): void {
    if (this.auth.authenticating()) {
      return;
    }

    if (this.mode() === 'login') {
      this.submitLogin();
      return;
    }

    this.submitRegister();
  }

  private submitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const raw = this.loginForm.getRawValue();
    const identifier = String(raw.identifier ?? '').trim();
    const password = String(raw.password ?? '');
    this.error.set(null);
    this.auth.authError.set(null);

    this.auth.login(identifier, password).subscribe((ok) => {
      if (!ok) {
        this.error.set(this.auth.authError() ?? 'Login failed. Check username/email and password.');
      } else {
        this.loginForm.controls.password.setValue('');
      }
    });
  }

  private submitRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.error.set('Please fix the highlighted fields.');
      return;
    }

    const raw = this.registerForm.getRawValue();
    const username = String(raw.username ?? '').trim();
    const email = String(raw.email ?? '').trim();
    const fullName = String(raw.full_name ?? '').trim();
    const password = String(raw.password ?? '');
    this.error.set(null);
    this.auth.authError.set(null);
    this.auth.register(username, email, fullName, password).subscribe((ok) => {
      if (!ok) {
        this.error.set(this.auth.authError() ?? 'Registration failed. Try again.');
        return;
      }

      this.mode.set('login');

      this.registerForm.controls.password.setValue('');
      this.registerForm.controls.confirm_password.setValue('');
    });
  }

  fieldInvalid(controlName: 'username' | 'email' | 'password' | 'confirm_password'): boolean {
    const control = this.registerForm.controls[controlName];
    return Boolean(control.invalid && (control.touched || control.dirty));
  }

  hasPasswordMismatch(): boolean {
    const confirmControl = this.registerForm.controls.confirm_password;
    return Boolean(this.registerForm.hasError('passwordMismatch') && (confirmControl.touched || confirmControl.dirty));
  }

  private passwordsMatchValidator(control: AbstractControl): { passwordMismatch: true } | null {
    const password = String(control.get('password')?.value ?? '');
    const confirmPassword = String(control.get('confirm_password')?.value ?? '');
    if (!password || !confirmPassword) {
      return null;
    }
    return password === confirmPassword ? null : { passwordMismatch: true };
  }
}
