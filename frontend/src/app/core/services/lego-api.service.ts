import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AuthUser {
  user_id: number;
  username: string;
  email?: string;
  full_name?: string;
}

export interface AuthLoginResponse {
  token: string;
  user: AuthUser;
}

export interface PagedResult {
  data: Record<string, unknown>[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SetPartRequirement {
  part_num: string;
  color_id: number;
  required_quantity: number;
  inventory_id: number;
  part_name?: string;
  part_img_url?: string;
  color_name?: string;
}

export interface SetPartsResponse {
  set_num: string;
  inventory_id: number | null;
  inventory_version?: number;
  parts: SetPartRequirement[];
}

export interface CatalogSetPart {
  part_num: string;
  color_id: number;
  quantity: number;
  part_name?: string;
  part_img_url?: string;
  color_name?: string;
}

export interface CatalogSetPartsResponse {
  set_num: string;
  inventory_id: number | null;
  inventory_version?: number;
  parts: CatalogSetPart[];
}

export interface UserSetCreatePayload {
  user_id: number;
  set_num: string;
  quantity: number;
  condition_public?: string;
  condition_complete?: string;
  purchase_price?: number;
  owned_since?: string;
}

export interface UserSetPartSelection extends SetPartRequirement {
  has_part: boolean;
  owned_quantity?: number;
}

export interface UserSetWithPartsPayload {
  user_set: UserSetCreatePayload;
  parts: UserSetPartSelection[];
}

export interface UserSetWithPartsResult {
  user_set: {
    id: number;
  } & UserSetCreatePayload;
  summary: {
    parts_processed: number;
    user_parts_created: number;
    missing_parts_created: number;
  };
}

export interface UserSetBreakdownPart {
  row_id: number;
  part_num: string;
  color_id: number;
  quantity: number;
  part_name?: string;
  part_img_url?: string;
  color_name?: string;
}

export interface UserSetBreakdownResponse {
  user_set_id: number;
  user_id: number;
  set_num: string;
  set_name?: string;
  img_url?: string;
  available_parts: UserSetBreakdownPart[];
  missing_parts: UserSetBreakdownPart[];
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

  deleteRow(endpoint: string, id: string | number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${endpoint}/${encodeURIComponent(String(id))}`);
  }

  getUserSetParts(setNum: string): Observable<SetPartsResponse> {
    return this.http.get<SetPartsResponse>(`${this.baseUrl}/user_sets/set-parts/${encodeURIComponent(setNum)}`);
  }

  createUserSetWithParts(payload: UserSetWithPartsPayload): Observable<UserSetWithPartsResult> {
    return this.http.post<UserSetWithPartsResult>(`${this.baseUrl}/user_sets/with-parts`, payload);
  }

  getCatalogSetParts(setNum: string): Observable<CatalogSetPartsResponse> {
    return this.http.get<CatalogSetPartsResponse>(`${this.baseUrl}/sets/${encodeURIComponent(setNum)}/parts`);
  }

  authLogin(identifier: string, password: string): Observable<AuthLoginResponse> {
    return this.http.post<AuthLoginResponse>(`${this.baseUrl}/auth/login`, {
      identifier,
      password
    });
  }

  authMe(token: string): Observable<{ user: AuthUser }> {
    return this.http.get<{ user: AuthUser }>(`${this.baseUrl}/auth/me`, {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    });
  }

  getUserSetBreakdown(userSetId: number): Observable<UserSetBreakdownResponse> {
    return this.http.get<UserSetBreakdownResponse>(`${this.baseUrl}/user_sets/${userSetId}/breakdown`);
  }

  updateUserSetBreakdownPart(
    userSetId: number,
    kind: 'available' | 'missing',
    rowId: number,
    quantity: number
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.baseUrl}/user_sets/${userSetId}/parts/${kind}/${rowId}`,
      { quantity }
    );
  }

  deleteUserSetBreakdownPart(
    userSetId: number,
    kind: 'available' | 'missing',
    rowId: number
  ): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/user_sets/${userSetId}/parts/${kind}/${rowId}`);
  }
}
