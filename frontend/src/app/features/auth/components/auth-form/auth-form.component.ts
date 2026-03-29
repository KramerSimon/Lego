import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../../core/services/auth.service';

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
    MatIconModule
  ],
  templateUrl: './auth-form.component.html',
  styleUrl: './auth-form.component.scss'
})
export class AuthFormComponent {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    identifier: this.fb.control('', [Validators.required]),
    password: this.fb.control('', [Validators.required])
  });

  submit(): void {
    if (this.form.invalid || this.auth.authenticating()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const identifier = String(raw.identifier ?? '').trim();
    const password = String(raw.password ?? '');
    this.error.set(null);

    this.auth.login(identifier, password).subscribe((ok) => {
      if (!ok) {
        this.error.set('Login failed. Check username/email and password.');
      } else {
        this.form.controls.password.setValue('');
      }
    });
  }
}
