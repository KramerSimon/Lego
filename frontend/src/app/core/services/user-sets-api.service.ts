import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiHttpService } from './api-http.service';
import {
  SetPartsResponse,
  UserSetBreakdownResponse,
  UserSetWithPartsPayload,
  UserSetWithPartsResult
} from './api-types';

@Injectable({ providedIn: 'root' })
export class UserSetsApiService {
  private readonly apiHttp = inject(ApiHttpService);

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
