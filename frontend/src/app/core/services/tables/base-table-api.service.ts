import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiHttpService } from '../api-http.service';
import { PagedResult } from '../api-types';

export interface TableApiService {
  getRows(
    page: number,
    pageSize: number,
    extraParams?: Record<string, string | number>
  ): Observable<PagedResult | Record<string, unknown>[]>;
  createRow(payload: Record<string, unknown>): Observable<Record<string, unknown>>;
  deleteRow(id: string | number): Observable<{ message: string }>;
}

@Injectable()
export abstract class BaseTableApiService implements TableApiService {
  protected constructor(
    private readonly apiHttp: ApiHttpService,
    private readonly endpoint: string
  ) {}

  getRows(
    page: number,
    pageSize: number,
    extraParams: Record<string, string | number> = {}
  ): Observable<PagedResult | Record<string, unknown>[]> {
    return this.apiHttp.get<PagedResult | Record<string, unknown>[]>(this.endpoint, {
      params: {
        page,
        pageSize,
        ...extraParams
      }
    });
  }

  createRow(payload: Record<string, unknown>): Observable<Record<string, unknown>> {
    return this.apiHttp.post<Record<string, unknown>>(this.endpoint, payload);
  }

  deleteRow(id: string | number): Observable<{ message: string }> {
    return this.apiHttp.delete<{ message: string }>(`${this.endpoint}/${encodeURIComponent(String(id))}`);
  }
}
