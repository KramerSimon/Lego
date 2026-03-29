import { Injectable, inject, signal } from '@angular/core';
import { catchError, map, of, tap } from 'rxjs';
import { AuthUser, LegoApiService } from './lego-api.service';

const TOKEN_KEY = 'lego_auth_token';
const USER_KEY = 'lego_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(LegoApiService);

  readonly token = signal<string | null>(null);
  readonly user = signal<AuthUser | null>(null);
  readonly authenticating = signal(false);

  constructor() {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedToken) {
      this.token.set(savedToken);
    }
    if (savedUser) {
      try {
        this.user.set(JSON.parse(savedUser) as AuthUser);
      } catch {
        this.user.set(null);
      }
    }
  }

  login(identifier: string, password: string) {
    this.authenticating.set(true);
    return this.api.authLogin(identifier, password).pipe(
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

  logout(): void {
    this.token.set(null);
    this.user.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
