import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of, tap } from 'rxjs';
import { AuthUser } from './api-types';
import { AuthApiService } from './auth-api.service';

const TOKEN_KEY = 'lego_auth_token';
const USER_KEY = 'lego_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApiService);

  readonly token = signal<string | null>(null);
  readonly user = signal<AuthUser | null>(null);
  readonly authenticating = signal(false);
  readonly authError = signal<string | null>(null);

  constructor() {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (!savedToken) {
      // Keep local auth state consistent: user identity without a token is invalid.
      if (savedUser) {
        localStorage.removeItem(USER_KEY);
      }
      return;
    }

    this.token.set(savedToken);

    if (savedUser) {
      try {
        this.user.set(JSON.parse(savedUser) as AuthUser);
      } catch {
        this.user.set(null);
        localStorage.removeItem(USER_KEY);
      }
    }
  }

  login(identifier: string, password: string) {
    this.authenticating.set(true);
    this.authError.set(null);
    return this.api.login(identifier, password).pipe(
      tap((response) => {
        this.persistAuth(response.token, response.user);
        this.authenticating.set(false);
      }),
      map(() => true),
      catchError((error: unknown) => {
        this.authenticating.set(false);
        this.authError.set(this.extractApiError(error));
        return of(false);
      })
    );
  }

  register(username: string, email: string, fullName: string, password: string) {
    this.authenticating.set(true);
    this.authError.set(null);
    return this.api.register({
      username,
      email,
      full_name: fullName,
      password
    }).pipe(
      tap((response) => {
        this.persistAuth(response.token, response.user);
        this.authenticating.set(false);
      }),
      map(() => true),
      catchError((error: unknown) => {
        this.authenticating.set(false);
        this.authError.set(this.extractApiError(error));
        return of(false);
      })
    );
  }

  refreshMyAccount() {
    return this.api.getMyAccount().pipe(
      tap((response) => {
        this.setCurrentUser(response.user);
      }),
      map((response) => response.user)
    );
  }

  completeOnboardingGuide() {
    return this.api.completeOnboardingGuide().pipe(
      tap((response) => {
        this.setCurrentUser(response.user);
      }),
      map(() => true),
      catchError(() => of(false))
    );
  }

  setCurrentUser(user: AuthUser): void {
    this.user.set(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  logout(): void {
    this.token.set(null);
    this.user.set(null);
    this.authError.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private persistAuth(token: string, user: AuthUser): void {
    this.token.set(token);
    this.user.set(user);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private extractApiError(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
      return error.error.error;
    }
    return 'Authentication failed';
  }
}
