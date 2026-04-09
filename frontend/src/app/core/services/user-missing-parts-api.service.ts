import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiHttpService } from './api-http.service';
import { PagedResult } from './api-types';

@Injectable({ providedIn: 'root' })
export class UserMissingPartsApiService {
  private readonly apiHttp = inject(ApiHttpService);

  getCatalog(
    page: number,
    pageSize: number,
    filters: {
      user_id?: number;
      set_num?: string;
      theme_id?: number;
      search?: string;
    } = {}
  ): Observable<PagedResult> {
    const params: Record<string, string | number> = { page, pageSize };
    if (filters.user_id) {
      params['user_id'] = filters.user_id;
    }
    if (filters.set_num) {
      params['set_num'] = filters.set_num;
    }
    if (filters.theme_id) {
      params['theme_id'] = filters.theme_id;
    }
    if (filters.search) {
      params['search'] = filters.search;
    }

    return this.apiHttp.get<PagedResult>('user_missing_parts/catalog', { params });
  }
}
