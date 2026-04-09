import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiHttpService } from './api-http.service';
import { CatalogSetPartsResponse, SetInstructionsResponse } from './api-types';

@Injectable({ providedIn: 'root' })
export class SetsApiService {
  private readonly apiHttp = inject(ApiHttpService);

  getCatalogSetParts(setNum: string): Observable<CatalogSetPartsResponse> {
    return this.apiHttp.get<CatalogSetPartsResponse>(`sets/${encodeURIComponent(setNum)}/parts`);
  }

  getCatalogSetInstructions(setNum: string): Observable<SetInstructionsResponse> {
    return this.apiHttp.get<SetInstructionsResponse>(`sets/${encodeURIComponent(setNum)}/instructions`);
  }
}
