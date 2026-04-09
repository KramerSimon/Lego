import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const AUTH_TOKEN_KEY = 'lego_auth_token';
const API_BASE_URL = environment.apiBaseUrl;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL)) {
    return next(req);
  }

  if (req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
    return next(req);
  }

  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    return next(req);
  }

  const authenticated = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
  return next(authenticated);
};
