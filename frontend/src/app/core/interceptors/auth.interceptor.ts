import { HttpInterceptorFn } from '@angular/common/http';

const AUTH_TOKEN_KEY = 'lego_auth_token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('http://localhost:3000')) {
    return next(req);
  }

  if (req.url.includes('/auth/login')) {
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
