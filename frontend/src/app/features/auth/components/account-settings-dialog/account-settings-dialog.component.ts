import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../../environments/environment';
import { AuthApiService } from '../../../../core/services/auth-api.service';
import { AuthUser } from '../../../../core/services/api-types';

@Component({
  selector: 'lego-account-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './account-settings-dialog.component.html',
  styleUrl: './account-settings-dialog.component.scss'
})
export class AccountSettingsDialogComponent {
  private readonly data = inject<AuthUser>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AccountSettingsDialogComponent, AuthUser | null>);
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly saving = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly selectedFileName = signal<string>('');
  readonly selectedPreviewUrl = signal<string | null>(null);

  readonly form = this.fb.group({
    username: this.fb.control(this.data.username ?? '', [Validators.required, Validators.minLength(2)]),
    email: this.fb.control(this.data.email ?? '', [Validators.required, Validators.email]),
    full_name: this.fb.control(this.data.full_name ?? '', [Validators.required, Validators.minLength(2)]),
    password: this.fb.control('', [Validators.minLength(6)])
  });

  readonly currentImageUrl = computed(() => this.toImageUrl(this.data.profile_image_url));
  readonly previewImageUrl = computed(() => this.selectedPreviewUrl() ?? this.currentImageUrl());

  close(): void {
    this.dialogRef.close(null);
  }

  handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      this.clearSelectedFile();
      return;
    }

    const mime = String(file.type || '').toLowerCase();
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowed.has(mime)) {
      this.snackBar.open('Only JPG, PNG, WEBP, and GIF files are supported.', 'Close', { duration: 3200 });
      this.clearSelectedFile();
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      this.snackBar.open('Profile image must be 8MB or smaller.', 'Close', { duration: 3200 });
      this.clearSelectedFile();
      return;
    }

    this.selectedFile.set(file);
    this.selectedFileName.set(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedPreviewUrl.set(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.selectedFileName.set('');
    this.selectedPreviewUrl.set(null);
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = new FormData();
    payload.append('username', String(raw.username ?? '').trim());
    payload.append('email', String(raw.email ?? '').trim());
    payload.append('full_name', String(raw.full_name ?? '').trim());

    const password = String(raw.password ?? '').trim();
    if (password) {
      payload.append('password', password);
    }

    const profileImage = this.selectedFile();
    if (profileImage) {
      payload.append('profile_image', profileImage);
    }

    this.saving.set(true);
    this.authApi.updateMyAccount(payload).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.dialogRef.close(response.user);
      },
      error: (error) => {
        this.saving.set(false);
        const errorMessage = String(error?.error?.error ?? 'Failed to update account details.');
        this.snackBar.open(errorMessage, 'Close', { duration: 3200 });
      }
    });
  }

  private toImageUrl(value: string | null | undefined): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return null;
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    if (raw.startsWith('/')) {
      return `${environment.apiBaseUrl}${raw}`;
    }
    return raw;
  }
}
