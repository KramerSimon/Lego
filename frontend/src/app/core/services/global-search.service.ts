import { Injectable, signal } from '@angular/core';

export type GlobalSearchScope = 'all' | 'my-sets' | 'missing-parts' | 'buildable-sets' | 'build-mode' | 'inventory-overview';

export interface GlobalSearchRequest {
  query: string;
  scope: GlobalSearchScope;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private readonly latestRequest = signal<GlobalSearchRequest | null>(null);

  readonly request = this.latestRequest.asReadonly();

  publish(query: string, scope: GlobalSearchScope): boolean {
    const normalized = query.trim();
    if (!normalized) {
      return false;
    }

    this.latestRequest.set({
      query: normalized,
      scope,
      timestamp: Date.now()
    });

    return true;
  }
}
