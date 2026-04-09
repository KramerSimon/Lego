import { HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiHttpService } from './api-http.service';
import { AuthAccountResponse, AuthLoginResponse, AuthRegisterPayload, AuthUser } from './api-types';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly apiHttp = inject(ApiHttpService);

  login(identifier: string, password: string): Observable<AuthLoginResponse> {
    return this.apiHttp.post<AuthLoginResponse>('auth/login', {
      identifier,
      password
    });
  }

  register(payload: AuthRegisterPayload): Observable<AuthLoginResponse> {
    return this.apiHttp.post<AuthLoginResponse>('auth/register', payload);
  }

  me(token: string): Observable<{ user: AuthUser }> {
    return this.apiHttp.get<{ user: AuthUser }>('auth/me', {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    });
  }

  getMyAccount(): Observable<AuthAccountResponse> {
    return this.apiHttp.get<AuthAccountResponse>('users/me');
  }

  updateMyAccount(payload: FormData): Observable<AuthAccountResponse> {
    return this.apiHttp.put<AuthAccountResponse>('users/me', payload);
  }
}
