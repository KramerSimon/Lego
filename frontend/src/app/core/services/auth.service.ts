import { Injectable, inject, signal } from '@angular/core';
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
    return this.api.login(identifier, password).pipe(
      tap((response) => {
        this.authenticating.set(false);
        this.token.set(response.token);
        this.user.set(response.user);
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      }),
      map(() => true),
      catchError(() => {
        this.authenticating.set(false);
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

  setCurrentUser(user: AuthUser): void {
    this.user.set(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  logout(): void {
    this.token.set(null);
    this.user.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
