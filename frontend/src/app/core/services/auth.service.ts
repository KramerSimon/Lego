import { Injectable, inject, signal } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of, tap } from 'rxjs';
import {
  AuthAccountResponse,
  AuthLoginResponse,
  AuthRegisterPayload,
  AuthRegisterResponse,
  AuthResendVerificationPayload,
  AuthResendVerificationResponse,
  AuthUser
} from './api-types';
import { ApiHttpService } from './api-http.service';

const TOKEN_KEY = 'lego_auth_token';
const USER_KEY = 'lego_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiHttp = inject(ApiHttpService);

  readonly token = signal<string | null>(null);
  readonly user = signal<AuthUser | null>(null);
  readonly authenticating = signal(false);
  readonly authError = signal<string | null>(null);
  readonly pendingVerificationEmail = signal<string | null>(null);
  readonly verificationMessage = signal<string | null>(null);

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
    this.verificationMessage.set(null);
    return this.loginRequest(identifier, password).pipe(
      tap((response) => {
        this.persistAuth(response.token, response.user);
        this.pendingVerificationEmail.set(null);
        this.authenticating.set(false);
      }),
      map(() => true),
      catchError((error: unknown) => {
        this.authenticating.set(false);
        const message = this.extractApiError(error);
        this.authError.set(message);
        if (message.includes('Email not verified')) {
          this.pendingVerificationEmail.set(String(identifier ?? '').trim());
        }
        return of(false);
      })
    );
  }

  register(username: string, email: string, fullName: string, password: string) {
    this.authenticating.set(true);
    this.authError.set(null);
    this.verificationMessage.set(null);
    return this.registerRequest({
      username,
      email,
      full_name: fullName,
      password
    }).pipe(
      tap((response) => {
        this.pendingVerificationEmail.set(response.email);
        this.verificationMessage.set(response.message);
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

  resendVerification(identifierOrEmail: string) {
    this.authenticating.set(true);
    this.authError.set(null);
    return this.resendVerificationRequest({ identifier: identifierOrEmail, email: identifierOrEmail }).pipe(
      tap((response) => {
        if (response.email) {
          this.pendingVerificationEmail.set(response.email);
        }
        this.verificationMessage.set(response.message);
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
    return this.getMyAccount().pipe(
      tap((response) => {
        this.setCurrentUser(response.user);
      }),
      map((response) => response.user)
    );
  }

  completeOnboardingGuide() {
    return this.completeOnboardingGuideRequest().pipe(
      tap((response) => {
        this.setCurrentUser(response.user);
      }),
      map(() => true),
      catchError(() => of(false))
    );
  }

  me(token: string) {
    return this.apiHttp.get<{ user: AuthUser }>('auth/me', {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    });
  }

  getMyAccount() {
    return this.apiHttp.get<AuthAccountResponse>('users/me');
  }

  updateMyAccount(payload: FormData) {
    return this.apiHttp.put<AuthAccountResponse>('users/me', payload);
  }

  setCurrentUser(user: AuthUser): void {
    this.user.set(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  logout(): void {
    this.token.set(null);
    this.user.set(null);
    this.authError.set(null);
    this.pendingVerificationEmail.set(null);
    this.verificationMessage.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private persistAuth(token: string, user: AuthUser): void {
    this.token.set(token);
    this.user.set(user);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private loginRequest(identifier: string, password: string) {
    return this.apiHttp.post<AuthLoginResponse>('auth/login', {
      identifier,
      password
    });
  }

  private registerRequest(payload: AuthRegisterPayload) {
    return this.apiHttp.post<AuthRegisterResponse>('auth/register', payload);
  }

  private resendVerificationRequest(payload: AuthResendVerificationPayload) {
    return this.apiHttp.post<AuthResendVerificationResponse>('auth/resend-verification', payload);
  }

  private completeOnboardingGuideRequest() {
    return this.apiHttp.post<{ user: AuthUser }>('auth/onboarding/complete', {});
  }

  private extractApiError(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
      return error.error.error;
    }
    return 'Authentication failed';
  }
}
