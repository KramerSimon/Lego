import { Injectable, signal } from '@angular/core';
import { DEFAULT_LANGUAGE, SupportedLanguage, TRANSLATIONS } from '../i18n/translations';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private static readonly LANGUAGE_COOKIE = 'lego_lang';
  private static readonly COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

  readonly language = signal<SupportedLanguage>(this.readLanguageCookie());

  setLanguage(language: SupportedLanguage): void {
    this.language.set(language);
    this.writeLanguageCookie(language);
  }

  translate(value: string): string {
    const key = String(value ?? '');
    if (!key) {
      return '';
    }

    const active = this.language();
    const table = TRANSLATIONS[active];
    return table[key] ?? key;
  }

  private readLanguageCookie(): SupportedLanguage {
    const cookieName = `${LanguageService.LANGUAGE_COOKIE}=`;
    const cookies = document.cookie ? document.cookie.split(';') : [];
    for (const rawCookie of cookies) {
      const cookie = rawCookie.trim();
      if (!cookie.startsWith(cookieName)) {
        continue;
      }

      const value = decodeURIComponent(cookie.slice(cookieName.length));
      if (value === 'en' || value === 'it' || value === 'de') {
        return value;
      }
    }

    return DEFAULT_LANGUAGE;
  }

  private writeLanguageCookie(language: SupportedLanguage): void {
    document.cookie = `${LanguageService.LANGUAGE_COOKIE}=${encodeURIComponent(language)}; path=/; max-age=${LanguageService.COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
  }
}
