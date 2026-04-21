import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiHttpService } from './api-http.service';
import {
  BuildableSetCatalogRow,
  PagedResult,
  SetPartsResponse,
  UserSetBreakdownResponse,
  UserSetWithPartsPayload,
  UserSetWithPartsResult
} from './api-types';

@Injectable({ providedIn: 'root' })
export class UserSetsApiService {
  private readonly apiHttp = inject(ApiHttpService);

  getBuildableCatalog(
    page: number,
    pageSize: number,
    filters: {
      search?: string;
      theme_id?: number;
      buildableOnly?: boolean;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    } = {}
  ): Observable<PagedResult & { data: BuildableSetCatalogRow[] }> {
    const params: Record<string, string | number> = { page, pageSize };
    if (filters.search) {
      params['search'] = filters.search;
    }
    if (filters.theme_id) {
      params['theme_id'] = filters.theme_id;
    }
    if (typeof filters.buildableOnly === 'boolean') {
      params['buildableOnly'] = filters.buildableOnly ? 1 : 0;
    }
    if (filters.sortBy) {
      params['sortBy'] = filters.sortBy;
    }
    if (filters.sortDir) {
      params['sortDir'] = filters.sortDir;
    }

    return this.apiHttp.get<PagedResult & { data: BuildableSetCatalogRow[] }>('user_sets/buildable', { params });
  }

  getSetParts(setNum: string): Observable<SetPartsResponse> {
    return this.apiHttp.get<SetPartsResponse>(`user_sets/set-parts/${encodeURIComponent(setNum)}`);
  }

  createWithParts(payload: UserSetWithPartsPayload): Observable<UserSetWithPartsResult> {
    return this.apiHttp.post<UserSetWithPartsResult>('user_sets/with-parts', payload);
  }

  getBreakdown(userSetId: number): Observable<UserSetBreakdownResponse> {
    return this.apiHttp.get<UserSetBreakdownResponse>(`user_sets/${userSetId}/breakdown`);
  }

  updateBreakdownPart(
    userSetId: number,
    kind: 'available' | 'missing',
    rowId: number,
    quantity: number
  ): Observable<{ message: string }> {
    return this.apiHttp.put<{ message: string }>(`user_sets/${userSetId}/parts/${kind}/${rowId}`, { quantity });
  }

  deleteBreakdownPart(
    userSetId: number,
    kind: 'available' | 'missing',
    rowId: number
  ): Observable<{ message: string }> {
    return this.apiHttp.delete<{ message: string }>(`user_sets/${userSetId}/parts/${kind}/${rowId}`);
  }
}
