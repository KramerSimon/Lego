import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PagedResult {
  data: Record<string, unknown>[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class LegoApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000';

  getRows(
    endpoint: string,
    page: number,
    pageSize: number,
    extraParams: Record<string, string | number> = {}
  ): Observable<PagedResult | Record<string, unknown>[]> {
    return this.http.get<PagedResult | Record<string, unknown>[]>(`${this.baseUrl}/${endpoint}`, {
      params: {
        page,
        pageSize,
        ...extraParams
      }
    });
  }

  createRow(endpoint: string, payload: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.baseUrl}/${endpoint}`, payload);
  }
}
